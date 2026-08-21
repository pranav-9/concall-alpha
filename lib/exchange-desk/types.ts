// Exchange Desk — frontend payload types for the classified BSE announcement
// feed. Mirrors ../../../schemas/bse_announcement_v1.json (material rows only).
// See lib/exchange-desk.ts for the loader that fetches + buckets these.

export type ExchangeCategory =
  | "order_win"
  | "capex"
  | "ma"
  | "fundraise"
  | "product_approval"
  | "partnership"
  | "rating"
  | "business_update";

export type RecencyBucketKey = "today" | "week" | "earlier";

/**
 * Signed impact axis — how a reader should weigh the news. Ordered strongest-
 * positive to strongest-negative. Drives the coloured badge on each row.
 */
export type ExchangeImpact =
  | "transformative"
  | "positive"
  | "neutral"
  | "negative"
  | "severe";

/**
 * Badge display per impact tier. `className` styles the pill: the extremes get a
 * filled tint + weight, the middle tiers a plain coloured word, all on the house
 * signal/alarm/ink tokens so it reads correctly in both themes.
 */
export const IMPACT_META: Record<
  ExchangeImpact,
  { label: string; className: string }
> = {
  transformative: {
    label: "Transformative",
    className:
      "border-transparent bg-[color-mix(in_srgb,var(--signal)_16%,transparent)] text-[var(--signal)] font-semibold",
  },
  positive: {
    label: "Positive",
    className: "border-[var(--rule)] text-[var(--signal)]",
  },
  neutral: {
    label: "Routine",
    className: "border-[var(--rule)] text-[var(--ink-soft)]",
  },
  negative: {
    label: "Negative",
    className: "border-[var(--rule)] text-[var(--alarm)]",
  },
  severe: {
    label: "Severe",
    className:
      "border-transparent bg-[color-mix(in_srgb,var(--alarm)_16%,transparent)] text-[var(--alarm)] font-semibold",
  },
};

export function coerceImpact(value: string | null | undefined): ExchangeImpact {
  return value != null && value in IMPACT_META
    ? (value as ExchangeImpact)
    : "neutral";
}

/**
 * Tab order for the impact/quality filter — strongest-positive to strongest-
 * negative, the same good→bad reading as the badge axis.
 */
export const IMPACT_ORDER: ExchangeImpact[] = [
  "transformative",
  "positive",
  "neutral",
  "negative",
  "severe",
];

/**
 * Filter-tab labels. Distinct from IMPACT_META's badge labels on purpose: the
 * neutral tier's per-row badge reads "Routine", but its tab reads "Neutral".
 */
export const IMPACT_TAB_LABEL: Record<ExchangeImpact, string> = {
  transformative: "Transformative",
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  severe: "Severe",
};

/**
 * Build the impact/quality filter facet from a set of updates: count by tier,
 * walk IMPACT_ORDER, and keep only tiers that have rows (so an empty tier — e.g.
 * Severe on a quiet week — gets no tab). Pure and dependency-free so the loader
 * and the unit test can both call it. `total` is not derived here; the "All" tab
 * uses the payload's own `total`.
 */
export function buildImpactFacet(
  updates: { impact: ExchangeImpact }[],
): { key: ExchangeImpact; label: string; count: number }[] {
  const counts = new Map<ExchangeImpact, number>();
  for (const u of updates) {
    counts.set(u.impact, (counts.get(u.impact) ?? 0) + 1);
  }
  return IMPACT_ORDER.filter((key) => (counts.get(key) ?? 0) > 0).map((key) => ({
    key,
    label: IMPACT_TAB_LABEL[key],
    count: counts.get(key) ?? 0,
  }));
}

/** Display metadata per category, in the order tabs should appear. */
export const CATEGORY_META: { key: ExchangeCategory; label: string }[] = [
  { key: "order_win", label: "Order Wins" },
  { key: "capex", label: "Capex & Expansion" },
  { key: "ma", label: "M&A / Investment" },
  { key: "fundraise", label: "Fundraising" },
  { key: "product_approval", label: "Product & Approvals" },
  { key: "partnership", label: "Partnerships" },
  { key: "rating", label: "Credit Rating" },
  { key: "business_update", label: "Business Update" },
];

const CATEGORY_LABELS: Record<ExchangeCategory, string> = Object.fromEntries(
  CATEGORY_META.map((c) => [c.key, c.label]),
) as Record<ExchangeCategory, string>;

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as ExchangeCategory] ?? "Update";
}

export function isKnownCategory(category: string): category is ExchangeCategory {
  return category in CATEGORY_LABELS;
}

/** One classified, material announcement, ready to render on the Desk. */
export type ExchangeUpdate = {
  id: string;
  companyCode: string;
  companyName: string;
  category: ExchangeCategory;
  categoryLabel: string;
  /** Signed impact tier — good/bad read at a glance. */
  impact: ExchangeImpact;
  /** Plain-English one-liner from the classifier. */
  summary: string;
  headline: string;
  /** BSE attachment (the actual filing PDF); null when the filing had none. */
  attachmentUrl: string | null;
  filedRaw: string;
  /** Server-computed relative label ("2h ago"), so the client can't drift it. */
  filedLabel: string;
  bucketKey: RecencyBucketKey;
};

export type ExchangeDeskData = {
  updates: ExchangeUpdate[];
  /**
   * Impact/quality facets present in the current window, with counts, in tab
   * order (IMPACT_ORDER, empty tiers dropped). Drives the filter tabs.
   */
  impacts: { key: ExchangeImpact; label: string; count: number }[];
  total: number;
  windowDays: number;
  /**
   * Material filings from names just below the coverage cut (Gate 2 —
   * excluded_from_discovery — only, NOT large-cap admissions). Surfaced in a
   * separate, de-emphasized block so a strong update on a below-cut name isn't
   * missed — it might be the thing that earns the name back into the ranked
   * hundred — without diluting the covered-100 feed above it.
   */
  belowCut: ExchangeUpdate[];
};
