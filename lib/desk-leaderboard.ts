import "server-only";

import { unstable_cache } from "next/cache";

import { createPublicReadClient } from "@/lib/supabase/public-read";
import { selectMostViewed } from "@/lib/desk-most-viewed";
import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";
import { isCompanyNew } from "@/lib/company-freshness";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { normalizeGrowthPct } from "@/lib/growth-pct-normalizer";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import { MOAT_RATING_ORDER, moatTierRank } from "@/lib/moat-analysis/rank";
import type { MoatAnalysisRow, NormalizedMoatAnalysis } from "@/lib/moat-analysis/types";

// Every desk fetcher reads through the cookie-free public-read client: the raw
// reads are cached with unstable_cache (getCachedDeskSubstrate), and
// unstable_cache forbids cookies() inside its callback. Row parity with the
// cookie/service client was verified for all four tables (2026-08-26).
type DeskReadClient = ReturnType<typeof createPublicReadClient>;

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
  /** Base forward-growth display (e.g. "18%"), only populated on growth-leader rows. */
  growthLabel: string | null;
  /** Bear-case growth display, only populated on growth-leader rows. */
  growthDownside: string | null;
  /** Bull-case growth display, only populated on growth-leader rows. */
  growthUpside: string | null;
  /** Growth score (0–10, growth-band scale), only populated on growth-leader rows. */
  growthScore: number | null;
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
  growthLeaders: DeskRow[];
  moatLeaders: DeskRow[];
  /** Most-viewed covered companies over the trailing 7 days (unique visitors). */
  mostViewedWeek: DeskRow[];
  /** Most-viewed covered companies over the trailing 30 days (unique visitors). */
  mostViewedMonth: DeskRow[];
  /** Which window the right-rail block opens on — Week unless it's empty. */
  mostViewedInitial: "week" | "month";
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
// Raw company rows — the cacheable read. Map/Set-building lives in buildCoverage
// (below), which runs OUTSIDE the cache: unstable_cache JSON-serializes its
// result, and a Map/Set would round-trip to `{}`.
async function fetchCompanyRows(supabase: DeskReadClient): Promise<CoverageRow[]> {
  const { data, error } = await supabase
    .from("company")
    .select(`code, name, sector, created_at, ${COVERAGE_SELECT}`);
  if (error) throw error;
  return (data ?? []) as CoverageRow[];
}

/**
 * Discovery-listed coverage keyed by uppercased code and name. Companies off
 * discovery — large-cap admissions (outside the mid/small positioning) and
 * below-cut names — are collected into `excludedKeys` and dropped, matching the
 * homepage/banner convention (isDiscoveryListed). Pure derivation of the cached
 * company rows, so it runs per request outside the substrate cache.
 */
