import { assessStaleness } from "@/lib/valuation-check/normalize";
import type { NormalizedValuationCheck } from "@/lib/valuation-check/types";

import {
  brokerNoteRowSchema,
  type BrokerLatestView,
  type BrokerNoteListItem,
  type BrokerNoteRow,
  type BrokerNoteType,
  type BrokerNotesView,
  type GrowthBlock,
  type GrowthMetric,
  type RatingBucket,
  type RatingCounts,
  type StatedMove,
  type TargetBlock,
} from "./types";

/**
 * Display shape for the Broker Notes tab. All display policy lives here: which note
 * speaks for each broker, how ratings are counted, which targets count, and which of
 * our own figures may sit beside the brokers' growth. Every number is the brokers'
 * (credited to them) or our valuation row's; nothing here feeds a score.
 */

/** The strip reads each broker's notes from this window. */
export const BROKER_NOTES_WINDOW_DAYS = 180;
/** The header's "notes in the last N days" count. */
export const BROKER_NOTES_RECENT_DAYS = 90;
/**
 * Price-fit guard (R6 / R14): today's price ÷ the price the note implies
 * (target ÷ (1 ± stated move)). Outside this band a split, a bonus, a bad value or a
 * big move sits between the note and today, so the target is left out of the median.
 */
export const PRICE_FIT_BAND = { low: 0.65, high: 1.55 } as const;
/** A note with no stated move can only be checked crudely: target ÷ today's price. */
export const NO_MOVE_TARGET_BAND = { low: 0.2, high: 5 } as const;

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const NOTE_TYPE_LABEL: Record<BrokerNoteType, string> = {
  company_update: "Company update",
  initiating_coverage: "Initiating coverage",
  results_review: "Results review",
  management_meet: "Management meet",
  ipo_note: "IPO note",
  top_picks: "Top picks",
  sector_or_thematic: "Sector note",
  daily: "Daily note",
  other: "Note",
};

export const RATING_BUCKET_LABEL: Record<RatingBucket, string> = {
  bullish: "Bullish",
  neutral: "Neutral",
  bearish: "Bearish",
  not_rated: "Not rated",
  not_stated: "No rating stated",
  not_read: "Not read",
  other: "Other rating",
};

const GROWTH_METRIC_LABEL: Record<GrowthMetric, string> = {
  revenue: "Revenue",
  ebitda: "EBITDA",
  pat: "Profit",
};

const GROWTH_FIELD: Record<GrowthMetric, "revenue_cagr_pct" | "ebitda_cagr_pct" | "pat_cagr_pct"> = {
  revenue: "revenue_cagr_pct",
  ebitda: "ebitda_cagr_pct",
  pat: "pat_cagr_pct",
};

/** "12 Nov 2026". Fixed English months so server output never depends on the runtime locale. */
export function formatNoteDate(iso: string): string {
  const day = Number(iso.slice(8, 10));
  const month = MONTHS[Number(iso.slice(5, 7)) - 1];
  return month ? `${day} ${month} ${iso.slice(0, 4)}` : iso;
}

