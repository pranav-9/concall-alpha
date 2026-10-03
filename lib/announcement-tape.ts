// Company Announcements tab (redesign 2026-10-03) — the pure helpers behind the
// filing history chart, the quarter-grouped tape and the two templated
// headlines. Everything here is derived from tape rows the loader already
// holds (lib/exchange-desk.ts) plus the stored digest; no prose is invented
// beyond the closed templates below, and no row is ever re-classified.

import type { ActivityKey, DigestChip, DigestScale } from "@/lib/announcement-digest/types";
import {
  formatOrderSize,
  type ExchangeCategory,
  type ExchangeImpact,
  type ExchangeUpdate,
  type OrderSize,
} from "@/lib/exchange-desk/types";

/**
 * The day the BSE sweep that feeds bse_announcements first ran. Quarters that
 * end before this day are "before the record", not quiet quarters, and the
 * history chart says so. A backfill would simply fill those slots: a slot is
 * only labelled before-record while it holds no rows.
 */
export const FILING_RECORD_START = "2026-05-16";

// ---------------------------------------------------------------------------
// Impact tiers for the chart: five impacts fold into four tiles (severe joins
// negative — five rows in the whole archive, and both are "adverse").
// ---------------------------------------------------------------------------

export type TierKey = "transformative" | "positive" | "routine" | "negative";

/** Bottom → top stacking order of the tiles, and legend order. */
export const TIER_ORDER: TierKey[] = ["transformative", "positive", "routine", "negative"];

export const TIER_LABEL: Record<TierKey, string> = {
  transformative: "Transformative",
  positive: "Positive",
  routine: "Routine",
  negative: "Negative",
};

export function tierOf(impact: ExchangeImpact): TierKey {
  if (impact === "transformative") return "transformative";
  if (impact === "positive") return "positive";
  if (impact === "neutral") return "routine";
  return "negative";
}

export const isAdverse = (impact: ExchangeImpact) => impact === "negative" || impact === "severe";
export const isGood = (impact: ExchangeImpact) =>
  impact === "positive" || impact === "transformative";

// ---------------------------------------------------------------------------
// Indian fiscal quarters (April–March), read in IST so a filing stamped
// 23:30 UTC on 30 June lands in Q1, not Q2.
// ---------------------------------------------------------------------------

export type FiscalQuarter = {
  /** fy * 4 + (q - 1): a sortable integer, one step per quarter. */
  index: number;
  /** The fiscal year the quarter belongs to, e.g. 2027 for Oct–Dec 2026. */
  fy: number;
  q: 1 | 2 | 3 | 4;
  /** "Q3 FY27" */
  label: string;
  /** "FY27Q3" — a stable key for grouping and selection. */
  key: string;
  /** First calendar day of the quarter, "YYYY-MM-DD". */
  startDate: string;
  /** Last calendar day of the quarter, "YYYY-MM-DD". */
  endDate: string;
};

const istYearMonth = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
});

const pad2 = (n: number) => String(n).padStart(2, "0");

export function fiscalQuarterFromIndex(index: number): FiscalQuarter {
  const fy = Math.floor(index / 4);
  const q = ((index % 4) + 1) as 1 | 2 | 3 | 4;
  // Q1 = Apr–Jun of fy-1, Q2 = Jul–Sep of fy-1, Q3 = Oct–Dec of fy-1, Q4 = Jan–Mar of fy.
  const startMonth = q === 4 ? 1 : 1 + 3 * q; // 4, 7, 10, 1
  const calendarYear = q === 4 ? fy : fy - 1;
  const endMonth = startMonth + 2;
  const endDay = endMonth === 6 || endMonth === 9 ? 30 : 31; // Jun, Sep → 30; Dec, Mar → 31
  return {
    index,
    fy,
    q,
    label: `Q${q} FY${String(fy).slice(-2)}`,
    key: `FY${String(fy).slice(-2)}Q${q}`,
    startDate: `${calendarYear}-${pad2(startMonth)}-01`,
    endDate: `${calendarYear}-${pad2(endMonth)}-${endDay}`,
  };
}

