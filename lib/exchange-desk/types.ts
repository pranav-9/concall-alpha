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
};
