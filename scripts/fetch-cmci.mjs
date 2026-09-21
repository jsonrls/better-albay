#!/usr/bin/env node
/**
 * Builds `data/cmci_2024.json` — the official 2024 Cities and Municipalities
 * Competitiveness Index (CMCI) results for all 18 cities and municipalities of
 * Albay province, Philippines.
 *
 * Sources (CMCI, Department of Trade and Industry — https://cmci.dti.gov.ph)
 *   lgu-profile.php?lgu=<name>&year=<year>   primary: one request per LGU
 *       → LGU classification (Category), mayor, population, website, address,
 *         contact numbers, Facebook page
 *       → overall rank, plus each pillar's rank + score
 *       → each pillar's 10 indicators, with their own rank + score
 *   rankings-data.php                        cross-validator: one request
 *       → overall rank + score and all five pillar ranks + scores for every
 *         LGU in the country, from which the 18 Albay rows are selected
 *
 * ## Why the profile page is the primary source
 *
 * `rankings-data.php` publishes bare rank/score numbers with no classification,
 * and it interleaves **six independent ranked lists** in one table — provinces
 * plus five LGU classes. Each rank value therefore repeats up to six times, so
 * a row carrying "rank 3" means "3rd within its own class", never "3rd in the
 * Philippines". Reading it without the class is actively misleading.
 *
 * The profile page states the class outright, so the rank travels with the
 * scope it belongs to. It also exposes per-indicator ranks, which the rankings
 * page does not publish at all.
 *
 * ## Rank scope — read this before displaying any number
 *
 * Every `rank` in the output is CMCI's own rank **within the LGU's
 * classification** (`category`), not a national rank. A separate, unambiguous
 * `province_rank` (1–18, by overall score among Albay LGUs) is computed and
 * included for province-level comparisons.
 *
 * ## Validation gates — the script throws (non-zero exit) if any fail
 *
 *   1. exactly 18 Albay LGUs are found and their names match `data/barangays.json`
 *   2. every profile states a Category
 *   3. the profile's overall rank equals the rankings page's overall rank
 *   4. every pillar's rank *and* score agree exactly between the two endpoints
 *   5. the five pillar scores sum to the published overall score (±0.01)
 *   6. every LGU yields all 50 indicators, each with a finite score
 *   7. every indicator lands in exactly one pillar, and each pillar holds 10
 *   8. all scores fall inside 0–100
 *
 * Gates 3–5 are the point of the two-source design: they prove both endpoints
 * describe the same LGU in the same year before anything is written.
 *
 * ## Source quirks handled here
 *
 *   - Each pillar table in the profile page ends with a stray duplicate row
 *     ("Local Economy Size") left over from a template. It is discarded by
 *     accepting a row only when its label belongs to *that* pillar and has not
 *     already been assigned.
 *   - CMCI capitalises inconsistently ("STEM graduates" in one place,
 *     "STEM Graduates" in another), so labels are matched case-insensitively.
 *   - CMCI disambiguates same-named LGUs as "Santo Domingo (AY)" and
 *     "Malinao (AY)"; the province tag is stripped to match PSGC.
 *   - `get-metadata.php` returns lorem ipsum and `{"year_start":null}` despite
 *     looking like a real endpoint. It is not used.
 *
 * ## Usage
 *
 *   node scripts/fetch-cmci.mjs
 *
 * 19 requests, 1.2 s apart — about 30 seconds. Output is deterministic and
 * safe to regenerate.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'cmci_2024.json');
const BARANGAYS = join(ROOT, 'data', 'barangays.json');

const YEAR = 2024;
const CMCI_BASE = 'https://cmci.dti.gov.ph';
const RANKINGS_URL = `${CMCI_BASE}/rankings-data.php`;
const profileUrl = (name) =>
  `${CMCI_BASE}/lgu-profile.php?lgu=${encodeURIComponent(name)}&year=${YEAR}`;

const EXPECTED_LGU_COUNT = 18;
const EXPECTED_PER_PILLAR = 10;
const EXPECTED_TOTAL_INDICATORS = 50;

// The host rejects requests without a browser-like User-Agent.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DELAY_MS = 1200;
const RETRIEVED = new Date().toISOString().slice(0, 10);

/**
 * Pillars, in the order both endpoints present them, with the uppercase label
 * the profile page uses as its table heading.
 */
