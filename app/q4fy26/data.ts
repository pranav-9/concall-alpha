import { createClient } from "@/lib/supabase/server";
import { BANDS, SCORE_BAND_ORDER, bandForScore, type BandKey } from "@/lib/score-band";

// Note: concall_analysis.fy is stored as the 4-digit year (e.g. 2026),
// not the short FY identifier — keep this in sync with that schema.
export const TARGET_FY = 2026;
export const TARGET_QTR = 4;
export const TARGET_LABEL = "Q4 FY26";

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
  createdAt: string | null;
};

type CompanyRow = {
  code: string;
  name: string | null;
  sector: string | null;
  sub_sector: string | null;
};

type AnalysisRow = {
  company_code: string;
  score: number | string | null;
  fy: number;
  qtr: number;
  created_at: string | null;
};

type CalendarRow = {
  company_code: string | null;
  nse_symbol: string;
  event_date: string;
};

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

const quarterLabelFor = (fy: number, qtr: number) => {
  // fy is stored as 4-digit year (e.g. 2026); display as 2-digit "FY26".
  const short = fy >= 2000 ? fy - 2000 : fy;
  return `Q${qtr} FY${String(short).padStart(2, "0")}`;
};

export type TrackerData = {
  entries: TrackerEntry[];
  countsByBucket: Record<BucketKey, number>;
  sectors: string[];
  totalCompanies: number;
  reportedCompanies: number;
};

export async function getTrackerData(): Promise<TrackerData> {
  const supabase = await createClient();
  const [{ data: companyData }, { data: analysisData }, calendarResult] =
    await Promise.all([
      supabase.from("company").select("code, name, sector, sub_sector"),
      supabase
        .from("concall_analysis")
        .select("company_code, score, fy, qtr, created_at"),
      supabase
        .from("earnings_calendar")
        .select("company_code, nse_symbol, event_date")
        .eq("inferred_fy", TARGET_FY)
        .eq("inferred_qtr", TARGET_QTR),
    ]);

  const companies = (companyData ?? []) as CompanyRow[];
  const analysis = (analysisData ?? []) as AnalysisRow[];
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

  for (const row of analysis) {
    const key = row.company_code?.toUpperCase();
    if (!key) continue;
    if (row.fy === TARGET_FY && row.qtr === TARGET_QTR) {
      targetByCompany.set(key, row);
    }
    anyHistoryByCompany.add(key);
    if (isPriorTo(row, TARGET_FY, TARGET_QTR)) {
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

  const entries: TrackerEntry[] = companies
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
        createdAt: target?.created_at ?? null,
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
    entries,
    countsByBucket,
    sectors,
    totalCompanies: entries.length,
    reportedCompanies: entries.length - countsByBucket.upcoming,
  };
}
