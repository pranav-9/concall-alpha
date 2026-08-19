import { ConcallScoreSection } from "concall-alpha";

// CAPTURE PLUMBING, not part of the component's API. The score line is drawn by
// ChartLineLabel (app/company/[code]/chart.tsx), which never sets
// isAnimationActive and is not on the package barrel, so no preview can reach
// its <Line>. recharts tweens for 1500ms while the harness screenshots at
// ~500ms, which published a two-thirds-drawn line with unpainted dots. Skewing
// the frame timestamp forward makes react-smooth treat the tween as already
// finished, so the first painted frame is the final one. Same fix as
// SegmentRevenueDisplay's preview. The real repo fix is isAnimationActive={false}
// in chart.tsx — see NOTES.md.
if (typeof window !== "undefined" && !("__dsSettleRaf" in window)) {
  (window as unknown as Record<string, unknown>).__dsSettleRaf = true;
  const raf = window.requestAnimationFrame.bind(window);
  let skew = 0;
  window.requestAnimationFrame = (cb: FrameRequestCallback) =>
    raf((t) => {
      skew += 4000;
      cb(t + skew);
    });
}

// Trishul Speciality Chemicals (TRISHULCH) — CDMO + performance intermediates
// + agro actives, out of Dahej and Ankleshwar. Both props are plain stored
// shapes, not computed models: chartData is the score series oldest -> newest,
// detailQuarters is the concall_analysis rows NEWEST-first (index 0 is the
// quarter the section opens on). The section derives everything else itself —
// the trajectory, the rolling 4-quarter average, the per-category leans, and
// the "What to watch next quarter" block.
//
// BAND VOCABULARY: the number here reads on lib/score-band (quarterly
// sentiment: Strongly Bullish -> Strongly Bearish, cuts at 8 / 7 / 6.5 / 4.5 /
// 3). 7.6 is Bullish. The growthScore prop is on a DIFFERENT ramp
// (lib/growth-band) and is only used to detect a print-versus-outlook gap.

type Point = { qtr: string; score: number };

const SERIES: Point[] = [
  { qtr: "Q4 FY23", score: 5.4 },
  { qtr: "Q1 FY24", score: 5.1 },
  { qtr: "Q2 FY24", score: 5.6 },
  { qtr: "Q3 FY24", score: 5.4 },
  { qtr: "Q4 FY24", score: 5.9 },
  { qtr: "Q1 FY25", score: 6.0 },
  { qtr: "Q2 FY25", score: 5.8 },
  { qtr: "Q3 FY25", score: 6.2 },
  { qtr: "Q4 FY25", score: 6.1 },
  { qtr: "Q1 FY26", score: 6.3 },
  { qtr: "Q2 FY26", score: 6.6 },
  { qtr: "Q3 FY26", score: 7.0 },
  { qtr: "Q4 FY26", score: 7.2 },
  { qtr: "Q1 FY27", score: 7.6 },
];

const V4_Q1_FY27 = {
  cat_1_quantitative_decomposition: {
    state: "addressed",
    key_points: [
      "Revenue ₹512 cr, up 24% YoY, with CDMO at ₹236 cr (+38%) carrying almost the whole increment.",
      "EBITDA ₹113 cr at a 22.1% margin, 140 bps better YoY on a richer mix and softer solvent costs.",
      "Gross debt down to ₹289 cr after the ₹75 cr prepayment in June.",
    ],
  },
  cat_2_forward_guidance: {
    state: "addressed",
    key_points: [
      "FY27 revenue growth reiterated at 22-26%, unchanged for three calls.",
      "EBITDA margin guided to 22-23% for FY27 against 21.4% delivered in FY26.",
      "Capex of ₹340 cr across FY27-FY28, of which ₹120 cr falls this year.",
    ],
  },
  cat_3_strategy_capital_allocation: {
    state: "addressed",
    key_points: [
      "Dahej Unit-4 multipurpose block commissioned in May, adding 4,200 KL of reactor capacity.",
      "No further greenfield land will be bought until Unit-4 crosses 70% utilisation.",
    ],
  },
  cat_4_industry_context: {
    state: "addressed",
    key_points: [
      "Chinese intermediate pricing has stabilised after six quarters of deflation.",
      "Innovator supply-chain de-risking keeps pulling enquiries toward Indian CDMO capacity.",
    ],
  },
  cat_5_concentration_dependencies: {
    state: "absent_in_concall",
    absence_justification:
      "No analyst asked about customer or geography concentration, and the top-5 customer share was not volunteered.",
  },
  cat_6_management_quality: {
    state: "deferred_v2",
    deferred_reason: "Management-quality assessment is deferred to the v2 framework.",
  },
  cat_7_qa_signals: {
    state: "addressed",
    key_points: [
      "Management declined to name the two molecules moving to commercial supply, citing confidentiality.",
      "The agro-actives pricing answer was hedged twice; working capital drew a specific 112 days unprompted.",
    ],
  },
};

