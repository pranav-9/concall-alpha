import "server-only";

import { cache } from "react";

import { formatRelativeActivityTime } from "@/lib/activity-feed";
import { classifyBoardRead } from "@/lib/board-read";
import { safeFilingHref } from "@/lib/exchange-desk/filing-href";
import { categoryLabel, coerceImpact, type ExchangeImpact } from "@/lib/exchange-desk/types";
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";
import { computeBoardRanks, COVERAGE_BOARD_SIZE } from "@/lib/leaderboard-rank";
import { logger } from "@/lib/logger";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import { edgePhrase } from "@/lib/moat-analysis/plain-language";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import { getOverallBoardRows } from "@/lib/overall-board";
import { percentileOf } from "@/lib/read-distribution";
import type { ScorePoint } from "@/lib/score-path";
import {
  classifyTrajectory,
  quarterIndex,
  type TrajectoryResult,
} from "@/lib/score-trajectory";
import { createClient } from "@/lib/supabase/server";
import { buildValuationHeadline, VERDICT_DISPLAY } from "@/lib/valuation-check/headline";
import { toValuationScale } from "@/lib/valuation-band";
import { assessStaleness, normalizeValuationCheck } from "@/lib/valuation-check/normalize";
import type { ValuationCheckRow, ValuationPill } from "@/lib/valuation-check/types";
import { getWalkTheTalk } from "@/lib/walk-the-talk/get";
import type { NormalizedWalkTheTalk } from "@/lib/walk-the-talk/types";

// Data for the recency-first company overview ("signal board", 2026-08-21).
//
// The overview cache row (lib/company-overview-cache.ts) already carries the
// scores, ranks, deltas and series. What it does NOT carry is the one-line
// "why" behind each read, the trajectory label, the valuation lenses, the
// walk-the-talk grade, theme membership and the announcement tape — the parts
// that make the board readable without opening a section. This module fetches
// those per company, in parallel, and degrades each leg independently: a
// missing table or a failed query blanks that card, never the page.

const ACTIVITY_WINDOW_DAYS = 60;

const ACTIVITY_LIMIT = 5;

const toNumber = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

const parseJsonObject = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

export type OverviewQuarterRead = {
  /**
   * Latest / prior print read LIVE from concall_analysis, alongside their labels,
   * so the card's score, delta, label and why-line always describe the same
   * quarter. The overview cache row can lag a fresh score by a revalidate window;
   * mixing its score with these labels would caption Q4's number "Q1".
   */
  latestScore: number | null;
  priorScore: number | null;
  latestLabel: string | null;
  priorLabel: string | null;
  /** The one-line "why" for the latest print, from the scored row's own fields. */
  whyLine: string | null;
  trajectory: TrajectoryResult | null;
  /** Oldest → newest, ≤ 8 prints, for the sparkline. */
  scorePath: ScorePoint[];
};

export type OverviewValuationRead = {
  /** Verdict label, present ONLY when a verdict is shown (rateable + fresh). */
  verdictLabel: string | null;
  /** Valuation score on the 0-10 board scale, present ONLY when a verdict is shown. */
  score: number | null;
  headline: string | null;
  /** null = a verdict is shown; string = why it is withheld. */
  withheldReason: string | null;
  ageDays: number | null;
  lenses: { label: string; pill: ValuationPill }[];
};

export type OverviewActivityItem = {
  id: string;
  kind: string;
  impact: ExchangeImpact | null;
  headline: string;
  filedRaw: string;
  whenLabel: string;
  href: string | null;
};

export type OverviewThemeTag = { slug: string; title: string; rationale: string | null };

export type OverviewSignalExtras = {
  quarter: OverviewQuarterRead;
  /** Live growth score from the same row as the why-line (cache can lag a refresh). */
  growthScore: number | null;
  growthWhyLine: string | null;
  valuation: OverviewValuationRead | null;
  moat: { phrase: string; headline: string | null } | null;
  walkTheTalk: NormalizedWalkTheTalk | null;
  themes: OverviewThemeTag[];
  activity: OverviewActivityItem[];
};

type ConcallRow = {
  fy: unknown;
  qtr: unknown;
  quarter_label: unknown;
  score: unknown;
  details: unknown;
};

