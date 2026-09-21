#!/usr/bin/env node
/**
 * Builds `data/barangays.json` — the complete, verified list of all 720
 * barangays of Albay province, Philippines.
 *
 * Sources
 *   Geography (PSGC codes + official names)
 *     Philippine Standard Geographic Code (PSGC), Philippine Statistics
 *     Authority — public API at https://psgc.gitlab.io/api
 *   Population
 *     PSA 2015 & 2020 Census of Population and Housing, tabulated per
 *     barangay by PhilAtlas (https://www.philatlas.com/lists/barangays-albay.html)
 *
 * Validation gates — the script throws (non-zero exit) if any fail
 *   1. every LGU's barangay count matches its PSGC record
 *   2. every barangay in PSGC is matched to a population record
 *   3. each LGU's summed barangay population equals its published LGU total
 *   4. the province-wide sum equals the PSA 2020 total (1,374,768)
 *
 * Usage:
 *   node scripts/fetch-barangays.mjs
 *
 * The output is deterministic and safe to regenerate. It fetches ~40 pages,
 * so it takes roughly a minute.
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'barangays.json');

const PROVINCE_CODE = '050500000';
const PSA_2020_PROVINCE_TOTAL = 1_374_768;
const PSA_2015_PROVINCE_TOTAL = 1_314_826;

const PSGC_API = 'https://psgc.gitlab.io/api';
const PHILATLAS_BASE = 'https://www.philatlas.com/luzon/r05/albay';

// PhilAtlas requires a browser-like User-Agent; plain curl/fetch is blocked.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DELAY_MS = 1200; // be polite to both hosts
const RETRIEVED = new Date().toISOString().slice(0, 10);

/** PhilAtlas page slug per LGU PSGC code. */
const PHILATLAS_SLUG = {
  '050501000': 'bacacay',
  '050502000': 'camalig',
  '050503000': 'daraga',
  '050504000': 'guinobatan',
  '050505000': 'jovellar',
  '050506000': 'legazpi',
  '050507000': 'libon',
  '050508000': 'ligao',
  '050509000': 'malilipot',
  '050510000': 'malinao',
  '050511000': 'manito',
  '050512000': 'oas',
  '050513000': 'pio-duran',
  '050514000': 'polangui',
  '050515000': 'rapu-rapu',
  '050516000': 'santo-domingo',
  '050517000': 'tabaco',
  '050518000': 'tiwi',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fromCodePoint = (cp) => {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return '';
  }
};

/**
 * Decode HTML entities.
 *
 * PhilAtlas emits accented characters numerically — "Cabag&#241;an" for
 * "Cabagñan", "Santo Ni&#241;o" for "Santo Niño". If those digits leak into
 * the comparison key the name never matches its PSGC counterpart, silently
 * dropping the barangay from the dataset.
 */
const decodeEntities = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

/**
 * Strip HTML tags, then decode entities — in that order, because decoding
 * first could turn an escaped "&lt;td&gt;" into a bogus tag.
 */
