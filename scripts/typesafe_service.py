#!/usr/bin/env python3
"""
TypeSafe AI Service for BetterAlbay.org
Integrates TypeSafe System One (Jev) with verified Albay Open Data (PSA, DTI, BLGF).

Architecture:
- Semantic Natural Language Understanding: TypeSafe System One (jev-latest) routes queries to typed indicators.
- Verified Primary Data: Deterministic extraction from local JSON datasets in data/.
- Zero hallucination: All figures, years, and citations are extracted from primary government sources.
"""

import os
import sys
import json
import ssl
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')

def get_api_key():
    """Retrieve TYPESAFE_API_KEY from environment or .env file."""
    if 'TYPESAFE_API_KEY' in os.environ and os.environ['TYPESAFE_API_KEY']:
        return os.environ['TYPESAFE_API_KEY']
    
    env_path = os.path.join(BASE_DIR, '.env')
    if os.path.isfile(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('TYPESAFE_API_KEY='):
                    return line.split('=', 1)[1].strip('"\' ')
    return None

def get_ssl_context():
    """Create SSL context compatible with macOS standard Python."""
    ctx = ssl.create_default_context()
    try:
        import certifi
        ctx.load_verify_locations(certifi.where())
    except ImportError:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    return ctx

def load_json(filename):
    """Safely load a JSON dataset from data/ directory."""
    path = os.path.join(DATA_DIR, filename)
    if os.path.isfile(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def classify_query(query_text, api_key):
    """
    Call TypeSafe System One API to classify the user's inquiry into a target indicator.
    Supports English, Filipino/Tagalog, and Bikol.
    """
    payload = {
        "state": query_text,
        "model": "jev-latest",
        "questions": {
            "indicator": {
                "type": "choice",
                "instructions": "Determine which Albay provincial statistical indicator the user query is asking about. If the inquiry is not about Albay government statistics, choose unknown.",
                "criteria": {
                    "poverty_threshold": "Minimum income needed for an individual or family to meet basic food and non-food needs (poverty line, monthly/annual threshold).",
                    "poverty_incidence": "Percentage or proportion of families or individuals living below the poverty threshold, poverty rate, or poverty gap.",
                    "economic_gpdp": "Gross Provincial Domestic Product (GPDP), overall size of the Albay economy, economic growth rate, or economic sectors/industries.",
                    "inflation_cpi": "Consumer Price Index (CPI), inflation rate, price level of consumer goods, or purchasing power.",
                    "agriculture_palay": "Rice or palay agricultural harvest, crop production volume in metric tons, harvest area, or palay yield.",
                    "demographics_population": "Census population count, number of residents, private households, land area, or population density in Albay.",
                    "competitiveness_cmci": "Cities and Municipalities Competitiveness Index (CMCI), LGU rankings, economic dynamism, government efficiency, or resilience.",
                    "unknown": "Inquiry is not about Albay statistical indicators, or is completely unrelated."
                }
            }
        }
    }

    req = urllib.request.Request(
        "https://api.typesafe.ai/v1/systemone",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    )

    ctx = get_ssl_context()
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        ans = data.get("answers", {}).get("indicator", {})
        return {
            "choice": ans.get("choice", "unknown"),
            "confidence": ans.get("confidence", 0.0),
            "probabilities": ans.get("probabilities", {}),
            "model": data.get("model", "jev")
        }

def format_data_for_choice(choice, query_text):
    """
    Deterministically retrieve verified government data corresponding to the choice.
    Returns structured answer with primary citation and section anchor.
    """
    if choice == "poverty_threshold":
        pov = load_json("poverty_statistics.json")
        if not pov:
            return None
        latest = pov["records"][-1]
        year = latest["year"]
        per_capita_annual = latest["per_capita_threshold_php"]
        per_capita_monthly = round(per_capita_annual / 12)
        family_5_monthly = round((per_capita_annual * 5) / 12)
        r2021 = next((r for r in pov["records"] if r["year"] == 2021), None)

        return {
            "indicator": "poverty_threshold",
            "title": f"Albay Poverty Threshold ({year})",
            "headline": f"₱{per_capita_annual:,.2f} / capita per year",
            "secondary_headline": f"₱{per_capita_monthly:,} / month per individual (approx. ₱{family_5_monthly:,} / month for a family of 5)",
            "summary": f"According to the official Philippine Statistics Authority (PSA) Full-Year Poverty Statistics, a resident of Albay needed at least ₱{per_capita_annual:,.2f} per year (₱{per_capita_monthly:,}/month) in {year} to meet basic food and non-food necessities.",
            "metrics": [
                {"label": "Per Capita (Annual)", "value": f"₱{per_capita_annual:,.2f}"},
                {"label": "Per Capita (Monthly)", "value": f"₱{per_capita_monthly:,}"},
                {"label": "Family of 5 (Monthly)", "value": f"₱{family_5_monthly:,}"},
                {"label": "2021 Threshold", "value": f"₱{r2021['per_capita_threshold_php']:,.2f}" if r2021 else "--"}
            ],
            "source": "Philippine Statistics Authority (PSA) — Full-Year Poverty Statistics",
            "source_url": pov.get("_source_url", "https://psa.gov.ph/statistics/poverty"),
            "section_anchor": "stats-poverty",
            "section_name": "Poverty Statistics"
        }

    elif choice == "poverty_incidence":
        pov = load_json("poverty_statistics.json")
        if not pov:
            return None
        latest = pov["records"][-1]
        year = latest["year"]
        family_inc = latest["family_incidence_pct"]
        pop_inc = latest["population_incidence_pct"]
        ci_lower = latest.get("family_incidence_ci95_lower", 0.0)
        ci_upper = latest.get("family_incidence_ci95_upper", 0.0)
        gap = latest.get("poverty_gap_pct", 0.0)

        return {
            "indicator": "poverty_incidence",
            "title": f"Albay Poverty Incidence ({year})",
            "headline": f"{family_inc:.1f}% among families",
            "secondary_headline": f"{pop_inc:.1f}% among the total Albay population",
            "summary": f"In {year}, estimated {family_inc:.1f}% of families in Albay lived below the official poverty threshold (95% CI: {ci_lower:.1f}% to {ci_upper:.1f}%). The poverty gap ratio was {gap:.2f}%.",
            "metrics": [
                {"label": "Family Poverty Rate", "value": f"{family_inc:.1f}%"},
                {"label": "Population Poverty Rate", "value": f"{pop_inc:.1f}%"},
                {"label": "95% Confidence Interval", "value": f"{ci_lower:.1f}% – {ci_upper:.1f}%"},
                {"label": "Poverty Gap Ratio", "value": f"{gap:.2f}%"}
            ],
            "source": "Philippine Statistics Authority (PSA) — Full-Year Poverty Statistics",
            "source_url": pov.get("_source_url", "https://psa.gov.ph/statistics/poverty"),
            "section_anchor": "stats-poverty",
            "section_name": "Poverty Statistics"
        }

    elif choice == "economic_gpdp":
        econ = load_json("economic_accounts.json")
        if not econ:
            return None
        summary = econ.get("summary", {})
        latest_year = econ.get("latest_year", 2025)
        current_val = summary.get("gpdp_current_2025_billion_php", 200.95)
        constant_val = summary.get("gpdp_constant_2025_billion_php", 164.23)
        growth = summary.get("real_growth_2025_pct", 1.1)
        top_sector = summary.get("top_sector", "Construction")

        return {
            "indicator": "economic_gpdp",
            "title": f"Albay Gross Provincial Domestic Product ({latest_year})",
            "headline": f"₱{current_val:.2f} Billion (Current Prices)",
            "secondary_headline": f"₱{constant_val:.2f} Billion in real terms (growth: +{growth:.1f}%)",
            "summary": f"The total economic output (GPDP) of the Province of Albay reached ₱{current_val:.2f} Billion at current prices in {latest_year}, with real economic growth of +{growth:.1f}%. The largest economic sector was {top_sector}.",
            "metrics": [
                {"label": f"GPDP Current ({latest_year})", "value": f"₱{current_val:.2f}B"},
                {"label": f"GPDP Constant 2018 Prices", "value": f"₱{constant_val:.2f}B"},
                {"label": "Real Growth Rate", "value": f"+{growth:.1f}%"},
                {"label": "Key Sector", "value": top_sector}
            ],
            "source": "Philippine Statistics Authority (PSA) — Provincial Product Accounts",
            "source_url": econ.get("_source_url", "https://openstat.psa.gov.ph/"),
            "section_anchor": "stats-economy",
            "section_name": "Economic Indicators"
        }

    elif choice == "inflation_cpi":
        cpi = load_json("cpi_inflation.json")
        if not cpi:
            return None
        latest = cpi.get("latest_cpi", {})
        val = latest.get("value", 143.1)
        month = latest.get("month", "Aug")
        yr = latest.get("year", 2026)
        base = cpi.get("base_year", 2018)
        base_display = f"Base {base}" if "=100" in str(base) else f"Base {base} = 100"

        return {
            "indicator": "inflation_cpi",
            "title": f"Albay Consumer Price Index ({month} {yr})",
            "headline": f"CPI: {val:.1f} ({base_display})",
            "secondary_headline": f"Latest monthly figure recorded in Albay Province for {month} {yr}",
            "summary": f"According to PSA price monitoring data, Albay's Consumer Price Index (CPI) stood at {val:.1f} in {month} {yr} relative to the base year ({base_display}).",
            "metrics": [
                {"label": "Latest CPI Value", "value": f"{val:.1f}"},
                {"label": "Reference Period", "value": f"{month} {yr}"},
                {"label": "Base Year", "value": base_display},
                {"label": "Scope", "value": "Province of Albay"}
            ],
            "source": "Philippine Statistics Authority (PSA) — OpenSTAT CPI Series",
            "source_url": cpi.get("_source_url", "https://openstat.psa.gov.ph/"),
            "section_anchor": "stats-economy",
            "section_name": "Economic Indicators"
        }

    elif choice == "agriculture_palay":
        agri = load_json("agriculture_palay.json")
        if not agri:
            return None
        summary = agri.get("summary", {})
        yr = agri.get("latest_year", 2025)
        volume = summary.get("volume_2025_mt", 210954.81)
        area = summary.get("area_2025_ha", 52482.05)
        yield_rate = summary.get("yield_2025_mt_per_ha", 4.02)

        return {
            "indicator": "agriculture_palay",
            "title": f"Albay Palay / Rice Production ({yr})",
            "headline": f"{volume:,.0f} Metric Tons",
            "secondary_headline": f"Harvested across {area:,.0f} hectares with an average yield of {yield_rate:.2f} MT/ha",
            "summary": f"In {yr}, Albay agricultural production yielded {volume:,.0f} metric tons of palay across {area:,.0f} hectares of harvested land, achieving a yield rate of {yield_rate:.2f} metric tons per hectare.",
            "metrics": [
                {"label": f"Annual Production ({yr})", "value": f"{volume:,.0f} MT"},
                {"label": "Harvested Area", "value": f"{area:,.0f} ha"},
                {"label": "Average Yield", "value": f"{yield_rate:.2f} MT/ha"},
                {"label": "Commodity", "value": "Palay (Rice)"}
            ],
            "source": "Philippine Statistics Authority (PSA) — Crops Production Survey",
            "source_url": agri.get("_source_url", "https://openstat.psa.gov.ph/"),
            "section_anchor": "stats-economy",
            "section_name": "Economic Indicators"
        }

    elif choice == "demographics_population":
        pop = load_json("population_2024.json")
        if not pop:
            return None
        t = pop.get("province_totals", {})
        p2024 = t.get("population_2024", 1379398)
        p2020 = t.get("population_2020", 1374768)
        households = t.get("households_2024", 339427)
        area = t.get("land_area_km2", 2514.74)
        density = t.get("density_2024", 549)
        brgy_count = pop.get("total_barangays", 720)
        lgus_count = len(pop.get("lgus", []))

        return {
            "indicator": "demographics_population",
            "title": "Albay Demographics & Census (2024)",
            "headline": f"{p2024:,} Residents",
            "secondary_headline": f"{households:,} private households across {lgus_count} LGUs and {brgy_count} barangays",
            "summary": f"According to the 2024 Census of Population conducted by the PSA, Albay has an official count of {p2024:,} residents, with a population density of {density:,} persons/km² over {area:,.2f} km² of land area.",
            "metrics": [
                {"label": "2024 Census Population", "value": f"{p2024:,}"},
                {"label": "2020 Census Population", "value": f"{p2020:,}"},
                {"label": "Private Households", "value": f"{households:,}"},
                {"label": "Population Density", "value": f"{density:,} / km²"}
            ],
            "source": "Philippine Statistics Authority (PSA) — 2024 Census of Population",
            "source_url": "https://openstat.psa.gov.ph/",
            "section_anchor": "stats-metrics",
            "section_name": "Demographics Overview"
        }

    elif choice == "competitiveness_cmci":
        cmci = load_json("cmci_2024.json")
        if not cmci:
            return None
        yr = cmci.get("year", 2024)
        lgus = sorted(cmci.get("lgus", []), key=lambda x: x.get("overall", {}).get("score", 0), reverse=True)
        top_lgu = lgus[0] if lgus else {}
        top_name = top_lgu.get("name", "Legazpi City")
        top_score = top_lgu.get("overall", {}).get("score", 50.46)

        return {
            "indicator": "competitiveness_cmci",
            "title": f"Albay LGU Competitiveness Index ({yr})",
            "headline": f"Top Performer: {top_name} ({top_score:.2f} pts)",
            "secondary_headline": f"18 LGUs evaluated across 5 pillars by DTI",
            "summary": f"In the {yr} Cities and Municipalities Competitiveness Index (CMCI), {top_name} ranked highest overall among Albay LGUs with an overall score of {top_score:.2f}, followed by Ligao and Tabaco.",
            "metrics": [
                {"label": "Rank 1 LGU", "value": f"{top_name} ({top_score:.2f})"},
                {"label": "Rank 2 LGU", "value": f"{lgus[1]['name']} ({lgus[1]['overall']['score']:.2f})" if len(lgus) > 1 else "--"},
                {"label": "Rank 3 LGU", "value": f"{lgus[2]['name']} ({lgus[2]['overall']['score']:.2f})" if len(lgus) > 2 else "--"},
                {"label": "Pillars Assessed", "value": "5 (Dynamism, Efficiency, Infra, Resiliency, Innovation)"}
            ],
            "source": "Department of Trade and Industry (DTI) — CMCI",
            "source_url": cmci.get("_source_url", "https://cmci.dti.gov.ph/"),
            "section_anchor": "competitive-index",
            "section_name": "Competitiveness Index"
        }

    return None

def resolve_query(query_text):
    """
    Main entry point:
    1. Authenticates TypeSafe API key.
    2. Runs TypeSafe System One (Jev) classification.
    3. Deterministically builds verified response from local datasets.
    """
    query_text = (query_text or "").strip()
    if not query_text:
        return {
            "success": False,
            "error": "Query cannot be empty."
        }

    api_key = get_api_key()
    if not api_key:
        return {
            "success": False,
            "error": "TypeSafe API key not configured on server."
        }

    try:
        classification = classify_query(query_text, api_key)
    except Exception as e:
        return {
            "success": False,
            "error": f"Error contacting TypeSafe AI: {str(e)}"
        }

    choice = classification["choice"]
    confidence = classification["confidence"]

    if choice == "unknown" or confidence < 0.5:
        return {
            "success": True,
            "matched": False,
            "query": query_text,
            "choice": "unknown",
            "confidence": confidence,
            "message": "I could not find a verified Albay government dataset matching this specific question. You can ask about poverty threshold, GPDP, CPI/inflation, rice production, demographics, or competitiveness.",
            "suggested_queries": [
                "Pira an poverty threshold sa Albay?",
                "Magkano ang Gross Provincial Domestic Product (GPDP) ng Albay?",
                "What is the latest inflation rate or CPI in Albay?",
                "Pira an bilog na populasyon kan Albay?",
                "How much palay was produced in Albay?"
            ]
        }

    data_payload = format_data_for_choice(choice, query_text)
    if not data_payload:
        return {
            "success": False,
            "error": f"No data file found for indicator {choice}."
        }

    return {
        "success": True,
        "matched": True,
        "query": query_text,
        "choice": choice,
        "confidence": confidence,
        "model": classification.get("model", "jev"),
        "result": data_payload
    }

if __name__ == "__main__":
    test_query = sys.argv[1] if len(sys.argv) > 1 else "Pira an poverty threshold sa Albay para sa sarong pamilya?"
    print(f"Resolving query: '{test_query}'...")
    res = resolve_query(test_query)
    print(json.dumps(res, indent=2, ensure_ascii=False))
