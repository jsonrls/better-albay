#!/usr/bin/env node
/**
 * fetch-psa-population.mjs
 * ---------------------------------------------------------------------------
 * Pulls official 2024 Census of Population figures for the Province of Albay
 * from the Philippine Statistics Authority's OpenSTAT PxWeb API, and writes
 * them to `data/population_2024.json`.
 *
 * Why this source
 * ---------------
 * PSA OpenSTAT (https://openstat.psa.gov.ph) is the National Statistician's
 * official dissemination database. Its PxWeb REST API is public, keyless and
 * stable. Two tables are used:
 *
 *   A) DB/1A/PO_2024/0051A6DTPH4.px
 *      "Total Population, Household Population, and Number of Households by
 *       Province, City, Municipality, and Barangay as of 01 July 2024:
 *       Bicol Region"
 *      -> barangay-level 2024 population + households
 *
 *   B) DB/1A/PO_2024/0221A6DLPD0.px
 *      "Population, Land Area, Population Density, and Percent Change in
 *       Population Density by Region, Province/HUC, and City/Municipality:
 *       2015, 2020, and 2024"
 *      -> LGU-level 2015/2020/2024 population, land area, density
 *
 * Self-validation
 * ---------------
 * The script refuses to write output unless every gate passes. Gates compare
 * two independently produced PSA figures against each other, so a parse error
 * cannot silently produce a plausible-looking-but-wrong file:
 *
 *   1. every requested geography returned a value
 *   2. sum(barangay 2024) == LGU 2024, for each of the 18 LGUs
 *   3. sum(barangay households) == LGU households, for each LGU
 *   4. sum(LGU 2024) == province 2024
 *   5. PSA 2020 population == population_2020 already in data/barangays.json
 *   6. every LGU has a non-null land area
 *
 * Usage
 * -----
 *   node scripts/fetch-psa-population.mjs
 *   node scripts/fetch-psa-population.mjs --dry-run   # validate, do not write
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BARANGAYS = path.join(ROOT, 'data', 'barangays.json');
const OUT = path.join(ROOT, 'data', 'population_2024.json');

const API = 'https://openstat.psa.gov.ph/PXWeb/api/v1/en/';
const TABLE_BARANGAY = 'DB/1A/PO_2024/0051A6DTPH4.px';
const TABLE_LGU = 'DB/1A/PO_2024/0221A6DLPD0.px';

const SOURCE_PORTAL = 'https://openstat.psa.gov.ph';
const SOURCE_TITLE = '2024 Census of Population';
const SOURCE_PUBLISHER = 'Philippine Statistics Authority';
const REFERENCE_DATE = '01 July 2024';
const PROVINCE = 'Albay';
const REGION = 'Region V (Bicol Region)';
const PROVINCE_PSGC = '0500500000';

const EXPECTED_LGUS = 18;
const EXPECTED_BARANGAYS = 720;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

/* ------------------------------------------------------------------ *
 * small helpers
 * ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(...a) {
  console.log(...a);
}
function ok(msg) {
  log(`  \u2713 ${msg}`);
}
function fail(msg) {
  log(`  \u2717 ${msg}`);
}
function info(msg) {
  log(`\n${msg}`);
}

/** number | null, tolerating the many ways PxWeb spells "no data". */
function num(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '' || s === '..' || s === '.' || s === '-' || s === 'N/A') return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** PxWeb pads geographic labels with leader dots; strip them and footnote marks. */
function cleanLabel(s) {
  if (!s) return '';
  return String(s)
    .replace(/^[.\s]+/, '')
    .replace(/\s*\*+.*$/, '')
    .trim();
}

/* ------------------------------------------------------------------ *
 * PxWeb client
 * ------------------------------------------------------------------ */

async function pxGet(table) {
  const url = API + table;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`metadata ${table} -> HTTP ${res.status}`);
  return res.json();
}

/**
 * POST a PxWeb query and return a flat Map of `${geo}|${param}` -> value.
 *
 * Only the "json" response format returns a full table from this server;
 * "json-stat2" silently collapses to a single value. That behaviour is why
 * this fetcher does not use the more usual json-stat2 shape.
 */
