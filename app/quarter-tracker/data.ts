import { unstable_cache } from "next/cache";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import {
  isScoredWithin24h,
  normalizeSourceStatus,
  scoreWrittenAt,
  type ScoreSourceStatus,
} from "@/lib/score-freshness";
import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";
import type { ScorePoint } from "@/lib/score-path";
import { BANDS, SCORE_BAND_ORDER, bandForScore, type BandKey } from "@/lib/score-band";
import {
  currentReportingQuarter,
  quarterLabelFor,
  type ReportingQuarter,
} from "@/lib/current-quarter";

// The tracked quarter is derived from today's date (lib/current-quarter), so
// the tracker rolls forward automatically each results season. fy/qtr match
// concall_analysis.fy (4-digit year) / qtr.
export const getTargetQuarter = (): ReportingQuarter => currentReportingQuarter();

// Score classification is platform-wide — single source of truth in lib/score-band.
// These thin aliases keep this page's existing names/shape; page.tsx is band-key-agnostic
// except for the "upcoming" not-reported state, which the shared module preserves.
export type BucketKey = BandKey;
export const BUCKET_ORDER = SCORE_BAND_ORDER;
export const BUCKETS = BANDS;
export const bucketForScore = bandForScore;

export type TrackerEntry = {
  code: string;
  name: string;
  sector: string | null;
  subSector: string | null;
  score: number | null;
  bucket: BucketKey;
  priorScore: number | null;
  priorLabel: string | null;
  expectedDate: string | null;
  /**
   * When this score was computed (scoring_meta.scored_at), NOT when the row was
   * inserted. During results season a company is scored off a third-party
   * transcript and re-scored days later off the issuer's — the row is upserted
   * in place, so created_at still points at the superseded score.
   */
  scoredAt: string | null;
  /** null = issuer-filed transcript; "unofficial" = third-party source. */
  sourceStatus: ScoreSourceStatus;
  /** Server-computed against one clock for the whole render. */
  scoredWithin24h: boolean;
  /**
   * Up to the last 7 scored quarters, oldest -> newest, for the inline
   * sparkline. Missing/unscored quarters are dropped rather than gapped: the
   * tracker only has one row per quarter here, so this is a dense series.
   */
  scorePath: ScorePoint[];
};

type CompanyRow = {
  code: string;
  name: string | null;
  sector: string | null;
  sub_sector: string | null;
  market_cap_band_at_admission: string | null;
  excluded_from_discovery: boolean | null;
};

type AnalysisRow = {
  company_code: string;
  score: number | string | null;
  fy: number;
  qtr: number;
  created_at: string | null;
  updated_at: string | null;
  source_status: string | null;
  scored_at: string | null;
};

type CalendarRow = {
  company_code: string | null;
  nse_symbol: string;
  event_date: string;
};

// PostgREST silently caps an unpaginated select at 1000 rows, so page through
// it. concall_analysis crossed 1000 rows through the scoring_meta filter during
// Q1 FY27 season; without paging, the newest quarter's inserts (which sort last)
// get dropped and their companies fall off the tracker. Mirrors fetchScoreRows
// in app/company/get-concall-data.ts.
const ANALYSIS_PAGE_SIZE = 1000;
const ANALYSIS_COLUMNS =
  "company_code, score, fy, qtr, created_at, updated_at, " +
  "source_status:details->scoring_meta->>source_status, " +
  "scored_at:details->scoring_meta->>scored_at";

async function fetchAnalysisRows(
  supabase: ReturnType<typeof createPublicReadClient>,
): Promise<AnalysisRow[]> {
  const rows: AnalysisRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("concall_analysis")
      .select(ANALYSIS_COLUMNS)
      // legacy-logic scores (no details.scoring_meta) are hidden portal-wide
      .not("details->scoring_meta", "is", null)
      .order("id", { ascending: true })
      .range(from, from + ANALYSIS_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as AnalysisRow[];
    rows.push(...page);
    if (page.length < ANALYSIS_PAGE_SIZE) break;
    from += ANALYSIS_PAGE_SIZE;
  }
  return rows;
}

const toNumberOrNull = (val: unknown): number | null => {
  if (val == null) return null;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : null;
};

const isPriorTo = (row: { fy: number; qtr: number }, fy: number, qtr: number) => {
  if (row.fy < fy) return true;
  if (row.fy > fy) return false;
  return row.qtr < qtr;
};

