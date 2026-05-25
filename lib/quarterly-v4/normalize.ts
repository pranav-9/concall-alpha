// Quarterly v4 — concall_analysis.details.v4_categories → display shape.
//
// Fail-closed: the raw categories object is validated via
// validateQuarterlyV4Categories before any display mapping. Invalid → null, so
// the breakdown renders nothing rather than half-broken content.

import {
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  validateQuarterlyV4Categories,
  type CategoryKey,
  type ContentState,
} from "./types";

export type NormalizedCategory = {
  key: CategoryKey;
  number: number; // 1..7 for display
  label: string;
  state: ContentState;
  keyPoints: string[]; // ranked, most important first (addressed only)
  absenceJustification: string | null;
  deferredReason: string | null;
};

export type NormalizedQuarterlyV4 = {
  quarterLabel: string;
  categories: NormalizedCategory[];
};

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return null;
}

function keyPointsOf(cat: Record<string, unknown>): string[] {
  if (!Array.isArray(cat.key_points)) return [];
  return cat.key_points
    .map(asString)
    .filter((s): s is string => Boolean(s))
    .slice(0, 3);
}

/**
 * Normalize the v4 categories object from concall_analysis.details.v4_categories.
 * `quarterLabel` comes from the concall_analysis row.
 */
export function normalizeQuarterlyV4Categories(
  raw: unknown,
  quarterLabel: string,
): NormalizedQuarterlyV4 | null {
  const validated = validateQuarterlyV4Categories(raw);
  if (!validated) return null;

  const categories: NormalizedCategory[] = CATEGORY_KEYS.map((key, idx) => {
    const cat = validated[key] as Record<string, unknown>;
    return {
      key,
      number: idx + 1,
      label: CATEGORY_LABELS[key],
      state: cat.state as ContentState,
      keyPoints: cat.state === "addressed" ? keyPointsOf(cat) : [],
      absenceJustification: asString(cat.absence_justification),
      deferredReason: asString(cat.deferred_reason),
    };
  });

  return { quarterLabel, categories };
}