/** The fiscal quarter an ISO timestamp (or Date) falls in, in IST; null when unparseable. */
export function fiscalQuarterOf(input: string | Date): FiscalQuarter | null {
  const at = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(at.getTime())) return null;
  const [y, m] = istYearMonth.format(at).split("-").map(Number);
  if (!y || !m) return null;
  const q = m >= 4 ? Math.floor((m - 4) / 3) + 1 : 4;
  const fy = m >= 4 ? y + 1 : y;
  return fiscalQuarterFromIndex(fy * 4 + (q - 1));
}

// ---------------------------------------------------------------------------
// Filing history — one slot per fiscal quarter, newest last.
// ---------------------------------------------------------------------------

export type HistorySlot = {
  key: string;
  label: string;
  index: number;
  counts: Record<TierKey, number>;
  total: number;
  /** The quarter the reader is in — still filling. */
  current: boolean;
  /** The record started part-way through this quarter, so its count is a floor. */
  partial: boolean;
  /** Ends before the record starts and holds nothing: not a quiet quarter, no data. */
  beforeRecord: boolean;
};

const emptyCounts = (): Record<TierKey, number> => ({
  transformative: 0,
  positive: 0,
  routine: 0,
  negative: 0,
});

/**
 * The last N fiscal quarters as chart slots. Runs from the quarter the record
 * starts in (or the oldest row, if a backfill reaches further) to the current
 * quarter, padded to `minSlots` so the chart has a shape on a young archive
 * and capped at `maxSlots` so it stays a glance.
 */
export function buildFilingHistory(
  updates: Pick<ExchangeUpdate, "filedRaw" | "impact">[],
  now: Date = new Date(),
  { minSlots = 4, maxSlots = 8 }: { minSlots?: number; maxSlots?: number } = {},
): HistorySlot[] {
  const current = fiscalQuarterOf(now);
  if (!current) return [];
  const recordStartQuarter = fiscalQuarterOf(`${FILING_RECORD_START}T12:00:00+05:30`);

  const byIndex = new Map<number, Record<TierKey, number>>();
  let oldest = recordStartQuarter?.index ?? current.index;
  for (const u of updates) {
    const fq = fiscalQuarterOf(u.filedRaw);
    if (!fq || fq.index > current.index) continue;
    const counts = byIndex.get(fq.index) ?? emptyCounts();
    counts[tierOf(u.impact)] += 1;
    byIndex.set(fq.index, counts);
    if (fq.index < oldest) oldest = fq.index;
  }

  const span = Math.min(maxSlots, Math.max(minSlots, current.index - oldest + 1));
  const first = current.index - span + 1;
  const slots: HistorySlot[] = [];
  for (let index = first; index <= current.index; index += 1) {
    const fq = fiscalQuarterFromIndex(index);
    const counts = byIndex.get(index) ?? emptyCounts();
    const total = counts.transformative + counts.positive + counts.routine + counts.negative;
    slots.push({
      key: fq.key,
      label: fq.label,
      index,
      counts,
      total,
      current: index === current.index,
      partial: fq.startDate < FILING_RECORD_START && fq.endDate >= FILING_RECORD_START,
      beforeRecord: fq.endDate < FILING_RECORD_START && total === 0,
    });
  }
  return slots;
}

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const monthYear = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/** "May 2026" — the month the record starts. */
export function recordStartLabel(): string {
  return monthYear.format(new Date(`${FILING_RECORD_START}T12:00:00+05:30`));
}

/** Complete quarters only: not the one still filling, not the partial first one, not pre-record. */
const completeSlots = (slots: HistorySlot[]) =>
  slots.filter((s) => !s.current && !s.partial && !s.beforeRecord);

const goodOf = (s: HistorySlot) => s.counts.transformative + s.counts.positive;
const goodShare = (slots: HistorySlot[]) => {
  const total = slots.reduce((n, s) => n + s.total, 0);
  return total === 0 ? 0 : slots.reduce((n, s) => n + goodOf(s), 0) / total;
};

/**
 * The one-line read over the history chart. Templated from counts only:
 *  - two or more complete quarters → the latest complete quarter against the
 *    others' average (busier / quieter / steady) and whether more of it was
 *    good news;
 *  - otherwise → a plain tally since the record began.
 */