async function pxQuery(table, geoCodes, paramCodes) {
  const body = {
    query: [
      {
        code: 'Geographic Location',
        selection: { filter: 'item', values: geoCodes },
      },
      { code: 'Parameter', selection: { filter: 'item', values: paramCodes } },
    ],
    response: { format: 'json' },
  };

  const url = API + table;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      if (!json || !Array.isArray(json.data)) {
        throw new Error('malformed response (no data array)');
      }
      const out = new Map();
      for (const row of json.data) {
        const [geo, param] = row.key;
        out.set(`${geo}|${param}`, row.values?.[0] ?? null);
      }
      return out;
    } catch (e) {
      lastErr = e;
      if (attempt < 4) await sleep(1500 * attempt);
    }
  }
  throw new Error(`query ${table} failed after 4 attempts: ${lastErr?.message}`);
}

/* ------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------ */

async function main() {
  log('PSA OpenSTAT \u2014 2024 Census of Population');
  log(`source : ${SOURCE_PORTAL}`);
  log(`tables : ${TABLE_BARANGAY}`);
  log(`         ${TABLE_LGU}`);

  /* ---- 1. read the existing barangay dataset (the join key source) ---- */
  if (!fs.existsSync(BARANGAYS)) {
    throw new Error(`missing ${BARANGAYS} \u2014 run the barangay fetcher first`);
  }
  const base = JSON.parse(fs.readFileSync(BARANGAYS, 'utf8'));
  const lgus = Array.isArray(base.lgus) ? base.lgus : [];
  if (lgus.length !== EXPECTED_LGUS) {
    throw new Error(`expected ${EXPECTED_LGUS} LGUs in barangays.json, found ${lgus.length}`);
  }

  let brgyCount = 0;
  for (const l of lgus) brgyCount += l.barangays?.length ?? 0;
  if (brgyCount !== EXPECTED_BARANGAYS) {
    throw new Error(
      `expected ${EXPECTED_BARANGAYS} barangays in barangays.json, found ${brgyCount}`
    );
  }

  const lguCodeToName = new Map();
  const allGeoCodes = [PROVINCE_PSGC];
  for (const l of lgus) {
    const code = l.psgc_10digit || l.psgc_code;
    if (!code) throw new Error(`LGU ${l.name} has no PSGC code`);
    lguCodeToName.set(code, l.name);
    allGeoCodes.push(code);
    for (const b of l.barangays ?? []) {
      const bc = b.psgc_10digit || b.psgc_code;
      if (!bc) throw new Error(`barangay in ${l.name} has no PSGC code`);
      allGeoCodes.push(bc);
    }
  }
  const uniqueGeo = Array.from(new Set(allGeoCodes));
  info(
    `requesting ${uniqueGeo.length} geographies ` +
      `(1 province + ${lgus.length} LGUs + ${brgyCount} barangays)`
  );

  /* ---- 2. table A: 2024 population / households, barangay level ---- */
  const P_TOTAL_POP = '0';
  const P_HH_POP = '1';
  const P_HH_COUNT = '2';

  const tableA = await pxQuery(TABLE_BARANGAY, uniqueGeo, [P_TOTAL_POP, P_HH_POP, P_HH_COUNT]);
  ok(`table A returned ${tableA.size} cells`);
  await sleep(600);

  /* ---- 3. table B: LGU population history + land area + density ---- */
  const lguCodes = Array.from(lguCodeToName.keys());
  const B_PARAMS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const tableB = await pxQuery(TABLE_LGU, [PROVINCE_PSGC, ...lguCodes], B_PARAMS);
  ok(`table B returned ${tableB.size} cells`);
  await sleep(600);

  /* ---- 4. assemble ---- */
  const e = [];
  const at = (map, geo, param, what) => {
    const v = num(map.get(`${geo}|${param}`));
    if (v === null) e.push(`${what}: no value for ${geo} / param ${param}`);
    return v;
  };

  const provinceRow = {
    population_2015: at(tableB, PROVINCE_PSGC, '0', 'province 2015'),
    population_2020: at(tableB, PROVINCE_PSGC, '1', 'province 2020'),
    population_2024: at(tableB, PROVINCE_PSGC, '2', 'province 2024'),
    land_area_km2: at(tableB, PROVINCE_PSGC, '3', 'province land area'),
    density_2015: at(tableB, PROVINCE_PSGC, '4', 'province density 2015'),
    density_2020: at(tableB, PROVINCE_PSGC, '5', 'province density 2020'),
    density_2024: at(tableB, PROVINCE_PSGC, '6', 'province density 2024'),
    change_2015_2020: at(tableB, PROVINCE_PSGC, '7', 'province change 15-20'),
    change_2015_2024: at(tableB, PROVINCE_PSGC, '8', 'province change 15-24'),
    change_2020_2024: at(tableB, PROVINCE_PSGC, '9', 'province change 20-24'),
    household_population_2024: at(tableA, PROVINCE_PSGC, P_HH_POP, 'province HH pop'),
    households_2024: at(tableA, PROVINCE_PSGC, P_HH_COUNT, 'province households'),
  };

  const outLgus = [];
  for (const l of lgus) {
    const code = l.psgc_10digit || l.psgc_code;
    const rec = {
      name: l.name,
      official_name: l.official_name ?? l.name,
      type: l.type ?? null,
      is_capital: !!l.is_capital,
      psgc_code: l.psgc_code ?? null,
      psgc_10digit: code,
      barangay_count: l.barangays?.length ?? 0,
      population_2015: at(tableB, code, '0', `${l.name} 2015`),
      population_2020: at(tableB, code, '1', `${l.name} 2020`),
      population_2024: at(tableB, code, '2', `${l.name} 2024`),
      land_area_km2: at(tableB, code, '3', `${l.name} land area`),
      density_2015: at(tableB, code, '4', `${l.name} density 2015`),
      density_2020: at(tableB, code, '5', `${l.name} density 2020`),
      density_2024: at(tableB, code, '6', `${l.name} density 2024`),
      change_2015_2020: at(tableB, code, '7', `${l.name} change 15-20`),
      change_2015_2024: at(tableB, code, '8', `${l.name} change 15-24`),
      change_2020_2024: at(tableB, code, '9', `${l.name} change 20-24`),
      household_population_2024: at(tableA, code, P_HH_POP, `${l.name} HH pop`),
      households_2024: at(tableA, code, P_HH_COUNT, `${l.name} households`),
      barangays: [],
    };

    for (const b of l.barangays ?? []) {
      const bc = b.psgc_10digit || b.psgc_code;
      rec.barangays.push({
        psgc_code: b.psgc_code ?? null,
        psgc_10digit: bc,
        name: b.name,
        is_poblacion: !!b.is_poblacion,
        population_2015: b.population_2015 ?? null,
        population_2020: b.population_2020 ?? null,
        population_2024: at(tableA, bc, P_TOTAL_POP, `${l.name}/${b.name} 2024`),
        household_population_2024: at(tableA, bc, P_HH_POP, `${l.name}/${b.name} HH pop`),
        households_2024: at(tableA, bc, P_HH_COUNT, `${l.name}/${b.name} households`),
      });
    }
    outLgus.push(rec);
  }

  if (e.length) {
    fail(`${e.length} missing value(s):`);
    for (const m of e.slice(0, 20)) log(`      ${m}`);
    throw new Error('incomplete source data \u2014 refusing to write');
  }
  ok('every requested geography returned a value');

  /* ---- 5. gates ---- */
  const gates = {};

  // gate: barangay 2024 sums to LGU 2024
  let sumMismatch = 0;
  for (const l of outLgus) {
    const s = l.barangays.reduce((a, b) => a + (b.population_2024 ?? 0), 0);
    if (s !== l.population_2024) {
      sumMismatch++;
      fail(`${l.name}: barangay sum ${s} != LGU total ${l.population_2024}`);
    }
  }
  gates['barangay_population_sums_to_lgu_2024'] = sumMismatch === 0;
  if (sumMismatch === 0) ok('barangay 2024 population sums to LGU total (all 18)');

  // gate: barangay households sum to LGU households
  let hhMismatch = 0;
  for (const l of outLgus) {
    const s = l.barangays.reduce((a, b) => a + (b.households_2024 ?? 0), 0);
    if (s !== l.households_2024) {
      hhMismatch++;
      fail(`${l.name}: household sum ${s} != LGU ${l.households_2024}`);
    }
  }
  gates['barangay_households_sums_to_lgu_2024'] = hhMismatch === 0;
  if (hhMismatch === 0) ok('barangay households sum to LGU total (all 18)');

  // gate: LGU 2024 sums to province 2024
  const lguSum = outLgus.reduce((a, l) => a + l.population_2024, 0);
  gates['lgu_population_sums_to_province_2024'] = lguSum === provinceRow.population_2024;
  if (gates['lgu_population_sums_to_province_2024']) {
    ok(`LGU 2024 population sums to province (${lguSum.toLocaleString('en-US')})`);
  } else {
    fail(`LGU sum ${lguSum} != province ${provinceRow.population_2024}`);
  }

  // gate: PSA 2020 agrees with the existing verified barangays.json
  let pop2020Mismatch = 0;
  for (const l of outLgus) {
    const src = lgus.find((x) => (x.psgc_10digit || x.psgc_code) === l.psgc_10digit);
    if (src?.population_2020 != null && src.population_2020 !== l.population_2020) {
      pop2020Mismatch++;
      fail(`${l.name}: PSA 2020 ${l.population_2020} != barangays.json ${src.population_2020}`);
    }
  }
  gates['psa_2020_matches_barangays_json'] = pop2020Mismatch === 0;
  if (pop2020Mismatch === 0) ok('PSA 2020 total agrees with barangays.json (cross-source)');

  // gate: land area present
  gates['land_area_complete'] = outLgus.every((l) => l.land_area_km2 > 0);
  if (gates['land_area_complete']) ok('land area present for all 18 LGUs');

  // gate: density consistency (pop / area, within rounding)
  let densBad = 0;
  for (const l of outLgus) {
    const calc = Math.round(l.population_2024 / l.land_area_km2);
    if (Math.abs(calc - l.density_2024) > 2) {
      densBad++;
      fail(`${l.name}: density ${l.density_2024} vs computed ${calc}`);
    }
  }
  gates['density_consistent_with_population_and_area'] = densBad === 0;
  if (densBad === 0) ok('published density agrees with population / land area');

  const allPassed = Object.values(gates).every(Boolean);

  /* ---- 6. write ---- */
  const doc = {
    _schema_version: '1.0',
    _status: allPassed ? 'verified' : 'failed-validation',
    _source: `${SOURCE_PUBLISHER} \u2014 ${SOURCE_TITLE}`,
    _source_portal: SOURCE_PORTAL,
    _source_tables: {
      barangay_level: TABLE_BARANGAY,
      lgu_level: TABLE_LGU,
    },
    _source_api: API,
    _retrieved: new Date().toISOString().slice(0, 10),
    year: 2024,
    reference_date: REFERENCE_DATE,
    province: PROVINCE,
    region: REGION,
    province_psgc: PROVINCE_PSGC,
    lgu_count: outLgus.length,
    total_barangays: brgyCount,
    province_totals: provinceRow,
    lgus: outLgus,
    _validation: gates,
    _notes: [
      'Figures are official 2024 Census of Population counts published by the Philippine Statistics Authority via the OpenSTAT PxWeb API.',
      'Total population, household population and household counts are as of 01 July 2024.',
      'Land area is the Land Management Bureau (DENR) 2019 Masterlist of Land Areas of Cities and Municipalities and Barangays, as republished by PSA; it is not remeasured each census.',
      'population_2015 and population_2020 are PSA census counts for the same geographies, provided for trend comparison.',
      "Row-level cross-checks pass: barangay counts sum exactly to their LGU totals, LGU counts sum exactly to the province total, and PSA's 2020 figures match the independently sourced data/barangays.json.",
      'Density is published by PSA and is reproduced as published; it is also re-derived from population / land area during validation.',
    ],
  };

  if (!allPassed) {
    throw new Error('one or more validation gates failed \u2014 refusing to write');
  }

  if (DRY_RUN) {
    info('dry run \u2014 all gates passed, nothing written');
    return;
  }

  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  const bytes = fs.statSync(OUT).size;
  info(`wrote ${path.relative(ROOT, OUT)} (${(bytes / 1024).toFixed(1)} KB)`);
  log(`  LGUs .......... ${outLgus.length}`);
  log(`  barangays ..... ${brgyCount}`);
  log(`  province 2024 . ${provinceRow.population_2024.toLocaleString('en-US')}`);
  log(`  province 2020 . ${provinceRow.population_2020.toLocaleString('en-US')}`);
  log(`  land area ..... ${provinceRow.land_area_km2.toLocaleString('en-US')} km\u00B2`);
  if (VERBOSE) {
    log('\n  LGU            2015        2020        2024       km\u00B2    dens');
    for (const l of outLgus) {
      log(
        `  ${l.name.padEnd(16)}` +
          `${String(l.population_2015).padStart(9)}` +
          `${String(l.population_2020).padStart(12)}` +
          `${String(l.population_2024).padStart(12)}` +
          `${String(l.land_area_km2).padStart(10)}` +
          `${String(l.density_2024).padStart(8)}`
      );
    }
  }
  log('\nDone.');
}

main().catch((e) => {
  console.error(`\nFAILED: ${e.message}`);
  process.exit(1);
});
