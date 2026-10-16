// Dev-only fixture for /dev/quarterly-v4. CCL's real last four quarters
// (concall_analysis, read 2026-10-16); the latest quarter's v4_categories is the
// structured-key-point sandbox at /tmp/sandbox_v4_structured/CCL_FY27Q2_v4_categories.json,
// the older three keep their stored plain-string key_points (the legacy shape).
// Not a production payload — the sandbox promotes separately.
import type { QuarterData } from "@/app/company/types";

export const QUARTERLY_V4_FIXTURE: QuarterData[] = [
  {
    "id": 1000,
    "company_code": "CCL",
    "fy": 2027,
    "qtr": 2,
    "quarter_start_date": "",
    "quarter_label": "Q2FY27",
    "score": 4.9,
    "details": {
      "fy": 2027,
      "qtr": 2,
      "score": 4.9,
      "rationale": [
        {
          "detail": "Q2 revenue +7.5% to ₹1,210.8 cr on 10-15% volume, but EBITDA was only +9.5% (₹217.3 cr; ~+7.6% ex other income) vs ~+22% in Q1, the first lag after nine quarters; other expenses +36% to ₹196.7 cr and a smaller forex gain. PAT +29% to ₹130.1 cr was helped by lower interest and tax. Offset: H1 operating cash flow ₹438.8 cr, net debt down to ~₹742 cr.",
          "heading": "EBITDA lags volume, PAT flattered",
          "category": "cat_1_quantitative_decomposition",
          "direction": "negative"
        },
        {
          "detail": "~15% volume and similar EBITDA growth for FY27 maintained on a robust Q3-Q4 order book; EBITDA per kg held at ₹135-140; domestic branded at ~₹550-600 cr and gross debt at ₹1,000-1,200 cr all unchanged.",
          "heading": "FY27 '15 and 15' reiterated",
          "category": "cat_2_forward_guidance",
          "direction": "neutral"
        },
        {
          "detail": "Freeze-dried capacity near full in 12-18 months; a ~6,000 t brownfield (~₹500 cr) or a strategic tie-up/JV to be decided by Q4 FY27-Q1 FY28 and funded mainly from internal accruals; international brands (~₹30 cr) adding US chain listings and a Nepal launch.",
          "heading": "FD capacity call due Q4/Q1",
          "category": "cat_3_strategy_capital_allocation",
          "direction": "neutral"
        }
      ],
      "score_breakdown": {
        "cat_7_qa_signals": 0,
        "cat_2_forward_guidance": 0,
        "cat_4_industry_context": 0,
        "cat_1_quantitative_decomposition": -1,
        "cat_5_concentration_dependencies": 0,
        "cat_3_strategy_capital_allocation": 0
      },
      "v4_categories": {
        "cat_1_quantitative_decomposition": {
          "state": "addressed",
          "key_points": [
            {
              "heading": "EBITDA lags volume, first time in nine quarters",
              "detail": "Consolidated revenue from operations ₹1,210.8 cr (+7.5% YoY) on 10–15% volume growth, value trailing volume as green coffee fell. EBITDA incl. other income ₹217.3 cr, +9.5% (~+7.6% ex other income), against ~+22% in Q1 FY27.",
              "metric": "EBITDA +9.5% · Rev +7.5%",
              "tone": "negative"
            },
            {
              "heading": "PAT flattered below the line",
              "detail": "PBT +18.7% to ₹150.9 cr and PAT +29% to ₹130.1 cr on lower finance cost (₹26.0 cr vs ₹32.6 cr) and a lower tax rate (~13.8% vs ~20.6%). Other expenses rose 36% to ₹196.7 cr on freight, insurance, fuel and domestic ad spend; the forex gain was smaller (H1 ~₹11 cr vs ~₹39 cr).",
              "metric": "PAT +29% · other exp +36%",
              "tone": "neutral"
            },
            {
              "heading": "Cash generation strong, debt down",
              "detail": "H1 operating cash flow ₹438.8 cr against ₹25.3 cr of capex; gross debt ₹1,192 cr and net debt ~₹742 cr at 30 Sep (from ~₹1,291 cr / ~₹1,074 cr in March). Domestic gross turnover ₹210 cr, of which branded ~₹140 cr, +25% on volume alone.",
              "metric": "H1 OCF ₹438.8 cr · net debt ~₹742 cr",
              "tone": "positive"
            }
          ]
        },
        "cat_2_forward_guidance": {
          "state": "addressed",
          "key_points": [
            {
              "heading": "'15 and 15' needs a faster H2",
              "detail": "Volume and EBITDA growth both held at ~15% for FY27. H1 ran at 10–15%, so the back half has to run above the line — management leans on a Q3–Q4 order book it calls robust.",
              "metric": "Guide ~15% · H1 10–15%",
              "tone": "neutral"
            },
            {
              "heading": "Per-kg margin held, no mix lift assumed",
              "detail": "EBITDA per kg held at ₹135–140; management says EBITDA simply follows volume from here, with no product-mix uplift built in.",
              "metric": "₹135–140 per kg",
              "tone": "neutral"
            },
            {
              "heading": "Also unchanged",
              "detail": "domestic branded ₹550–600 cr (H2 seasonally heavier) · gross debt ₹1,000–1,200 cr, ~₹800 cr net, as working capital builds for Vietnam crop procurement.",
              "watch": "Year-end update deferred to the Q3 call.",
              "tone": "minor"
            }
          ]
        },
        "cat_3_strategy_capital_allocation": {
          "state": "addressed",
          "key_points": [
            {
              "heading": "FD capacity call due Q4 FY27–Q1 FY28",
              "detail": "Overall utilisation ~70%, but freeze-dried could be close to full in 12–18 months. The choice is a brownfield FD line (India or Vietnam, 9–12 month build, 30–50% of volume underwritten first) versus contract manufacturing or a JV.",
              "metric": "~6,000 t · ~₹500 cr",
              "tone": "neutral"
            },
            {
              "heading": "International brands still sub-scale",
              "detail": "Percol ₹25–30 cr and loss-making by ₹1–2 cr a year, aiming for break-even next year. US chain listings signed for one or two acquired brands, a Nepal launch, seeding planned in Vietnam and the Middle East. Malgudi snacks and Continental tea remain in test market with encouraging early offtake.",
              "metric": "~₹30 cr · loss ₹1–2 cr",
              "tone": "neutral"
            },
            {
              "heading": "M&A open, self-funded",
              "detail": "acquisitions considered (international coffee brands, Indian adjacencies) if well priced, no timeline; expansion funded largely from accruals on a ₹300–400 cr cash cushion.",
              "tone": "minor"
            }
          ]
        },
        "cat_4_industry_context": {
          "state": "addressed",
          "key_points": [
            {
              "heading": "Green coffee range-bound, not spiking pre-harvest",
              "detail": "Unusual for the season, though it still swings $50–100 a day. The Vietnam crop due Nov–Dec sets direction, with El Niño and flood risk set against reports of a good harvest.",
              "metric": "$3,400–3,800/t",
              "tone": "neutral"
            },
            {
              "heading": "Longer contracts returning",
              "detail": "Customers still partly wait out the daily volatility, but with prices structurally lower more medium- and long-term contracts are coming back. Freeze-dried demand keeps running ahead of spray-dried as premium end-prices fall.",
              "metric": "FD demand > SD",
              "tone": "positive"
            },
            {
              "heading": "Cost headwinds",
              "detail": "Higher freight, insurance and fuel (partly passed through via CIF contracts), interest rates edging up, and a smaller rupee-depreciation tailwind than last year.",
              "metric": "Rates ~7.25%",
              "tone": "negative"
            }
          ]
        },
        "cat_5_concentration_dependencies": {
          "state": "addressed",
          "key_points": [
            {
              "heading": "No large-client loss",
              "detail": "Churn described as routine: wallet share rose with existing clients, and new clients came from the Far East, a market seeded two years ago.",
              "tone": "positive"
            },
            {
              "heading": "FD capacity is the emerging bottleneck",
              "detail": "CCL may lean on third-party or contract capacity in the interim, possibly at lower margins.",
              "metric": "Near full in ~12–18 months",
              "tone": "negative"
            },
            {
              "heading": "Multi-sourced equipment",
              "detail": "roasters from Brazil and Europe, extraction work in-house, no single-supplier dependence; global B2B instant-coffee share still high single digits (~9–10%).",
              "tone": "minor"
            }
          ]
        },
        "cat_6_management_quality": {
          "state": "deferred_v2",
          "deferred_reason": "Management-quality sub-signals (governance, capital structure, operational reliability, disclosure integrity) are cross-quarter and land in v2."
        },
        "cat_7_qa_signals": {
          "state": "addressed",
          "key_points": [
            {
              "heading": "Margin quality dominated the Q&A",
              "detail": "At least five analysts pressed on EBITDA lagging volume, the 36% jump in other expenses, gross margin and EBITDA per kg. Management cited an FD/SD mix benefit now in the base, CIF pass-through optics, freight and ad spend, conceded the smaller forex gain, and asked analysts to look at EBITDA rather than gross margin.",
              "metric": "5+ analysts",
              "quote": "your observations are right",
              "tone": "neutral"
            },
            {
              "heading": "Capacity route left open",
              "detail": "Several analysts asked about FD lead time, JV vs contract manufacturing, the capex trigger and M&A; management answered on cost, timing and funding but would not commit to a route.",
              "tone": "neutral"
            },
            {
              "heading": "Still no unit-level utilisation",
              "detail": "as in prior calls, volume growth was given only as a 10–15% range; the CFO's figures were attributed to an analyst in the third-party transcript.",
              "tone": "minor"
            }
          ]
        }
      },
      "scoring_meta": {
        "provider": "fixture"
      }
    },
    "summary": []
  },
  {
    "id": 1001,
    "company_code": "CCL",
    "fy": 2027,
    "qtr": 1,
    "quarter_start_date": "",
    "quarter_label": "Q1FY27",
    "score": 6.1,
    "details": {
      "fy": 2027,
      "qtr": 1,
      "score": 6.1,
      "rationale": [
        {
          "detail": "Q1 volume growth ~20% vs guided 15%, with EBITDA growing 22% YoY; net debt reduced further to INR963 cr.",
          "heading": "Volume growth beats guidance",
          "category": "cat_1_quantitative_decomposition",
          "direction": "positive"
        },
        {
          "detail": "Despite Q1 beat, management kept 15% volume growth guidance unchanged, citing coffee price volatility.",
          "heading": "Guidance maintained, not raised",
          "category": "cat_2_forward_guidance",
          "direction": "neutral"
        },
        {
          "detail": "Capex of INR25-50 cr for FY27; no capacity expansion for 2-3 years; debt reduction remains priority.",
          "heading": "No major capex planned",
          "category": "cat_3_strategy_capital_allocation",
          "direction": "neutral"
        }
      ],
      "score_breakdown": {
        "cat_7_qa_signals": 0,
        "cat_2_forward_guidance": 0,
        "cat_4_industry_context": 0,
        "cat_1_quantitative_decomposition": 1,
        "cat_5_concentration_dependencies": 0,
        "cat_3_strategy_capital_allocation": 0
      },
      "v4_categories": {
        "cat_7_qa_signals": {
          "state": "addressed",
          "key_points": [
            "Management maintained guidance despite Q1 beat, citing volatility; consistent with cautious stance.",
            "Repeated questions on EBITDA per kg and capacity expansion were answered directly with specific ranges.",
            "Analyst pressed on peer comparison (EBITDA per kg gap); management declined to comment, redirecting to own performance."
          ]
        },
        "cat_2_forward_guidance": {
          "state": "addressed",
          "key_points": [
            "Volume growth guidance maintained at 15% for FY27 (Q1 achieved 20%); not upgraded due to coffee price volatility.",
            "EBITDA per kg expected to sustain at current levels (~INR140) for the year.",
            "Domestic branded business guided at INR550-600 cr for FY27 (Q1 run-rate ~INR500 cr annualized)."
          ]
        },
        "cat_4_industry_context": {
          "state": "addressed",
          "key_points": [
            "Green coffee prices range-bound INR3,300-3,800/kg; volatility persists due to Brazil supply and potential El Nino impact on Vietnam crop.",
            "Coffee consumption inelastic to price changes; no demand destruction seen even at high prices.",
            "Logistics costs remain volatile due to Middle East tensions; packaging costs also fluctuating."
          ]
        },
        "cat_6_management_quality": {
          "state": "deferred_v2",
          "deferred_reason": "Management-quality sub-signals (governance, capital structure, operational reliability, disclosure integrity) are cross-quarter and land in v2."
        },
        "cat_1_quantitative_decomposition": {
          "state": "addressed",
          "key_points": [
            "Group turnover INR1,203.59 cr, +13.76% YoY; volume growth ~20% (vs guided 15%).",
            "EBITDA INR196.69 cr, +21.84% YoY; EBITDA per kg ~INR140, stable vs FY26.",
            "Net debt reduced to INR963 cr from INR1,073 cr in Mar'26; gross debt INR1,268 cr (term loan INR517 cr, working capital INR751 cr)."
          ]
        },
        "cat_5_concentration_dependencies": {
          "state": "absent_in_concall",
          "absence_justification": "Searched for customer/geographic concentration, single-source suppliers, regulatory dependencies; not discussed on the call."
        },
        "cat_3_strategy_capital_allocation": {
          "state": "addressed",
          "key_points": [
            "Capex plan for FY27: INR25-50 cr (maintenance/upgradation only); no major capacity expansion for 2-3 years.",
            "Debt reduction priority: target gross debt to ~INR1,000 cr by FY27-end (INR140 cr term loan repayment in next 3 quarters).",
            "B2C expansion: new snack category (Malgudi) launched; small revenue contribution (~couple of crores) in FY27."
          ]
        }
      },
      "scoring_meta": {
        "provider": "fixture"
      }
    },
    "summary": []
  },
  {
    "id": 1002,
    "company_code": "CCL",
    "fy": 2026,
    "qtr": 4,
    "quarter_start_date": "",
    "quarter_label": "Q4FY26",
    "score": 7.3,
    "details": {
      "fy": 2026,
      "qtr": 4,
      "score": 7.3,
      "rationale": [
        {
          "detail": "Net debt reduced by >INR750 cr to INR1,073 cr; debt/equity from 0.92 to 0.5; net debt/EBITDA from 3.1 to 1.45.",
          "heading": "Strong balance sheet improvement",
          "direction": "positive"
        },
        {
          "detail": "Q4 revenue +46% YoY, full-year +43%; volume growth ~18-20% in line with guidance; EBITDA per kg improved annually.",
          "heading": "Solid revenue and volume growth",
          "direction": "positive"
        },
        {
          "detail": "FY27 guidance of 15% volume and EBITDA growth maintained with conviction; no major capex needed for 2 years.",
          "heading": "Clear and confident guidance",
          "direction": "positive"
        }
      ],
      "score_breakdown": {
        "cat_7_qa_signals": 0,
        "cat_2_forward_guidance": 1,
        "cat_4_industry_context": 0,
        "cat_1_quantitative_decomposition": 1,
        "cat_5_concentration_dependencies": 0,
        "cat_3_strategy_capital_allocation": 2
      },
      "v4_categories": {
        "cat_7_qa_signals": {
          "state": "addressed",
          "key_points": [
            "Management provided detailed answers on volume growth, EBITDA per kg, and guidance; no evasion on key metrics.",
            "Analysts pressed on capacity utilization and capex; management gave clear, consistent responses.",
            "No new analysts or dropped analysts noted; Q&A tone constructive and informative."
          ]
        },
        "cat_2_forward_guidance": {
          "state": "addressed",
          "key_points": [
            "Guidance: volume growth ~15% and EBITDA growth ~15% for FY27, maintained with confidence.",
            "No major capex planned for next 2 years; maintenance capex INR25-35 cr annually.",
            "Domestic branded business guided for ~25% volume growth; value growth in line."
          ]
        },
        "cat_4_industry_context": {
          "state": "addressed",
          "key_points": [
            "Green coffee prices stable, expected to soften with Brazilian crop; management sees this as positive.",
            "Middle East crisis causing supply disruptions and energy cost increases, but managed well with no major impact expected.",
            "Shift towards freeze-dried coffee and premiumization observed; company well-positioned with freeze-dried capacity."
          ]
        },
        "cat_6_management_quality": {
          "state": "deferred_v2",
          "deferred_reason": "Management-quality sub-signals (governance, capital structure, operational reliability, disclosure integrity) are cross-quarter and land in v2."
        },
        "cat_1_quantitative_decomposition": {
          "state": "addressed",
          "key_points": [
            "Q4 FY26 revenue INR1,226.39 cr, +46% YoY; full-year revenue INR4,465.80 cr, +43% YoY.",
            "Q4 EBITDA INR193.76 cr, +16% YoY; full-year EBITDA INR741.38 cr, +32% YoY; net profit INR388.11 cr, +25% YoY.",
            "Volume growth ~18-20% in Q4 and full year; EBITDA per kg improved annually but dipped sequentially due to product mix."
          ]
        },
        "cat_5_concentration_dependencies": {
          "state": "absent_in_concall",
          "absence_justification": "Searched for customer/product/geo concentration, contract cycles, regulatory dependencies, single-source vendors; not discussed on this call."
        },
        "cat_3_strategy_capital_allocation": {
          "state": "addressed",
          "key_points": [
            "Net debt reduced by >INR750 cr to INR1,073 cr; debt/equity improved to 0.5 from 0.92; net debt/EBITDA to 1.45 from 3.1.",
            "Capacity utilization ~65% annually, good for 2 years; evaluating strategic tie-ups or brownfield for freeze-dried if needed.",
            "Branded business (Continental) now #3 in India; exploring international B2C expansion (Percol in UK, evaluating US and Vietnam)."
          ]
        }
      },
      "scoring_meta": {
        "provider": "fixture"
      }
    },
    "summary": []
  },
  {
    "id": 1003,
    "company_code": "CCL",
    "fy": 2026,
    "qtr": 3,
    "quarter_start_date": "",
    "quarter_label": "Q3FY26",
    "score": 8.5,
    "details": {
      "fy": 2026,
      "qtr": 3,
      "score": 8.5,
      "rationale": [
        {
          "detail": "Revenue +38% YoY, EBITDA +47%, net profit +59%; volume growth ~20% with EBITDA per kg improving to INR135-140.",
          "heading": "Strong revenue and profit growth",
          "category": "cat_1_quantitative_decomposition",
          "direction": "positive"
        },
        {
          "detail": "FY26 EBITDA growth guidance revised up to ~25% from 15-20%; volume growth guidance of 18-20% maintained with confidence.",
          "heading": "Guidance raised with conviction",
          "category": "cat_2_forward_guidance",
          "direction": "positive"
        },
        {
          "detail": "Gross debt reduced to INR1,448 crore from ~INR2,000 crore a year ago, ahead of plan; working capital improvements driving free cash flow of ~INR700 crore TTM.",
          "heading": "Debt reduction ahead of plan",
          "category": "cat_3_strategy_capital_allocation",
          "direction": "positive"
        }
      ],
      "score_breakdown": {
        "cat_7_qa_signals": 1,
        "cat_2_forward_guidance": 2,
        "cat_4_industry_context": 1,
        "cat_1_quantitative_decomposition": 2,
        "cat_5_concentration_dependencies": 0,
        "cat_3_strategy_capital_allocation": 1
      },
      "v4_categories": {
        "cat_7_qa_signals": {
          "state": "addressed",
          "key_points": [
            "Management was candid and detailed: provided specific volume/value split, EBITDA per kg range, debt reduction progress, and branded business margins (5-8%).",
            "Chairman's presence and closing remarks ('have patience') reinforced long-term confidence; no evasion on key questions.",
            "Analysts focused on volume growth sustainability, debt reduction, and branded business; no critical gaps or repeated dodged questions observed."
          ]
        },
        "cat_2_forward_guidance": {
          "state": "addressed",
          "key_points": [
            "Management revised FY26 EBITDA growth guidance to ~25% (from earlier 15-20%), confident of delivering.",
            "Volume growth guidance of 18-20% for FY26 remains intact; Q4 volume growth expected to be similar to 9-month trend.",
            "For FY27, guidance will be provided after 1-2 months, contingent on green coffee price stability post-Vietnam Tet holidays."
          ]
        },
        "cat_4_industry_context": {
          "state": "addressed",
          "key_points": [
            "Green coffee prices stable at INR3,600-4,000/kg, significantly more stable than a year ago; Brazil crop outlook positive.",
            "Vietnam Tet holidays may cause short-term selling pressure; post-Tet farmer holding could reintroduce volatility.",
            "US tariff impact neutral due to flexibility to supply from Vietnam; stable prices encouraging long-term contracts, evident in volume growth acceleration to 15-20% from 10-15% last year."
          ]
        },
        "cat_6_management_quality": {
          "state": "deferred_v2",
          "deferred_reason": "Management-quality sub-signals (governance, capital structure, operational reliability, disclosure integrity) are cross-quarter and land in v2."
        },
        "cat_1_quantitative_decomposition": {
          "state": "addressed",
          "key_points": [
            "Group revenue grew 38% YoY to INR1,053 crore in Q3 FY26, with volume growth of ~20% and value growth of ~18-20%.",
            "EBITDA grew 47% YoY to INR187.56 crore; EBITDA per kg improved to INR135-140 from prior levels.",
            "Gross debt reduced to INR1,448 crore from ~INR2,000 crore a year ago; net debt at INR1,248 crore; free cash flow on TTM basis ~INR700 crore."
          ]
        },
        "cat_5_concentration_dependencies": {
          "state": "addressed",
          "key_points": [
            "Customer diversification strong: top 20% clients contribute only 40-50% of revenue; growth is broad-based across geographies (Africa, Americas, Europe, Asia).",
            "Sourcing flexibility across Brazil, Vietnam, and Africa mitigates single-region dependency; no material concentration risk flagged.",
            "No new dependency risks identified; management highlighted ability to manage supply chain despite geographic distances."
          ]
        },
        "cat_3_strategy_capital_allocation": {
          "state": "addressed",
          "key_points": [
            "Debt reduction ahead of plan: gross debt down to INR1,448 crore vs. March '26 guidance of INR1,250 crore; net debt at INR1,248 crore.",
            "Working capital improvements via renegotiated credit terms (reduced DSO) and lower inventory due to softer coffee prices.",
            "Innovation and diversification: launched traditional snacks under 'Malgudi' brand in Hyderabad; discontinued plant-based meat category; exploring specialty instant coffee and microgrounds."
          ]
        }
      },
      "scoring_meta": {
        "provider": "fixture"
      }
    },
    "summary": []
  }
];
