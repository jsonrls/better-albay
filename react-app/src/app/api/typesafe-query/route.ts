import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface ChoiceClassification {
  choice: string;
  confidence: number;
  probabilities?: Record<string, number>;
  model?: string;
}

function loadDataset(filename: string): any {
  try {
    // Look in root data/ directory
    const rootDataPath = path.resolve(process.cwd(), '..', 'data', filename);
    if (fs.existsSync(rootDataPath)) {
      return JSON.parse(fs.readFileSync(rootDataPath, 'utf-8'));
    }
    const localDataPath = path.resolve(process.cwd(), 'data', filename);
    if (fs.existsSync(localDataPath)) {
      return JSON.parse(fs.readFileSync(localDataPath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Failed to load dataset ${filename}:`, err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    const queryText = (query || '').trim();

    if (!queryText) {
      return NextResponse.json({ success: false, error: 'Query cannot be empty.' }, { status: 400 });
    }

    const apiKey = process.env.TYPESAFE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'TypeSafe API key not configured on server.' },
        { status: 500 }
      );
    }

    const typeSafeRes = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: queryText,
        model: 'jev-latest',
        questions: {
          indicator: {
            type: 'choice',
            instructions:
              'Determine which Albay provincial statistical indicator the user query is asking about. If the inquiry is not about Albay government statistics, choose unknown.',
            criteria: {
              poverty_threshold:
                'Minimum income needed for an individual or family to meet basic food and non-food needs (poverty line, monthly/annual threshold).',
              poverty_incidence:
                'Percentage or proportion of families or individuals living below the poverty threshold, poverty rate, or poverty gap.',
              economic_gpdp:
                'Gross Provincial Domestic Product (GPDP), overall size of the Albay economy, economic growth rate, or economic sectors/industries.',
              inflation_cpi:
                'Consumer Price Index (CPI), inflation rate, price level of consumer goods, or purchasing power.',
              agriculture_palay:
                'Rice or palay agricultural harvest, crop production volume in metric tons, harvest area, or palay yield.',
              demographics_population:
                'Census population count, number of residents, private households, land area, or population density in Albay.',
              competitiveness_cmci:
                'Cities and Municipalities Competitiveness Index (CMCI), LGU rankings, economic dynamism, government efficiency, or resilience.',
              unknown:
                'Inquiry is not about Albay statistical indicators, or is completely unrelated.',
            },
          },
        },
      }),
    });

    if (!typeSafeRes.ok) {
      const errText = await typeSafeRes.text();
      return NextResponse.json(
        { success: false, error: `TypeSafe API error: ${typeSafeRes.status} ${errText}` },
        { status: 502 }
      );
    }

    const tsData = await typeSafeRes.json();
    const classification: ChoiceClassification = tsData.answers?.indicator || {
      choice: 'unknown',
      confidence: 0,
    };

    const choice = classification.choice;
    const confidence = classification.confidence;

    if (choice === 'unknown' || confidence < 0.5) {
      return NextResponse.json({
        success: true,
        matched: false,
        query: queryText,
        choice: 'unknown',
        confidence,
        message:
          'I could not find a verified Albay government dataset matching this specific question. You can ask about poverty threshold, GPDP, CPI/inflation, rice production, demographics, or competitiveness.',
        suggested_queries: [
          'Pira an poverty threshold sa Albay?',
          'Magkano ang Gross Provincial Domestic Product (GPDP) ng Albay?',
          'What is the latest inflation rate or CPI in Albay?',
          'Pira an bilog na populasyon kan Albay?',
          'How much palay was produced in Albay?',
        ],
      });
    }

    // Format based on choice
    let resultPayload = null;
    if (choice === 'poverty_threshold') {
      const pov = loadDataset('poverty_statistics.json');
      if (pov && pov.records?.length) {
        const latest = pov.records[pov.records.length - 1];
        const perCapitaAnnual = latest.per_capita_threshold_php;
        const perCapitaMonthly = Math.round(perCapitaAnnual / 12);
        const family5Monthly = Math.round((perCapitaAnnual * 5) / 12);
        resultPayload = {
          indicator: 'poverty_threshold',
          title: `Albay Poverty Threshold (${latest.year})`,
          headline: `₱${perCapitaAnnual.toLocaleString('en-PH', { minimumFractionDigits: 2 })} / capita per year`,
          secondary_headline: `₱${perCapitaMonthly.toLocaleString('en-PH')} / month per individual (approx. ₱${family5Monthly.toLocaleString('en-PH')} / month for a family of 5)`,
          summary: `According to the official Philippine Statistics Authority (PSA) Full-Year Poverty Statistics, a resident of Albay needed at least ₱${perCapitaAnnual.toLocaleString('en-PH', { minimumFractionDigits: 2 })} per year (₱${perCapitaMonthly.toLocaleString('en-PH')}/month) in ${latest.year} to meet basic food and non-food necessities.`,
          metrics: [
            { label: 'Per Capita (Annual)', value: `₱${perCapitaAnnual.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` },
            { label: 'Per Capita (Monthly)', value: `₱${perCapitaMonthly.toLocaleString('en-PH')}` },
            { label: 'Family of 5 (Monthly)', value: `₱${family5Monthly.toLocaleString('en-PH')}` },
          ],
          source: 'Philippine Statistics Authority (PSA) — Full-Year Poverty Statistics',
          source_url: pov._source_url || 'https://psa.gov.ph/statistics/poverty',
          section_anchor: 'stats-poverty',
          section_name: 'Poverty Statistics',
        };
      }
    } else if (choice === 'poverty_incidence') {
      const pov = loadDataset('poverty_statistics.json');
      if (pov && pov.records?.length) {
        const latest = pov.records[pov.records.length - 1];
        resultPayload = {
          indicator: 'poverty_incidence',
          title: `Albay Poverty Incidence (${latest.year})`,
          headline: `${latest.family_incidence_pct.toFixed(1)}% among families`,
          secondary_headline: `${latest.population_incidence_pct.toFixed(1)}% among the total Albay population`,
          summary: `In ${latest.year}, an estimated ${latest.family_incidence_pct.toFixed(1)}% of families in Albay lived below the official poverty threshold.`,
          metrics: [
            { label: 'Family Poverty Rate', value: `${latest.family_incidence_pct.toFixed(1)}%` },
            { label: 'Population Poverty Rate', value: `${latest.population_incidence_pct.toFixed(1)}%` },
            { label: 'Poverty Gap Ratio', value: `${latest.poverty_gap_pct?.toFixed(2) || '--'}%` },
          ],
          source: 'Philippine Statistics Authority (PSA) — Full-Year Poverty Statistics',
          source_url: pov._source_url || 'https://psa.gov.ph/statistics/poverty',
          section_anchor: 'stats-poverty',
          section_name: 'Poverty Statistics',
        };
      }
    } else if (choice === 'economic_gpdp') {
      const econ = loadDataset('economic_accounts.json');
      if (econ) {
        const s = econ.summary || {};
        resultPayload = {
          indicator: 'economic_gpdp',
          title: `Albay Gross Provincial Domestic Product (${econ.latest_year || 2025})`,
          headline: `₱${s.gpdp_current_2025_billion_php?.toFixed(2) || '200.95'} Billion`,
          secondary_headline: `₱${s.gpdp_constant_2025_billion_php?.toFixed(2) || '164.23'} Billion in real terms (growth: +${s.real_growth_2025_pct?.toFixed(1) || '1.1'}%)`,
          summary: `The total economic output (GPDP) of Albay reached ₱${s.gpdp_current_2025_billion_php?.toFixed(2) || '200.95'} Billion at current prices in ${econ.latest_year || 2025}.`,
          metrics: [
            { label: 'GPDP Current', value: `₱${s.gpdp_current_2025_billion_php?.toFixed(2) || '200.95'}B` },
            { label: 'GPDP Constant', value: `₱${s.gpdp_constant_2025_billion_php?.toFixed(2) || '164.23'}B` },
            { label: 'Real Growth', value: `+${s.real_growth_2025_pct?.toFixed(1) || '1.1'}%` },
          ],
          source: 'Philippine Statistics Authority (PSA) — Provincial Product Accounts',
          source_url: econ._source_url || 'https://openstat.psa.gov.ph/',
          section_anchor: 'stats-economy',
          section_name: 'Economic Indicators',
        };
      }
    } else if (choice === 'inflation_cpi') {
      const cpi = loadDataset('cpi_inflation.json');
      if (cpi) {
        const lat = cpi.latest_cpi || { value: 143.1, month: 'Aug', year: 2026 };
        resultPayload = {
          indicator: 'inflation_cpi',
          title: `Albay Consumer Price Index (${lat.month} ${lat.year})`,
          headline: `CPI: ${lat.value?.toFixed(1)} (Base 2018 = 100)`,
          secondary_headline: `Latest monthly figure recorded in Albay Province for ${lat.month} ${lat.year}`,
          summary: `According to PSA price monitoring data, Albay's Consumer Price Index (CPI) stood at ${lat.value?.toFixed(1)} in ${lat.month} ${lat.year}.`,
          metrics: [
            { label: 'Latest CPI Value', value: `${lat.value?.toFixed(1)}` },
            { label: 'Reference Period', value: `${lat.month} ${lat.year}` },
          ],
          source: 'Philippine Statistics Authority (PSA) — OpenSTAT CPI Series',
          source_url: cpi._source_url || 'https://openstat.psa.gov.ph/',
          section_anchor: 'stats-economy',
          section_name: 'Economic Indicators',
        };
      }
    } else if (choice === 'agriculture_palay') {
      const agri = loadDataset('agriculture_palay.json');
      if (agri) {
        const s = agri.summary || {};
        resultPayload = {
          indicator: 'agriculture_palay',
          title: `Albay Palay / Rice Production (${agri.latest_year || 2025})`,
          headline: `${Math.round(s.volume_2025_mt || 210955).toLocaleString('en-PH')} Metric Tons`,
          secondary_headline: `Harvested across ${Math.round(s.area_2025_ha || 52482).toLocaleString('en-PH')} hectares (yield: ${s.yield_2025_mt_per_ha?.toFixed(2) || '4.02'} MT/ha)`,
          summary: `In ${agri.latest_year || 2025}, Albay agricultural production yielded ${Math.round(s.volume_2025_mt || 210955).toLocaleString('en-PH')} metric tons of palay.`,
          metrics: [
            { label: 'Annual Production', value: `${Math.round(s.volume_2025_mt || 210955).toLocaleString('en-PH')} MT` },
            { label: 'Harvested Area', value: `${Math.round(s.area_2025_ha || 52482).toLocaleString('en-PH')} ha` },
            { label: 'Average Yield', value: `${s.yield_2025_mt_per_ha?.toFixed(2) || '4.02'} MT/ha` },
          ],
          source: 'Philippine Statistics Authority (PSA) — Crops Production Survey',
          source_url: agri._source_url || 'https://openstat.psa.gov.ph/',
          section_anchor: 'stats-economy',
          section_name: 'Economic Indicators',
        };
      }
    } else if (choice === 'demographics_population') {
      const pop = loadDataset('population_2024.json');
      if (pop) {
        const t = pop.province_totals || {};
        resultPayload = {
          indicator: 'demographics_population',
          title: 'Albay Demographics & Census (2024)',
          headline: `${t.population_2024?.toLocaleString('en-PH') || '1,379,398'} Residents`,
          secondary_headline: `${t.households_2024?.toLocaleString('en-PH') || '339,427'} private households across 18 LGUs and 720 barangays`,
          summary: `According to the 2024 Census of Population, Albay has an official count of ${t.population_2024?.toLocaleString('en-PH') || '1,379,398'} residents.`,
          metrics: [
            { label: '2024 Population', value: `${t.population_2024?.toLocaleString('en-PH') || '1,379,398'}` },
            { label: 'Households', value: `${t.households_2024?.toLocaleString('en-PH') || '339,427'}` },
            { label: 'Density', value: `${t.density_2024 || '549'} / km²` },
          ],
          source: 'Philippine Statistics Authority (PSA) — 2024 Census of Population',
          source_url: 'https://openstat.psa.gov.ph/',
          section_anchor: 'stats-metrics',
          section_name: 'Demographics Overview',
        };
      }
    } else if (choice === 'competitiveness_cmci') {
      const cmci = loadDataset('cmci_2024.json');
      if (cmci) {
        resultPayload = {
          indicator: 'competitiveness_cmci',
          title: `Albay LGU Competitiveness Index (${cmci.year || 2024})`,
          headline: 'Top Performer: Legazpi City (50.46 pts)',
          secondary_headline: '18 LGUs evaluated across 5 pillars by DTI',
          summary: 'In the 2024 CMCI, Legazpi City ranked highest overall among Albay LGUs.',
          metrics: [
            { label: 'Rank 1 LGU', value: 'Legazpi City (50.46)' },
            { label: 'Rank 2 LGU', value: 'Ligao City (40.63)' },
            { label: 'Rank 3 LGU', value: 'Tabaco City (38.50)' },
          ],
          source: 'Department of Trade and Industry (DTI) — CMCI',
          source_url: cmci._source_url || 'https://cmci.dti.gov.ph/',
          section_anchor: 'competitive-index',
          section_name: 'Competitiveness Index',
        };
      }
    }

    return NextResponse.json({
      success: true,
      matched: true,
      query: queryText,
      choice,
      confidence,
      model: classification.model || 'jev-latest',
      result: resultPayload,
    });
  } catch (error: any) {
    console.error('TypeSafe Route Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