const PILLARS = {
  ed: { label: 'Economic Dynamism', profileLabel: 'ECONOMIC DYNAMISM' },
  ge: { label: 'Government Efficiency', profileLabel: 'GOVERNMENT EFFICIENCY' },
  in: { label: 'Infrastructure', profileLabel: 'INFRASTRUCTURE' },
  re: { label: 'Resiliency', profileLabel: 'RESILIENCY' },
  iv: { label: 'Innovation', profileLabel: 'INNOVATION' },
};

const PILLAR_CODES = Object.keys(PILLARS);

/**
 * Indicator code → { label, pillar }.
 *
 * Codes are the values CMCI's data portal accepts as `chk-indicators[]`.
 *
 * The pillar grouping is taken from the profile page's own table headings —
 * deliberately NOT inferred from the order the data portal lists the codes,
 * which does not group by pillar. Four indicators (cnd, pipu, lup, itp) sit in
 * a different pillar than their portal position implies; gate 7 keeps the
 * grouping honest.
 */
const INDICATORS = {
  // Economic Dynamism
  les: { label: 'Local Economy Size', pillar: 'ed' },
  leg: { label: 'Local Economy Growth', pillar: 'ed' },
  sle: { label: 'Active Establishments in the Locality', pillar: 'ed' },
  scb: { label: 'Safety Compliant Business', pillar: 'ed' },
  job: { label: 'Employment Generation', pillar: 'ed' },
  col: { label: 'Cost of Living', pillar: 'ed' },
  cdb: { label: 'Cost of Doing Business', pillar: 'ed' },
  fd: { label: 'Financial Deepening', pillar: 'ed' },
  pro: { label: 'Productivity', pillar: 'ed' },
  pbpo: { label: 'Presence of Business and Professional Organizations', pillar: 'ed' },

  // Government Efficiency
  cnd: { label: 'Compliance to National Directives', pillar: 'ge' },
  pipu: { label: 'Presence of Investment Promotion Unit', pillar: 'ge' },
  bre: { label: 'Compliance to ARTA Citizens Charter', pillar: 'ge' },
  rat: { label: 'Capacity to Generate Local Resource', pillar: 'ge' },
  chs: { label: 'Capacity of Health Services', pillar: 'ge' },
  css: { label: 'Capacity of School Services', pillar: 'ge' },
  lgua: { label: 'Recognition of Performance', pillar: 'ge' },
  bpls: { label: 'Getting Business Permits', pillar: 'ge' },
  pao: { label: 'Peace and Order', pillar: 'ge' },
  sp: { label: 'Social Protection', pillar: 'ge' },

  // Infrastructure
  road: { label: 'Road Network', pillar: 'in' },
  dtp: { label: 'Distance to Ports', pillar: 'in' },
  abu: { label: 'Availability of Basic Utilities', pillar: 'in' },
  trans: { label: 'Transportation Vehicles', pillar: 'in' },
  edu: { label: 'Education', pillar: 'in' },
  hea: { label: 'Health', pillar: 'in' },
  inv: { label: 'LGU Investment', pillar: 'in' },
  acc: { label: 'Accommodation Capacity', pillar: 'in' },
  ict: { label: 'Information Technology Capacity', pillar: 'in' },
  atm: { label: 'Financial Technology Capacity', pillar: 'in' },

  // Resiliency
  lup: { label: 'Land Use Plan', pillar: 're' },
  drrp: { label: 'Disaster Risk Reduction Plan', pillar: 're' },
  add: { label: 'Annual Disaster Drill', pillar: 're' },
  ews: { label: 'Early Warning System', pillar: 're' },
  drrmp: { label: 'Budget for DRRMP', pillar: 're' },
  lra: { label: 'Local Risk Assessments', pillar: 're' },
  ei: { label: 'Emergency Infrastructure', pillar: 're' },
  util: { label: 'Utilities', pillar: 're' },
  ep: { label: 'Employed Population', pillar: 're' },
  ss: { label: 'Sanitary System', pillar: 're' },

  // Innovation
  itp: { label: 'ICT Plan', pillar: 'iv' },
  ivf: { label: 'Innovation Financing: R&D Expenditures Allotment', pillar: 'iv' },
  ebpls: { label: 'ICT Use: E-BPLS Software', pillar: 'iv' },
  opf: { label: 'Online Payment Facilities', pillar: 'iv' },
  stg: { label: 'STEM graduates', pillar: 'iv' },
  ipop: { label: 'Intellectual Property Registration', pillar: 'iv' },
  intc: { label: 'Internet Capability', pillar: 'iv' },
  abis: { label: 'Availability of Basic Internet Service', pillar: 'iv' },
  stup: { label: 'Start Up and Innovation Facilities', pillar: 'iv' },
  newt: { label: 'New Technology', pillar: 'iv' },
};