function quarterWhyLine(row: ConcallRow | undefined): string | null {
  if (!row) return null;
  const details = parseJsonObject(row.details);
  const resultsSummary = Array.isArray(details?.results_summary)
    ? (details!.results_summary as unknown[]).map(str).filter(Boolean)
    : [];
  if (resultsSummary[0]) return resultsSummary[0];
  const rationale = Array.isArray(details?.rationale) ? (details!.rationale as unknown[]) : [];
  for (const item of rationale) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (item && typeof item === "object") {
      // `detail` is the full sentence; `heading` is a terse label — prefer the sentence.
      const o = item as { heading?: unknown; detail?: unknown };
      const line = str(o.detail) ?? str(o.heading);
      if (line) return line;
    }
  }
  return null;
}

function buildQuarterRead(rows: ConcallRow[]): OverviewQuarterRead {
  // rows are newest-first
  const scored = rows
    .map((r) => ({
      fy: toNumber(r.fy),
      qtr: toNumber(r.qtr),
      label: str(r.quarter_label),
      score: toNumber(r.score),
      row: r,
    }))
    .filter((r) => r.score != null);

  // Gap detection mirrors app/company/get-concall-data.ts exactly (4-record
  // window over the RAW rows: a null score or non-contiguous fy/qtr inside it
  // withholds event labels), so the overview and the leaderboard never carry two
  // different Trend labels for the same company.
  const gapWindow = rows.slice(0, 4).map((r) => ({
    fy: toNumber(r.fy),
    qtr: toNumber(r.qtr),
    score: toNumber(r.score),
  }));
  let hasGapInWindow = gapWindow.some((r) => r.score == null);
  for (let i = 0; i < gapWindow.length - 1; i += 1) {
    const a = gapWindow[i];
    const b = gapWindow[i + 1];
    if (a.fy == null || a.qtr == null || b.fy == null || b.qtr == null) {
      hasGapInWindow = true;
      continue;
    }
    if (quarterIndex(a.fy, a.qtr) - quarterIndex(b.fy, b.qtr) !== 1) hasGapInWindow = true;
  }

  const trajectory =
    scored.length > 0
      ? classifyTrajectory(
          scored.map((r) => r.score as number),
          { hasGapInWindow },
        )
      : null;

  const scorePath: ScorePoint[] = scored
    .slice(0, 8)
    .reverse()
    .map((r, i) => ({ period: r.label ?? `#${i}`, value: r.score }));

  return {
    latestScore: scored[0]?.score ?? null,
    priorScore: scored[1]?.score ?? null,
    latestLabel: scored[0]?.label ?? null,
    priorLabel: scored[1]?.label ?? null,
    // Why-line from the same row as the displayed score — a partially written
    // row (scoring_meta present, score null) must not caption the prior print.
    whyLine: quarterWhyLine(scored[0]?.row),
    trajectory,
    scorePath,
  };
}

