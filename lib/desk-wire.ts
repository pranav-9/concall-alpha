// "The wire" on the desk (2026-10-29 redesign): the filings that mattered over
// the last seven days — one large card, two small ones, then plain rows.
//
// The list is /announcements' own "Top 5 this week" (selectTopStoryReads), so
// the two pages never disagree on what mattered. That pick is empty under
// three qualifying filings; the desk then falls back to the week's material
// filings off the tape, strongest impact first, so the block still reports
// the week rather than vanishing. Pure — the caller hands in both lists.

import type { StoryPick } from "@/lib/announcement-story-read/select";
import type { ExchangeImpact, ExchangeUpdate } from "@/lib/exchange-desk/types";

export type WireItem = {
  id: string;
  companyCode: string;
  companyName: string;
  categoryLabel: string;
  filedRaw: string;
  /** The card's line: the story read's headline, else the tape's summary. */
  headline: string;
  /** What it changes for the company (the story read), when there is one. */
  dek: string | null;
  attachmentUrl: string | null;
  belowCut: boolean;
};

export const WIRE_LIMIT = 5;
export const WIRE_WINDOW_DAYS = 7;

// Strongest first, either direction: a severe filing matters as much as a
// transformative one. Neutral (routine) filings never make the wire.
const FALLBACK_TIER: Record<ExchangeImpact, number> = {
  transformative: 0,
  severe: 0,
  positive: 1,
  negative: 1,
  neutral: 2,
};

export function buildWire(
  picks: readonly StoryPick[],
  updates: readonly ExchangeUpdate[],
  nowMs: number,
  limit: number = WIRE_LIMIT,
): WireItem[] {
  if (picks.length > 0) {
    return picks.slice(0, limit).map(({ update, read, belowCut }) => ({
      id: update.id,
      companyCode: update.companyCode,
      companyName: update.companyName,
      categoryLabel: update.categoryLabel,
      filedRaw: update.filedRaw,
      headline: read.headline ?? update.summary,
      dek: read.changes?.trim() || null,
      attachmentUrl: update.attachmentUrl,
      belowCut,
    }));
  }

  const floor = nowMs - WIRE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  return updates
    .map((u) => ({ u, at: Date.parse(u.filedRaw) }))
    .filter(({ u, at }) => u.impact !== "neutral" && Number.isFinite(at) && at >= floor && at <= nowMs)
    .sort((a, b) => FALLBACK_TIER[a.u.impact] - FALLBACK_TIER[b.u.impact] || b.at - a.at)
    // One filing per company, as the Top 5 does.
    .filter(({ u }) => {
      const key = u.companyCode.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ u }) => ({
      id: u.id,
      companyCode: u.companyCode,
      companyName: u.companyName,
      categoryLabel: u.categoryLabel,
      filedRaw: u.filedRaw,
      headline: u.summary,
      dek: null,
      attachmentUrl: u.attachmentUrl,
      belowCut: false,
    }));
}