const LEANS_Q1_FY27 = {
  cat_1_quantitative_decomposition: 2,
  cat_2_forward_guidance: 1,
  cat_3_strategy_capital_allocation: 1,
  cat_4_industry_context: 0,
  cat_7_qa_signals: -1,
};

const RATIONALE_Q1_FY27 = [
  {
    direction: "positive",
    heading: "CDMO carried the quarter",
    detail: "₹236 cr of the ₹512 cr top line and essentially all of the YoY increment.",
  },
  {
    direction: "positive",
    heading: "Guidance held without hedging",
    detail: "22-26% for FY27 restated in the same words for a third consecutive call.",
  },
  {
    direction: "negative",
    heading: "Agro actives still repricing",
    detail: "Management would not commit to a recovery quarter and hedged the pricing question twice.",
  },
  {
    direction: "neutral",
    heading: "Unit-4 at 41%",
    detail: "First utilisation disclosure on the new block; the margin case needs it near 70% by March.",
  },
];

const RATIONALE_Q2_FY26 = [
  {
    direction: "negative",
    heading: "Ankleshwar shutdown ran long",
    detail: "The statutory revamp overran by four weeks and took the agro line out for the quarter.",
  },
  {
    direction: "neutral",
    heading: "FY26 guidance held",
    detail: "Management kept 18-20% but moved the shortfall into H2 without quantifying it.",
  },
];

type Quarter = {
  label: string;
  fy: number;
  qtr: number;
  start: string;
  score: number;
  rationale?: typeof RATIONALE_Q1_FY27;
};

const QUARTERS: Quarter[] = [
  { label: "Q1 FY27", fy: 2027, qtr: 1, start: "2026-04-01", score: 7.6, rationale: RATIONALE_Q1_FY27 },
  { label: "Q4 FY26", fy: 2026, qtr: 4, start: "2026-01-01", score: 7.2 },
  { label: "Q3 FY26", fy: 2026, qtr: 3, start: "2025-10-01", score: 7.0 },
  { label: "Q2 FY26", fy: 2026, qtr: 2, start: "2025-07-01", score: 6.6 },
  { label: "Q1 FY26", fy: 2026, qtr: 1, start: "2025-04-01", score: 6.3 },
  { label: "Q4 FY25", fy: 2025, qtr: 4, start: "2025-01-01", score: 6.1 },
  { label: "Q3 FY25", fy: 2025, qtr: 3, start: "2024-10-01", score: 6.2 },
  { label: "Q2 FY25", fy: 2025, qtr: 2, start: "2024-07-01", score: 5.8 },
];

const quarterRow = (q: Quarter, index: number) => ({
  id: 7300 + index,
  company_code: "TRISHULCH",
  fy: q.fy,
  qtr: q.qtr,
  quarter_start_date: q.start,
  quarter_label: q.label,
  score: q.score,
  summary: [],
  details: {
    score: q.score,
    fy: q.fy,
    qtr: q.qtr,
    rationale: q.rationale ?? RATIONALE_Q1_FY27,
    v4_categories: V4_Q1_FY27,
    score_breakdown: LEANS_Q1_FY27,
  },
});

// A pre-v4 row: scored before the seven-category breakdown existed, so it keeps
// the legacy flat fields and carries no per-category leans.
const legacyRow = (q: Quarter, index: number) => ({
  id: 7400 + index,
  company_code: "TRISHULCH",
  fy: q.fy,
  qtr: q.qtr,
  quarter_start_date: q.start,
  quarter_label: q.label,
  score: q.score,
  summary: [],
  details: {
    score: q.score,
    fy: q.fy,
    qtr: q.qtr,
    rationale: q.rationale ?? RATIONALE_Q2_FY26,
    results_summary: [
      "Revenue ₹352 cr, down 4% YoY as the Ankleshwar agro line stayed shut through the quarter.",
      "EBITDA margin 18.9%, 250 bps below Q1 on unabsorbed fixed cost.",
    ],
    guidance: "FY26 revenue growth held at 18-20%, with the shortfall pushed into H2.",
    risks: [
      "Statutory revamp at Ankleshwar overran by four weeks with no restart date given.",
      "Agro-actives realisation is being renegotiated contract by contract.",
    ],
  },
});

