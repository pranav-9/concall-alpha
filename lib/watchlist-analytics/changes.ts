// "Latest changes" — a dated ledger of what moved in the list's analysis over
// the trailing thirty days, PURE over per-company facts the server side
// gathers. One line per event, newest first, bucketed Today / This week /
// Earlier like the Desk's recency ledger (app/desk/desk-recency-ledger.tsx).
//
// What counts as a change, and what it is dated by:
//   quarter        a ConcallScore print, dated by scoring_meta.scored_at (the
//                  row timestamps are insert-time and miss re-scores — see
//                  lib/score-freshness.ts); the delta is against the print
//                  before it, so an official re-score of the same quarter
//                  shows as its own line
//   growth         a growth outlook run, with the delta against the run before
//   valuation      a re-pricing — ONLY when the band changed against the
//                  previous pricing (the fleet is re-priced every ~10 days, so
//                  "re-priced" alone would put every company here every time),
//                  or the first pricing on record
//   guidance / quality / moat / business / key_variables
//                  a refreshed section, dated by its generated_at / updated_at
//
// Tones follow the move's effect on the case: a score up is good, down is bad,
// anything without a direction is muted. Nothing here is a claim the section
// behind it does not make — every title restates a number or label it shows.

import type { ForensicTally } from "@/lib/company-quality/types";
import { bandForValuationScore, VALUATION_BANDS } from "@/lib/valuation-band";

import type { ChangeBucket, ChangeBucketKey, ChangeTone, WatchlistChange, WatchlistChanges } from "./types";

export const CHANGES_WINDOW_DAYS = 30;
export const MAX_CHANGES = 20;

/** The delta a score has to move (0–10 scale) before the line is toned. */
const TONE_DELTA = 0.3;

export type CompanyChangeInputs = {
  code: string;
  name: string;
  /** Newest first. `scoredAt` null = undated (never listed). */
  quarterPrints: { label: string; score: number; scoredAt: string | null }[];
  /** Newest first. */
  growthRuns: { score: number | null; at: string | null }[];
  valuation: {
    /** Current pricing, 0–10 scale. */
    score: number | null;
    pricedAsOf: string | null;
    /** Every pricing on record, oldest first, 0–10 scale. */
    history: { pricedAsOf: string; score: number }[];
  } | null;
  guidance: { generatedAt: string | null; liveCount: number | null; tierLabel: string | null } | null;
  quality: { generatedAt: string | null; tally: ForensicTally | null } | null;
  moat: { updatedAt: string | null; label: string | null } | null;
  business: { generatedAt: string | null } | null;
  keyVariables: { generatedAt: string | null } | null;
};

const SECTION: Record<WatchlistChange["kind"], string> = {
  quarter: "sentiment-score",
  growth: "future-growth",
  valuation: "valuation-check",
  guidance: "guidance-history",
  quality: "quality",
  moat: "quality",
  business: "business-overview",
  key_variables: "key-variables",
  sections: "overview",
};

/** The short word each refreshed section takes inside a folded "sections refreshed" line. */
const REFRESH_WORD: Partial<Record<WatchlistChange["kind"], string>> = {
  business: "business",
  guidance: "guidance",
  quality: "quality",
  moat: "moat",
  key_variables: "key variables",
};
const REFRESH_ORDER = Object.keys(REFRESH_WORD) as WatchlistChange["kind"][];

