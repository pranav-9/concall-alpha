import type { GuidanceTrackingRow, NormalizedGuidanceItem } from "@/lib/guidance-tracking/types";

export type GuidanceSnapshotRow = {
  company_code: string;
  generated_at?: string | null;
  analysis_window_quarters?: number | null;
  guidance_items?: unknown;
  source_files?: unknown;
  details?: unknown;
  updated_at?: string | null;
};

export type GuidanceSnapshotGuidanceItemRow = Omit<
  GuidanceTrackingRow,
  "id" | "company_code" | "generated_at"
>;

// Per-snapshot provenance entry (PR2 item 16). Phase 6 v2 emits these in
// `source_files` so the frontend can render click-through links back to
// the underlying transcript / PPT / annual report PDF rather than opaque
// chunk ids. Legacy snapshots may still carry raw chunk-id lists; the
// normalizer surfaces whatever is there as `sourceFiles: unknown[]`.
export type GuidanceSnapshotSourceFile = {
  source_doc_id: number;
  period_label: string | null;
  fy: number | null;
  qtr: number | null;
  doc_type: string | null;
  url: string | null;
  local_path: string | null;
};

export type NormalizedGuidanceSnapshot = {
  companyCode: string;
  generatedAtRaw: string | null;
  updatedAtRaw: string | null;
  analysisWindowQuarters: number | null;
  guidanceItems: NormalizedGuidanceItem[];
  // Heterogeneous by design — legacy rows may have number[] (chunk ids);
  // PR2-onwards rows have GuidanceSnapshotSourceFile[]. UI must handle both.
  sourceFiles: unknown[];
  details: Record<string, unknown> | null;
};

// ---------------------------------------------------------------------------
// Forward-strength layer (details.forward_strength / details.strategy_narrative)
//
// The second guidance verdict — "how strong is the guidance RIGHT NOW?" — on
// the live/forward book, distinct from the backward credibility verdict. Shape
// authority: /schemas/guidance_strength_v2.json (v1 payloads still parse: the
// per-horizon block is optional there). The deep-track producer routes these
// into the details jsonb (store_guidance_snapshot's non-promoted keys),
// alongside deep_track. These types mirror the schema and reject payloads the
// schema would reject (types-are-the-gate); malformed blocks parse to null and
// the section simply does not render the card.
//
// v2 adds `horizons`: the same ambition × evidence read separately for THIS
// YEAR (live commitments due inside the anchor FY) and the LONG TERM (the
// multi-year vision, as far out as the company set it). A cautious year-in-hand
// guide and a large unbuilt vision average away into one whole-book label, so
// the Guidance tab renders the two horizons as its top pair of cards when they
// are present and falls back to the single whole-book card when they are not.
// ---------------------------------------------------------------------------

export type AmbitionLabel = "ambitious" | "measured" | "conservative";
export type EvidenceBand = "well_evidenced" | "partly_evidenced" | "thinly_evidenced";
export type EvidenceClass = "order_backed" | "asserted" | "aspiration";

export type ForwardStrengthAmbition = {
  label: AmbitionLabel;
  rationale: string | null;
  // Deterministic guardrail written by guidance_strength_score.py. Kept for
  // provenance; the card reads the label, not the guardrail.
  guardrail: {
    fwdGrowthPct: number | null;
    trailingDeliveredCagrPct: number | null;
    ratio: number | null;
    expectedBand: AmbitionLabel | null;
    overrideFlagged: boolean;
    note: string | null;
  } | null;
};

export type ForwardStrengthEvidence = {
  label: EvidenceBand;
  liveTotal: number;
  orderBacked: number;
  asserted: number;
  aspiration: number;
};

// One horizon's verdict (schema definitions/horizon_verdict). `visionLabel` is
// the company's own name or number for its long-range frame ("'Advait 2030'",
// "₹1,000 Cr by FY30") — long-term only, null on this-year and when management
// set none.
export type ForwardStrengthHorizon = {
  horizonLabel: string; // "FY27" · "FY28–FY31"
  ambition: ForwardStrengthAmbition;
  evidence: ForwardStrengthEvidence;
  headline: string;
  supportingLine: string;
  visionLabel: string | null;
};

export type ForwardStrengthHorizons = {
  anchorFyLabel: string; // "FY27" — the FY the split was anchored on at scoring time
  thisYear: ForwardStrengthHorizon | null;
  longTerm: ForwardStrengthHorizon | null;
};

export type ForwardStrength = {
  ambition: ForwardStrengthAmbition;
  evidence: ForwardStrengthEvidence;
  headline: string;
  supportingLine: string;
  // Null on v1 payloads and on a malformed v2 block — the section then shows
  // the whole-book card. When non-null at least one horizon is populated.
  horizons: ForwardStrengthHorizons | null;
};

export type StrategyNarrative = {
  headline: string;
  body: string;
  impliedLever: {
    label: string;
    from: string | null;
    to: string | null;
    basis: string | null;
  } | null;
};

const AMBITION_LABELS: ReadonlySet<string> = new Set<AmbitionLabel>([
  "ambitious",
  "measured",
  "conservative",
]);
const EVIDENCE_BANDS: ReadonlySet<string> = new Set<EvidenceBand>([
  "well_evidenced",
  "partly_evidenced",
  "thinly_evidenced",
]);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asTrimmed = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