const isAtOrBefore = (row: { fy: number; qtr: number }, fy: number, qtr: number) =>
  row.fy < fy || (row.fy === fy && row.qtr <= qtr);

// How many trailing quarters the inline sparkline shows.
const SPARK_QUARTERS = 7;

// Build the oldest->newest score series the sparkline draws. Dedupe by (fy,qtr)
// keeping the last-seen row — a quarter can carry an unofficial then official
// upsert, and we want a single point per quarter.
const buildTrackerScorePath = (rows: AnalysisRow[] | undefined): ScorePoint[] => {
  if (!rows || rows.length === 0) return [];
  const byPeriod = new Map<number, AnalysisRow>();
  for (const r of rows) byPeriod.set(r.fy * 10 + r.qtr, r);
  return [...byPeriod.values()]
    .sort((a, b) => a.fy - b.fy || a.qtr - b.qtr)
    .slice(-SPARK_QUARTERS)
    .map((r) => ({ period: quarterLabelFor(r.fy, r.qtr), value: toNumberOrNull(r.score) }));
};

export type TrackerData = {
  target: ReportingQuarter;
  entries: TrackerEntry[];
  countsByBucket: Record<BucketKey, number>;
  sectors: string[];
  totalCompanies: number;
  reportedCompanies: number;
  /** Reported this quarter off a third-party transcript — each owes a re-score. */
  unofficialCompanies: number;
  /** Scored (or re-scored) in the last 24 hours. */
  freshCompanies: number;
};

// Everything time-INdependent lives in this cached fetch; the 24h-freshness
// flags are stamped per request in getTrackerData below. Cached because the
// fetch pages through the whole scoring_meta-filtered concall_analysis table
// (1000+ rows, serial round-trips) — done on every request it put the page's
// TTFB at 1.1–1.7s. The target quarter is an argument (not derived inside) so
// it participates in the cache key and a season rollover can't serve the old
// quarter for a revalidate window.
type CachedTrackerEntry = Omit<TrackerEntry, "scoredWithin24h">;

type CachedTrackerData = Omit<TrackerData, "entries" | "freshCompanies"> & {
  entries: CachedTrackerEntry[];
};

