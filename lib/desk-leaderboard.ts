import "server-only";

import { createClient } from "@/lib/supabase/server";
import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";
import { isCompanyNew } from "@/lib/company-freshness";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import { MOAT_RATING_ORDER, moatTierRank } from "@/lib/moat-analysis/rank";
import type { MoatAnalysisRow, NormalizedMoatAnalysis } from "@/lib/moat-analysis/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// How many quarters of score history a row's sparkline draws.
const SPARK_QUARTERS = 7;

// PostgREST silently caps an unpaginated select at 1000 rows; concall_analysis
// crossed that during Q1 FY27, so page through it (mirrors top-stocks fetchAll).
const FETCH_ALL_PAGE_SIZE = 1000;

/** One company's row in the desk leaderboard, tab-agnostic. */
export type DeskRow = {
  code: string;
  name: string;
  sector: string | null;
  isNew: boolean;
  /** Latest ConcallScore; null when the company has a moat row but no score. */
  latestScore: number | null;
  /** The company's own latest-minus-previous quarter delta. */
  delta: number | null;
  /** Latest score vs the mean of the prior four quarters, as a percentage. */
  twistPct: number | null;
  /** Up to SPARK_QUARTERS scores, oldest-first, for the sparkline. */
  sparkPoints: number[];
  /** ISO timestamp the latest read was scored (scoring_meta.scored_at). */
  filedRaw: string | null;
  /** Moat label, only populated on moat-leader rows. */
  moatLabel: string | null;
};

export type DeskLeaderboard = {
  quarterLabel: string;
  /**
   * The discovery-listed universe (the ranked hundred). Kept in step with the
   * LIVE banner, which counts the same set, so the eyebrow's "N of coveredCount
   * calls read" can't disagree with "N reported" in the banner.
   */
  coveredCount: number;
  /** Distinct sectors with more than one covered company (matches /sectors). */
  sectorCount: number;
  /** Covered companies with a current-quarter read. */
  reportedCount: number;
  latestReads: DeskRow[];
  quarterLeaders: DeskRow[];
  positiveTwist: DeskRow[];
  moatLeaders: DeskRow[];
};

type ConcallRow = {
  company_code: string;
  score: number;
  fy: number;
  qtr: number;
  scored_at: string | null;
  company:
    | { name?: string | null; sector?: string | null; created_at?: string | null }
    | { name?: string | null; sector?: string | null; created_at?: string | null }[]
    | null;
};

type CoverageRow = {
  code: string | null;
  name: string | null;
  sector: string | null;
  created_at: string | null;
  market_cap_band_at_admission: string | null;
  excluded_from_discovery: boolean | null;
};

type CoverageInfo = {
  name: string | null;
  sector: string | null;
  createdAt: string | null;
};

const upper = (value: string | null | undefined) => (value ?? "").toUpperCase();

const embeddedCompany = (row: ConcallRow) =>
  Array.isArray(row.company) ? row.company[0] ?? null : row.company ?? null;

/**
 * Discovery-listed coverage keyed by uppercased code and name. Companies off
 * discovery — large-cap admissions (outside the mid/small positioning) and
 * below-cut names — are collected into `excludedKeys` and dropped, matching the
 * homepage/banner convention (isDiscoveryListed).
 */
async function fetchCoverage(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from("company")
    .select(`code, name, sector, created_at, ${COVERAGE_SELECT}`);
  if (error) throw error;

  const byCode = new Map<string, CoverageInfo>();
  const excludedKeys = new Set<string>();
  const sectorCounts = new Map<string, number>();
  let coveredCount = 0;

  (data ?? []).forEach((raw) => {
    const row = raw as CoverageRow;
    if (!isDiscoveryListed(row)) {
      if (row.code) excludedKeys.add(upper(row.code));
      if (row.name) excludedKeys.add(upper(row.name));
      return;
    }
    coveredCount += 1;
    const info: CoverageInfo = {
      name: row.name,
      sector: row.sector,
      createdAt: row.created_at,
    };
    if (row.code) byCode.set(upper(row.code), info);
    if (row.name) byCode.set(upper(row.name), info);
    if (row.sector) {
      sectorCounts.set(row.sector, (sectorCounts.get(row.sector) ?? 0) + 1);
    }
  });

  // Sectors with a single company are noise on a sector view (matches
  // app/sectors/page.tsx, which drops companyCount <= 1).
  const sectorCount = Array.from(sectorCounts.values()).filter((n) => n > 1).length;

  return { byCode, excludedKeys, coveredCount, sectorCount };
}

async function fetchConcallRows(supabase: SupabaseServerClient) {
  const rows: ConcallRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("concall_analysis")
      .select(
        "company_code, score, fy, qtr, scored_at:details->scoring_meta->>scored_at, company(name, sector, created_at)",
      )
      // legacy-logic scores (no scoring_meta) are hidden portal-wide.
      .not("details->scoring_meta", "is", null)
      .order("fy", { ascending: false })
      .order("qtr", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + FETCH_ALL_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as ConcallRow[];
    rows.push(...page);
    if (page.length < FETCH_ALL_PAGE_SIZE) break;
    from += FETCH_ALL_PAGE_SIZE;
  }
  return rows;
}

