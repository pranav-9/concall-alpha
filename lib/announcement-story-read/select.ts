import type { ExchangeCategory, ExchangeImpact, ExchangeUpdate } from "@/lib/exchange-desk/types";

import {
  AnnouncementStoryReadSchema,
  type AnnouncementStoryRead,
  type AnnouncementStoryReadRow,
} from "./types";

// ---------------------------------------------------------------------------
// "What moved a story this week" — the list, computed at load time.
//
// The producer stores one read per filing and nothing else. This file is the
// whole ranking: join the reads to the tape rows the page already loaded (the
// tape is the authority for every fact — company, impact tier, order size,
// link, coverage), keep the last seven days, apply the floor, one filing per
// company, best five.
//
// Mirror of concallyser/app/exchange_desk/story_read.py (`qualifies`,
// `top_reads`), which the producer uses for its sandbox preview. The same cases
// pin both: tests/announcement-story-read.test.ts here,
// tests/test_announcement_story_read.py there. Change one, change both.
// ---------------------------------------------------------------------------

export const STORY_WINDOW_DAYS = 7;
export const MAX_STORY_PICKS = 5;
/** Under this many picks the block is not worth a heading; the page shows the tape alone. */
export const MIN_STORY_PICKS = 3;
/** Below this a filing is routine for the company. */
export const SCORE_FLOOR = 3;
/** A negative filing the checks call genuinely adverse lists a notch earlier. */
export const ADVERSE_FLOOR = 2;

const IMPACT_TIER: Record<ExchangeImpact, number> = {
  transformative: 0,
  severe: 0,
  positive: 1,
  negative: 1,
  neutral: 2,
};

/** Tie-break inside a tier and score: the more durable the category, the earlier. */
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

export type StoryPick = {
  rank: number;
  update: ExchangeUpdate;
  read: AnnouncementStoryRead;
  /** The company sits below the coverage cut — still ours, tagged as such. */
  belowCut: boolean;
};

export type ParsedStoryReads = {
  reads: AnnouncementStoryRead[];
  /** announcement_ids whose payload failed the v1 schema — logged, never rendered. */
  invalid: string[];
};

/** Rows → validated reads. A payload that fails the schema is dropped by name. */
export function parseStoryReads(rows: AnnouncementStoryReadRow[] | null | undefined): ParsedStoryReads {
  const reads: AnnouncementStoryRead[] = [];
  const invalid: string[] = [];
  for (const row of rows ?? []) {
    const parsed = AnnouncementStoryReadSchema.safeParse(row?.payload);
    if (parsed.success && parsed.data.announcement_id === row.announcement_id) reads.push(parsed.data);
    else invalid.push(String(row?.announcement_id ?? "?"));
  }
  return { reads, invalid };
}

export function qualifies(read: Pick<AnnouncementStoryRead, "score" | "checks">, impact: ExchangeImpact): boolean {
  if (IMPACT_TIER[impact] === 0) return true;
  if (impact === "negative" && read.checks.adverse && read.score >= ADVERSE_FLOOR) return true;
  return read.score >= SCORE_FLOOR;
}

/**
 * Up to five picks, best first — or none at all when fewer than three qualify.
 * `updates` is the listed tape, `belowCut` the below-cut tape (large caps are
 * already gone from both). A read whose filing is no longer on the tape (folded
 * into a same-event twin, re-classified, aged out) is dropped.
 */
export function selectTopStoryReads(
  reads: AnnouncementStoryRead[],
  updates: ExchangeUpdate[],
  belowCut: ExchangeUpdate[],
  now: Date = new Date(),
): StoryPick[] {
  const tape = new Map<string, { update: ExchangeUpdate; belowCut: boolean }>();
  for (const update of updates) tape.set(update.id, { update, belowCut: false });
  for (const update of belowCut) if (!tape.has(update.id)) tape.set(update.id, { update, belowCut: true });

  const cutoff = now.getTime() - STORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const candidates: { key: (number | string)[]; pick: Omit<StoryPick, "rank"> }[] = [];
  for (const read of reads) {
    const row = tape.get(read.announcement_id);
    if (!row) continue;
    const { update } = row;
    const filed = new Date(update.filedRaw).getTime();
    if (Number.isNaN(filed) || filed < cutoff || filed > now.getTime()) continue;
    if (update.impact === "neutral" || !qualifies(read, update.impact)) continue;
    candidates.push({
      key: [
        IMPACT_TIER[update.impact],
        -read.score,
        -(update.orderSize?.pctOfMcap ?? 0),
        CATEGORY_WEIGHT[update.category] ?? 99,
        -filed,
        update.id,
      ],
      pick: { update, read, belowCut: row.belowCut },
    });
  }
  candidates.sort((a, b) => {
    for (let i = 0; i < a.key.length; i += 1) {
      if (a.key[i] === b.key[i]) continue;
      return a.key[i] < b.key[i] ? -1 : 1;
    }
    return 0;
  });

  const picks: StoryPick[] = [];
  const seen = new Set<string>();
  for (const { pick } of candidates) {
    const code = pick.update.companyCode.toUpperCase();
    if (seen.has(code)) continue;
    seen.add(code);
    picks.push({ rank: picks.length + 1, ...pick });
    if (picks.length === MAX_STORY_PICKS) break;
  }
  return picks.length >= MIN_STORY_PICKS ? picks : [];
}
