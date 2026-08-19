import { V4CategoryCards, V4CoverageStrip, V4LeansStrip } from "concall-alpha";
// V4CategoryCards takes the ALREADY-NORMALIZED categories. The normalizer is a
// fail-closed gate (all seven cats must satisfy the state rules or it returns
// null), so building the array by hand would let a shape through that the
// portal would refuse to render. lib/quarterly-v4 is pure TS.
import { normalizeQuarterlyV4Categories } from "@/lib/quarterly-v4/normalize";

// Trishul Speciality Chemicals (TRISHULCH), Q1 FY27 concall — the seven v4
// information categories exactly as Phase 1 stores them in
// concall_analysis.details.v4_categories, with the sibling score_breakdown
// carrying each addressed category's -2..+2 lean.
const Q1_FY27_RAW = {
  cat_1_quantitative_decomposition: {
    state: "addressed",
    key_points: [
      "Revenue ₹512 cr, up 24% YoY, with CDMO at ₹236 cr (+38%) carrying almost the whole increment.",
      "EBITDA ₹113 cr at a 22.1% margin, 140 bps better YoY on a richer CDMO mix and softer solvent costs.",
      "PAT ₹61 cr; gross debt down to ₹289 cr after the ₹75 cr repayment in June.",
    ],
  },
  cat_2_forward_guidance: {
    state: "addressed",
    key_points: [
      "FY27 revenue growth reiterated at 22-26%, unchanged from the Q4 FY26 call.",
      "EBITDA margin guided to 22-23% for FY27, up from 21.4% delivered in FY26.",
      "Capex of ₹340 cr across FY27-FY28, of which ₹120 cr falls in FY27.",
    ],
  },
  cat_3_strategy_capital_allocation: {
    state: "addressed",
    key_points: [
      "Dahej Unit-4 multipurpose block commissioned in May, adding 4,200 KL of reactor capacity.",
      "Management reiterated that no further greenfield land will be bought until Unit-4 crosses 70% utilisation.",
    ],
  },
  cat_4_industry_context: {
    state: "addressed",
    key_points: [
      "Chinese intermediate pricing has stabilised after six quarters of deflation, easing the pass-through pressure.",
      "Innovator de-risking of supply chains continues to pull enquiries toward Indian CDMO capacity.",
    ],
  },
  cat_5_concentration_dependencies: {
    state: "absent_in_concall",
    absence_justification:
      "No analyst asked about customer or geography concentration, and management did not volunteer the top-5 customer share this quarter.",
  },
  cat_6_management_quality: {
    state: "deferred_v2",
    deferred_reason: "Management-quality assessment is deferred to the v2 framework.",
  },
  cat_7_qa_signals: {
    state: "addressed",
    key_points: [
      "Management declined to name the two molecules moving to commercial supply, citing customer confidentiality.",
      "The agro-actives pricing answer was hedged twice; the working-capital question drew a specific 112 days unprompted.",
    ],
  },
};

const Q1_FY27_LEANS = {
  cat_1_quantitative_decomposition: 2,
  cat_2_forward_guidance: 1,
  cat_3_strategy_capital_allocation: 1,
  cat_4_industry_context: 0,
  cat_7_qa_signals: -1,
};

const q1 = normalizeQuarterlyV4Categories(Q1_FY27_RAW, "Q1 FY27", Q1_FY27_LEANS)!;

// A thinner quarter: a short update call where only results and guidance were
// covered. Three content cats came back absent, so only two cards render.
const THIN_RAW = {
  ...Q1_FY27_RAW,
  cat_3_strategy_capital_allocation: {
    state: "absent_in_concall",
    absence_justification: "No capital-allocation commentary on this call; the capex plan was last restated in Q4 FY26.",
  },
  cat_4_industry_context: {
    state: "absent_in_concall",
    absence_justification: "Management stayed company-specific throughout; no industry or channel commentary.",
  },
  cat_7_qa_signals: {
    state: "absent_in_concall",
    absence_justification: "The call ran 22 minutes with no Q&A segment.",
  },
};

const thin = normalizeQuarterlyV4Categories(THIN_RAW, "Q3 FY26", {
  cat_1_quantitative_decomposition: 1,
  cat_2_forward_guidance: 0,
})!;

const gridClass = "grid grid-cols-1 gap-3";
const caption = "text-[11px] leading-relaxed text-muted-foreground";
const heading =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

/**
 * Canonical: the whole quarter-breakdown block from the ConcallScore section —
 * the proportional leans strip, the coverage strip, then the addressed cards.
 * Only V4CategoryCards has its own card here; the two strips ship from the same
 * module and the cards are close to meaningless without them.
 */
export const QuarterBreakdown = () => (
  <div className="space-y-3">
    <div className="space-y-1.5">
      <V4LeansStrip categories={q1.categories} />
      <p className="text-[10px] text-muted-foreground">
        Click a segment to open that category&rsquo;s detail; expand for all cards.
      </p>
    </div>
    <V4CoverageStrip categories={q1.categories} />
    <div className={gridClass}>
      <V4CategoryCards categories={q1.categories} />
    </div>
  </div>
);

/**
 * focusKey — set when the reader clicks a segment in the leans strip. That card
 * takes an anchor id and a highlight ring; everything else is unchanged.
 */
export const FocusedCategory = () => (
  <div className="space-y-2">
    <p className={heading}>Q&amp;A signals selected from the leans strip</p>
    <div className={gridClass}>
      <V4CategoryCards categories={q1.categories} focusKey="cat_7_qa_signals" />
    </div>
  </div>
);

/**
 * omit — used when a category is rendered somewhere else on the page (financial
 * results sits beside the chart in the wide layout) so it is not drawn twice.
 */
export const OmittedCategory = () => (
  <div className="space-y-2">
    <p className={heading}>Financial results omitted — rendered beside the chart</p>
    <div className={gridClass}>
      <V4CategoryCards
        categories={q1.categories}
        omit={["cat_1_quantitative_decomposition"]}
      />
    </div>
  </div>
);

/**
 * A thin call. Absent and deferred categories never become cards — they exist
 * only in the coverage strip — so three of the seven silently drop out here.
 */
export const AbsentCategoriesDropOut = () => (
  <div className="space-y-3">
    <V4CoverageStrip categories={thin.categories} />
    <div className={gridClass}>
      <V4CategoryCards categories={thin.categories} />
    </div>
    <p className={caption}>
      Guidance carries a zero lean, so it shows an &ldquo;In line&rdquo; chip with no signed
      number and contributes no segment to the leans strip.
    </p>
  </div>
);
