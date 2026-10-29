import "server-only";

import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import { logger } from "@/lib/logger";

// The Δ (rank-change) column's data layer. The board's `#` is computed live each
// render, so "where a company sat before" only exists if we record it. This reads
// the nearest prior snapshot for the Δ, and lazily writes today's snapshot the
// first time /leaderboards is rendered on a new UTC day. See
// lib/supabase/leaderboard_rank_snapshot.sql.

const SNAPSHOT_TABLE = "leaderboard_rank_snapshot";
// Δ compares to the newest snapshot at least this old, so it reads as "moved
// recently" rather than jittering on same-day re-renders. Gaps are tolerated —
// we take the nearest snapshot ≤ this age, not an exact calendar day.
const DELTA_WINDOW_DAYS = 3;

export type RankSnapshotRow = {
  companyCode: string;
  rank: number;
  readScore: number | null;
};

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Once this server process has written today's snapshot, short-circuit every
// later render for the rest of the day — otherwise after() would fire a
// service-role count round-trip on every /leaderboards hit. Per-process, so a
// fresh instance still does one count check (cheap) before settling.
let lastWrittenUtcDate: string | null = null;

/**
 * UPPERCASE code → rank from the newest snapshot at least DELTA_WINDOW_DAYS old.
 * A plain Record, not a Map: it is passed from the server page into the client
 * board (ssr:false), and only plain objects survive that boundary. Empty until a
 * week of history has accrued (Δ then renders blank, not zero). Public data (RLS
 * allows select), so this uses the anon read client, not admin.
 */
export async function readPriorRanks(): Promise<Record<string, number>> {
  // The Δ column is non-essential — a failure here must never break the board
  // render, so the whole read is wrapped and degrades to "no prior ranks" (Δ
  // hidden) on any error, including a missing table before the DDL is applied.
  try {
    const supabase = createPublicReadClient();
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - DELTA_WINDOW_DAYS);

    const { data: dateRows, error: dateErr } = await supabase
      .from(SNAPSHOT_TABLE)
      .select("snapshot_date")
      .lte("snapshot_date", utcDateString(cutoff))
      .order("snapshot_date", { ascending: false })
      .limit(1);
    if (dateErr || !dateRows?.length) return {};
    const targetDate = dateRows[0].snapshot_date as string;

    const { data, error } = await supabase
      .from(SNAPSHOT_TABLE)
      .select("company_code, rank")
      .eq("snapshot_date", targetDate);
    if (error || !data) return {};

    const out: Record<string, number> = {};
    for (const r of data) out[String(r.company_code).toUpperCase()] = Number(r.rank);
    return out;
  } catch {
    return {};
  }
}

/**
 * Write today's snapshot once per UTC day (the first /leaderboards render of the
 * day). Best-effort and self-contained: it swallows every error so a snapshot
 * failure can never break the board render. Call it from `after()` so it runs
 * off the response path. Uses the service-role client — the only write here.
 */
export async function writeTodaySnapshotIfMissing(rows: RankSnapshotRow[]): Promise<void> {
  if (rows.length === 0) return;
  const today = utcDateString(new Date());
  if (lastWrittenUtcDate === today) return; // this process already wrote today
  try {
    const admin = createAdminClient();

    const { count, error: countErr } = await admin
      .from(SNAPSHOT_TABLE)
      .select("company_code", { count: "exact", head: true })
      .eq("snapshot_date", today);
    if (countErr) {
      logger.warn("rank snapshot: count check failed", { error: countErr.message });
      return;
    }
    if ((count ?? 0) > 0) {
      lastWrittenUtcDate = today; // another render/process already did it
      return;
    }

    const payload = rows.map((r) => ({
      snapshot_date: today,
      company_code: r.companyCode.toUpperCase(),
      rank: r.rank,
      read_score: r.readScore,
    }));
    const { error } = await admin
      .from(SNAPSHOT_TABLE)
      .upsert(payload, { onConflict: "snapshot_date,company_code" });
    if (error) logger.warn("rank snapshot: write failed", { error: error.message });
    else lastWrittenUtcDate = today;
  } catch (err) {
    logger.warn("rank snapshot: unexpected failure", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// The desk's "Leaderboard movers · this week" (lib/desk-movers.ts) compares the
// newest snapshot with the newest one at least a week older. Gaps are tolerated
// the same way as the Δ column: zero-traffic days leave no snapshot, so "a week
// before" is the nearest earlier date, not an exact calendar day.
// ---------------------------------------------------------------------------

const MOVERS_WINDOW_DAYS = 7;

export type WeeklyRankPair = {
  latestDate: string | null;
  priorDate: string | null;
  /** UPPERCASE code → rank. Plain Records: they cross unstable_cache's JSON. */
  latest: Record<string, number>;
  prior: Record<string, number>;
};

const EMPTY_PAIR: WeeklyRankPair = { latestDate: null, priorDate: null, latest: {}, prior: {} };

async function readWeeklyRankPair(): Promise<WeeklyRankPair> {
  // Non-essential like the Δ column: any failure (including a missing table)
  // hides the movers block instead of breaking the desk.
  try {
    const supabase = createPublicReadClient();
    const { data: newest, error: newestErr } = await supabase
      .from(SNAPSHOT_TABLE)
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(1);
    if (newestErr || !newest?.length) return EMPTY_PAIR;
    const latestDate = newest[0].snapshot_date as string;

    const cutoff = new Date(`${latestDate}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - MOVERS_WINDOW_DAYS);
    const { data: older, error: olderErr } = await supabase
      .from(SNAPSHOT_TABLE)
      .select("snapshot_date")
      .lte("snapshot_date", utcDateString(cutoff))
      .order("snapshot_date", { ascending: false })
      .limit(1);
    if (olderErr || !older?.length) return { ...EMPTY_PAIR, latestDate };
    const priorDate = older[0].snapshot_date as string;

    // Two days of the whole board (~200 rows each), well under the 1000-row cap.
    const { data, error } = await supabase
      .from(SNAPSHOT_TABLE)
      .select("snapshot_date, company_code, rank")
      .in("snapshot_date", [latestDate, priorDate]);
    if (error || !data) return EMPTY_PAIR;

    const latest: Record<string, number> = {};
    const prior: Record<string, number> = {};
    for (const r of data) {
      const target = r.snapshot_date === latestDate ? latest : prior;
      target[String(r.company_code).toUpperCase()] = Number(r.rank);
    }
    return { latestDate, priorDate, latest, prior };
  } catch {
    return EMPTY_PAIR;
  }
}

// A snapshot lands at most once a UTC day, so half an hour of staleness costs
// nothing and spares the desk three reads per request.
export const getCachedWeeklyRankPair = unstable_cache(readWeeklyRankPair, ["leaderboard-rank-pair-v1"], {
  revalidate: 1800,
});
