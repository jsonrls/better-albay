/**
 * scripts/sync-psa-statistics.mjs
 * ---------------------------------------------------------------------------
 * Connects to the Philippine Statistics Explorer API / MCP endpoint
 * (https://statistics.bettergov.ph/mcp) and extracts verified primary
 * statistical data for Albay Province from PSA OpenSTAT and PSGC mirrors.
 *
 * Generated artifacts in data/:
 *   - data/poverty_statistics.json
 *   - data/economic_accounts.json
 *   - data/cpi_inflation.json
 *   - data/agriculture_palay.json
 *
 * Usage:
 *   node scripts/sync-psa-statistics.mjs
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '../data');

const MCP_ENDPOINT = 'https://statistics.bettergov.ph/mcp';

async function mcpCall(toolName, args) {
  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    })
  });

  if (!res.ok) {
    throw new Error(`MCP request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.error) {
    throw new Error(`MCP Error ${json.error.code}: ${json.error.message}`);
  }

  const content = json.result?.content?.[0]?.text;
  if (!content) {
    throw new Error(`No content returned from tool ${toolName}`);
  }

  return JSON.parse(content);
}

// ---------------------------------------------------------------------------
// 1. Sync Poverty Statistics
// ---------------------------------------------------------------------------
async function syncPoverty() {
  console.log('Fetching Poverty Statistics (Tables 1, 2, 11)...');

  // Table 1: Family Poverty Threshold and Incidence
  const ds1Meta = (await mcpCall('get_dataset', { id: 'd4aac603f5dc8c5cdb21' })).data;
  const ds1Query = await mcpCall('query_dataset', {
    id: 'd4aac603f5dc8c5cdb21',
    release: ds1Meta.release,
    selection: {
      'Geolocation': ['45'], // Albay
      'Threshold/Incidence/Measures of Precision': ['0', '1', '2', '3', '4', '5'],
      'Year': ['0', '1', '2'] // 2018, 2021, 2023
    }
  });

  // Table 2: Population Poverty Incidence
  const ds2Meta = (await mcpCall('get_dataset', { id: 'b4a71a27b4e4189c79a8' })).data;
  const ds2Query = await mcpCall('query_dataset', {
    id: 'b4a71a27b4e4189c79a8',
    release: ds2Meta.release,
    selection: {
      'Geolocation': ['45'],
      'Parameters': ['1'], // Poverty Incidence among Population (%)
      'Year': ['0', '1', '2']
    }
  });

  // Table 11: Poverty Gap
  const dsGapMeta = (await mcpCall('get_dataset', { id: '6584f8211247efc26f85' })).data;
  const dsGapQuery = await mcpCall('query_dataset', {
    id: '6584f8211247efc26f85',
    release: dsGapMeta.release,
    selection: {
      'Geolocation': ['45'],
      'Estimates/Measures of Precision': ['0'],
      'Year': ['0', '1', '2']
    }
  });

  const years = ['2018', '2021', '2023'];
  const records = {};

  years.forEach((yr) => {
    records[yr] = {
      year: parseInt(yr, 10),
      per_capita_threshold_php: null,
      family_incidence_pct: null,
      family_incidence_cv: null,
      family_incidence_se: null,
      family_incidence_ci95_lower: null,
      family_incidence_ci95_upper: null,
      population_incidence_pct: null,
      poverty_gap_pct: null
    };
  });

  for (const row of ds1Query.data.rows) {
    const yr = row.labels[2];
    const metricCode = row.codes[1];
    if (!records[yr]) continue;
    if (metricCode === '0') records[yr].per_capita_threshold_php = row.value;
    else if (metricCode === '1') records[yr].family_incidence_pct = row.value;
    else if (metricCode === '2') records[yr].family_incidence_cv = row.value;
    else if (metricCode === '3') records[yr].family_incidence_se = row.value;
    else if (metricCode === '4') records[yr].family_incidence_ci95_lower = row.value;
    else if (metricCode === '5') records[yr].family_incidence_ci95_upper = row.value;
  }

  for (const row of ds2Query.data.rows) {
    const yr = row.labels[2];
    if (records[yr]) records[yr].population_incidence_pct = row.value;
  }

  for (const row of dsGapQuery.data.rows) {
    const yr = row.labels[2];
    if (records[yr]) records[yr].poverty_gap_pct = row.value;
  }

  const output = {
    _schema_version: '1.0',
    _status: 'verified',
    _source: 'Philippine Statistics Authority (PSA) via Statistics Explorer API',
    _source_url: ds1Meta.source,
    province: 'Albay',
    psgc_code: '0500500000',
    latest_year: 2023,
    records: Object.values(records),
    summary: {
      threshold_2023_php: records['2023'].per_capita_threshold_php,
      family_incidence_2023_pct: records['2023'].family_incidence_pct,
      family_incidence_change_2021_2023: +(records['2023'].family_incidence_pct - records['2021'].family_incidence_pct).toFixed(2),
      population_incidence_2023_pct: records['2023'].population_incidence_pct,
      poverty_gap_2023_pct: records['2023'].poverty_gap_pct
    },
    provenance: [
      {
        dataset_id: 'd4aac603f5dc8c5cdb21',
        title: ds1Meta.title,
        release: ds1Meta.release,
        source: ds1Meta.source
      },
      {
        dataset_id: 'b4a71a27b4e4189c79a8',
        title: ds2Meta.title,
        release: ds2Meta.release,
        source: ds2Meta.source
      },
      {
        dataset_id: '6584f8211247efc26f85',
        title: dsGapMeta.title,
        release: dsGapMeta.release,
        source: dsGapMeta.source
      }
    ],
    updated_at: new Date().toISOString()
  };

  const path = resolve(DATA_DIR, 'poverty_statistics.json');
  writeFileSync(path, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Saved ${path}`);
  return output;
}

// ---------------------------------------------------------------------------
// 2. Sync Economic Accounts (Gross Provincial Domestic Product)
// ---------------------------------------------------------------------------
async function syncEconomicAccounts() {
  console.log('Fetching Economic Accounts (PPA - GPDP and Industry breakdown)...');

  const gdpMeta = (await mcpCall('get_dataset', { id: '85c06b8cbf6e6cdee6f6' })).data;
  const gdpQuery = await mcpCall('query_dataset', {
    id: '85c06b8cbf6e6cdee6f6',
    release: gdpMeta.release,
    selection: {
      'Geolocation': ['62'], // Albay
      'Type of Valuation': ['0', '1'], // 0 = Current Prices, 1 = Constant 2018 Prices
      'Year': ['0', '1', '2', '3', '4', '5', '6', '7'] // 2018 to 2025
    }
  });

  const years = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
  const annual = {};
  years.forEach((yr) => {
    annual[yr] = {
      year: parseInt(yr, 10),
      current_prices_thousand_php: null,
      current_prices_billion_php: null,
      constant_2018_prices_thousand_php: null,
      constant_2018_prices_billion_php: null,
      real_growth_rate_pct: null
    };
  });

  for (const row of gdpQuery.data.rows) {
    const yr = row.labels[2];
    const valCode = row.codes[1];
    if (!annual[yr]) continue;
    if (valCode === '0') {
      annual[yr].current_prices_thousand_php = row.value;
      annual[yr].current_prices_billion_php = +(row.value / 1e6).toFixed(2);
    } else if (valCode === '1') {
      annual[yr].constant_2018_prices_thousand_php = row.value;
      annual[yr].constant_2018_prices_billion_php = +(row.value / 1e6).toFixed(2);
    }
  }

  // Calculate real growth rate based on constant 2018 prices
  years.forEach((yr, idx) => {
    if (idx === 0) {
      annual[yr].real_growth_rate_pct = null;
    } else {
      const prevYr = years[idx - 1];
      const prevVal = annual[prevYr].constant_2018_prices_thousand_php;
      const currVal = annual[yr].constant_2018_prices_thousand_php;
      if (prevVal && currVal) {
        annual[yr].real_growth_rate_pct = +(((currVal - prevVal) / prevVal) * 100).toFixed(2);
      }
    }
  });

  // Industry Breakdown (2025 Constant 2018 Prices)
  const indMeta = (await mcpCall('get_dataset', { id: '2097de6633f1a5da204e' })).data;
  const indQuery = await mcpCall('query_dataset', {
    id: '2097de6633f1a5da204e',
    release: indMeta.release,
    selection: {
      'Sector': ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15'],
      'Geolocation': ['62'],
      'Type of Valuation': ['1'], // Constant 2018 Prices
      'Year': ['7'] // 2025
    }
  });

  const total2025Constant = annual['2025'].constant_2018_prices_thousand_php || 1;
  const sectors2025 = indQuery.data.rows.map((r) => {
    const valThousand = r.value;
    const share = +((valThousand / total2025Constant) * 100).toFixed(2);
    return {
      sector_code: r.codes[0],
      sector_name: r.labels[0],
      constant_2018_prices_thousand_php: valThousand,
      constant_2018_prices_billion_php: +(valThousand / 1e6).toFixed(2),
      share_pct: share
    };
  }).sort((a, b) => b.constant_2018_prices_thousand_php - a.constant_2018_prices_thousand_php);

  // Group into macro sectors (AFF, Industry, Services)
  // Industry codes: 1 (Mining), 2 (Manufacturing), 3 (Electricity/Water), 4 (Construction)
  // AFF code: 0 (Agriculture, Forestry, Fishing)
  // Services: 5 to 15
  let affTotal = 0;
  let industryTotal = 0;
  let servicesTotal = 0;

  sectors2025.forEach((s) => {
    const c = parseInt(s.sector_code, 10);
    if (c === 0) affTotal += s.constant_2018_prices_thousand_php;
    else if (c >= 1 && c <= 4) industryTotal += s.constant_2018_prices_thousand_php;
    else servicesTotal += s.constant_2018_prices_thousand_php;
  });

  const macroSectors = [
    {
      macro_sector: 'Services',
      billion_php: +(servicesTotal / 1e6).toFixed(2),
      share_pct: +((servicesTotal / total2025Constant) * 100).toFixed(1)
    },
    {
      macro_sector: 'Industry',
      billion_php: +(industryTotal / 1e6).toFixed(2),
      share_pct: +((industryTotal / total2025Constant) * 100).toFixed(1)
    },
    {
      macro_sector: 'Agriculture, Forestry, and Fishing',
      billion_php: +(affTotal / 1e6).toFixed(2),
      share_pct: +((affTotal / total2025Constant) * 100).toFixed(1)
    }
  ];

  const output = {
    _schema_version: '1.0',
    _status: 'verified',
    _source: 'Philippine Statistics Authority (PSA) — Provincial Product Accounts (PPA)',
    _source_url: gdpMeta.source,
    province: 'Albay',
    psgc_code: '0500500000',
    latest_year: 2025,
    summary: {
      gpdp_current_2025_billion_php: annual['2025'].current_prices_billion_php,
      gpdp_constant_2025_billion_php: annual['2025'].constant_2018_prices_billion_php,
      real_growth_2025_pct: annual['2025'].real_growth_rate_pct,
      top_sector: sectors2025[0].sector_name
    },
    macro_sectors_2025: macroSectors,
    annual_series: Object.values(annual),
    sectors_2025: sectors2025,
    provenance: [
      {
        dataset_id: '85c06b8cbf6e6cdee6f6',
        title: gdpMeta.title,
        release: gdpMeta.release,
        source: gdpMeta.source
      },
      {
        dataset_id: '2097de6633f1a5da204e',
        title: indMeta.title,
        release: indMeta.release,
        source: indMeta.source
      }
    ],
    updated_at: new Date().toISOString()
  };

  const path = resolve(DATA_DIR, 'economic_accounts.json');
  writeFileSync(path, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Saved ${path}`);
  return output;
}

// ---------------------------------------------------------------------------
// 3. Sync Consumer Price Index & Inflation
// ---------------------------------------------------------------------------
async function syncCPI() {
  console.log('Fetching Consumer Price Index (Albay)...');

  const cpiMeta = (await mcpCall('get_dataset', { id: '4e9a668dd28bc2207b05' })).data;

  // Annual averages 2018 to 2025
  const annualQuery = await mcpCall('query_dataset', {
    id: '4e9a668dd28bc2207b05',
    release: cpiMeta.release,
    selection: {
      'Geolocation': ['47'], // Albay
      'Commodity Description': ['0'], // 0 - ALL ITEMS
      'Year': ['0', '1', '2', '3', '4', '5', '6', '7'],
      'Period': ['12'] // Annual Average
    }
  });

  const annualSeries = annualQuery.data.rows.map((r) => ({
    year: parseInt(r.labels[2], 10),
    cpi: r.value ? +r.value.toFixed(2) : null
  }));

  // 2026 Monthly Series (Jan - Aug)
  const monthlyQuery = await mcpCall('query_dataset', {
    id: '4e9a668dd28bc2207b05',
    release: cpiMeta.release,
    selection: {
      'Geolocation': ['47'],
      'Commodity Description': ['0'],
      'Year': ['8'], // 2026
      'Period': ['0', '1', '2', '3', '4', '5', '6', '7'] // Jan to Aug
    }
  });

  const monthly2026 = monthlyQuery.data.rows.map((r) => ({
    month: r.labels[3],
    cpi: r.value ? +r.value.toFixed(2) : null
  }));

  const latestMonth = monthly2026[monthly2026.length - 1];

  const output = {
    _schema_version: '1.0',
    _status: 'verified',
    _source: 'Philippine Statistics Authority (PSA) — Price Statistics',
    _source_url: cpiMeta.source,
    province: 'Albay',
    base_year: '2018=100',
    latest_cpi: {
      year: 2026,
      month: latestMonth.month,
      value: latestMonth.cpi
    },
    annual_series: annualSeries,
    monthly_2026_series: monthly2026,
    provenance: [
      {
        dataset_id: '4e9a668dd28bc2207b05',
        title: cpiMeta.title,
        release: cpiMeta.release,
        source: cpiMeta.source
      }
    ],
    updated_at: new Date().toISOString()
  };

  const path = resolve(DATA_DIR, 'cpi_inflation.json');
  writeFileSync(path, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Saved ${path}`);
  return output;
}

// ---------------------------------------------------------------------------
// 4. Sync Palay & Agricultural Production
// ---------------------------------------------------------------------------
async function syncAgriculture() {
  console.log('Fetching Palay Production & Area Harvested (Albay)...');

  const volMeta = (await mcpCall('get_dataset', { id: '9b78cb1fa95ae59f78d4' })).data;
  const areaMeta = (await mcpCall('get_dataset', { id: 'c22ae91fc7712bbf0d5f' })).data;

  // Recent years: 2018 (31) to 2025 (38)
  const yearCodes = ['31', '32', '33', '34', '35', '36', '37', '38'];

  const volQuery = await mcpCall('query_dataset', {
    id: '9b78cb1fa95ae59f78d4',
    release: volMeta.release,
    selection: {
      'Ecosystem/Croptype': ['0', '1', '2'], // Irrigated, Rainfed, Total
      'Geolocation': ['41'], // Albay
      'Year': yearCodes,
      'Period': ['6'] // Annual
    }
  });

  const areaQuery = await mcpCall('query_dataset', {
    id: 'c22ae91fc7712bbf0d5f',
    release: areaMeta.release,
    selection: {
      'Ecosystem/Croptype': ['0', '1', '2'],
      'Geolocation': ['41'],
      'Year': yearCodes,
      'Period': ['6']
    }
  });

  const years = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
  const dataMap = {};
  years.forEach((yr) => {
    dataMap[yr] = {
      year: parseInt(yr, 10),
      volume_total_mt: null,
      volume_irrigated_mt: null,
      volume_rainfed_mt: null,
      area_total_ha: null,
      area_irrigated_ha: null,
      area_rainfed_ha: null,
      yield_mt_per_ha: null
    };
  });

  for (const row of volQuery.data.rows) {
    const yr = row.labels[2];
    const cropCode = row.codes[0];
    if (!dataMap[yr]) continue;
    if (cropCode === '2') dataMap[yr].volume_total_mt = row.value;
    else if (cropCode === '0') dataMap[yr].volume_irrigated_mt = row.value;
    else if (cropCode === '1') dataMap[yr].volume_rainfed_mt = row.value;
  }

  for (const row of areaQuery.data.rows) {
    const yr = row.labels[2];
    const cropCode = row.codes[0];
    if (!dataMap[yr]) continue;
    if (cropCode === '2') dataMap[yr].area_total_ha = row.value;
    else if (cropCode === '0') dataMap[yr].area_irrigated_ha = row.value;
    else if (cropCode === '1') dataMap[yr].area_rainfed_ha = row.value;
  }

  // Calculate yield
  years.forEach((yr) => {
    const rec = dataMap[yr];
    if (rec.volume_total_mt && rec.area_total_ha) {
      rec.yield_mt_per_ha = +(rec.volume_total_mt / rec.area_total_ha).toFixed(2);
    }
  });

  const latest2025 = dataMap['2025'];

  const output = {
    _schema_version: '1.0',
    _status: 'verified',
    _source: 'Philippine Statistics Authority (PSA) — Crops Statistics',
    _source_url: volMeta.source,
    province: 'Albay',
    crop: 'Palay (Rice)',
    latest_year: 2025,
    summary: {
      volume_2025_mt: latest2025.volume_total_mt,
      area_2025_ha: latest2025.area_total_ha,
      yield_2025_mt_per_ha: latest2025.yield_mt_per_ha
    },
    annual_series: Object.values(dataMap),
    provenance: [
      {
        dataset_id: '9b78cb1fa95ae59f78d4',
        title: volMeta.title,
        release: volMeta.release,
        source: volMeta.source
      },
      {
        dataset_id: 'c22ae91fc7712bbf0d5f',
        title: areaMeta.title,
        release: areaMeta.release,
        source: areaMeta.source
      }
    ],
    updated_at: new Date().toISOString()
  };

  const path = resolve(DATA_DIR, 'agriculture_palay.json');
  writeFileSync(path, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Saved ${path}`);
  return output;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Starting PSA OpenSTAT Sync for Albay Province ===\n');
  try {
    await syncPoverty();
    await syncEconomicAccounts();
    await syncCPI();
    await syncAgriculture();
    console.log('\n=== All datasets successfully ingested into data/ ===');
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

main();