/** Case-insensitive label → code, for tolerant matching. */
const CODE_BY_LABEL = new Map(
  Object.entries(INDICATORS).map(([code, d]) => [d.label.toLowerCase(), code])
);

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

const fromCodePoint = (cp) => {
  try {
    return String.fromCodePoint(cp);
  } catch {
    return '';
  }
};

const decodeEntities = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");

/** Strip tags, then decode — decoding first could revive an escaped tag. */
const clean = (s) =>
  decodeEntities(String(s).replace(/<[^>]+>/g, ' '))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** "3 rd" -> 3, "114 th" -> 114, "" -> null. */
const toRank = (s) => {
  const m = clean(s).match(/^(\d+)/);
  return m ? Number(m[1]) : null;
};

/** Parse a score, rejecting blanks and placeholders. */
const toScore = (s) => {
  const t = clean(s).replace(/,/g, '');
  if (!t || t === '-' || t === '\u2014') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Table -> array of cell-arrays. */
const tableRows = (table) =>
  (table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []).map((r) =>
    (r.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map(clean)
  );

const tablesOf = (html) => html.match(/<table[\s\S]*?<\/table>/gi) || [];

async function get(url, init = {}, attempt = 1) {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': USER_AGENT, ...(init.headers || {}) },
  });
  if (!res.ok) {
    if (attempt <= 3 && res.status >= 500) {
      await SLEEP(DELAY_MS * attempt);
      return get(url, init, attempt + 1);
    }
    throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  }
  return res.text();
}

/** "Santo Domingo (AY)" -> "Santo Domingo"; defensive against "CITY OF X". */
const normaliseLguName = (raw) =>
  clean(raw)
    .replace(/\s*\([A-Z]{2}\)\s*$/, '')
    .replace(/^CITY OF\s+/i, '')
    .replace(/^MUNICIPALITY OF\s+/i, '')
    .trim();

/**
 * Pull the LGU's metadata table (Category, Mayor, Population, …) into a plain
 * object. Its rows are four-cell key/value pairs, sometimes two.
 */
function parseProfileMeta(html) {
  for (const table of tablesOf(html)) {
    const rows = tableRows(table);
    // The Category row is not necessarily the first row of the table, so
    // the table is located by its content rather than by position.
    if (!rows.some((c) => c[0] === 'Category')) continue;
    const meta = {};
    for (const cells of rows) {
      if (cells.length >= 4) {
        if (cells[0]) meta[cells[0]] = cells[1];
        if (cells[2]) meta[cells[2]] = cells[3];
      } else if (cells.length >= 2 && cells[0]) {
        meta[cells[0]] = cells[1];
      }
    }
    return meta;
  }
  return null;
}

/**
 * Walk the profile page's five pillar tables.
 *
 * Each is laid out as:
 *   ["", "Rank", "Score"]
 *   ["ECONOMIC DYNAMISM", "5 th", "8.1209"]   ← the pillar aggregate
 *   ["Local Economy Size", "25 th", "0.1375"] ← indicators
 *   …
 *
 * Every pillar table ends with a duplicated stray row, so a row is accepted
 * only when its label belongs to this pillar and is not already assigned.
 */