export function historyHeadline(slots: HistorySlot[]): string {
  const complete = completeSlots(slots);
  if (complete.length >= 2) {
    const latest = complete[complete.length - 1];
    const others = complete.slice(0, -1);
    const mean = others.reduce((n, s) => n + s.total, 0) / others.length;
    const pace =
      latest.total >= mean * 1.25
        ? "A busier quarter than usual"
        : latest.total <= mean * 0.75
          ? "A quieter quarter than usual"
          : "A steady tape, quarter on quarter";
    const latestGood = latest.total === 0 ? 0 : goodOf(latest) / latest.total;
    const othersGood = goodShare(others);
    const mix =
      latest.total === 0
        ? ""
        : latestGood >= othersGood + 0.1
          ? ", and more of it was good news"
          : latestGood <= othersGood - 0.1
            ? ", and more of it was routine"
            : ", with a similar mix";
    return `${pace}${mix}.`;
  }

  const total = slots.reduce((n, s) => n + s.total, 0);
  const good = slots.reduce((n, s) => n + goodOf(s), 0);
  const adverse = slots.reduce((n, s) => n + s.counts.negative, 0);
  const since = `since ${recordStartLabel()}`;
  if (total === 0) return `No material filings ${since}.`;
  if (good === 0 && adverse === 0) return `${pluralize(total, "filing")} ${since}, all routine.`;
  const parts = [
    good > 0 ? `${good} good news` : null,
    adverse > 0 ? `${good > 0 ? adverse : pluralize(adverse, "filing")} adverse` : null,
  ].filter(Boolean);
  return `${pluralize(total, "filing")} ${since}: ${parts.join(", ")}.`;
}

// ---------------------------------------------------------------------------
// "The quarter in filings" headline — the digest's activity word, set against
// the complete quarters on record.
// ---------------------------------------------------------------------------

/** Said on its own when the record is too young for a pace claim. */
const ACTIVITY_ALONE: Record<ActivityKey, string> = {
  order_led: "Orders did most of the talking.",
  capacity_build: "Capacity did most of the talking.",
  deal_making: "Deals did most of the talking.",
  raising_capital: "Raising capital did most of the talking.",
  operating_updates: "Operating updates did most of the talking.",
  routine: "A routine tape: none of it moved the needle.",
  mixed: "A mixed tape, with no single theme.",
};

/** Said after the pace clause: "A busier stretch than usual, and …". */
const ACTIVITY_TAIL: Record<ActivityKey, string> = {
  order_led: ", and orders did most of the talking.",
  capacity_build: ", and capacity did most of the talking.",
  deal_making: ", and deals did most of the talking.",
  raising_capital: ", and raising capital did most of the talking.",
  operating_updates: ", and operating updates did most of the talking.",
  routine: ", and none of it moved the needle.",
  mixed: ", with no single theme.",
};

/**
 * `windowCount` is the digest's material count over its ~90-day window — the
 * same length as a quarter, so it compares against the complete quarters on
 * record. With fewer than two complete quarters, only the activity clause is
 * said.
 */
export function quarterHeadline(
  activity: ActivityKey,
  windowCount: number,
  slots: HistorySlot[],
): string {
  const complete = completeSlots(slots);
  // One complete quarter is not a record to be the busiest of.
  if (complete.length < 2 || windowCount === 0) return ACTIVITY_ALONE[activity];
  const max = Math.max(...complete.map((s) => s.total));
  const mean = complete.reduce((n, s) => n + s.total, 0) / complete.length;
  const pace =
    windowCount >= max && windowCount > mean
      ? "Busiest stretch on record"
      : windowCount >= mean * 1.25
        ? "A busier stretch than usual"
        : windowCount <= mean * 0.75
          ? "A quieter stretch than usual"
          : "A typical stretch";
  return `${pace}${ACTIVITY_TAIL[activity]}`;
}

// ---------------------------------------------------------------------------
// Fallback facts for a company with no stored digest — the same closed rules
// the producer runs (concallyser/app/exchange_desk/digest.py: activity_for and
// the category chips), so the card reads the same either way.
// ---------------------------------------------------------------------------

export const DIGEST_WINDOW_DAYS = 90;

export function windowRows<T extends Pick<ExchangeUpdate, "filedRaw">>(
  updates: T[],
  now: Date = new Date(),
  days: number = DIGEST_WINDOW_DAYS,
): T[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return updates.filter((u) => {
    const t = new Date(u.filedRaw).getTime();
    return !Number.isNaN(t) && t >= cutoff && t <= now.getTime();
  });
}