/** "₹1,751", "₹62.5": whole rupees from ₹100 up. */
export function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: value < 100 ? 1 : 0 })}`;
}

/** "22.8%", "25%": one decimal unless whole. */
export function formatPct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

/** Whole days from the note's date to `today` (UTC calendar days). */
export function noteAgeDays(reportDate: string, today: Date): number {
  return Math.floor((today.getTime() - Date.parse(`${reportDate}T00:00:00Z`)) / DAY_MS);
}

/** Newest first; a same-day tie goes to the higher message id (posted later). */
export function compareNewest(a: BrokerNoteRow, b: BrokerNoteRow): number {
  if (a.report_date !== b.report_date) return a.report_date < b.report_date ? 1 : -1;
  return b.message_id - a.message_id;
}

/** Median; an even count takes the mean of the middle two. */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Does this note's target still fit today's price? With a stated move, compare today's
 * price with the price the note implies; without one, only an absurd target fails.
 * No price, or no target, means nothing to check.
 */
export function targetFitsPrice(
  note: Pick<BrokerNoteRow, "target_price" | "stated_upside_pct" | "direction">,
  price: number | null,
): boolean {
  const target = note.target_price;
  if (price === null || target === null) return true;
  if (note.stated_upside_pct !== null && note.direction !== null) {
    const move = note.stated_upside_pct / 100;
    const factor = note.direction === "UPSIDE" ? 1 + move : 1 - move;
    if (factor <= 0) return false;
    const ratio = price / (target / factor);
    return ratio >= PRICE_FIT_BAND.low && ratio <= PRICE_FIT_BAND.high;
  }
  const ratio = target / price;
  return ratio >= NO_MOVE_TARGET_BAND.low && ratio <= NO_MOVE_TARGET_BAND.high;
}

/** Parse every row; an invalid one is dropped and labelled, never rendered. */
export function parseBrokerNoteRows(rows: readonly unknown[]): { rows: BrokerNoteRow[]; errors: string[] } {
  const parsed: BrokerNoteRow[] = [];
  const errors: string[] = [];
  for (const raw of rows) {
    const result = brokerNoteRowSchema.safeParse(raw);
    if (result.success) {
      parsed.push(result.data);
      continue;
    }
    const id = (raw as { message_id?: unknown } | null)?.message_id;
    const issue = result.error.issues[0];
    errors.push(
      `broker_notes message ${typeof id === "number" || typeof id === "string" ? id : "?"}: ` +
        `${issue?.path.join(".") || "<root>"}: ${issue?.message ?? "invalid"}`,
    );
  }
  return { rows: parsed, errors };
}

const statedMove = (row: BrokerNoteRow): StatedMove | null =>
  row.direction !== null && row.stated_upside_pct !== null
    ? { direction: row.direction, pct: row.stated_upside_pct }
    : null;

const ratingLabel = (row: BrokerNoteRow): string =>
  row.rating_raw?.trim() || RATING_BUCKET_LABEL[row.rating_bucket];

type GrowthSource = {
  metric: GrowthMetric;
  rebased: boolean;
  ourBaseFraction: number | null;
  ourWindow: string;
  priceAssumesPct: number | null;
};

/**
 * R13: which broker CAGR may sit beside our figures. Revenue basis → revenue; earnings
 * basis → the ladder's own metric (PAT or EBITDA). EBIT, or an earnings ladder with no
 * metric, has no broker figure to match, so the block hides.
 *
 * Units: `scenarios.base` and `ladderRebase.statedBase` are FRACTIONS (0.4095 = 40.95%;
 * price-assumes-rows.ts scales them ×100), `impliedCagrPct` is already percent.
 */
function growthSource(valuation: NormalizedValuationCheck): GrowthSource | null {
  const metric: GrowthMetric | null =
    valuation.ladderBasis === "revenue"
      ? "revenue"
      : valuation.ladderMetric === "pat"
        ? "pat"
        : valuation.ladderMetric === "ebitda"
          ? "ebitda"
          : null;
  if (!metric) return null;
  const rebase = valuation.ladderRebase;
  if (rebase) {
    return {
      metric,
      rebased: true,
      // Rebased cases start from the TTM; the as-stated base starts from the last full
      // year, like the brokers' CAGRs, so only it may sit beside them.
      ourBaseFraction: rebase.statedBase,
      ourWindow: rebase.fyLabel ? `2 years from ${rebase.fyLabel}` : "2 years from the last full year",
      priceAssumesPct: null,
    };
  }
  return {
    metric,
    rebased: false,
    ourBaseFraction: valuation.scenarios.base,
    ourWindow: "2 years from the last full year",
    priceAssumesPct: valuation.isResidualIncome ? null : valuation.impliedCagrPct,
  };
}

type BrokerGroup = {
  view: BrokerLatestView;
  /** Newest note in the window with a hand-read estimate (rating + growth source). */
  newestRead: BrokerNoteRow | null;
};

export function normalizeBrokerNotes(
  rawRows: readonly unknown[],
  valuation: NormalizedValuationCheck | null,
  today: Date = new Date(),
): BrokerNotesView {
  const { rows, errors } = parseBrokerNoteRows(rawRows);
  if (rows.length === 0) return { kind: "empty", parseErrors: errors };

  const sorted = [...rows].sort(compareNewest);
  const price = valuation?.priceAtRun != null && valuation.priceAtRun > 0 ? valuation.priceAtRun : null;
  const inWindow = (row: BrokerNoteRow) => noteAgeDays(row.report_date, today) <= BROKER_NOTES_WINDOW_DAYS;

  // ── One group per canonical firm, from its notes inside the window ────────
  const groups = new Map<string, { notes: BrokerNoteRow[] }>();
  for (const row of sorted) {
    if (!inWindow(row)) continue;
    const key = row.broker.trim().toLowerCase();
    const group = groups.get(key) ?? { notes: [] };
    group.notes.push(row);
    groups.set(key, group);
  }

  const brokerGroups: BrokerGroup[] = [...groups.values()].map(({ notes }) => {
    const newest = notes[0];
    const newestRead = notes.find((note) => note.has_estimate) ?? null;
    const newestTarget = notes.find((note) => note.target_price !== null) ?? null;
    return {
      newestRead,
      view: {
        broker: newest.broker,
        latestNote: {
          reportDate: newest.report_date,
          messageId: newest.message_id,
          stated: statedMove(newest),
          headline: newest.headline,
        },
        rating: newestRead
          ? { bucket: newestRead.rating_bucket, label: ratingLabel(newestRead), asOf: newestRead.report_date }
          : null,
        target:
          newestTarget && newestTarget.target_price !== null
            ? {
                price: newestTarget.target_price,
                asOf: newestTarget.report_date,
                excluded: !targetFitsPrice(newestTarget, price),
              }
            : null,
      },
    };
  });

  // ── Ratings: the broker's own word where read, never the caption's direction ─
  let ratings: RatingCounts | null = null;
  if (brokerGroups.length > 0) {
    ratings = {
      bullish: 0,
      neutral: 0,
      bearish: 0,
      notRated: 0,
      notStated: 0,
      notRead: 0,
      other: 0,
      notReadStated: { upside: 0, downside: 0, none: 0 },
    };
    for (const { view } of brokerGroups) {
      const bucket: RatingBucket = view.rating?.bucket ?? "not_read";
      if (bucket === "bullish") ratings.bullish += 1;
      else if (bucket === "neutral") ratings.neutral += 1;
      else if (bucket === "bearish") ratings.bearish += 1;
      else if (bucket === "not_rated") ratings.notRated += 1;
      else if (bucket === "not_stated") ratings.notStated += 1;
      else if (bucket === "other") ratings.other += 1;
      else {
        ratings.notRead += 1;
        const stated = view.latestNote.stated;
        if (!stated) ratings.notReadStated.none += 1;
        else if (stated.direction === "UPSIDE") ratings.notReadStated.upside += 1;
        else ratings.notReadStated.downside += 1;
      }
    }
  }

  // ── Targets: guarded, then single or median + range ───────────────────────
  let target: TargetBlock | null = null;
  const counted = brokerGroups
    .map(({ view }) => view.target)
    .filter((t): t is NonNullable<BrokerLatestView["target"]> => t !== null && !t.excluded);
  if (counted.length > 0) {
    const values = counted.map((t) => t.price);
    const value = values.length === 1 ? values[0] : median(values);
    const asOfDates = counted.map((t) => t.asOf).sort();
    const fresh =
      valuation !== null && price !== null && valuation.pricedAsOf !== null && !assessStaleness(valuation, today).stale;
    target = {
      kind: values.length === 1 ? "single" : "median",
      value,
      low: Math.min(...values),
      high: Math.max(...values),
      brokerCount: values.length,
      excludedCount: brokerGroups.filter(({ view }) => view.target?.excluded).length,
      asOfFrom: asOfDates[0],
      asOfTo: asOfDates[asOfDates.length - 1],
      upsideFromPrice:
        fresh && price !== null && valuation?.pricedAsOf
          ? { pct: (value / price - 1) * 100, price, pricedAsOf: valuation.pricedAsOf }
          : null,
    };
  }

  // ── Growth: same metric, same starting year, every figure labelled ────────
  let growth: GrowthBlock | null = null;
  const source = valuation ? growthSource(valuation) : null;
  if (source) {
    const field = GROWTH_FIELD[source.metric];
    const figures = brokerGroups
      .map(({ newestRead }) =>
        newestRead && newestRead[field] !== null
          ? { pct: newestRead[field] as number, window: newestRead.cagr_horizon }
          : null,
      )
      .filter((f): f is { pct: number; window: string | null } => f !== null);
    if (figures.length > 0) {
      const pcts = figures.map((f) => f.pct);
      const windows = [...new Set(figures.map((f) => f.window?.trim()).filter((w): w is string => Boolean(w)))].sort();
      growth = {
        metric: source.metric,
        metricLabel: GROWTH_METRIC_LABEL[source.metric],
        brokers: {
          lowPct: Math.min(...pcts),
          highPct: Math.max(...pcts),
          brokerCount: figures.length,
          windows,
        },
        ourBase:
          source.ourBaseFraction !== null ? { pct: source.ourBaseFraction * 100, window: source.ourWindow } : null,
        priceAssumes:
          source.priceAssumesPct !== null ? { pct: source.priceAssumesPct, window: "next 2 years" } : null,
        rebased: source.rebased,
      };
    }
  }

  // ── The list: every note, newest first; older than the window folds away ──
  const toItem = (row: BrokerNoteRow): BrokerNoteListItem => ({
    messageId: row.message_id,
    reportDate: row.report_date,
    broker: row.broker,
    noteType: row.note_type,
    noteTypeLabel: NOTE_TYPE_LABEL[row.note_type],
    ratingLabel: ratingLabel(row),
    ratingBucket: row.rating_bucket,
    stated: statedMove(row),
    targetPrice: row.target_price,
    priceMovedFlag: row.target_price !== null && !targetFitsPrice(row, price),
    headline: row.headline,
  });

  return {
    kind: "notes",
    header: {
      brokerCount: brokerGroups.length,
      notesLast90: sorted.filter((row) => noteAgeDays(row.report_date, today) <= BROKER_NOTES_RECENT_DAYS).length,
      latestDate: sorted[0].report_date,
      readThrough: sorted.find((row) => row.has_estimate)?.report_date ?? null,
    },
    brokers: brokerGroups.map(({ view }) => view),
    ratings,
    target,
    growth,
    recent: sorted.filter(inWindow).map(toItem),
    older: sorted.filter((row) => !inWindow(row)).map(toItem),
    parseErrors: errors,
  };
}