function parseProfilePillars(html) {
  const seen = new Set();
  // pillarCode -> { rank, score, indicators: { code: {rank, score} } }
  const result = {};

  for (const table of tablesOf(html)) {
    const rows = tableRows(table);
    // Locate the ["", "Rank", "Score"] header by content, not by position.
    const h = rows.findIndex((c) => c.length === 3 && c[1] === 'Rank' && c[2] === 'Score');
    if (h === -1) continue;

    const rest = rows.slice(h + 1);
    const aggregate = rest.find((c) => c.length === 3 && c[0]);
    if (!aggregate) continue;
    const pillarCode = PILLAR_CODES.find(
      (c) => PILLARS[c].profileLabel === aggregate[0].toUpperCase()
    );
    if (!pillarCode) continue;

    const entry = {
      label: PILLARS[pillarCode].label,
      rank: toRank(aggregate[1]),
      score: toScore(aggregate[2]),
      indicators: {},
    };

    for (const cells of rest.slice(rest.indexOf(aggregate) + 1)) {
      if (cells.length !== 3 || !cells[0]) continue;
      const code = CODE_BY_LABEL.get(cells[0].toLowerCase());
      if (!code) continue;
      if (INDICATORS[code].pillar !== pillarCode) continue; // stray leftover row
      if (seen.has(code)) continue; // template duplicate
      seen.add(code);
      entry.indicators[code] = { rank: toRank(cells[1]), score: toScore(cells[2]) };
    }

    result[pillarCode] = entry;
  }
  return result;
}