const CATEGORY_ACTIVITY: Partial<Record<ExchangeCategory, ActivityKey>> = {
  order_win: "order_led",
  capex: "capacity_build",
  product_approval: "capacity_build",
  ma: "deal_making",
  partnership: "deal_making",
  fundraise: "raising_capital",
  business_update: "operating_updates",
};
const ACTIVITY_RANK: ActivityKey[] = [
  "order_led",
  "capacity_build",
  "deal_making",
  "raising_capital",
  "operating_updates",
];
const ACTIVITY_DOMINANT_SHARE = 0.4;

/** The producer's chip labels — shorter than the tape's category labels. */
export const DIGEST_CATEGORY_LABEL: Record<ExchangeCategory, string> = {
  order_win: "Orders",
  capex: "Capex & expansion",
  ma: "M&A / investment",
  fundraise: "Fundraising",
  product_approval: "Products & approvals",
  partnership: "Partnerships",
  rating: "Credit rating",
  business_update: "Operating updates",
};
const CATEGORY_WEIGHT: Record<ExchangeCategory, number> = {
  ma: 0,
  capex: 1,
  order_win: 2,
  fundraise: 3,
  product_approval: 4,
  partnership: 5,
  business_update: 6,
  rating: 7,
};

export function deriveActivity(rows: Pick<ExchangeUpdate, "category" | "impact">[]): ActivityKey {
  const counted = rows.filter((r) => r.category !== "rating");
  const adverse = rows.some((r) => isAdverse(r.impact));
  if ((counted.length === 0 || counted.every((r) => r.impact === "neutral")) && !adverse) {
    return "routine";
  }
  const buckets = new Map<ActivityKey, number>();
  for (const r of counted) {
    const bucket = CATEGORY_ACTIVITY[r.category];
    if (bucket) buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  if (buckets.size === 0) return adverse ? "mixed" : "routine";
  const [top, count] = [...buckets.entries()].sort(
    (a, b) => b[1] - a[1] || ACTIVITY_RANK.indexOf(a[0]) - ACTIVITY_RANK.indexOf(b[0]),
  )[0];
  return count >= 2 && count / counted.length >= ACTIVITY_DOMINANT_SHARE ? top : "mixed";
}

export function categoryChips(
  rows: Pick<ExchangeUpdate, "category">[],
  limit = 3,
): DigestChip[] {
  const counts = new Map<ExchangeCategory, number>();
  for (const r of rows) {
    if (r.category === "rating") continue;
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || CATEGORY_WEIGHT[a[0]] - CATEGORY_WEIGHT[b[0]])
    .slice(0, limit)
    .map(([category, n]) => ({ label: DIGEST_CATEGORY_LABEL[category], value: String(n), detail: null }));
}

// ---------------------------------------------------------------------------
// Tape helpers.
// ---------------------------------------------------------------------------

export type TapeFilter = "non_neutral" | "all" | ExchangeImpact;

/**
 * The tape opens on the non-neutral rows when there are enough of them to be
 * a tape on their own; a thin record opens on everything, so the reader is
 * never met by two rows and a hidden tail.
 */
export function defaultTapeFilter(updates: Pick<ExchangeUpdate, "impact">[]): TapeFilter {
  const nonNeutral = updates.filter((u) => u.impact !== "neutral").length;
  return nonNeutral >= 4 ? "non_neutral" : "all";
}

export function matchesTapeFilter(impact: ExchangeImpact, filter: TapeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "non_neutral") return impact !== "neutral";
  return impact === filter;
}

/**
 * "₹2,329 cr, ≈ 45% of FY26 revenue, 18% of market cap" — the scale facts for
 * the one that matters, whichever of the two anchors the row carries.
 */
export function scaleLine(scale: DigestScale | null, orderSize: OrderSize | null): string | null {
  const parts: string[] = [];
  if (scale) parts.push(scale.valueLabel, scale.ratioLabel);
  if (orderSize) parts.push(formatOrderSize(orderSize).replace("of mcap", "of market cap"));
  return parts.length > 0 ? parts.join(", ") : null;
}
