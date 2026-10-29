import "server-only";

import { unstable_cache } from "next/cache";

import { createPublicReadClient } from "@/lib/supabase/public-read";
import { selectMostViewed } from "@/lib/desk-most-viewed";
import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";
import { isCompanyNew } from "@/lib/company-freshness";
import { currentReportingQuarter, quarterLabelFor } from "@/lib/current-quarter";

// Every desk fetcher reads through the cookie-free public-read client: the raw
// reads are cached with unstable_cache (getCachedDeskSubstrate), and
// unstable_cache forbids cookies() inside its callback. Row parity with the
// cookie/service client was verified for these tables (2026-08-26).
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
  /** Covered companies with a current-quarter read. */
  reportedCount: number;
  /** Ranked reads from one quarter only — quarterLeadersLabel says which. */
  quarterLeaders: DeskRow[];
  /**
   * The quarter quarterLeaders is drawn from: the reporting quarter, or the one
   * before it while no covered company has a read for the reporting quarter yet.
   */
  quarterLeadersLabel: string;
  /** Most-viewed covered companies over the trailing 7 days (unique visitors). */
  mostViewedWeek: DeskRow[];
  /** Most-viewed covered companies over the trailing 30 days (unique visitors). */
  mostViewedMonth: DeskRow[];
  /** Which window the right-rail block opens on — Week unless it's empty. */
  mostViewedInitial: "week" | "month";
  /**
   * Every discovery-listed company, scored or not — the lookup the other desk
   * blocks (research updates, new coverage, movers) join against, so each one
   * applies the same coverage gate and shows the same score.
   */
  companies: DeskCompany[];
};

/** One discovery-listed company, as the desk's other blocks need it. */
export type DeskCompany = {
  code: string;
  name: string;
  sector: string | null;
  /** company.created_at — when the company entered coverage. */
  createdAt: string | null;
  /** Latest ConcallScore; null until its first scored call. */
  latestScore: number | null;
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
  const listed: CoverageRow[] = [];
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
    if (row.code) listed.push(row);
  });

  return { byCode, excludedKeys, listed, coveredCount };
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

// The heavy, user-independent reads (whole concall_analysis history and
// coverage) behind one cross-request cache. This
// caches RAW data only — no time-derived fields — so a warm board can't freeze
// the reporting quarter, the reportedCount, or the isNew badge for a whole
// revalidate window. Cookie-free client, same reason getConcallData is.
type DeskSubstrate = {
  companyRows: CoverageRow[];
  concallRows: ConcallRow[];
};

const getCachedDeskSubstrate = unstable_cache(
  async (): Promise<DeskSubstrate> => {
    const supabase = createPublicReadClient();
    const [companyRows, concallRows] = await Promise.all([
      fetchCompanyRows(supabase),
      fetchConcallRows(supabase),
    ]);
    return { companyRows, concallRows };
  },
  // v2 (2026-10-29): the moat + growth leader lists left the substrate with the
  // desk's ranking table; the new key drops cached entries that still carry them.
  ["desk-substrate-v2"],
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
  const { concallRows } = substrate;

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
  // Each row's latest-read quarter, keyed by uppercased code (quarterLeaders).
  const latestQuarterByCode = new Map<string, { fy: number; qtr: number }>();

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
    latestQuarterByCode.set(upper(latest.company_code), { fy: latest.fy, qtr: latest.qtr });

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

  // Quarter leaders rank only reads FROM the quarter they're labelled with — a
  // company still on last quarter's score isn't a this-quarter performer. Until
  // the season's first read lands, show the previous quarter (and say so) rather
  // than an empty block.
  const readsIn = (fy: number, qtr: number) =>
    scored.filter((r) => {
      const q = latestQuarterByCode.get(upper(r.code));
      return q?.fy === fy && q?.qtr === qtr;
    });
  let leadersQuarter: { fy: number; qtr: number } = quarter;
  let leadersPool = readsIn(quarter.fy, quarter.qtr);
  if (leadersPool.length === 0) {
    leadersQuarter =
      quarter.qtr === 1 ? { fy: quarter.fy - 1, qtr: 4 } : { fy: quarter.fy, qtr: quarter.qtr - 1 };
    leadersPool = readsIn(leadersQuarter.fy, leadersQuarter.qtr);
  }
  const quarterLeadersLabel = quarterLabelFor(leadersQuarter.fy, leadersQuarter.qtr);
  const quarterLeaders = [...leadersPool]
    .sort((a, b) => (b.latestScore ?? 0) - (a.latestScore ?? 0))
    .slice(0, 12);

  const rowByCode = new Map(rows.map((r) => [upper(r.code), r]));

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

  const companies: DeskCompany[] = coverage.listed.map((row) => {
    const code = row.code as string;
    return {
      code,
      name: row.name ?? code,
      sector: row.sector,
      createdAt: row.created_at,
      latestScore: rowByCode.get(upper(code))?.latestScore ?? null,
    };
  });

  return {
    quarterLabel: quarter.label,
    coveredCount: coverage.coveredCount,
    reportedCount,
    quarterLeaders,
    quarterLeadersLabel,
    mostViewedWeek,
    mostViewedMonth,
    mostViewedInitial,
    companies,
  };
}
