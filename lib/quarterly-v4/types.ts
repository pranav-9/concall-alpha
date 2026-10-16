// Quarterly v4-category breakdown — frontend types + validation gate.
//
// v4 lives as `concall_analysis.details.v4_categories` (produced by Phase 1's
// scorer; see concallyser/app/phase1_sentiment/v4_categories.py). This file
// validates that categories OBJECT (the seven cats), not a standalone-table row.
// Mirrors the Python coerce rules:
//   1. content cat addressed          ⇒ 1-3 key_points
//   2. content cat absent_in_concall  ⇒ non-empty absence_justification, no key_points
//   3. cat_6_management_quality        ⇒ state === "deferred_v2"
//
// Each content category surfaces up to 3 ranked key_points (most important first).
//
// key_points items come in two shapes (structural authority:
// /schemas/quarterly_v4_extraction_v2.json → definitions.keyPoint):
//   - legacy: a plain sentence (rows scored before 2026-10-16);
//   - structured: {heading, detail, metric?, quote?, watch?, tone?} — the shape
//     the card design renders as a bold lead, a right-aligned figure tag, the
//     body, an optional verbatim quote and an amber "watch" phrase.
// Both validate; the normalizer folds a string into {heading: null, detail}.

export type ContentState = "addressed" | "absent_in_concall" | "deferred_v2";

export const MAX_KEY_POINTS = 3;

export const DEFERRED_V2_CATS = ["cat_6_management_quality"] as const;

export const KEY_POINT_TONES = ["positive", "negative", "neutral", "minor"] as const;
export type KeyPointTone = (typeof KEY_POINT_TONES)[number];

export type StructuredKeyPoint = {
  heading: string;
  detail: string;
  // Short figure tag, e.g. "Guide ~15% · H1 10–15%". Numbers only — no prose.
  metric?: string | null;
  // Verbatim words from the call (or deck). Never paraphrased.
  quote?: string | null;
  // What to watch next on this point, e.g. "Year-end update deferred to Q3."
  watch?: string | null;
  // positive / negative = the point itself helps or hurts the quarter's read;
  // neutral = in line (default); minor = a compact aside ("also unchanged: …").
  tone?: KeyPointTone | null;
};

export type KeyPoint = string | StructuredKeyPoint;

export type ContentCategory = {
  state: "addressed" | "absent_in_concall";
  key_points?: KeyPoint[];
  absence_justification?: string | null;
};

export type Cat6ManagementQuality = {
  state: "deferred_v2";
  deferred_reason?: string | null;
};

export type QuarterlyV4Categories = {
  cat_1_quantitative_decomposition: ContentCategory;
  cat_2_forward_guidance: ContentCategory;
  cat_3_strategy_capital_allocation: ContentCategory;
  cat_4_industry_context: ContentCategory;
  cat_5_concentration_dependencies: ContentCategory;
  cat_6_management_quality: Cat6ManagementQuality;
  cat_7_qa_signals: ContentCategory;
};

export const CATEGORY_KEYS = [
  "cat_1_quantitative_decomposition",
  "cat_2_forward_guidance",
  "cat_3_strategy_capital_allocation",
  "cat_4_industry_context",
  "cat_5_concentration_dependencies",
  "cat_6_management_quality",
  "cat_7_qa_signals",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

// One label set used by BOTH the coverage strip and the cards, so they can't
// drift (kept concise enough to fit the strip pills).
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  cat_1_quantitative_decomposition: "Financial results",
  cat_2_forward_guidance: "Guidance",
  cat_3_strategy_capital_allocation: "Strategy",
  cat_4_industry_context: "Industry",
  cat_5_concentration_dependencies: "Concentration",
  cat_6_management_quality: "Mgmt quality",
  cat_7_qa_signals: "Q&A",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function optionalString(v: unknown): boolean {
  return v === undefined || v === null || typeof v === "string";
}

// A key point is a non-empty string, or an object with non-empty heading +
// detail, string-or-null extras, and a tone from KEY_POINT_TONES when set.
export function isValidKeyPoint(p: unknown): p is KeyPoint {
  if (typeof p === "string") return p.trim().length > 0;
  if (!isRecord(p)) return false;
  if (!nonEmpty(p.heading) || !nonEmpty(p.detail)) return false;
  if (!optionalString(p.metric) || !optionalString(p.quote) || !optionalString(p.watch)) {
    return false;
  }
  if (p.tone !== undefined && p.tone !== null) {
    if (!(KEY_POINT_TONES as readonly unknown[]).includes(p.tone)) return false;
  }
  return true;
}

function isValidCategory(v: unknown, key: CategoryKey): boolean {
  if (!isRecord(v)) return false;

  if ((DEFERRED_V2_CATS as readonly string[]).includes(key)) {
    return v.state === "deferred_v2";
  }
  if (v.state === "addressed") {
    if (!Array.isArray(v.key_points)) return false;
    const points = v.key_points.filter(isValidKeyPoint);
    return points.length >= 1 && points.length <= MAX_KEY_POINTS;
  }
  if (v.state === "absent_in_concall") {
    const j = v.absence_justification;
    if (typeof j !== "string" || j.trim().length === 0) return false;
    if (Array.isArray(v.key_points) && v.key_points.length > 0) return false;
    return true;
  }
  return false;
}

/**
 * Fail-closed gate over the v4 categories object (concall_analysis.details.v4_categories).
 * Returns the typed categories if all seven satisfy the rules, else null.
 */
export function validateQuarterlyV4Categories(raw: unknown): QuarterlyV4Categories | null {
  if (!isRecord(raw)) return null;
  for (const key of CATEGORY_KEYS) {
    if (!(key in raw)) return null;
    if (!isValidCategory(raw[key], key)) return null;
  }
  return raw as QuarterlyV4Categories;
}
