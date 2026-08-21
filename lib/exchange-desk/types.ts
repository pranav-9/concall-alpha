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
  /** Category facets present in the current window, with counts, tab order. */
  categories: { key: ExchangeCategory; label: string; count: number }[];
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
