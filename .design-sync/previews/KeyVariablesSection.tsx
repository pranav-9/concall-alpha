import { KeyVariablesSection } from "concall-alpha";
// The section takes an already-normalized snapshot whose KPI history, transition
// flags and dropped list are all coerced (a "demoted" transition, for instance,
// legally becomes null). Running the real normalizer keeps the fixture inside
// what the pipeline can actually emit; lib/key-variables-snapshot/normalize is
// pure TS.
import { normalizeKeyVariablesSnapshot } from "@/lib/key-variables-snapshot/normalize";

// Trishul Speciality Chemicals (TRISHULCH) — CDMO + performance intermediates
// + agro actives, out of Dahej and Ankleshwar. Q1 FY27 snapshot.
const PERIODS = ["Q3 FY26", "Q4 FY26", "Q1 FY27"];

const FULL_LIST = [
  {
    variable: "CDMO commercial-molecule count",
    why_flagged:
      "Management quantifies the validation-to-commercial funnel on every call, and it is the single input the FY28 CDMO target hangs on.",
    source_basis: "both",
  },
  {
    variable: "Dahej Unit-4 utilisation",
    why_flagged:
      "The new multipurpose block carries most of the FY27 margin guidance; utilisation is disclosed quarterly in the investor deck.",
    source_basis: "presentation",
  },
  {
    variable: "Gross margin per KL of reactor capacity",
    why_flagged:
      "Standard speciality-chemicals productivity measure; reconstructable from the segment tables even though management never quotes it.",
    source_basis: "industry_standard",
  },
  {
    variable: "Net working capital days",
    why_flagged:
      "Management volunteered 112 days unprompted in Q1 FY27 after three quarters of not disclosing it.",
    source_basis: "concall",
  },
  {
    variable: "Share of revenue from the top five customers",
    why_flagged: "Disclosed annually in the annual report; not restated on calls.",
    source_basis: "annual_report",
  },
];

const DEEP_TREATMENT = [
  {
    variable: "CDMO commercial-molecule count",
    kpi_history: {
      periods: PERIODS,
      rows: [
        {
          metric: "Molecules in commercial supply",
          values_by_period: { "Q3 FY26": 6, "Q4 FY26": 7, "Q1 FY27": 7 },
        },
        {
          metric: "Molecules in Phase-3 validation",
          values_by_period: { "Q3 FY26": 6, "Q4 FY26": 8, "Q1 FY27": 9 },
        },
        {
          metric: "CDMO revenue (₹ cr)",
          values_by_period: { "Q3 FY26": 188, "Q4 FY26": 214, "Q1 FY27": 236 },
        },
      ],
    },
    current_read:
      "Seven molecules in commercial supply against nine in validation — the widest the funnel has been. Two of the nine are contracted to convert in H2 FY27, which is what the FY28 doubling target is built on.",
    what_it_tracks:
      "How many customer molecules have crossed from development campaigns into repeat commercial supply.",
    why_it_matters_now:
      "Commercial molecules carry three-to-five-year visibility; validation molecules carry none.",
    trend_interpretation:
      "One molecule a year has converted for three years while the validation queue has grown faster. Conversion, not enquiry flow, is the constraint.",
    transition: "retained",
  },
  {
    variable: "Dahej Unit-4 utilisation",
    kpi_history: {
      periods: PERIODS,
      rows: [
        {
          metric: "Reactor capacity commissioned (KL)",
          values_by_period: { "Q3 FY26": 0, "Q4 FY26": 0, "Q1 FY27": 4200 },
        },
        {
          metric: "Utilisation (%)",
          values_by_period: { "Q3 FY26": null, "Q4 FY26": null, "Q1 FY27": 41 },
        },
      ],
    },
    current_read:
      "Unit-4 was commissioned in May and ran at 41% through the June quarter. Management has said the FY27 margin band assumes it exits the year near 70%.",
    what_it_tracks:
      "Loading of the 4,200 KL multipurpose block at Dahej, the only capacity addition in the FY27-FY28 capex plan.",
    why_it_matters_now:
      "Fixed cost on the block is already in the P&L. Every 10 points of utilisation is worth roughly 60 bps of consolidated EBITDA margin on our own arithmetic.",
    trend_interpretation:
      "One quarter of data, so the level matters more than the slope. It is disclosed in the deck, not the transcript, which is why it was only promoted this quarter.",
    transition: "promoted",
    transition_reason:
      "Unit-4 moved from a capex line item to a live utilisation disclosure in the Q1 FY27 deck, so it now carries a trackable series.",
  },
];

const DROPPED = [
  {
    variable: "Solvent recovery ratio",
    reason:
      "Held between 91% and 93% for six quarters with no commentary attached — stable and low-signal, displaced by Unit-4 utilisation.",
  },
  {
    variable: "Export share of revenue",
    reason:
      "Now fully explained by the CDMO mix variable above; tracking both double-counted the same driver.",
  },
];