async function fetchTrackerData(target: ReportingQuarter): Promise<CachedTrackerData> {
  const supabase = createPublicReadClient();
  const [{ data: companyData }, analysisRows, calendarResult] =
    await Promise.all([
      supabase
        .from("company")
        .select(`code, name, sector, sub_sector, ${COVERAGE_SELECT}`),
      // source_status and scored_at come back as scalar JSON paths so the whole
      // details blob stays off the wire. Paged to dodge the 1000-row cap.
      fetchAnalysisRows(supabase),
      supabase
        .from("earnings_calendar")
        .select("company_code, nse_symbol, event_date")
        .eq("inferred_fy", target.fy)
        .eq("inferred_qtr", target.qtr),
    ]);

  // The tracker is a discovery surface (linked from the homepage banner):
  // de-emphasized companies (large-cap band / coverage cut) stay off it,
  // same as leaderboards and the homepage feed.
  const companies = ((companyData ?? []) as CompanyRow[]).filter(isDiscoveryListed);
  const analysis = analysisRows;
  // earnings_calendar may not yet exist in the DB — treat errors as empty.
  const calendarRows: CalendarRow[] =
    !calendarResult.error && Array.isArray(calendarResult.data)
      ? (calendarResult.data as CalendarRow[])
      : [];

  const calendarByCompany = new Map<string, string>();
  const calendarBySymbol = new Map<string, string>();
  for (const row of calendarRows) {
    if (!row.event_date) continue;
    if (row.company_code) {
      const key = row.company_code.toUpperCase();
      const existing = calendarByCompany.get(key);
      if (!existing || row.event_date < existing) {
        calendarByCompany.set(key, row.event_date);
      }
    }
    if (row.nse_symbol) {
      const sym = row.nse_symbol.toUpperCase();
      const existing = calendarBySymbol.get(sym);
      if (!existing || row.event_date < existing) {
        calendarBySymbol.set(sym, row.event_date);
      }
    }
  }

  const targetByCompany = new Map<string, AnalysisRow>();
  const priorBestByCompany = new Map<string, AnalysisRow>();
  const anyHistoryByCompany = new Set<string>();
  // All rows at or before the target quarter, per company — feeds the sparkline.
  const historyByCompany = new Map<string, AnalysisRow[]>();

  for (const row of analysis) {
    const key = row.company_code?.toUpperCase();
    if (!key) continue;
    if (row.fy === target.fy && row.qtr === target.qtr) {
      targetByCompany.set(key, row);
    }
    anyHistoryByCompany.add(key);
    if (isAtOrBefore(row, target.fy, target.qtr)) {
      const bucketRows = historyByCompany.get(key);
      if (bucketRows) bucketRows.push(row);
      else historyByCompany.set(key, [row]);
    }
    if (isPriorTo(row, target.fy, target.qtr)) {
      const existing = priorBestByCompany.get(key);
      if (
        !existing ||
        row.fy > existing.fy ||
        (row.fy === existing.fy && row.qtr > existing.qtr)
      ) {
        priorBestByCompany.set(key, row);
      }
    }
  }

  const entries: CachedTrackerEntry[] = companies
    .filter((c) => c.code)
    .map((c) => {
      const key = c.code.toUpperCase();
      const target = targetByCompany.get(key);
      const score = target ? toNumberOrNull(target.score) : null;
      const prior = priorBestByCompany.get(key);
      const priorScore = prior ? toNumberOrNull(prior.score) : null;

      let bucket: BucketKey;
      if (score != null) {
        bucket = bucketForScore(score);
      } else {
        bucket = "upcoming";
      }

      const expectedDate =
        calendarByCompany.get(key) ?? calendarBySymbol.get(key) ?? null;
      const scoredAt = target ? scoreWrittenAt(target) : null;

      return {
        code: c.code,
        name: c.name ?? c.code,
        sector: c.sector,
        subSector: c.sub_sector,
        score,
        bucket,
        priorScore,
        priorLabel: prior ? quarterLabelFor(prior.fy, prior.qtr) : null,
        expectedDate,
        scoredAt,
        sourceStatus: normalizeSourceStatus(target?.source_status),
        scorePath: buildTrackerScorePath(historyByCompany.get(key)),
      };
    })
    .filter((entry) => {
      if (entry.bucket !== "upcoming") return true;
      return anyHistoryByCompany.has(entry.code.toUpperCase());
    });

  entries.sort((a, b) => {
    const ai = BUCKET_ORDER.indexOf(a.bucket);
    const bi = BUCKET_ORDER.indexOf(b.bucket);
    if (ai !== bi) return ai - bi;
    const as = a.score ?? Number.NEGATIVE_INFINITY;
    const bs = b.score ?? Number.NEGATIVE_INFINITY;
    if (bs !== as) return bs - as;
    return a.name.localeCompare(b.name);
  });

  const countsByBucket = BUCKET_ORDER.reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as Record<BucketKey, number>,
  );
  for (const entry of entries) countsByBucket[entry.bucket] += 1;

  const sectors = Array.from(
    new Set(
      entries
        .map((e) => e.sector)
        .filter((s): s is string => Boolean(s && s.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return {
    target,
    entries,
    countsByBucket,
    sectors,
    totalCompanies: entries.length,
    reportedCompanies: entries.length - countsByBucket.upcoming,
    unofficialCompanies: entries.filter((e) => e.sourceStatus === "unofficial").length,
  };
}

const getCachedTrackerData = unstable_cache(
  fetchTrackerData,
  // Bump the version whenever TrackerEntry's shape changes — the cached payload
  // is JSON on disk, and a stale entry would arrive missing the new fields.
  ["quarter-tracker-v1"],
  { revalidate: 300 },
);

export async function getTrackerData(): Promise<TrackerData> {
  const data = await getCachedTrackerData(getTargetQuarter());
  // The 24h flag is stamped per request, never cached: a cached true would keep
  // a row "fresh" for a whole revalidate window past the edge. One clock for
  // the whole render, so two rows can't straddle the 24h edge.
  const renderedAt = new Date();
  const entries: TrackerEntry[] = data.entries.map((entry) => ({
    ...entry,
    scoredWithin24h: isScoredWithin24h(entry.scoredAt, renderedAt),
  }));
  return {
    ...data,
    entries,
    freshCompanies: entries.filter((e) => e.scoredWithin24h).length,
  };
}
