import { z } from "zod";

/**
 * Frontend validation gate for one `broker_notes` row (the Broker Notes tab).
 * Mirrors /schemas/broker_notes_v1.json (the structural authority): accept what it
 * accepts, reject what it rejects. If one changes, change both.
 *
 * Produced by concallyser/scripts/load_broker_notes.py: one row per sell-side note on
 * a covered company, caption fields joined on message_id to the hand-read estimate
 * ledger. These are the brokers' published views, never an input to any SoaS score.
 * Percentages are 0-100; prices are INR per share.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pctOrNull = z.number().nullable();

export const BROKER_NOTE_TYPES = [
  "company_update",
  "initiating_coverage",
  "results_review",
  "management_meet",
  "ipo_note",
  "top_picks",
  "sector_or_thematic",
  "daily",
  "other",
] as const;

export const RATING_BUCKETS = [
  "bullish",
  "neutral",
  "bearish",
  "not_rated",
  "not_stated",
  "not_read",
  "other",
] as const;

export const brokerNoteRowSchema = z
  .object({
    schema_version: z.literal("broker_notes_v1"),
    message_id: z.number().int().min(1),
    company_code: z.string().min(1).max(50),
    report_date: isoDate,
    broker: z.string().min(1).max(120),
    broker_raw: z.string().min(1).max(200),
    note_type: z.enum(BROKER_NOTE_TYPES),
    headline: z.string().max(600).nullable(),
    direction: z.enum(["UPSIDE", "DOWNSIDE"]).nullable(),
    stated_upside_pct: z.number().min(0).nullable(),
    target_price: z.number().positive().nullable(),
    target_source: z.enum(["caption", "estimate"]).nullable(),
    has_estimate: z.boolean(),
    rating_raw: z.string().max(80).nullable(),
    rating_bucket: z.enum(RATING_BUCKETS),
    rating_source: z.enum(["pdf_read", "none"]),
    revenue_cagr_pct: pctOrNull,
    ebitda_cagr_pct: pctOrNull,
    pat_cagr_pct: pctOrNull,
    cagr_horizon: z.string().max(40).nullable(),
    // JSON Schema `format: date-time` is an annotation in draft-07, so any string passes there.
    loaded_at: z.string(),
  })
  .strict();

export type BrokerNoteRow = z.infer<typeof brokerNoteRowSchema>;
export type BrokerNoteType = BrokerNoteRow["note_type"];
export type RatingBucket = BrokerNoteRow["rating_bucket"];
export type NoteDirection = NonNullable<BrokerNoteRow["direction"]>;

/** Every column the schema defines, so the portal's select can't drift from the row contract. */
export const BROKER_NOTES_SELECT = Object.keys(brokerNoteRowSchema.shape).join(", ");

// ── The view normalizeBrokerNotes returns ────────────────────────────────────

export type StatedMove = { direction: NoteDirection; pct: number };

/** One note in the list. */
export type BrokerNoteListItem = {
  messageId: number;
  reportDate: string;
  broker: string;
  noteType: BrokerNoteType;
  noteTypeLabel: string;
  /** The broker's own word when read (rating_raw), else the bucket's label. */
  ratingLabel: string;
  ratingBucket: RatingBucket;
  stated: StatedMove | null;
  targetPrice: number | null;
  /** The target failed the price-fit guard: shown with "Price moved a lot since this note". */
  priceMovedFlag: boolean;
  headline: string | null;
};

/** One broker's latest view inside the 180-day window (R10: each part dated on its own). */
export type BrokerLatestView = {
  broker: string;
  /** From the broker's newest note in the window, read or not. */
  latestNote: { reportDate: string; messageId: number; stated: StatedMove | null; headline: string | null };
  /** From its newest note with a hand-read estimate; null = rating not read. */
  rating: { bucket: RatingBucket; label: string; asOf: string } | null;
  /** From its newest note with a target price. */
  target: { price: number; asOf: string; excluded: boolean } | null;
};

export type RatingCounts = {
  bullish: number;
  neutral: number;
  bearish: number;
  notRated: number;
  notStated: number;
  notRead: number;
  other: number;
  /** Stated direction on the newest note of each broker counted as not read (R1). */
  notReadStated: { upside: number; downside: number; none: number };
};

export type TargetBlock = {
  /** "single" = one broker's target; "median" = two or more. */
  kind: "single" | "median";
  /** The single target, or the median. */
  value: number;
  low: number;
  high: number;
  brokerCount: number;
  /** Brokers whose target was left out by the price-fit guard. */
  excludedCount: number;
  /** Oldest and newest "as of" dates among the targets counted. */
  asOfFrom: string;
  asOfTo: string;
  /** Upside to target from our valuation price, percent; null when that price is stale or missing. */
  upsideFromPrice: { pct: number; price: number; pricedAsOf: string } | null;
};

export type GrowthMetric = "revenue" | "ebitda" | "pat";

export type GrowthBlock = {
  metric: GrowthMetric;
  metricLabel: string;
  brokers: { lowPct: number; highPct: number; brokerCount: number; windows: string[] };
  /** Our base case, percent a year, with its window. */
  ourBase: { pct: number; window: string } | null;
  /** What today's price implies, percent a year; null when rebased, residual income or missing. */
  priceAssumes: { pct: number; window: string } | null;
  rebased: boolean;
};

export type BrokerNotesView =
  | { kind: "empty"; parseErrors: string[] }
  | {
      kind: "notes";
      header: {
        /** Distinct brokers with a note in the last 180 days. */
        brokerCount: number;
        notesLast90: number;
        latestDate: string;
        /** Latest report_date among this company's notes with a hand-read estimate. */
        readThrough: string | null;
      };
      brokers: BrokerLatestView[];
      ratings: RatingCounts | null;
      target: TargetBlock | null;
      growth: GrowthBlock | null;
      /** Notes inside the 180-day window, newest first. */
      recent: BrokerNoteListItem[];
      /** Notes older than 180 days, newest first (inline <details>). */
      older: BrokerNoteListItem[];
      parseErrors: string[];
    };
