// Synthetic fixture only. Never load this company or these sources into Supabase.
const sources = [{ label: "Example FY26 annual report", url: "https://example.test/annual-report.pdf", locator: "Company overview" }];
export const businessProfilePreview = {
  about_company: {
    about_short: "A component maker expanding from assembly into complete industrial systems.",
    business_intro: "Example Components builds electronic assemblies and complete systems for equipment manufacturers. Customers pay for manufacturing, testing and delivery against their product designs.",
    about_long: "The business began with circuit-board assembly. It now delivers complete systems as well as individual components. Its customers supply industrial and medical equipment. Revenue is earned through manufacturing contracts, with product testing and integration included in the service.",
    company_timeline: [
      { year: 2001, title: "Founded as an assembly business", sources },
      { year: 2007, title: "Opens a second manufacturing site", sources },
      { year: 2013, title: "Enters medical electronics", sources },
      { year: 2018, title: "Adds complete system integration", sources },
      { year: 2021, title: "Lists on the stock exchange", sources },
      { year: 2025, title: "Commissions a dedicated testing facility", sources },
    ],
    business_facts: [
      { category: "customers", title: "Customers & concentration", text: "Sells to industrial and medical equipment manufacturers. Its five largest customers account for 54% of consolidated revenue.", period: "FY26", sources, metrics: [{ label: "Top 5", value: 54, unit: "%" }, { label: "6-10", value: 14, unit: "%" }, { label: "Others", value: 32, unit: "%" }] },
      { category: "geography", title: "Markets served", text: "Exports contribute 62% of consolidated revenue. Domestic customers contribute the remaining 38%.", period: "FY26", sources },
      { category: "footprint", title: "Operating footprint", text: "Two manufacturing sites handle assembly, testing and complete system integration. The dedicated testing facility began operating in 2025.", period: "FY26", sources, metrics: [{ label: "Installed lines", value: 23, unit: "lines" }] },
      { category: "capabilities", title: "Engineering capabilities", text: "In-house engineering covers design for manufacturing, traceability and product testing for industrial and medical customers.", period: "FY26", sources },
      { category: "expansion", title: "Planned expansion", text: "An additional production line is approved. It is not included in the operating footprint until commissioned.", period: "FY26", sources },
    ],
    what_changed: { headline: "Complete systems are a larger part of the business.", text: "System integration grew from 50% to 60% of revenue between FY24 and FY26. That changes the scope of work delivered to customers; it does not by itself establish better margins.", period: "FY24–FY26", sources },
  },
  revenue_breakdown: { by_segment: [
    { segment: "Complete systems", segment_explained: "Manufactures and tests complete industrial systems.", revenue_share_percent: 60, role_pill: "core_engine", growth_direction_pill: "stable", margin_profile: "improving", margin_profile_note: "Management reports a greater contribution from integration services." },
    { segment: "Electronic assemblies", segment_explained: "Builds circuit boards and subassemblies to customer designs.", revenue_share_percent: 25, role_pill: "support_engine", growth_direction_pill: "stable", margin_profile: "unknown", margin_profile_note: "Insufficient support in source text." },
    { segment: "Medical electronics", segment_explained: "Manufactures components for medical equipment makers.", revenue_share_percent: 15, role_pill: "support_engine", growth_direction_pill: "stable", margin_profile: "unknown", margin_profile_note: "Insufficient support in source text." },
  ] },
  historical_economics: {
    revenue_mix_history_by_segment: {
      years: ["FY22", "FY23", "FY24", "FY25", "FY26"], latest_period: null,
      rows: [
        { segment: "Complete systems", mix_percent_by_year: { FY22: 40, FY23: 45, FY24: 50, FY25: 55, FY26: 60 }, latest_mix_percent: 60, direction_label: "gaining_share", comparability_label: "reported" },
        { segment: "Electronic assemblies", mix_percent_by_year: { FY22: 45, FY23: 40, FY24: 35, FY25: 30, FY26: 25 }, latest_mix_percent: 25, direction_label: "losing_share", comparability_label: "reported" },
        { segment: "Medical electronics", mix_percent_by_year: { FY22: 15, FY23: 15, FY24: 15, FY25: 15, FY26: 15 }, latest_mix_percent: 15, direction_label: "stable_share", comparability_label: "reported" },
      ], insights: [],
    },
  },
  // "Medical devices" is deliberately NOT "Medical electronics" (the name used
  // above in revenue_mix_history_by_segment) — same free-text-segment-naming
  // risk a real company's LLM extraction can hit. Exercises the Δ Share
  // column's graceful no-match fallback for that one row, not just its
  // matched-name path.
  segment_history_annual: {
    periods: ["FY22", "FY23", "FY24", "FY25", "FY26"],
    rows: [
      { segment: "Complete systems", amount_by_period: { FY22: 120, FY23: 162, FY24: 210, FY25: 264, FY26: 324 }, unit: "Rs Cr", mix_pct_latest: 60, comparability_label: "reported" },
      { segment: "Electronic assemblies", amount_by_period: { FY22: 135, FY23: 144, FY24: 147, FY25: 144, FY26: 135 }, unit: "Rs Cr", mix_pct_latest: 25, comparability_label: "reported" },
      { segment: "Medical devices", amount_by_period: { FY22: 45, FY23: 54, FY24: 63, FY25: 72, FY26: 81 }, unit: "Rs Cr", mix_pct_latest: 15, comparability_label: "reported" },
    ],
    insights: [],
  },
};
