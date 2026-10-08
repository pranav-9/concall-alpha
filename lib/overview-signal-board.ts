import "server-only";

import { cache } from "react";

import { classifyBoardRead } from "@/lib/board-read";
import { getCompanyIndustryAnalysis } from "@/lib/company-industry-analysis/get";
import { buildSubSectorEntries } from "@/lib/company-industry-analysis/view";
import { normalizeCompanyQuality } from "@/lib/company-quality/normalize";
import { getCompanyQualityRow } from "@/lib/company-quality/get";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { getGuidanceSnapshotRow } from "@/lib/guidance-snapshot/get";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import { parseForwardStrength } from "@/lib/guidance-snapshot/types";
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";
import { buildGrowthSummary } from "@/lib/growth-outlook/summary";
import { buildGuidanceVerdict } from "@/lib/guidance-tracking/verdict";
import { computeBoardRanks, COVERAGE_BOARD_SIZE } from "@/lib/leaderboard-rank";
import { logger } from "@/lib/logger";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import { getOverallBoardRows } from "@/lib/overall-board";
import { buildProsCons, type ProsCons, type ProsConsInputs } from "@/lib/overview-pros-cons";
import { percentileOf } from "@/lib/read-distribution";
import type { ScorePoint } from "@/lib/score-path";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import { createClient } from "@/lib/supabase/server";
import { buildValuationHeadline, VERDICT_DISPLAY } from "@/lib/valuation-check/headline";
import {
  buildValuationScoreHistory,
  type ValuationScoreHistoryRow,
} from "@/lib/valuation-check/history";
import { toValuationScale } from "@/lib/valuation-band";
import { assessStaleness, normalizeValuationCheck } from "@/lib/valuation-check/normalize";
import type { ValuationCheckRow } from "@/lib/valuation-check/types";
import { getWalkTheTalk } from "@/lib/walk-the-talk/get";