const clean = (s) =>
  decodeEntities(s.replace(/<[^>]+>/g, ' '))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const num = (s) => {
  const n = parseInt(String(s).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
};

/**
 * Collapse the two naming conventions to a common matching key.
 *
 *   PSGC                              PhilAtlas
 *   "Bgy. 1 - Em's Barrio (Pob.)"  →  "Barangay 1-Em's Barrio"      → "1 em s barrio"
 *   "San Juan Pob."                →  "San Juan Poblacion"          → "san juan"
 *   "Zone I (Pob.)"                →  "Zone I"                      → "zone i"
 *
 * The `(Pob.)` / `Poblacion` marker is itself meaningful (it flags the
 * población — the population centre / urban core), so it is captured
 * separately as `is_poblacion` rather than used in the comparison.
 */
function normalize(name) {
  return (
    name
      .toLowerCase()
      .replace(/\((?:pob\.?|poblacion)\)/g, ' ')
      .replace(/\bpoblacion\b/g, ' ')
      .replace(/\bpob\b\.?/g, ' ')
      .replace(/^\s*bgy\.?\s*/i, '')
      .replace(/^\s*barangay\s*/i, '')
      // Unicode-aware: letters like ñ and é must survive, otherwise
      // "Cabagñan" and "Cabag an" would diverge between the two sources.
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

/**
 * Parse PhilAtlas' per-LGU barangay table (`<table id='lguTable'>`).
 *
 * Two traps, both guarded below:
 *   - the header row (`<tr id='sortRow'>`) would otherwise parse as a
 *     barangay named "Population (2020)" worth 2,020 people
 *   - the totals row (`<tr id='tableTotals'>`) reads as "{LGU} Total"
 *   - Legazpi's header `</tr>` is unclosed, so its first data row gets
 *     swallowed into the header match — parsing is anchored after `<tbody>`
 */
function parsePhilAtlas(html) {
  const table = html.match(/<table[^>]*id='lguTable'[^>]*>([\s\S]*?)<\/table>/i);
  if (!table) throw new Error('lguTable not found');

  const body = /<tbody>/i.test(table[1]) ? table[1].replace(/^[\s\S]*?<tbody>/i, '') : table[1];

  const rows = [];
  let lguTotal2020 = null;
  let lguTotal2015 = null;

  for (const m of body.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi)) {
    const attrs = m[1];
    const inner = m[2];
    if (/sortRow/.test(attrs)) continue;

    if (/tableTotals/.test(attrs)) {
      lguTotal2020 = num((inner.match(/id='curPop'[^>]*>([\d,]+)/i) || [])[1]);
      lguTotal2015 = num((inner.match(/id='prevPop'[^>]*>([\d,]+)/i) || [])[1]);
      continue;
    }

    const cells = [...inner.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => clean(c[1]));
    if (cells.length < 4 || !cells[0]) continue;

    rows.push({
      name: cells[0],
      pop2020: num(cells[2]),
      pop2015: num(cells[3]),
    });
  }

  return { rows, lguTotal2020, lguTotal2015 };
}

async function main() {
  process.stdout.write('Fetching province and LGU metadata…\n');
  const province = await getJson(`${PSGC_API}/provinces/${PROVINCE_CODE}/`);
  const lguList = await getJson(`${PSGC_API}/provinces/${PROVINCE_CODE}/cities-municipalities/`);

  // Stable ordering by PSGC code so regeneration produces no spurious diffs.
  lguList.sort((a, b) => a.code.localeCompare(b.code));

  const lgus = [];
  const byLguNames = {};
  const problems = [];
  let grandTotal2020 = 0;
  let grandTotal2015 = 0;
  let grandCount = 0;

  for (const lgu of lguList) {
    const slug = PHILATLAS_SLUG[lgu.code];
    if (!slug) throw new Error(`No PhilAtlas slug mapped for ${lgu.name} (${lgu.code})`);

    process.stdout.write(`  ${lgu.name}…`);
    const [psgcBarangays, html] = await Promise.all([
      getJson(`${PSGC_API}/cities-municipalities/${lgu.code}/barangays/`),
      getText(`${PHILATLAS_BASE}/${slug}.html`),
    ]);
    const { rows, lguTotal2020, lguTotal2015 } = parsePhilAtlas(html);

    // Index PhilAtlas rows by normalized name for merging.
    const popIndex = new Map();
    for (const row of rows) {
      const key = normalize(row.name);
      if (popIndex.has(key)) problems.push(`${lgu.name}: duplicate PhilAtlas key "${key}"`);
      popIndex.set(key, row);
    }

    psgcBarangays.sort((a, b) => a.code.localeCompare(b.code));

    const barangays = [];
    const consumed = new Set();

    for (const b of psgcBarangays) {
      const key = normalize(b.name);
      const pop = popIndex.get(key);
      if (!pop) {
        problems.push(`${lgu.name}: no population record for "${b.name}" (key "${key}")`);
        continue;
      }
      consumed.add(key);

      barangays.push({
        psgc_code: b.code,
        psgc_10digit: b.psgc10DigitCode,
        name: pop.name,
        official_name: b.name,
        is_poblacion: /\(pob\.?\)|\bpoblacion\b/i.test(b.name),
        population_2020: pop.pop2020,
        population_2015: pop.pop2015,
      });
    }

    for (const [key, row] of popIndex) {
      if (!consumed.has(key)) {
        problems.push(`${lgu.name}: unmatched PhilAtlas row "${row.name}" (key "${key}")`);
      }
    }

    const sum2020 = barangays.reduce((a, r) => a + (r.population_2020 || 0), 0);
    const sum2015 = barangays.reduce((a, r) => a + (r.population_2015 || 0), 0);

    if (barangays.length !== psgcBarangays.length) {
      problems.push(`${lgu.name}: got ${barangays.length} rows, expected ${psgcBarangays.length}`);
    }
    if (lguTotal2020 !== null && sum2020 !== lguTotal2020) {
      problems.push(`${lgu.name}: population sum ${sum2020} ≠ published ${lguTotal2020}`);
    }

    const isCity = /^City of /i.test(lgu.name);

    lgus.push({
      name: lgu.name.replace(/^City of /i, ''),
      official_name: lgu.name,
      type: isCity ? 'city' : 'municipality',
      is_capital: Boolean(lgu.isCapital),
      psgc_code: lgu.code,
      psgc_10digit: lgu.psgc10DigitCode,
      barangay_count: barangays.length,
      population_2020: lguTotal2020 ?? sum2020,
      population_2015: lguTotal2015 ?? sum2015,
      barangays,
    });

    byLguNames[lgu.name.replace(/^City of /i, '')] = barangays.map((b) => b.name);

    grandTotal2020 += lguTotal2020 ?? sum2020;
    grandTotal2015 += lguTotal2015 ?? sum2015;
    grandCount += barangays.length;

    process.stdout.write(
      ` ${barangays.length} brgys, ${(lguTotal2020 ?? sum2020).toLocaleString()} pop\n`
    );
    await sleep(DELAY_MS);
  }

  process.stdout.write('\nValidating…\n');
  if (problems.length) {
    throw new Error(`Data problems found:\n  - ${problems.join('\n  - ')}`);
  }
  if (grandCount !== 720) throw new Error(`Expected 720 barangays, got ${grandCount}`);
  if (lgus.length !== 18) throw new Error(`Expected 18 LGUs, got ${lgus.length}`);
  if (grandTotal2020 !== PSA_2020_PROVINCE_TOTAL) {
    throw new Error(
      `Sum of barangay populations ${grandTotal2020} ≠ PSA 2020 total ${PSA_2020_PROVINCE_TOTAL}`
    );
  }

  const out = {
    _schema_version: '2.0',
    _status: 'verified',
    _retrieved: RETRIEVED,
    _description:
      'All 720 barangays of the province of Albay, Philippines, with PSA ' +
      'geographic codes and 2015/2020 census population.',
    _sources: {
      geography: {
        name: 'Philippine Standard Geographic Code (PSGC)',
        authority: 'Philippine Statistics Authority (PSA)',
        url: `${PSGC_API}/provinces/${PROVINCE_CODE}/`,
      },
      population: {
        name: 'PSA 2015 & 2020 Census of Population and Housing, per barangay',
        url: 'https://www.philatlas.com/lists/barangays-albay.html',
      },
    },
    _notes: [
      '`name` is the common/display name; `official_name` is the PSGC official name.',
      '`is_poblacion` marks the población — the barangay forming the population centre/urban core of its LGU.',
      'The two sources were cross-checked independently and agree on all 720 barangays and their per-LGU counts.',
    ],
    _validation: {
      lgu_count: lgus.length,
      total_barangays: grandCount,
      total_population_2020: grandTotal2020,
      total_population_2015: grandTotal2015,
      psa_province_population_2020: PSA_2020_PROVINCE_TOTAL,
      psa_province_population_2015: PSA_2015_PROVINCE_TOTAL,
      barangay_population_sum_matches_psa_2020: true,
      per_lgu_counts_match_psgc: true,
      per_lgu_population_sums_match: true,
    },
    province: {
      name: province.name,
      psgc_code: province.code,
      psgc_10digit: province.psgc10DigitCode,
      region: 'Region V - Bicol Region',
      region_code: province.regionCode,
      island_group: province.islandGroupCode,
      barangay_count: grandCount,
      lgu_count: lgus.length,
      population_2020: PSA_2020_PROVINCE_TOTAL,
      population_2015: PSA_2015_PROVINCE_TOTAL,
      land_area_km2: 2574.91,
      capital: 'Legazpi',
      congressional_districts: 3,
    },
    total_barangays: grandCount,
    lgu_count: lgus.length,
    lgus,
    // Convenience index: LGU name → ordered list of barangay names.
    // Retained for backward compatibility with the schema 1.0 shape.
    by_lgu: byLguNames,
  };

  await writeFile(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');

  process.stdout.write(
    `\n✓ Wrote ${OUT}\n` +
      `  ${lgus.length} LGUs · ${grandCount} barangays\n` +
      `  2020 population ${grandTotal2020.toLocaleString()} (matches PSA province total)\n` +
      `  2015 population ${grandTotal2015.toLocaleString()}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`\n✗ ${err.message}\n`);
  process.exit(1);
});