const SWING_VARS = [
  {
    variable: "CDMO commercial-molecule count",
    note: "two of the nine validation-stage molecules are contracted to convert in H2 FY27",
  },
  {
    variable: "Dahej Unit-4 utilisation",
    note: "the block ran at 41% in Q1; the FY27 margin band needs it near 70%",
  },
];

const detailQuarters = QUARTERS.map(quarterRow);

// The same section a year earlier, at the Q2 FY26 print: the agro-actives line
// was down for a four-week statutory revamp, the score slid two quarters, and
// the forward outlook stayed strong — which is exactly what the watch block
// exists to flag.
const FALLING: Quarter[] = [
  { label: "Q2 FY26", fy: 2026, qtr: 2, start: "2025-07-01", score: 5.9 },
  { label: "Q1 FY26", fy: 2026, qtr: 1, start: "2025-04-01", score: 6.6 },
  { label: "Q4 FY25", fy: 2025, qtr: 4, start: "2025-01-01", score: 7.1 },
  { label: "Q3 FY25", fy: 2025, qtr: 3, start: "2024-10-01", score: 7.0 },
  { label: "Q2 FY25", fy: 2025, qtr: 2, start: "2024-07-01", score: 6.8 },
  { label: "Q1 FY25", fy: 2025, qtr: 1, start: "2024-04-01", score: 6.5 },
];

const fallingChart = [...FALLING]
  .reverse()
  .map((q) => ({ qtr: q.label, score: q.score }));

// A company two quarters into coverage: enough for a chart, not enough for a
// rolling average or a range toggle.
const SHORT: Quarter[] = [
  { label: "Q1 FY27", fy: 2027, qtr: 1, start: "2026-04-01", score: 6.8 },
  { label: "Q4 FY26", fy: 2026, qtr: 4, start: "2026-01-01", score: 6.5 },
  { label: "Q3 FY26", fy: 2026, qtr: 3, start: "2025-10-01", score: 6.2 },
];

/**
 * Canonical company-page render: the verdict card (score dial, band, "why this
 * score"), the whole-series chart with its Trend badge and range toggle, the
 * collapsed category breakdown with the proportional leans strip, and the
 * forward watch block — silent here, because a 7.6 print under a 7.8 outlook on
 * a climbing series has nothing to flag.
 */
export const QuarterlyScoreTrail = () => (
  <ConcallScoreSection
    chartData={SERIES}
    detailQuarters={detailQuarters}
    growthScore={7.8}
    swingVars={SWING_VARS}
  />
);

/**
 * The forward block firing: a 5.9 print against a 7.8 outlook is a divergence,
 * the series is Worsening, and the highest-priority swing variable fills the
 * third and last slot. These are pre-v4 rows, so the breakdown header carries
 * no net-lean chip and no leans strip.
 */
export const WatchBlockFlagged = () => (
  <ConcallScoreSection
    chartData={fallingChart}
    detailQuarters={FALLING.map(legacyRow)}
    growthScore={7.8}
    swingVars={SWING_VARS}
  />
);

/**
 * Three quarters of history: no rolling average (it needs eight), no 12Q/24Q
 * range toggle (it needs more than twelve), and a Steady trajectory because
 * nothing in the window clears the ±0.5 re-score noise floor.
 */
export const ShortHistory = () => (
  <ConcallScoreSection
    chartData={[...SHORT].reverse().map((q) => ({ qtr: q.label, score: q.score }))}
    detailQuarters={SHORT.map(quarterRow)}
    growthScore={7.1}
  />
);

/**
 * Scores exist but no quarter carries a stored breakdown — the left card says
 * so plainly and the chart still renders beside it.
 */
export const NoQuarterlyContext = () => (
  <ConcallScoreSection chartData={SERIES} detailQuarters={[]} growthScore={7.8} />
);
