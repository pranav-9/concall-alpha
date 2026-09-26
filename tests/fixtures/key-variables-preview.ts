import type { KeyVariablesSnapshotRow } from "@/lib/key-variables-snapshot/types";

/**
 * VINYAS-shaped snapshot carrying every 7a field (design reference "VINYAS Key
 * Variables.dc.html", option 7a). Numbers are illustrative — this is a layout
 * fixture for /dev/key-variables and the normalize tests, not a research row.
 */
export const keyVariablesPreview7a: KeyVariablesSnapshotRow = {
  company_code: "VINYAS",
  generated_at: "2026-08-14T09:00:00Z",
  section_headline: "Vinyas has the orders. The open question is whether they turn into cash.",
  section_synthesis:
    "How fast the confirmed defence order book converts into shipped revenue sets the growth. Whether working capital stays under control as it scales sets whether that growth turns into cash.",
  discovery_summary: {
    total_candidates_considered: 13,
    selected_full_list_count: 5,
    selected_deep_treatment_count: 2,
    selection_priority_stack: "growth_quality_signal>source_availability>incremental_insight",
  },
  full_variable_list: {
    variables: [
      {
        variable: "Defence order book & book-to-bill",
        why_flagged: "Confirmed programmes converting into shipped revenue.",
        source_basis: "both",
      },
      {
        variable: "Net working capital days",
        why_flagged: "Cash tied up in inventory and receivables.",
        source_basis: "both",
      },
      {
        variable: "Gross margin by build type",
        why_flagged: "Box-build carries a higher margin than bare-board assembly.",
        source_basis: "presentation",
        latest: { value: "24.5%", delta_label: "▲ +170 bps", effect: "helps", as_of: "Deck · Q1 FY27" },
        watch_for:
          "box-build crossing 50% of revenue (47% now). Past that, margin becomes a second growth engine, not just a tailwind.",
        next_to_promote: true,
      },
      {
        variable: "Mysuru line utilisation",
        why_flagged: "The ceiling on how fast the order book converts.",
        source_basis: "presentation",
        latest: { value: "82%", delta_label: "Near ceiling", effect: "caution", as_of: "Deck · Q1 FY27" },
        watch_for:
          "loading above ~85% with no new line announced. That's when the order book (01) stops converting faster.",
      },
      {
        variable: "Top-5 customer concentration",
        why_flagged: "One programme slipping a quarter dents a year's growth.",
        source_basis: "annual_report",
        latest: { value: "68%", delta_label: "High", effect: "hurts", as_of: "Annual report · FY26" },
        watch_for:
          "any single defence programme slipping a quarter. At this concentration, one delay dents a year's growth.",
      },
    ],
  },
  deep_treatment: {
    variables: [
      {
        variable: "Defence order book & book-to-bill",
        thesis_role: "Sets the growth",
        lead_metric_index: 0,
        lead_unit: "₹ cr",
        what_it_tracks: "Confirmed, funded defence programmes converting into shipped revenue.",
        why_it_matters_now: "defence is ~46% of revenue and the whole re-rating case.",
        kpi_history: {
          periods: ["Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27"],
          rows: [
            {
              metric: "Order book (₹ cr)",
              values_by_period: { "Q2 FY26": 590, "Q3 FY26": 640, "Q4 FY26": 720, "Q1 FY27": 860 },
            },
            {
              metric: "Book-to-bill (x)",
              values_by_period: { "Q2 FY26": 1.3, "Q3 FY26": 1.4, "Q4 FY26": 1.5, "Q1 FY27": 1.7 },
            },
            {
              metric: "Defence revenue (₹ cr)",
              values_by_period: { "Q2 FY26": 88, "Q3 FY26": 96, "Q4 FY26": 108, "Q1 FY27": 121 },
            },
          ],
        },
        trend_interpretation:
          "Book-to-bill has held above 1.5x for three straight quarters, so bookings are outrunning shipments. The ceiling is Mysuru capacity, not order flow.",
        transition: "retained",
      },
      {
        variable: "Net working capital days",
        thesis_role: "Sets the cash",
        lead_metric_index: 0,
        lead_unit: "days",
        metric_directions: {
          "NWC (days)": "lower_is_better",
          "Inventory (days)": "lower_is_better",
          "Receivables (days)": "lower_is_better",
        },
        guide: { value: 120, label: "Guide 120 · FY27" },
        what_it_tracks:
          "Cash tied up in inventory and receivables — the gap between booking revenue and collecting it.",
        kpi_history: {
          periods: ["Q3 FY26", "Q4 FY26", "Q1 FY27"],
          rows: [
            { metric: "NWC (days)", values_by_period: { "Q3 FY26": 118, "Q4 FY26": 131, "Q1 FY27": 146 } },
            { metric: "Inventory (days)", values_by_period: { "Q3 FY26": 84, "Q4 FY26": 92, "Q1 FY27": 103 } },
            { metric: "Receivables (days)", values_by_period: { "Q3 FY26": 71, "Q4 FY26": 74, "Q1 FY27": 79 } },
          ],
        },
        trend_interpretation:
          "Three straight quarters of expansion, and the highest in eight. This is the counterweight to the order book: growth that doesn't convert to cash re-rates nothing.",
        transition: "promoted",
        transition_reason:
          "Defence WIP rose three quarters running. It went from a steady, low-signal metric to a live risk. Every 10 days is ~₹25 cr of cash.",
      },
    ],
    dropped_variables: [
      { variable: "Automotive segment revenue", reason: "Run down to ~8% of mix. No longer material." },
      { variable: "Headcount & plant additions", reason: "Better read through Mysuru utilisation (04)." },
    ],
  },
  details: {},
};