// The evidence counts are `integer, minimum 0` in guidance_strength_v2 — reject
// (not truncate) anything that isn't a non-negative integer, so the frontend
// gate rejects what the schema rejects (concall-alpha CLAUDE.md).
const asCount = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const parseAmbition = (raw: unknown): ForwardStrengthAmbition | null => {
  const ambitionRaw = asRecord(raw);
  const label = asTrimmed(ambitionRaw?.label);
  if (!label || !AMBITION_LABELS.has(label)) return null;
  const guardrailRaw = asRecord(ambitionRaw?.guardrail);
  const expectedBand = asTrimmed(guardrailRaw?.expected_band);
  return {
    label: label as AmbitionLabel,
    rationale: asTrimmed(ambitionRaw?.rationale),
    guardrail: guardrailRaw
      ? {
          fwdGrowthPct: asFiniteNumber(guardrailRaw.fwd_growth_pct),
          trailingDeliveredCagrPct: asFiniteNumber(guardrailRaw.trailing_delivered_cagr_pct),
          ratio: asFiniteNumber(guardrailRaw.ratio),
          expectedBand:
            expectedBand && AMBITION_LABELS.has(expectedBand) ? (expectedBand as AmbitionLabel) : null,
          overrideFlagged: guardrailRaw.override_flagged === true,
          note: asTrimmed(guardrailRaw.note),
        }
      : null,
  };
};

const parseEvidence = (raw: unknown): ForwardStrengthEvidence | null => {
  const evidenceRaw = asRecord(raw);
  const label = asTrimmed(evidenceRaw?.label);
  const liveTotal = asCount(evidenceRaw?.live_total);
  const orderBacked = asCount(evidenceRaw?.order_backed);
  const asserted = asCount(evidenceRaw?.asserted);
  const aspiration = asCount(evidenceRaw?.aspiration);
  if (
    !label ||
    !EVIDENCE_BANDS.has(label) ||
    liveTotal == null ||
    orderBacked == null ||
    asserted == null ||
    aspiration == null
  ) {
    return null;
  }
  return { label: label as EvidenceBand, liveTotal, orderBacked, asserted, aspiration };
};

// One horizon block → verdict, or null when anything the schema requires is
// missing or malformed (the card for that horizon then does not render). The
// scorer nulls a horizon with no live threads, so a null here is expected, not
// an error; `vision_label` is read only for the long-term block.
const parseHorizon = (raw: unknown, longTerm: boolean): ForwardStrengthHorizon | null => {
  const block = asRecord(raw);
  if (!block) return null;
  const horizonLabel = asTrimmed(block.horizon_label);
  const ambition = parseAmbition(block.ambition);
  const evidence = parseEvidence(block.evidence);
  const headline = asTrimmed(block.headline);
  const supportingLine = asTrimmed(block.supporting_line);
  if (!horizonLabel || !ambition || !evidence || !headline || !supportingLine) return null;
  return {
    horizonLabel,
    ambition,
    evidence,
    headline,
    supportingLine,
    visionLabel: longTerm ? asTrimmed(block.vision_label) : null,
  };
};

// The schema pins anchor_fy to /^FY\d{2}$/; anything else fails the whole
// horizons block (never a half-parsed split), and the section falls back to
// the whole-book card.
const ANCHOR_FY = /^FY\d{2}$/;

const parseHorizons = (raw: unknown): ForwardStrengthHorizons | null => {
  const block = asRecord(raw);
  if (!block) return null;
  const anchorFyLabel = asTrimmed(block.anchor_fy);
  if (!anchorFyLabel || !ANCHOR_FY.test(anchorFyLabel)) return null;
  const thisYear = parseHorizon(block.this_year, false);
  const longTerm = parseHorizon(block.long_term, true);
  if (!thisYear && !longTerm) return null;
  return { anchorFyLabel, thisYear, longTerm };
};

export function parseForwardStrength(details: Record<string, unknown> | null): ForwardStrength | null {
  const fs = asRecord(details?.forward_strength);
  if (!fs) return null;

  const ambition = parseAmbition(fs.ambition);
  if (!ambition) return null;

  const evidence = parseEvidence(fs.evidence);
  if (!evidence) return null;

  const headline = asTrimmed(fs.headline);
  const supportingLine = asTrimmed(fs.supporting_line);
  if (!headline || !supportingLine) return null;

  return {
    ambition,
    evidence,
    headline,
    supportingLine,
    horizons: parseHorizons(fs.horizons),
  };
}

export function parseStrategyNarrative(
  details: Record<string, unknown> | null,
): StrategyNarrative | null {
  const sn = asRecord(details?.strategy_narrative);
  if (!sn) return null;
  const headline = asTrimmed(sn.headline);
  const body = asTrimmed(sn.body);
  if (!headline || !body) return null;

  const leverRaw = asRecord(sn.implied_lever);
  const leverLabel = asTrimmed(leverRaw?.label);

  return {
    headline,
    body,
    impliedLever:
      leverRaw && leverLabel
        ? {
            label: leverLabel,
            from: asTrimmed(leverRaw.from),
            to: asTrimmed(leverRaw.to),
            basis: asTrimmed(leverRaw.basis),
          }
        : null,
  };
}
