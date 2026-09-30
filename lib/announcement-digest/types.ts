import { z } from "zod";

import {
  categoryLabel,
  IMPACT_META,
  type ExchangeCategory,
  type ExchangeImpact,
} from "@/lib/exchange-desk/types";

// ---------------------------------------------------------------------------
// Announcement Digest — the company Announcements tab's two synthesis cards
// ("The quarter in filings" + "The one that matters"). One row per company in
// company_announcement_digest; `payload` mirrors
// ../../../schemas/announcement_digest_v1.json, produced by
// concallyser/scripts/synthesize_announcements.py. The zod schema below is the
// runtime validator AND the TypeScript source of truth — derived from the JSON
// schema, never from a stored row.
// ---------------------------------------------------------------------------

export type AnnouncementDigestRow = {
  company_code: string;
  payload: unknown;
  generated_at?: string | null;
  substrate_hash?: string | null;
  model?: string | null;
  updated_at?: string | null;
};

export const ACTIVITY_KEYS = [
  "order_led",
  "capacity_build",
  "deal_making",
  "raising_capital",
  "operating_updates",
  "routine",
  "mixed",
] as const;
export type ActivityKey = (typeof ACTIVITY_KEYS)[number];

/** Pill label per activity — the closed vocabulary the producer derives in Python. */
export const ACTIVITY_LABEL: Record<ActivityKey, string> = {
  order_led: "Order-led",
  capacity_build: "Capacity build",
  deal_making: "Deal-making",
  raising_capital: "Raising capital",
  operating_updates: "Operating updates",
  routine: "Routine tape",
  mixed: "Mixed tape",
};

const CATEGORY_KEYS = [
  "order_win",
  "capex",
  "ma",
  "fundraise",
  "product_approval",
  "partnership",
  "rating",
  "business_update",
] as const satisfies readonly ExchangeCategory[];

const IMPACT_KEYS = [
  "transformative",
  "positive",
  "neutral",
  "negative",
  "severe",
] as const satisfies readonly ExchangeImpact[];

export const VALUE_BASES = ["order value", "capex outlay", "deal value", "issue size", "other"] as const;

export const ChipSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  detail: z.string().nullable().optional(),
});

export const ScaleSchema = z.object({
  value_cr: z.number().positive(),
  value_basis: z.enum(VALUE_BASES),
  basis_label: z.string().min(1),
  basis_value_cr: z.number().positive(),
  ratio_pct: z.number().min(0),
});

export const BiggestSchema = z.object({
  announcement_id: z.string().min(1),
  filed_at: z.string().min(1),
  headline: z.string(),
  /** The tape row's classified one-liner — the card title when the row is off the loaded tape. */
  summary: z.string(),
  category: z.enum(CATEGORY_KEYS),
  impact: z.enum(IMPACT_KEYS),
  what: z.string().min(20).max(300),
  so_what: z.string().min(20).max(300),
  scale: ScaleSchema.nullable(),
  pick_reason: z.string().min(1).max(160),
  picked_by: z.enum(["rule", "model"]),
  pdf_read: z.boolean(),
});

export const AnnouncementDigestPayloadSchema = z.object({
  company_code: z.string().min(1),
  generated_at: z.string().min(1),
  model: z.string(),
  prompt_version: z.string(),
  window: z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    days: z.number().int().positive(),
  }),
  substrate: z.object({
    announcement_ids: z.array(z.string()).min(1),
    max_filed_at: z.string().min(1),
    material_count: z.number().int().min(1),
    hash: z.string().min(8),
  }),
  summary: z.object({
    activity: z.enum(ACTIVITY_KEYS),
    text: z.string().min(40).max(480),
    chips: z.array(ChipSchema).max(3),
  }),
  biggest: BiggestSchema.nullable(),
});

export type AnnouncementDigestPayload = z.infer<typeof AnnouncementDigestPayloadSchema>;

// ---------------------------------------------------------------------------
// Display shape.
// ---------------------------------------------------------------------------

export type DigestChip = { label: string; value: string; detail: string | null };

export type DigestScale = {
  valueCr: number;
  /** "₹2,329 cr" */
  valueLabel: string;
  valueBasis: (typeof VALUE_BASES)[number];
  /** "FY26 revenue" */
  basisLabel: string;
  /** "₹5,200 cr" */
  basisValueLabel: string;
  ratioPct: number;
  /** "≈ 45% of FY26 revenue" */
  ratioLabel: string;
};

export type DigestBiggest = {
  announcementId: string;
  filedAt: string;
  /** "14 Sept" (or "14 Sept 2025" when not this year) */
  filedLabel: string;
  headline: string;
  /** Never empty: the classified one-liner, else the BSE headline, else the category label. */
  title: string;
  category: ExchangeCategory;
  categoryLabel: string;
  impact: ExchangeImpact;
  impactLabel: string;
  what: string;
  soWhat: string;
  scale: DigestScale | null;
  pickReason: string;
  pickedBy: "rule" | "model";
  pdfRead: boolean;
};

export type NormalizedAnnouncementDigest = {
  companyCode: string;
  generatedAt: string;
  windowFrom: string;
  windowTo: string;
  windowDays: number;
  /** "Since 2 Jul" */
  windowFromLabel: string;
  materialCount: number;
  maxFiledAt: string;
  announcementIds: string[];
  summary: {
    activity: ActivityKey;
    activityLabel: string;
    text: string;
    chips: DigestChip[];
  };
  biggest: DigestBiggest | null;
};

export { categoryLabel, IMPACT_META };