/**
 * The shape every promoted row has today (copied from the live VINYAS row on
 * 2026-09-26, trimmed): no headline, no roles, no directions, no latest
 * readings, FY periods, five deep variables and no continuity block.
 */
export const keyVariablesPreviewLegacy: KeyVariablesSnapshotRow = {
  company_code: "VINYAS",
  generated_at: "2026-07-02T10:00:00Z",
  section_synthesis:
    "Vinyas's key variables reveal a business transitioning from a domestically focused defense EMS player to a more globally diversified, high-reliability manufacturing partner. The doubling of export share to 50% and strong order inflows indicate that growth quality is improving through market access and program depth. Capacity utilization remains low, offering significant operating leverage as revenue scales.",
  discovery_summary: {
    selected_full_list_count: 9,
    selection_priority_stack: "growth_quality_signal>source_availability>incremental_insight",
    total_candidates_considered: 12,
    selected_deep_treatment_count: 5,
  },
  full_variable_list: {
    variables: [
      { variable: "Order book quality", why_flagged: "Signals conversion reliability and future execution visibility beyond current-period revenue.", source_basis: "both" },
      { variable: "Capacity utilization", why_flagged: "Indicates headroom for growth and efficiency gains; management tracks and guides explicitly.", source_basis: "both" },
      { variable: "Export mix", why_flagged: "Reflects global competitiveness and diversification; >50% revenue from exports in FY26.", source_basis: "both" },
      { variable: "Customer/program diversification", why_flagged: "Reduces lumpiness; management targets defense/aero share reduction to 60% over 5 years.", source_basis: "both" },
      { variable: "Order inflow", why_flagged: "Leading indicator of future revenue; tracks conversion of pipeline.", source_basis: "both" },
      { variable: "Product mix (defense vs. others)", why_flagged: "Drives margin variability; management explicitly links margin to mix.", source_basis: "both" },
      { variable: "Working capital intensity (inventory & receivables days)", why_flagged: "Indicates cash conversion efficiency; management targets ~30% of revenue.", source_basis: "both" },
      { variable: "Certification status (NADCAP, etc.)", why_flagged: "Enables access to regulated programs; structural advantage.", source_basis: "both" },
      { variable: "Supply chain dependency (Israel, semiconductors)", why_flagged: "Risk factor for execution; management monitors 10-15% Israel exposure.", source_basis: "both" },
    ],
  },
  deep_treatment: {
    variables: [
      {
        variable: "Capacity utilization",
        kpi_history: { periods: ["FY24", "FY25", "FY26"], rows: [{ metric: "Capacity utilization (%)", values_by_period: { FY24: 35, FY25: 35, FY26: 40 } }] },
        trend_interpretation: "Capacity utilization has stayed low in the 35-40% range as the capacity expansion was not fully utilized due to a high-mix, low-volume profile and long qualification cycles.",
      },
      {
        variable: "Export mix",
        kpi_history: { periods: ["FY24", "FY25", "FY26"], rows: [{ metric: "Export contribution to revenue (%)", values_by_period: { FY24: 22, FY25: 23, FY26: 50 } }] },
        trend_interpretation: "Export share doubled in FY26, crossing 50% of revenue, driven by new defense and aerospace program wins, NADCAP certification, and a US subsidiary setup.",
      },
      {
        variable: "Product mix (defense vs. others)",
        kpi_history: {
          periods: ["FY23", "FY24", "FY25", "FY26"],
          rows: [
            { metric: "Defense & Aerospace share of revenue (%)", values_by_period: { FY23: 82.3, FY24: 84.7, FY25: 78, FY26: 78.5 } },
            { metric: "Industrial share of revenue (%)", values_by_period: { FY23: 9.9, FY24: 10.7, FY25: 18.4, FY26: 18.5 } },
            { metric: "Medical share of revenue (%)", values_by_period: { FY23: 1.2, FY24: 1.7, FY25: 1.7, FY26: 1.3 } },
          ],
        },
        trend_interpretation: "Defense & aerospace remains dominant but its share has declined from ~85% in FY24 to ~78% in FY26, while industrial has grown from ~11% to ~18.5%, indicating successful diversification.",
      },
      {
        variable: "Order inflow",
        kpi_history: { periods: ["FY24", "FY25", "FY26"], rows: [{ metric: "Order inflow (INR Cr)", values_by_period: { FY24: 520, FY25: 737, FY26: 960 } }] },
        trend_interpretation: "Order inflows have grown at a CAGR of ~36% over the last two years, outpacing revenue growth and signaling strong demand visibility.",
      },
      {
        variable: "Order book quality",
        kpi_history: {
          periods: ["FY24", "FY25", "FY26"],
          rows: [
            { metric: "Order book (INR Cr)", values_by_period: { FY24: 863, FY25: 1018, FY26: 1309 } },
            { metric: "Order book to revenue (times)", values_by_period: { FY24: 2.7, FY25: 2.6, FY26: 2.5 } },
          ],
        },
        trend_interpretation: "The order book has grown to INR 1,309 Cr, providing 2.5x revenue coverage with an 18-24 month execution horizon.",
      },
    ],
  },
  details: {},
};