const one = (value: number) => value.toFixed(1);
// Deltas are read at one decimal, as the scores print: 7.8 − 7.5 is 0.3, not
// the 0.2999… floating point hands back.
const round1 = (value: number) => Math.round(value * 10) / 10;
const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${one(Math.abs(value))}`;
const toneFor = (delta: number | null): ChangeTone =>
  delta == null ? "muted" : delta >= TONE_DELTA ? "good" : delta <= -TONE_DELTA ? "bad" : "muted";

const parseMs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  // A bare date (priced_as_of, "2026-10-01") is read as that day in UTC.
  const ms = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isFinite(ms) ? ms : null;
};

// One IST calendar day, so "Today" tracks the date a reader is looking at.
const istDay = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(ms));

const MS_DAY = 24 * 60 * 60 * 1000;

export function collectCompanyChanges(input: CompanyChangeInputs, now: Date, windowDays: number): WatchlistChange[] {
  const cutoff = now.getTime() - windowDays * MS_DAY;
  const out: WatchlistChange[] = [];
  const base = (kind: WatchlistChange["kind"], at: string, atMs: number, title: string, detail: string | null, tone: ChangeTone, suffix = ""): WatchlistChange => ({
    id: `${kind}-${input.code}${suffix ? `-${suffix}` : ""}`,
    kind,
    code: input.code,
    name: input.name,
    at,
    atMs,
    title,
    detail,
    tone,
    href: `/company/${input.code}#${SECTION[kind]}`,
  });
  const inWindow = (ms: number | null): ms is number => ms != null && ms >= cutoff && ms <= now.getTime();

  // Quarter prints — each dated print in the window, against the one before it.
  input.quarterPrints.forEach((print, index) => {
    const ms = parseMs(print.scoredAt);
    if (!inWindow(ms)) return;
    const prior = input.quarterPrints[index + 1] ?? null;
    const delta = prior ? round1(print.score - prior.score) : null;
    out.push(
      base(
        "quarter",
        print.scoredAt!,
        ms,
        `ConcallScore ${one(print.score)} · ${print.label}`,
        prior ? `${signed(delta!)} vs ${prior.label}` : "First scored quarter",
        toneFor(delta),
        print.label.replace(/\s+/g, ""),
      ),
    );
  });

  // Growth — the newest run in the window, against the run before it.
  const [latestGrowth, priorGrowth] = input.growthRuns;
  if (latestGrowth?.score != null) {
    const ms = parseMs(latestGrowth.at);
    if (inWindow(ms)) {
      const delta = priorGrowth?.score != null ? round1(latestGrowth.score - priorGrowth.score) : null;
      out.push(
        base(
          "growth",
          latestGrowth.at!,
          ms,
          `Growth outlook ${one(latestGrowth.score)}`,
          delta != null ? `${signed(delta)} vs the previous read` : "First growth read",
          toneFor(delta),
        ),
      );
    }
  }

  // Valuation — a band change, or the first pricing on record.
  const valuation = input.valuation;
  if (valuation?.score != null && valuation.pricedAsOf) {
    const ms = parseMs(valuation.pricedAsOf);
    if (inWindow(ms)) {
      const prior = [...valuation.history].reverse().find((p) => p.pricedAsOf < valuation.pricedAsOf!) ?? null;
      const band = bandForValuationScore(valuation.score);
      const priorBand = prior ? bandForValuationScore(prior.score) : null;
      if (!prior || priorBand !== band) {
        out.push(
          base(
            "valuation",
            valuation.pricedAsOf,
            ms,
            `Valuation · ${VALUATION_BANDS[band].label}`,
            prior && priorBand ? `Was ${VALUATION_BANDS[priorBand].label.toLowerCase()} at the previous pricing` : "First pricing on record",
            prior ? toneFor(round1(valuation.score - prior.score)) : "muted",
          ),
        );
      }
    }
  }

  // Refreshed sections — dated, no delta.
  const refreshed = (
    kind: WatchlistChange["kind"],
    at: string | null | undefined,
    title: string,
    detail: string | null,
  ) => {
    const ms = parseMs(at);
    if (!inWindow(ms)) return;
    out.push(base(kind, at!, ms, title, detail, "muted"));
  };
  if (input.guidance) {
    const live = input.guidance.liveCount;
    refreshed(
      "guidance",
      input.guidance.generatedAt,
      "Guidance track refreshed",
      [live != null ? `${live} live ${live === 1 ? "target" : "targets"}` : null, input.guidance.tierLabel]
        .filter(Boolean)
        .join(" · ") || null,
    );
  }
  if (input.quality) {
    const tally = input.quality.tally;
    refreshed(
      "quality",
      input.quality.generatedAt,
      "Quality read refreshed",
      tally && tally.assessed > 0 ? `${tally.clean} of ${tally.assessed} checks clean` : null,
    );
  }
  if (input.moat) refreshed("moat", input.moat.updatedAt, "Moat re-read", input.moat.label);
  if (input.business) refreshed("business", input.business.generatedAt, "Business snapshot refreshed", null);
  if (input.keyVariables) refreshed("key_variables", input.keyVariables.generatedAt, "Key variables refreshed", null);

  return out;
}

/**
 * A refresh run (deep-track, quarter refresh) rewrites several of one company's
 * sections within minutes, which would put five near-identical lines on the
 * ledger. Refreshes of the same company on the same IST day fold into one
 * line naming the sections; a lone refresh keeps its own line, and score /
 * valuation moves are never folded.
 */
export function collapseRefreshes(changes: WatchlistChange[]): WatchlistChange[] {
  const groups = new Map<string, WatchlistChange[]>();
  const out: WatchlistChange[] = [];
  for (const change of changes) {
    if (!(change.kind in REFRESH_WORD)) {
      out.push(change);
      continue;
    }
    const key = `${change.code}|${istDay(change.atMs)}`;
    const group = groups.get(key);
    if (group) group.push(change);
    else groups.set(key, [change]);
  }
  for (const group of groups.values()) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const newest = group.reduce((a, b) => (b.atMs > a.atMs ? b : a));
    const kinds = REFRESH_ORDER.filter((kind) => group.some((c) => c.kind === kind));
    out.push({
      id: `sections-${newest.code}-${istDay(newest.atMs)}`,
      kind: "sections",
      code: newest.code,
      name: newest.name,
      at: newest.at,
      atMs: newest.atMs,
      title: `${kinds.length} sections refreshed`,
      detail: kinds.map((kind) => REFRESH_WORD[kind]).join(" · "),
      tone: "muted",
      href: `/company/${newest.code}#${SECTION.sections}`,
    });
  }
  return out;
}

export function bucketChanges(changes: WatchlistChange[], now: Date): ChangeBucket[] {
  const today = istDay(now.getTime());
  const nowMs = now.getTime();
  const buckets: Record<ChangeBucketKey, WatchlistChange[]> = { today: [], week: [], earlier: [] };
  for (const change of changes) {
    if (istDay(change.atMs) === today) buckets.today.push(change);
    else if (nowMs - change.atMs < 7 * MS_DAY) buckets.week.push(change);
    else buckets.earlier.push(change);
  }
  return (
    [
      { key: "today", label: "Today", items: buckets.today },
      { key: "week", label: "This week", items: buckets.week },
      { key: "earlier", label: "Earlier", items: buckets.earlier },
    ] as ChangeBucket[]
  ).filter((b) => b.items.length > 0);
}

export function buildChangeLedger(
  inputs: CompanyChangeInputs[],
  now: Date = new Date(),
  { windowDays = CHANGES_WINDOW_DAYS, limit = MAX_CHANGES } = {},
): WatchlistChanges {
  const all = collapseRefreshes(inputs.flatMap((input) => collectCompanyChanges(input, now, windowDays)))
    .sort((a, b) => b.atMs - a.atMs || a.code.localeCompare(b.code) || a.id.localeCompare(b.id));
  const shown = all.slice(0, limit);
  return { buckets: bucketChanges(shown, now), windowDays, total: all.length, shown: shown.length };
}