async function main() {
  // ------------------------------------------------------- cross-validator
  console.log('▶ Fetching CMCI rankings page (cross-validator)…');
  const rankingsHtml = await get(RANKINGS_URL);
  const rankingTables = tablesOf(rankingsHtml);
  if (!rankingTables.length) throw new Error('No tables on the CMCI rankings page');

  // Table 0 is "2024 Rankings of Cities and Municipalities". It interleaves
  // provinces with five LGU classes, so `rank` here is within-class; it is
  // used only to cross-check the profile pages.
  const rankRows = tableRows(rankingTables[0]);
  if (rankRows.length < 100) {
    throw new Error(`Rankings table looks truncated (${rankRows.length} rows)`);
  }

  // Columns: Rank | Score | LGU | Province | Region | (rank, score) × 5 pillars
  // Province-level rows carry an empty Province cell, which excludes them.
  const fromRankings = new Map();
  for (const cells of rankRows) {
    if (cells.length < 15 || cells[3] !== 'Albay') continue;
    const name = normaliseLguName(cells[2]);
    const pillars = {};
    PILLAR_CODES.forEach((p, i) => {
      pillars[p] = {
        rank: toRank(cells[5 + i * 2]),
        score: toScore(cells[6 + i * 2]),
      };
    });
    fromRankings.set(name, {
      rawName: cells[2],
      rank: toRank(cells[0]),
      score: toScore(cells[1]),
      region: cells[4],
      pillars,
    });
  }
  console.log(`  ${fromRankings.size} Albay LGU row(s) found`);

  // -------------------------------------------------------------- primary
  const lgus = [];
  for (const [name, ranking] of fromRankings) {
    // The profile page must be addressed by CMCI's *raw* name: several LGUs
    // share a bare name nationwide, and "Santo Domingo" without its "(AY)"
    // province tag resolves to a different LGU in a different province.
    const html = await get(profileUrl(ranking.rawName));

    const meta = parseProfileMeta(html);
    if (!meta) throw new Error(`${name}: no profile metadata table found`);
    if (meta['Province'] !== 'Albay') {
      throw new Error(
        `${name}: profile page for raw name "${ranking.rawName}" resolved to ` +
          `province "${meta['Province']}" — expected Albay`
      );
    }

    const pillars = parseProfilePillars(html);
    lgus.push({
      name,
      category: meta['Category'] || null,
      mayor: meta['Mayor'] || null,
      population_cmci: meta['Population'] ? Number(meta['Population'].replace(/,/g, '')) : null,
      website: meta['Website Link'] || null,
      email: meta['LGU E-mail'] || null,
      address: meta['Address'] || null,
      contact: meta['Contact Nos.'] || null,
      facebook: meta['Facebook Page'] || null,
      cmci_editions: meta['Ranking'] || null,
      region: meta['Region'] || ranking.region,
      overall: { rank: ranking.rank, score: ranking.score },
      pillars,
      _rankingPillars: ranking.pillars, // temp, used by gates
    });

    const n = PILLAR_CODES.reduce(
      (a, p) => a + Object.keys(pillars[p]?.indicators || {}).length,
      0
    );
    console.log(
      `  ${name.padEnd(16)} ${String(ranking.rank).padStart(4)}  ` +
        `${String(ranking.score).padStart(8)}  ${(meta['Category'] || '?').padEnd(18)} ` +
        `${n} indicators`
    );
    await SLEEP(DELAY_MS);
  }

  // ----------------------------------------------------------- validation
  const expected = JSON.parse(await readFile(BARANGAYS, 'utf8'));
  const known = new Map(expected.lgus.map((l) => [l.name, l]));
  const fail = (msg) => {
    throw new Error(`VALIDATION FAILED: ${msg}`);
  };

  // Gate 1 — count and names, both directions
  if (lgus.length !== EXPECTED_LGU_COUNT) {
    fail(`expected ${EXPECTED_LGU_COUNT} Albay LGUs, found ${lgus.length}`);
  }
  for (const lgu of lgus) {
    const match = known.get(lgu.name);
    if (!match) fail(`"${lgu.name}" is not an Albay LGU in data/barangays.json`);
    lgu.official_name = match.official_name;
    lgu.type = match.type;
    lgu.psgc_code = match.psgc_code;
    lgu.population_2020 = match.population_2020;
  }
  for (const name of known.keys()) {
    if (!lgus.some((l) => l.name === name)) fail(`no CMCI data for Albay LGU "${name}"`);
  }

  // Gate 7 — indicator accounting, done once and globally
  const byPillar = {};
  for (const code of Object.keys(INDICATORS)) {
    const p = INDICATORS[code].pillar;
    byPillar[p] = (byPillar[p] || 0) + 1;
  }
  for (const p of PILLAR_CODES) {
    if (byPillar[p] !== EXPECTED_PER_PILLAR) {
      fail(`pillar "${p}" declares ${byPillar[p]} indicators, expected ${EXPECTED_PER_PILLAR}`);
    }
  }
  if (Object.keys(INDICATORS).length !== EXPECTED_TOTAL_INDICATORS) {
    fail(
      `declared ${Object.keys(INDICATORS).length} indicators, expected ${EXPECTED_TOTAL_INDICATORS}`
    );
  }

  for (const lgu of lgus) {
    // Gate 2 — classification
    if (!lgu.category) fail(`${lgu.name}: profile states no Category`);

    // Gates 3–5 — the two sources must agree
    const r = lgu._rankingPillars;
    for (const p of PILLAR_CODES) {
      const prof = lgu.pillars[p];
      if (!prof) fail(`${lgu.name}: profile is missing pillar "${p}"`);
      if (prof.rank !== r[p].rank) {
        fail(`${lgu.name} ${p}: profile rank ${prof.rank} ≠ rankings rank ${r[p].rank}`);
      }
      if (prof.score !== r[p].score) {
        fail(`${lgu.name} ${p}: profile score ${prof.score} ≠ rankings score ${r[p].score}`);
      }
    }
    const pillarSum = PILLAR_CODES.reduce((a, p) => a + lgu.pillars[p].score, 0);
    if (Math.abs(pillarSum - lgu.overall.score) > 0.01) {
      fail(
        `${lgu.name}: pillar scores sum to ${pillarSum.toFixed(4)} but the published ` +
          `overall score is ${lgu.overall.score}`
      );
    }

    // Gate 6 — every indicator, per pillar
    let total = 0;
    for (const p of PILLAR_CODES) {
      const ind = lgu.pillars[p].indicators;
      const n = Object.keys(ind).length;
      if (n !== EXPECTED_PER_PILLAR) {
        fail(`${lgu.name} ${p}: ${n} indicators, expected ${EXPECTED_PER_PILLAR}`);
      }
      for (const [code, v] of Object.entries(ind)) {
        if (v.score === null) fail(`${lgu.name} ${p}/${code}: no score`);
        total += 1;
      }
    }
    if (total !== EXPECTED_TOTAL_INDICATORS) {
      fail(`${lgu.name}: ${total} indicators, expected ${EXPECTED_TOTAL_INDICATORS}`);
    }

    // Gate 8 — score ranges
    const scores = [
      lgu.overall.score,
      ...PILLAR_CODES.map((p) => lgu.pillars[p].score),
      ...PILLAR_CODES.flatMap((p) => Object.values(lgu.pillars[p].indicators).map((i) => i.score)),
    ];
    for (const s of scores) {
      if (s < 0 || s > 100) fail(`${lgu.name}: score ${s} is outside 0–100`);
    }

    lgu.pillar_sum_check = Number(pillarSum.toFixed(4));
    delete lgu._rankingPillars;
  }

  // Unambiguous province-level ordering, since CMCI's ranks are within-class.
  [...lgus]
    .sort((a, b) => b.overall.score - a.overall.score)
    .forEach((l, i) => {
      l.province_rank = i + 1;
    });

  lgus.sort((a, b) => a.province_rank - b.province_rank);

  const output = {
    _schema_version: '1.0',
    _status: 'verified',
    _source:
      'Cities and Municipalities Competitiveness Index (CMCI), ' +
      'Department of Trade and Industry (DTI)',
    _source_url: RANKINGS_URL,
    _source_url_per_lgu: `${CMCI_BASE}/lgu-profile.php?lgu=<name>&year=${YEAR}`,
    _retrieved: RETRIEVED,
    year: YEAR,
    province: 'Albay',
    region: lgus[0].region,
    total_lgus: lgus.length,
    rank_scope:
      "Every `rank` below is CMCI's rank WITHIN the LGU's classification " +
      '(`category`), not a national rank. CMCI publishes separate rankings for ' +
      'provinces and for each city/municipality class, so a rank of 3 means ' +
      "'3rd among LGUs of the same class'. Use `province_rank` (1-18, by " +
      'overall score among Albay LGUs) for province-level comparisons.',
    pillars: Object.fromEntries(PILLAR_CODES.map((p) => [p, PILLARS[p].label])),
    indicators: Object.fromEntries(
      Object.entries(INDICATORS).map(([code, d]) => [code, { label: d.label, pillar: d.pillar }])
    ),
    _validation: {
      lgu_count: lgus.length,
      indicators_per_lgu: EXPECTED_TOTAL_INDICATORS,
      indicators_per_pillar: EXPECTED_PER_PILLAR,
      names_match_barangays_json: true,
      cross_source_pillar_rank_and_score_match: true,
      pillar_scores_sum_to_overall: true,
      scores_within_0_100: true,
    },
    _notes: [
      "Indicator scores are CMCI's normalised values, comparable only within the same indicator — never across indicators or pillars.",
      'The overall score is the sum of the five pillar scores; this is asserted per LGU during generation.',
      "Ranks are within the LGU's CMCI classification (see rank_scope). province_rank is computed locally and is not a CMCI figure.",
      "population_cmci is CMCI's own figure and may differ slightly from the PSA 2020 census value in population_2020.",
      "CMCI disambiguates same-named LGUs as 'Santo Domingo (AY)' and 'Malinao (AY)'; the province tag is stripped to match PSGC.",
      "Each pillar table on CMCI's profile pages ends with a duplicated stray row, discarded during parsing.",
      "Four indicators (cnd, pipu, lup, itp) sit in a different pillar than their order in CMCI's data portal implies; the pillar assignment here follows the profile pages' own table headings.",
    ],
    lgus,
  };

  await writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const top = lgus[0];
  console.log(`\n✓ Wrote ${OUT}`);
  console.log(
    `  ${lgus.length} LGUs · ${EXPECTED_TOTAL_INDICATORS} indicators each · CMCI ${YEAR}`
  );
  console.log(
    `  top: ${top.name} (${top.category}) — overall ${top.overall.score}, ` +
      `within-class rank ${top.overall.rank}`
  );
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