async function fetchMoatLeaders(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from("moat_analysis")
    .select(
      "id, company_code, company_name, industry, rating, tier, gatekeeper_answer, cycle_tested, assessment_payload, assessment_version, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;

  const latestByCompany = new Map<string, NormalizedMoatAnalysis>();
  ((data ?? []) as MoatAnalysisRow[]).forEach((row) => {
    const normalized = normalizeMoatAnalysis(row);
    if (!normalized) return;
    const key = upper(normalized.companyCode);
    if (!latestByCompany.has(key)) latestByCompany.set(key, normalized);
  });

  return Array.from(latestByCompany.values()).sort((a, b) => {
    const ratingDiff = MOAT_RATING_ORDER[a.moatRating] - MOAT_RATING_ORDER[b.moatRating];
    if (ratingDiff !== 0) return ratingDiff;
    const tierDiff = moatTierRank(a.moatTier) - moatTierRank(b.moatTier);
    if (tierDiff !== 0) return tierDiff;
    if (b.appliesSourceCount !== a.appliesSourceCount) {
      return b.appliesSourceCount - a.appliesSourceCount;
    }
    return (a.companyName ?? a.companyCode).localeCompare(b.companyName ?? b.companyCode);
  });
}

export async function getDeskLeaderboard(): Promise<DeskLeaderboard> {
  const supabase = await createClient();
  const now = new Date();
  const quarter = currentReportingQuarter(now);

  const [coverage, concallRows, moat] = await Promise.all([
    fetchCoverage(supabase),
    fetchConcallRows(supabase),
    fetchMoatLeaders(supabase),
  ]);

  // Group each covered company's reads, newest-first.
  const byCompany = new Map<string, ConcallRow[]>();
  concallRows.forEach((row) => {
    const key = upper(row.company_code);
    if (coverage.excludedKeys.has(key)) return; // off discovery
    if (!byCompany.has(key)) byCompany.set(key, []);
    byCompany.get(key)!.push(row);
  });

  let reportedCount = 0;
  const rows: DeskRow[] = [];

  byCompany.forEach((companyRows, key) => {
    const sorted = [...companyRows].sort((a, b) => b.fy - a.fy || b.qtr - a.qtr);
    const latest = sorted[0];
    if (!latest) return;

    const info = coverage.byCode.get(key);
    const embed = embeddedCompany(latest);
    const name = info?.name ?? embed?.name ?? latest.company_code;
    const sector = info?.sector ?? embed?.sector ?? null;
    const createdAt = info?.createdAt ?? embed?.created_at ?? null;

    const latestScore = Number(latest.score);
    const prevScore = sorted[1] ? Number(sorted[1].score) : null;
    const delta = prevScore != null ? latestScore - prevScore : null;

    // Latest vs the mean of the prior four quarters (the "trend twist").
    const priorFour = sorted.slice(1, 5);
    let twistPct: number | null = null;
    if (priorFour.length === 4) {
      const priorAvg =
        priorFour.reduce((acc, r) => acc + Number(r.score ?? 0), 0) / priorFour.length;
      if (priorAvg !== 0) twistPct = ((latestScore - priorAvg) / priorAvg) * 100;
    }

    const sparkPoints = sorted
      .slice(0, SPARK_QUARTERS)
      .reverse()
      .map((r) => Number(r.score));

    if (latest.fy === quarter.fy && latest.qtr === quarter.qtr) reportedCount += 1;

    rows.push({
      code: latest.company_code,
      name,
      sector,
      isNew: isCompanyNew(createdAt, now),
      latestScore: Number.isNaN(latestScore) ? null : latestScore,
      delta,
      twistPct,
      sparkPoints,
      filedRaw: latest.scored_at,
      moatLabel: null,
    });
  });

  const scored = rows.filter((r) => r.latestScore != null);

  const latestReads = [...rows]
    .filter((r) => r.filedRaw)
    .sort((a, b) => Date.parse(b.filedRaw!) - Date.parse(a.filedRaw!))
    .slice(0, 12);

  const quarterLeaders = [...scored]
    .sort((a, b) => (b.latestScore ?? 0) - (a.latestScore ?? 0))
    .slice(0, 12);

  const positiveTwist = [...rows]
    .filter((r) => (r.twistPct ?? 0) > 0)
    .sort((a, b) => (b.twistPct ?? 0) - (a.twistPct ?? 0))
    .slice(0, 12);

  // Moat leaders: enrich the moat ordering with each company's score history
  // (sector, sparkline, filed) from the concall rows built above. Skip names
  // that are off discovery (large-cap / below-cut).
  const rowByCode = new Map(rows.map((r) => [upper(r.code), r]));
  const moatLeaders: DeskRow[] = moat
    .filter((m) => !coverage.excludedKeys.has(upper(m.companyCode)))
    .slice(0, 12)
    .map((m) => {
      const key = upper(m.companyCode);
      const enriched = rowByCode.get(key);
      const info = coverage.byCode.get(key);
      return {
        code: m.companyCode,
        name: m.companyName ?? enriched?.name ?? m.companyCode,
        sector: enriched?.sector ?? info?.sector ?? null,
        isNew: enriched?.isNew ?? false,
        latestScore: enriched?.latestScore ?? null,
        delta: enriched?.delta ?? null,
        twistPct: enriched?.twistPct ?? null,
        sparkPoints: enriched?.sparkPoints ?? [],
        filedRaw: enriched?.filedRaw ?? null,
        moatLabel: m.moatRatingLabel,
      };
    });

  return {
    quarterLabel: quarter.label,
    coveredCount: coverage.coveredCount,
    sectorCount: coverage.sectorCount,
    reportedCount,
    latestReads,
    quarterLeaders,
    positiveTwist,
    moatLeaders,
  };
}