const SYNTHESIS =
  "Two variables carry this company: how fast validation-stage CDMO molecules convert into commercial supply, and how quickly the new Dahej block fills. The first sets the FY28 revenue target; the second sets the FY27 margin band.";

const DISCOVERY = {
  total_candidates_considered: 14,
  selected_full_list_count: 5,
  selected_deep_treatment_count: 2,
  selection_priority_stack:
    "growth_quality_signal>source_availability>incremental_insight",
};

// The section stacks one card per deep-treatment variable in a single column
// (its 2-up grid is xl-only), so each preview shows ONE variable end to end
// rather than cutting the second card off mid-sentence.
const retained = normalizeKeyVariablesSnapshot({
  company_code: "TRISHULCH",
  generated_at: "2026-08-14T09:20:00+05:30",
  updated_at: "2026-08-14T09:20:00+05:30",
  section_synthesis: SYNTHESIS,
  discovery_summary: DISCOVERY,
  full_variable_list: { variables: FULL_LIST },
  deep_treatment: { variables: [DEEP_TREATMENT[0]] },
})!;

const promoted = normalizeKeyVariablesSnapshot({
  company_code: "TRISHULCH",
  generated_at: "2026-08-14T09:20:00+05:30",
  updated_at: "2026-08-14T09:20:00+05:30",
  section_synthesis: null,
  discovery_summary: DISCOVERY,
  full_variable_list: { variables: FULL_LIST },
  deep_treatment: { variables: [DEEP_TREATMENT[1]], dropped_variables: DROPPED },
})!;

// Discovery ran and produced a shortlist rationale, but no variable cleared the
// bar for deep treatment yet — a real state for a newly onboarded company with
// two transcripts.
const discoveryOnly = normalizeKeyVariablesSnapshot({
  company_code: "TRISHULCH",
  generated_at: "2026-06-02T11:40:00+05:30",
  updated_at: "2026-06-02T11:40:00+05:30",
  section_synthesis: null,
  discovery_summary: {
    total_candidates_considered: 9,
    selected_full_list_count: 3,
    selected_deep_treatment_count: 0,
    selection_priority_stack: "source_availability>growth_quality_signal",
  },
  full_variable_list: { variables: FULL_LIST.slice(0, 3) },
  deep_treatment: { variables: [] },
})!;

// Synthesis promoted ahead of the KPI series — the reader gets the read even
// though no variable has a trackable history yet.
const synthesisOnly = normalizeKeyVariablesSnapshot({
  company_code: "TRISHULCH",
  generated_at: "2026-07-08T18:05:00+05:30",
  updated_at: "2026-07-08T18:05:00+05:30",
  section_synthesis: SYNTHESIS,
  discovery_summary: {
    total_candidates_considered: 14,
    selected_full_list_count: 5,
    selected_deep_treatment_count: 0,
    selection_priority_stack:
      "growth_quality_signal>source_availability>incremental_insight",
  },
  full_variable_list: { variables: FULL_LIST },
  deep_treatment: { variables: [] },
})!;

const caption = "text-[11px] leading-relaxed text-muted-foreground";

/**
 * Canonical company-page render: the synthesis block, the discovery drawer
 * trigger, and a retained deep-treatment variable with its KPI history table,
 * per-period deltas, sparkline and the four prose blocks under it.
 */
export const DeepTreatmentVariable = () => (
  <KeyVariablesSection
    snapshot={retained}
    companyCode="TRISHULCH"
    companyName="Trishul Speciality Chemicals"
  />
);

/**
 * A variable promoted into deep treatment this quarter: it carries the
 * "Newly deep-tracked" chip, a Why Promoted block, and the two variables it
 * displaced in the collapsed "No longer deep-tracked" disclosure.
 */
export const NewlyPromotedVariable = () => (
  <KeyVariablesSection
    snapshot={promoted}
    companyCode="TRISHULCH"
    companyName="Trishul Speciality Chemicals"
  />
);

/**
 * Synthesis without a KPI series. The deep-treatment grid is skipped entirely
 * rather than replaced by an empty-state block — the synthesis is the answer.
 */
export const SynthesisWithoutSeries = () => (
  <KeyVariablesSection
    snapshot={synthesisOnly}
    companyCode="TRISHULCH"
    companyName="Trishul Speciality Chemicals"
  />
);

/**
 * Discovery ran, nothing was promoted, and there is no synthesis either — the
 * one case that renders the explicit empty line. The selection context is still
 * reachable through the drawer trigger above it.
 */
export const NoDeepTreatmentYet = () => (
  <div className="space-y-2">
    <KeyVariablesSection
      snapshot={discoveryOnly}
      companyCode="TRISHULCH"
      companyName="Trishul Speciality Chemicals"
    />
    <p className={caption}>
      With no synthesis, no shortlist and no discovery summary at all the normalizer returns
      null and the page renders MissingSectionState instead of this component.
    </p>
  </div>
);