function buildCoverage(companyRows: CoverageRow[]) {
  const byCode = new Map<string, CoverageInfo>();
  const excludedKeys = new Set<string>();
  const sectorCounts = new Map<string, number>();
  let coveredCount = 0;

  companyRows.forEach((row) => {
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

async function fetchConcallRows(supabase: DeskReadClient) {
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

async function fetchMoatLeaders(supabase: DeskReadClient) {
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

type GrowthLeader = {
  companyCode: string;
  companyName: string | null;
  /** Base forward-growth display text (e.g. "18%" or "15-18%"). */
  baseDisplay: string | null;
  /** Bear-case (downside) growth display text. */
  downsideDisplay: string | null;
  /** Bull-case (upside) growth display text. */
  upsideDisplay: string | null;
  /** Growth score, the primary sort key. */
  growthScore: number | null;
};

// Latest growth_outlook row per company, ranked by growth score (base growth as
// the tiebreaker). Mirrors the /leaderboards Growth ordering, trimmed to what a
// desk row needs. Off-discovery names are dropped by the caller via excludedKeys.
async function fetchGrowthLeaders(supabase: DeskReadClient): Promise<GrowthLeader[]> {
  const { data, error } = await supabase
    .from("growth_outlook")
    .select(
      "company, run_timestamp, base_growth_pct, upside_growth_pct, downside_growth_pct, growth_score",
    )
    .order("run_timestamp", { ascending: false });
  if (error) throw error;

  type GrowthOutlookRow = {
    company: string | null;
    base_growth_pct?: string | number | null;
    upside_growth_pct?: string | number | null;
    downside_growth_pct?: string | number | null;
    growth_score?: string | number | null;
  };

  const latestByCompany = new Map<string, GrowthLeader>();
  ((data ?? []) as GrowthOutlookRow[]).forEach((row) => {
    const key = upper(row.company);
    if (!key || latestByCompany.has(key)) return; // rows are newest-first
    const scoreNum =
      row.growth_score == null ? null : Number(row.growth_score);
    latestByCompany.set(key, {
      companyCode: row.company ?? "",
      companyName: row.company ?? null,
      baseDisplay: normalizeGrowthPct(row.base_growth_pct).rawText,
      downsideDisplay: normalizeGrowthPct(row.downside_growth_pct).rawText,
      upsideDisplay: normalizeGrowthPct(row.upside_growth_pct).rawText,
      growthScore: scoreNum != null && Number.isFinite(scoreNum) ? scoreNum : null,
    });
  });

  return Array.from(latestByCompany.values()).sort((a, b) => {
    const aScore = a.growthScore;
    const bScore = b.growthScore;
    if (aScore != null && bScore != null && bScore !== aScore) return bScore - aScore;
    if (aScore != null && bScore == null) return -1;
    if (aScore == null && bScore != null) return 1;
    const aBase = normalizeGrowthPct(a.baseDisplay).sortValue ?? Number.NEGATIVE_INFINITY;
    const bBase = normalizeGrowthPct(b.baseDisplay).sortValue ?? Number.NEGATIVE_INFINITY;
    if (bBase !== aBase) return bBase - aBase;
    return (a.companyName ?? a.companyCode).localeCompare(b.companyName ?? b.companyCode);
  });
}

type MostViewedCodes = { week: string[]; month: string[] };

// Distinct-visitor top companies for one time window. Fail-soft: any error —
// including the RPC not existing yet (pre-DDL) — resolves to [] so the desk page
// never 500s over a missing analytics block.
async function fetchTopVisitors(
  client: ReturnType<typeof createPublicReadClient>,
  startIso: string,
  limit: number,
): Promise<string[]> {
  try {
    const { data, error } = await client.rpc("get_top_company_visitors", {
      start_ts: startIso,
      limit_n: limit,
    });
    if (error || !data) return [];
    return (data as { company_code: string | null }[])
      .map((r) => r.company_code)
      .filter((c): c is string => !!c);
  } catch {
    return [];
  }
}

// Cached ~5 min. A NO-ARG function so the cache key is stable — the 7d/30d
// cutoffs are computed INSIDE (bucketed to the hour), not passed as args, which
// would otherwise make every request a fresh key and defeat revalidate. Uses the
// cookie-free public-read client so the result stays cacheable.
const getCachedMostViewedCodes = unstable_cache(
  async (): Promise<MostViewedCodes> => {
    try {
      const nowMs = Date.now();
      const hourBucket = nowMs - (nowMs % 3_600_000);
      const iso = (days: number) =>
        new Date(hourBucket - days * 86_400_000).toISOString();
      const client = createPublicReadClient();
      const [week, month] = await Promise.all([
        fetchTopVisitors(client, iso(7), 40),
        fetchTopVisitors(client, iso(30), 40),
      ]);
      return { week, month };
    } catch {
      return { week: [], month: [] };
    }
  },
  ["desk-most-viewed-codes-v1"],
  { revalidate: 300 },
);

// The heavy, user-independent reads (whole concall_analysis history, the full
// moat payload parse, coverage and growth) behind one cross-request cache. This
// caches RAW data only — no time-derived fields — so a warm board can't freeze
// the reporting quarter, the reportedCount, or the isNew badge for a whole
// revalidate window. Cookie-free client, same reason getConcallData is.
type DeskSubstrate = {
  companyRows: CoverageRow[];
  concallRows: ConcallRow[];
  moatLeaders: NormalizedMoatAnalysis[];
  growthLeaders: GrowthLeader[];
};

const getCachedDeskSubstrate = unstable_cache(
  async (): Promise<DeskSubstrate> => {
    const supabase = createPublicReadClient();
    const [companyRows, concallRows, moatLeaders, growthLeaders] = await Promise.all([
      fetchCompanyRows(supabase),
      fetchConcallRows(supabase),
      fetchMoatLeaders(supabase),
      fetchGrowthLeaders(supabase),
    ]);
    return { companyRows, concallRows, moatLeaders, growthLeaders };
  },
  ["desk-substrate-v1"],
  { revalidate: 300 },
);

export async function getDeskLeaderboard(): Promise<DeskLeaderboard> {
  // Time-derived state stays OUTSIDE the cache. Most-viewed keeps its own cache
  // and is composed here too, so the board can't hold a doubly-stale window.
  const now = new Date();
  const quarter = currentReportingQuarter(now);

  const [substrate, mostViewedCodes] = await Promise.all([
    getCachedDeskSubstrate(),
    getCachedMostViewedCodes(),
  ]);

  const coverage = buildCoverage(substrate.companyRows);
  const { concallRows, moatLeaders: moat, growthLeaders: growth } = substrate;

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
      growthLabel: null,
      growthDownside: null,
      growthUpside: null,
      growthScore: null,
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
  const rowByName = new Map(rows.map((r) => [upper(r.name), r]));
  const moatLeaders: DeskRow[] = moat
    // Resolve by code OR name: moat_analysis sometimes stores a different
    // company_code (an internal id, e.g. "S00003") than concall_analysis, which
    // would otherwise blank the score/sparkline and produce a dead /company link.
    .filter(
      (m) =>
        !coverage.excludedKeys.has(upper(m.companyCode)) &&
        !coverage.excludedKeys.has(upper(m.companyName ?? "")),
    )
    .slice(0, 12)
    .map((m) => {
      const enriched =
        rowByCode.get(upper(m.companyCode)) ??
        (m.companyName ? rowByName.get(upper(m.companyName)) : undefined);
      const info =
        coverage.byCode.get(upper(m.companyCode)) ??
        (m.companyName ? coverage.byCode.get(upper(m.companyName)) : undefined);
      return {
        // Prefer the resolved concall/company code so the /company link works.
        code: enriched?.code ?? m.companyCode,
        name: enriched?.name ?? m.companyName ?? m.companyCode,
        sector: enriched?.sector ?? info?.sector ?? null,
        isNew: enriched?.isNew ?? false,
        latestScore: enriched?.latestScore ?? null,
        delta: enriched?.delta ?? null,
        twistPct: enriched?.twistPct ?? null,
        sparkPoints: enriched?.sparkPoints ?? [],
        filedRaw: enriched?.filedRaw ?? null,
        moatLabel: m.moatRatingLabel,
        growthLabel: null,
        growthDownside: null,
        growthUpside: null,
        growthScore: null,
      };
    });

  // Growth leaders: same enrich-from-concall-history shape as moat leaders, so
  // the row carries a score/sparkline/filed date and a live /company link. Drop
  // off-discovery names (large-cap / below-cut) and label with base FY growth.
  const growthLeaders: DeskRow[] = growth
    .filter(
      (g) =>
        !coverage.excludedKeys.has(upper(g.companyCode)) &&
        !coverage.excludedKeys.has(upper(g.companyName ?? "")),
    )
    .slice(0, 12)
    .map((g) => {
      const enriched =
        rowByCode.get(upper(g.companyCode)) ??
        (g.companyName ? rowByName.get(upper(g.companyName)) : undefined);
      const info =
        coverage.byCode.get(upper(g.companyCode)) ??
        (g.companyName ? coverage.byCode.get(upper(g.companyName)) : undefined);
      return {
        code: enriched?.code ?? g.companyCode,
        name: enriched?.name ?? g.companyName ?? g.companyCode,
        sector: enriched?.sector ?? info?.sector ?? null,
        isNew: enriched?.isNew ?? false,
        latestScore: enriched?.latestScore ?? null,
        delta: enriched?.delta ?? null,
        twistPct: enriched?.twistPct ?? null,
        sparkPoints: enriched?.sparkPoints ?? [],
        filedRaw: enriched?.filedRaw ?? null,
        moatLabel: null,
        growthLabel: g.baseDisplay,
        growthDownside: g.downsideDisplay,
        growthUpside: g.upsideDisplay,
        growthScore: g.growthScore,
      };
    });

  // Most viewed: turn the RPC's popularity-ordered codes into rows, gated by the
  // coverage map (so off-discovery / uncovered / fake codes drop) and enriched
  // with score/sparkline from the concall rows where available.
  const pickMostViewed = (codes: string[]) =>
    selectMostViewed({
      orderedCodes: codes,
      coveredByCode: coverage.byCode,
      excludedKeys: coverage.excludedKeys,
      rowByCode,
      limit: 8,
    });
  const mostViewedWeek = pickMostViewed(mostViewedCodes.week);
  const mostViewedMonth = pickMostViewed(mostViewedCodes.month);
  // Open on Week unless it's empty (quiet week at low traffic) — never first-paint
  // an empty flagship block.
  const mostViewedInitial: "week" | "month" =
    mostViewedWeek.length > 0 ? "week" : "month";

  return {
    quarterLabel: quarter.label,
    coveredCount: coverage.coveredCount,
    sectorCount: coverage.sectorCount,
    reportedCount,
    latestReads,
    quarterLeaders,
    positiveTwist,
    growthLeaders,
    moatLeaders,
    mostViewedWeek,
    mostViewedMonth,
    mostViewedInitial,
  };
}
