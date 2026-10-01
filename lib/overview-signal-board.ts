import "server-only";

import { cache } from "react";

import { classifyBoardRead } from "@/lib/board-read";
import { normalizeCompanyQuality } from "@/lib/company-quality/normalize";
import { getCompanyQualityRow } from "@/lib/company-quality/get";
import type { ForensicTally } from "@/lib/company-quality/types";
import { getGuidanceSnapshotRow } from "@/lib/guidance-snapshot/get";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import { parseForwardStrength, type AmbitionLabel } from "@/lib/guidance-snapshot/types";
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";
import { buildGrowthSummary } from "@/lib/growth-outlook/summary";
import { computeBoardRanks, COVERAGE_BOARD_SIZE } from "@/lib/leaderboard-rank";
import { logger } from "@/lib/logger";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { MoatAnalysisRow, MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";
import { getOverallBoardRows } from "@/lib/overall-board";
import { percentileOf } from "@/lib/read-distribution";
import type { ScorePoint } from "@/lib/score-path";
import { createClient } from "@/lib/supabase/server";
import { VERDICT_DISPLAY } from "@/lib/valuation-check/headline";
import {
  buildValuationScoreHistory,
  type ValuationScoreHistoryRow,
} from "@/lib/valuation-check/history";
import { toValuationScale } from "@/lib/valuation-band";
import { assessStaleness, normalizeValuationCheck } from "@/lib/valuation-check/normalize";
import type { ValuationCheckRow } from "@/lib/valuation-check/types";
import { getWalkTheTalk } from "@/lib/walk-the-talk/get";
import type { NormalizedWalkTheTalk } from "@/lib/walk-the-talk/types";

// Data for the company overview (redesigned 2026-10-01: a header score strip,
// The business / The story, three score cards with their paths, and three
// standing reads — moat, forensics, walk the talk).
//
// The overview cache row (lib/company-overview-cache.ts) already carries the
// scores, ranks, sector and story. What it does NOT carry is the business
// one-liner, the score and valuation paths, the growth range, the moat and
// forensic reads and the walk-the-talk grade. This module fetches those per
// company, in parallel, and degrades each leg independently: a missing table
// or a failed query blanks that card, never the page. Every read goes through
// the same normalizer the section behind it uses, so a card can never say
// something its section doesn't.

const toNumber = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export type OverviewQuarterRead = {
  /**
   * Latest print read LIVE from concall_analysis, alongside its label, so the
   * card's score, label and path always describe the same quarter. The overview
   * cache row can lag a fresh score by a revalidate window; mixing its score
   * with these labels would caption Q4's number "Q1".
   */
  latestScore: number | null;
  latestLabel: string | null;
  /** Oldest → newest, ≤ 8 prints, for the area chart. */
  scorePath: ScorePoint[];
};

export type OverviewGrowthRange = {
  bear: string | null;
  base: string;
  bull: string | null;
  horizonYears: number | null;
};

export type OverviewValuationRead = {
  /** Verdict label, present ONLY when a verdict is shown (rateable + fresh). */
  verdictLabel: string | null;
  /** Valuation score on the 0-10 board scale, present ONLY when a verdict is shown. */
  score: number | null;
  /** null = a verdict is shown; string = why it is withheld. */
  withheldReason: string | null;
  /** Published pricings, oldest → newest, on the 0-10 board scale. */
  path: { period: string; value: number }[];
};

export type OverviewSignalExtras = {
  quarter: OverviewQuarterRead;
  /** Live growth score (the cache can lag a refresh). */
  growthScore: number | null;
  /** The Growth tab summary's base case + bear/bull range (revenue growth). */
  growthRange: OverviewGrowthRange | null;
  valuation: OverviewValuationRead | null;
  /** The business snapshot's one-line "what it is". */
  businessLine: string | null;
  moat: { rating: MoatRatingKey; tier: MoatTier | null; headline: string | null } | null;
  /** The Quality tab's forensic tally + its templated headline. */
  forensics: { tally: ForensicTally; headline: string } | null;
  walkTheTalk: NormalizedWalkTheTalk | null;
  /** Deep-track forward-strength ambition, when the snapshot carries it. */
  guidanceAmbition: AmbitionLabel | null;
};

type ConcallRow = {
  fy: unknown;
  qtr: unknown;
  quarter_label: unknown;
  score: unknown;
};

function buildQuarterRead(rows: ConcallRow[]): OverviewQuarterRead {
  // rows are newest-first
  const scored = rows
    .map((r) => ({ label: str(r.quarter_label), score: toNumber(r.score) }))
    .filter((r) => r.score != null);

  const scorePath: ScorePoint[] = scored
    .slice(0, 8)
    .reverse()
    .map((r, i) => ({ period: r.label ?? `#${i}`, value: r.score }));

  return {
    latestScore: scored[0]?.score ?? null,
    latestLabel: scored[0]?.label ?? null,
    scorePath,
  };
}

export const getOverviewSignalExtras = cache(
  async (code: string, companyName: string): Promise<OverviewSignalExtras> => {
    const supabase = await createClient();
    const normalizedCode = code.trim().toUpperCase();

    // Each leg degrades independently: a missing table (pre-DDL) or a failed
    // query blanks that card, never the page. Supabase builders RESOLVE with
    // `{ data: null, error }` rather than throwing, so the catch only covers
    // network/thrown failures — `error` is logged per leg below so a dropped
    // column or RLS denial leaves a trace instead of a silently blank card.
    const safe = async <T,>(leg: string, p: PromiseLike<T>, fallback: unknown): Promise<T> => {
      try {
        const res = await p;
        const err = (res as { error?: { message?: string } | null } | null)?.error;
        if (err) {
          logger.warn("overview-signal-board: leg failed", {
            leg,
            code: normalizedCode,
            error: err.message ?? String(err),
          });
        }
        return res;
      } catch (e) {
        logger.warn("overview-signal-board: leg threw", {
          leg,
          code: normalizedCode,
          error: (e as Error)?.message ?? String(e),
        });
        return fallback as T;
      }
    };

    const [
      concallRes,
      growthRes,
      valuationRes,
      valuationHistoryRes,
      businessRes,
      moatRes,
      qualityRow,
      walkTheTalk,
      guidanceRow,
    ] = await Promise.all([
      safe(
        "concall",
        supabase
          .from("concall_analysis")
          .select("fy, qtr, quarter_label, score")
          .eq("company_code", normalizedCode)
          // legacy-logic scores (no details.scoring_meta) are hidden portal-wide
          .not("details->scoring_meta", "is", null)
          .order("fy", { ascending: false })
          .order("qtr", { ascending: false })
          .limit(12),
        { data: null },
      ),
      safe(
        "growth",
        supabase
          .from("growth_outlook")
          // What buildGrowthSummary reads: the score, the base case and its
          // bear/bull range (columns + the scenarios block), and the horizon.
          .select(
            "company, growth_score, run_timestamp, horizon_years, base_growth_pct, upside_growth_pct, downside_growth_pct, scenarios, details",
          )
          // .in() quotes values — a name with "," or "()" would break a string-built .or().
          .in("company", [normalizedCode, companyName])
          .order("run_timestamp", { ascending: false })
          .limit(1),
        { data: null },
      ),
      safe(
        "valuation",
        supabase
          .from("valuation_check")
          .select("*")
          .eq("company_code", normalizedCode)
          .eq("valuation_published", true)
          // Deterministic: newest priced row wins if a company ever has two published rows.
          .order("priced_as_of", { ascending: false })
          .limit(1),
        { data: null },
      ),
      safe(
        "valuation-history",
        supabase
          .from("valuation_check_history")
          .select("priced_as_of, recorded_at, score")
          .eq("company_code", normalizedCode)
          // Same filter as the Valuation tab's sparkline: legacy rows predate the
          // `published` column (NULL); only an explicit --unpublish is excluded.
          .not("published", "is", false)
          .order("priced_as_of", { ascending: true }),
        { data: null },
      ),
      safe(
        "business",
        supabase
          .from("business_snapshot")
          // Only the two one-liner paths, never the full snapshot payload.
          .select(
            "generated_at, about_short:about_company->>about_short, summary_short:business_snapshot->>business_summary_short",
          )
          .eq("company", normalizedCode)
          .order("generated_at", { ascending: false })
          .limit(1),
        { data: null },
      ),
      safe(
        "moat",
        supabase
          .from("moat_analysis")
          .select(
            "id, company_code, company_name, industry, rating, tier, gatekeeper_answer, cycle_tested, assessment_payload, assessment_version, created_at, updated_at",
          )
          .eq("company_code", normalizedCode)
          .limit(1),
        { data: null },
      ),
      safe("quality", getCompanyQualityRow(normalizedCode), null),
      safe("walk-the-talk", getWalkTheTalk(normalizedCode), null),
      safe("guidance-snapshot", getGuidanceSnapshotRow(normalizedCode), null),
    ]);

    // Quarter
    const concallRows = ((concallRes as { data: unknown }).data ?? []) as ConcallRow[];
    const quarter = buildQuarterRead(concallRows);

    // Growth — the same summary the Growth tab's top card renders.
    const growthRow = ((growthRes as { data: Record<string, unknown>[] | null }).data ?? [])[0];
    const growth = growthRow
      ? normalizeGrowthOutlook({
          details: growthRow.details,
          growthScore: growthRow.growth_score,
          runTimestamp: growthRow.run_timestamp,
          horizonYears: growthRow.horizon_years,
          baseGrowthPct: growthRow.base_growth_pct,
          upsideGrowthPct: growthRow.upside_growth_pct,
          downsideGrowthPct: growthRow.downside_growth_pct,
          scenarios: growthRow.scenarios,
        })
      : null;
    const growthSummary = buildGrowthSummary(growth);
    const growthRange: OverviewGrowthRange | null = growthSummary?.revenueGrowth
      ? {
          bear: growthSummary.bearGrowth,
          base: growthSummary.revenueGrowth,
          bull: growthSummary.bullGrowth,
          horizonYears: growthSummary.horizonYears,
        }
      : null;

    // Valuation — same staleness gate as the section: no verdict past the window.
    const valuationRow = ((valuationRes as { data: ValuationCheckRow[] | null }).data ?? [])[0];
    const valuationNorm = normalizeValuationCheck(valuationRow ?? null);
    let valuation: OverviewValuationRead | null = null;
    if (valuationNorm) {
      const staleness = assessStaleness(valuationNorm);
      const showVerdict = valuationNorm.rateable && Boolean(valuationNorm.verdict) && !staleness.stale;
      const withheldReason = showVerdict
        ? null
        : staleness.stale
          ? (staleness.reason ?? "price read is stale")
          : (valuationNorm.unratedReasons[0] ?? "not rated");
      const history = buildValuationScoreHistory(
        ((valuationHistoryRes as { data: ValuationScoreHistoryRow[] | null }).data ?? null),
      );
      valuation = {
        verdictLabel:
          showVerdict && valuationNorm.verdict ? VERDICT_DISPLAY[valuationNorm.verdict] : null,
        score: showVerdict ? toValuationScale(valuationNorm.score) : null,
        withheldReason,
        path: history.map((p) => ({ period: p.period, value: p.value / 10 })),
      };
    }

    // Business — the snapshot's own one-liner (about_short, else the legacy summary).
    const businessRow = ((businessRes as { data: Record<string, unknown>[] | null }).data ?? [])[0];
    const businessLine = str(businessRow?.about_short) ?? str(businessRow?.summary_short);

    // Moat — rating + tier + the payload's own headline.
    const moatRow = ((moatRes as { data: MoatAnalysisRow[] | null }).data ?? [])[0];
    const moatNorm = normalizeMoatAnalysis(moatRow ?? null);
    const moat = moatNorm
      ? {
          rating: moatNorm.moatRating,
          tier: moatNorm.moatTier,
          headline: moatNorm.payload?.headline?.trim() || null,
        }
      : null;

    // Forensics — the Quality tab's tally and headline, same normalizer.
    const qualityForensics = normalizeCompanyQuality(qualityRow)?.forensics ?? null;
    const forensics =
      qualityForensics && qualityForensics.tally.assessed > 0
        ? { tally: qualityForensics.tally, headline: qualityForensics.read.headline }
        : null;

    // Guidance ambition — deep-track forward strength only.
    const guidanceDetails = normalizeGuidanceSnapshot(guidanceRow)?.details ?? null;
    const guidanceAmbition = parseForwardStrength(guidanceDetails)?.ambition.label ?? null;

    return {
      quarter,
      growthScore: growth?.growthScore ?? null,
      growthRange,
      valuation,
      businessLine,
      moat,
      forensics,
      walkTheTalk: walkTheTalk && walkTheTalk.schemaStatus === "present" ? walkTheTalk : null,
      guidanceAmbition,
    };
  },
);

export type OverviewBoardPosition = {
  rank: number;
  total: number;
  /** Share of the covered universe this company reads above, 0–1. */
  percentile: number;
  belowLine: boolean;
};

/**
 * Live Overall-board position — the SAME pipeline the leaderboard renders with
 * (getOverallBoardRows → classifyBoardRead → computeBoardRanks), so the two
 * surfaces can never show different ranks. Fleet-wide, so callers stream it.
 */
export async function getOverviewBoardPosition(
  companyCode: string,
): Promise<OverviewBoardPosition | null> {
  const code = companyCode.trim().toUpperCase();
  if (!code) return null;
  try {
    const rows = await getOverallBoardRows();
    const scored = rows.map((row) => ({
      companyCode: row.companyCode,
      companyName: row.companyName,
      readScore: classifyBoardRead({
        concallScore: row.concallScore,
        growthScore: row.growthScore,
        valuationScore: row.valuationScore,
      }).score,
      growthScore: row.growthScore,
    }));
    const rankByCode = computeBoardRanks(scored);
    const rank = rankByCode.get(code);
    if (rank == null) return null;
    const own = scored.find((r) => r.companyCode.toUpperCase() === code)?.readScore ?? null;
    const universe = scored
      .map((r) => r.readScore)
      .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
    const percentile = own != null && universe.length > 0 ? percentileOf(own, universe) : 0;
    return {
      rank,
      total: rankByCode.size,
      percentile,
      belowLine: rank > COVERAGE_BOARD_SIZE,
    };
  } catch {
    return null;
  }
}
