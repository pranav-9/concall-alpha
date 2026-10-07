// "Big filings" — the list's material exchange filings over the trailing
// thirty days, ranked the way the Announcements page ranks its Top 5
// (lib/announcement-story-read/select.ts): impact tier first, then the
// producer's story-read score, then an order's size against the market cap,
// then the durability of the category, then recency. PURE; the tape rows and
// the story reads are fetched by lib/watchlist-analytics/data.ts.
//
// Differences from the Top 5, on purpose:
//   - No coverage gate. Watchlists are user-owned and unfiltered, so a filing
//     from a large cap or a below-cut name on the list is shown like any other.
//   - No score floor. The Top 5 is a discovery surface and asks "did this move a
//     story"; here the reader chose the companies, so every non-routine filing
//     qualifies and the read, when there is one, only orders and annotates.
//   - Two filings per company, not one, so a company that filed two big orders
//     shows both — while a third still cannot crowd the rest of the list out.
//   - Routine (neutral) filings are counted, never listed.

import type { ExchangeCategory, ExchangeImpact, ExchangeUpdate } from "@/lib/exchange-desk/types";
import type { AnnouncementStoryRead } from "@/lib/announcement-story-read/types";

import type { WatchlistFiling, WatchlistFilings } from "./types";

export const FILINGS_WINDOW_DAYS = 30;
export const MAX_FILINGS = 8;
export const MAX_FILINGS_PER_COMPANY = 2;

// Same tiers and category weights as the Top 5 (kept private there).
const IMPACT_TIER: Record<ExchangeImpact, number> = {
  transformative: 0,
  severe: 0,
  positive: 1,
  negative: 1,
  neutral: 2,
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

const isGood = (impact: ExchangeImpact) => impact === "positive" || impact === "transformative";
const isAdverse = (impact: ExchangeImpact) => impact === "negative" || impact === "severe";

export function selectWatchlistFilings(
  updates: ExchangeUpdate[],
  reads: AnnouncementStoryRead[],
  now: Date = new Date(),
  { windowDays = FILINGS_WINDOW_DAYS, limit = MAX_FILINGS, perCompany = MAX_FILINGS_PER_COMPANY } = {},
): WatchlistFilings {
  const readById = new Map(reads.map((read) => [read.announcement_id, read]));
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;

  const inWindow = updates.filter((update) => {
    const filed = new Date(update.filedRaw).getTime();
    return !Number.isNaN(filed) && filed >= cutoff && filed <= now.getTime();
  });

  let good = 0;
  let adverse = 0;
  let routine = 0;
  for (const update of inWindow) {
    if (isGood(update.impact)) good += 1;
    else if (isAdverse(update.impact)) adverse += 1;
    else routine += 1;
  }

  const candidates = inWindow
    .filter((update) => update.impact !== "neutral")
    .map((update) => {
      const read = readById.get(update.id) ?? null;
      return {
        update,
        read,
        key: [
          IMPACT_TIER[update.impact],
          -(read?.score ?? -1),
          -(update.orderSize?.pctOfMcap ?? 0),
          CATEGORY_WEIGHT[update.category] ?? 99,
          -new Date(update.filedRaw).getTime(),
          update.id,
        ] as (number | string)[],
      };
    })
    .sort((a, b) => {
      for (let i = 0; i < a.key.length; i += 1) {
        if (a.key[i] === b.key[i]) continue;
        return a.key[i] < b.key[i] ? -1 : 1;
      }
      return 0;
    });

  const picks: WatchlistFiling[] = [];
  const perCode = new Map<string, number>();
  for (const { update, read } of candidates) {
    if (picks.length === limit) break;
    const code = update.companyCode.toUpperCase();
    const used = perCode.get(code) ?? 0;
    if (used >= perCompany) continue;
    perCode.set(code, used + 1);
    picks.push({ rank: picks.length + 1, update, read, headline: read?.headline ?? update.summary });
  }

  return {
    picks,
    windowDays,
    total: inWindow.length,
    good,
    adverse,
    routine,
    hidden: candidates.length - picks.length,
  };
}