// Data for the company overview (redesigned 2026-10-01, simplified 2026-10-08:
// a header score strip, one story card, a compact strip of the three scores,
// and the good and the bad, ranked across every section by
// lib/overview-pros-cons).
//
// The overview cache row (lib/company-overview-cache.ts) already carries the
// scores, ranks, sector and story. What it does NOT carry is the business
// one-liner (getOverviewBusinessLine, read beside the cache row so the story
// card paints whole), the score and valuation paths, the growth base case and
// the moat / quality / guidance reads the good-and-bad board ranks. This module
// fetches those per company, in parallel, and degrades each leg independently:
// a missing table or a failed query blanks that piece, never the page. Every
// read goes through the same normalizer the section behind it uses, so the
// overview can never say something its section doesn't.

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
  base: string;
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
  /** The Growth tab summary's base case (revenue growth). */
  growthRange: OverviewGrowthRange | null;
  valuation: OverviewValuationRead | null;
  /** The clearly good and clearly bad readings across the sections, top five a side. */
  prosCons: ProsCons;
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
      moatRes,
      qualityRow,
      walkTheTalk,
      guidanceRow,
      industryAnalysis,
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
      // Pros and cons read only the lead market's capital cycle off this row.
      safe("industry", getCompanyIndustryAnalysis(normalizedCode), null),
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
      ? { base: growthSummary.revenueGrowth, horizonYears: growthSummary.horizonYears }
      : null;

    // Valuation — same staleness gate as the section: no verdict past the window.
    const valuationRow = ((valuationRes as { data: ValuationCheckRow[] | null }).data ?? [])[0];
    const valuationNorm = normalizeValuationCheck(valuationRow ?? null);
    let valuation: OverviewValuationRead | null = null;
    let shownVerdict: ProsConsInputs["valuation"] = null;
    if (valuationNorm) {
      const staleness = assessStaleness(valuationNorm);
      const showVerdict = valuationNorm.rateable && Boolean(valuationNorm.verdict) && !staleness.stale;
      if (showVerdict && valuationNorm.verdict) {
        shownVerdict = { verdict: valuationNorm.verdict, headline: buildValuationHeadline(valuationNorm) };
      }
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

    // Quality — financials, returns and forensic checks, same normalizer as the tab.
    const quality = normalizeCompanyQuality(qualityRow);

    // Guidance forward strength — deep-track snapshots only.
    const guidanceSnapshot = normalizeGuidanceSnapshot(guidanceRow);
    const forwardStrength = parseForwardStrength(guidanceSnapshot?.details ?? null);
    // The Guidance tab's verdict and "met / graded" count, off the same items.
    const guidanceItems = guidanceSnapshot?.guidanceItems ?? [];
    const guidanceVerdict =
      guidanceItems.length > 0
        ? buildGuidanceVerdict(
            guidanceItems,
            currentReportingQuarter(),
            (guidanceRow as { credibility_verdict?: unknown } | null)?.credibility_verdict,
          )
        : null;

    const presentWalkTheTalk = walkTheTalk && walkTheTalk.schemaStatus === "present" ? walkTheTalk : null;

    // Lead market's cycle — the same entry the Industry tab's "Where it sits"
    // reads: the first market, in qualifying order, that carries a cycle.
    const leadMarket = industryAnalysis
      ? (buildSubSectorEntries(industryAnalysis).find(
          (entry) => str(entry.capitalCycle?.stage) || str(entry.capitalCycle?.direction),
        ) ?? null)
      : null;
    const leadStage = str(leadMarket?.capitalCycle?.stage);

    const growthScore = growth?.growthScore ?? null;
    const prosCons = buildProsCons({
      quality,
      moat,
      concallPath: quarter.scorePath.filter(
        (p): p is { period: string; value: number } => p.value != null,
      ),
      growth:
        typeof growthScore === "number"
          ? {
              score: growthScore,
              base: growthRange?.base ?? null,
              horizonYears: growthRange?.horizonYears ?? null,
            }
          : null,
      valuation: shownVerdict,
      trackRecord: guidanceVerdict
        ? {
            tier: guidanceVerdict.tier,
            metCount: guidanceVerdict.metCount,
            countedCount: guidanceVerdict.countedCount,
          }
        : null,
      liveBook: presentWalkTheTalk
        ? {
            liveCount: presentWalkTheTalk.liveCount,
            revisedDownCount: presentWalkTheTalk.liveRevisedDownCount,
          }
        : null,
      guidance: forwardStrength
        ? {
            ambition: forwardStrength.ambition.label,
            evidence: forwardStrength.evidence.label,
            liveTotal: forwardStrength.evidence.liveTotal,
            orderBacked: forwardStrength.evidence.orderBacked,
            aspiration: forwardStrength.evidence.aspiration,
          }
        : null,
      industry: leadStage ? { stage: leadStage, market: str(leadMarket?.subSector) } : null,
    });

    return {
      quarter,
      growthScore,
      growthRange,
      valuation,
      prosCons,
    };
  },
);

/**
 * The business snapshot's own one-liner (about_short, else the legacy summary).
 * Read on the page's first await, beside the overview cache row, so the story
 * card — the overview's LCP element on phones — paints business line and story
 * together instead of growing when the extras land. Two JSON paths only, never
 * the snapshot payload; best-effort, a failure just drops the line.
 */
export const getOverviewBusinessLine = cache(async (code: string): Promise<string | null> => {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;
  try {
    const { data, error } = await createPublicReadClient()
      .from("business_snapshot")
      .select(
        "generated_at, about_short:about_company->>about_short, summary_short:business_snapshot->>business_summary_short",
      )
      .eq("company", normalizedCode)
      .order("generated_at", { ascending: false })
      .limit(1);
    if (error) {
      logger.warn("overview-signal-board: business line failed", {
        code: normalizedCode,
        error: error.message,
      });
      return null;
    }
    const row = (data ?? [])[0] as Record<string, unknown> | undefined;
    return str(row?.about_short) ?? str(row?.summary_short);
  } catch {
    return null;
  }
});

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