export const getOverviewSignalExtras = cache(
  async (code: string, companyName: string): Promise<OverviewSignalExtras> => {
    const supabase = await createClient();
    const normalizedCode = code.trim().toUpperCase();
    const activityNowMs = Date.now();
    const activityNow = new Date(activityNowMs).toISOString();
    const activityCutoff = new Date(
      activityNowMs - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

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

    const [concallRes, growthRes, valuationRes, moatRes, walkTheTalk, membershipRes, annRes] =
      await Promise.all([
        safe(
          "concall",
          supabase
            .from("concall_analysis")
            .select("fy, qtr, quarter_label, score, details")
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
            // Only the lead bullet is rendered (top-level column, with the legacy
            // details.summary_bullets fallback the normalizer already handles).
            .select("company, growth_score, run_timestamp, summary_bullets, details")
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
        safe("walk-the-talk", getWalkTheTalk(normalizedCode), null),
        safe(
          "themes",
          supabase
            .from("theme_membership")
            .select("theme_slug, rationale")
            .eq("company_code", normalizedCode),
          { data: null },
        ),
        safe(
          "announcements",
          supabase
            .from("bse_announcements")
            .select("announcement_id, filed_at, headline, summary, category, impact, attachment_url")
            .eq("company_code", normalizedCode)
            .eq("is_material", true)
            .gte("filed_at", activityCutoff)
            // A future-dated (mis-parsed or poisoned) row must not pin the top slot.
            .lte("filed_at", activityNow)
            .order("filed_at", { ascending: false })
            .limit(ACTIVITY_LIMIT),
          { data: null },
        ),
      ]);

    // Quarter
    const concallRows = ((concallRes as { data: unknown }).data ?? []) as ConcallRow[];
    const quarter = buildQuarterRead(concallRows);

    // Growth — first summary bullet is the pipeline's own lead line.
    const growthRow = ((growthRes as { data: Record<string, unknown>[] | null }).data ?? [])[0];
    const growth = growthRow
      ? normalizeGrowthOutlook({
          details: growthRow.details,
          growthScore: growthRow.growth_score,
          runTimestamp: growthRow.run_timestamp,
          summaryBullets: growthRow.summary_bullets,
        })
      : null;
    const growthWhyLine = growth?.summaryBullets?.[0]?.trim() || null;
    const growthScore = growth?.growthScore ?? null;

    // Valuation — same staleness gate as the section: no verdict past 4 days.
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
      valuation = {
        verdictLabel:
          showVerdict && valuationNorm.verdict ? VERDICT_DISPLAY[valuationNorm.verdict] : null,
        score: showVerdict ? toValuationScale(valuationNorm.score) : null,
        headline: showVerdict ? buildValuationHeadline(valuationNorm) : null,
        withheldReason,
        ageDays: staleness.ageDays,
        lenses: valuationNorm.lenses
          .filter((l): l is typeof l & { pill: ValuationPill } => Boolean(l.pill))
          .map((l) => ({ label: l.label, pill: l.pill })),
      };
    }

    // Moat — plain-language phrase, never the raw enum.
    const moatRow = ((moatRes as { data: MoatAnalysisRow[] | null }).data ?? [])[0];
    const moatNorm = normalizeMoatAnalysis(moatRow ?? null);
    const moat = moatNorm
      ? {
          phrase: edgePhrase(moatNorm.moatRating, moatNorm.moatTier),
          headline: moatNorm.payload?.headline?.trim() || null,
        }
      : null;

    // Themes — membership rows joined to titles; any failure → no chips.
    const memberships = ((membershipRes as { data: Array<{ theme_slug: unknown; rationale: unknown }> | null })
      .data ?? []).filter((m) => typeof m.theme_slug === "string");
    let themes: OverviewThemeTag[] = [];
    if (memberships.length > 0) {
      const slugs = memberships.map((m) => String(m.theme_slug));
      // Only featured themes are ever rendered on /themes — an unfeatured
      // membership must not become a chip that links to a page it's absent from.
      const themeRes = await safe(
        "theme-titles",
        supabase
          .from("theme")
          .select("slug, title, is_featured, sort")
          .in("slug", slugs)
          .eq("is_featured", true)
          .order("sort", { ascending: true }),
        { data: null },
      );
      const titleBySlug = new Map<string, string>();
      ((themeRes as { data: Array<{ slug: unknown; title: unknown }> | null }).data ?? []).forEach(
        (t) => {
          if (typeof t.slug === "string" && typeof t.title === "string") titleBySlug.set(t.slug, t.title);
        },
      );
      themes = memberships
        .map((m) => ({
          slug: String(m.theme_slug),
          title: titleBySlug.get(String(m.theme_slug)) ?? "",
          rationale: str(m.rationale),
        }))
        .filter((t) => t.title);
    }

    // Activity tape — material BSE filings, newest first.
    const activity: OverviewActivityItem[] = (
      ((annRes as { data: Array<Record<string, unknown>> | null }).data ?? [])
    )
      .map((row): OverviewActivityItem | null => {
        const headline = str(row.summary) ?? str(row.headline);
        const filedRaw = str(row.filed_at);
        if (!headline || !filedRaw) return null;
        return {
          id: String(row.announcement_id ?? filedRaw),
          kind: categoryLabel(str(row.category) ?? "") || "filing",
          impact: coerceImpact(str(row.impact)),
          headline,
          filedRaw,
          whenLabel: formatRelativeActivityTime(filedRaw),
          href: safeFilingHref(str(row.attachment_url)),
        };
      })
      .filter((x): x is OverviewActivityItem => x != null);

    return {
      quarter,
      growthScore,
      growthWhyLine,
      valuation,
      moat,
      walkTheTalk: walkTheTalk && walkTheTalk.schemaStatus === "present" ? walkTheTalk : null,
      themes,
      activity,
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
