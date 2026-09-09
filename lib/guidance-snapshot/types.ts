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
// authority: /schemas/guidance_strength_v1.json. The deep-track producer routes
// these into the details jsonb (store_guidance_snapshot's non-promoted keys),
// alongside deep_track. These types mirror the schema and reject payloads the
// schema would reject (types-are-the-gate); malformed blocks parse to null and
// the section simply does not render the card.
// ---------------------------------------------------------------------------

export type AmbitionLabel = "ambitious" | "measured" | "conservative";
export type EvidenceBand = "well_evidenced" | "partly_evidenced" | "thinly_evidenced";
export type EvidenceClass = "order_backed" | "asserted" | "aspiration";

export type ForwardStrength = {
  ambition: {
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
  evidence: {
    label: EvidenceBand;
    liveTotal: number;
    orderBacked: number;
    asserted: number;
    aspiration: number;
  };
  headline: string;
  supportingLine: string;
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

// The evidence counts are `integer, minimum 0` in guidance_strength_v1 — reject
// (not truncate) anything that isn't a non-negative integer, so the frontend
// gate rejects what the schema rejects (concall-alpha CLAUDE.md).
const asCount = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function parseForwardStrength(details: Record<string, unknown> | null): ForwardStrength | null {
  const fs = asRecord(details?.forward_strength);
  if (!fs) return null;

  const ambitionRaw = asRecord(fs.ambition);
  const ambitionLabel = asTrimmed(ambitionRaw?.label);
  if (!ambitionLabel || !AMBITION_LABELS.has(ambitionLabel)) return null;

  const evidenceRaw = asRecord(fs.evidence);
  const evidenceLabel = asTrimmed(evidenceRaw?.label);
  const liveTotal = asCount(evidenceRaw?.live_total);
  const orderBacked = asCount(evidenceRaw?.order_backed);
  const asserted = asCount(evidenceRaw?.asserted);
  const aspiration = asCount(evidenceRaw?.aspiration);
  if (
    !evidenceLabel ||
    !EVIDENCE_BANDS.has(evidenceLabel) ||
    liveTotal == null ||
    orderBacked == null ||
    asserted == null ||
    aspiration == null
  ) {
    return null;
  }

  const headline = asTrimmed(fs.headline);
  const supportingLine = asTrimmed(fs.supporting_line);
  if (!headline || !supportingLine) return null;

  const guardrailRaw = asRecord(ambitionRaw?.guardrail);
  const expectedBand = asTrimmed(guardrailRaw?.expected_band);

  return {
    ambition: {
      label: ambitionLabel as AmbitionLabel,
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
    },
    evidence: {
      label: evidenceLabel as EvidenceBand,
      liveTotal,
      orderBacked,
      asserted,
      aspiration,
    },
    headline,
    supportingLine,
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
