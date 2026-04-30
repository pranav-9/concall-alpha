import { createClient } from "@/lib/supabase/server";

// Note: concall_analysis.fy is stored as the 4-digit year (e.g. 2026),
// not the short FY identifier — keep this in sync with that schema.
export const TARGET_FY = 2026;
export const TARGET_QTR = 4;
export const TARGET_LABEL = "Q4 FY26";

export type BucketKey = "excellent" | "great" | "good" | "ok" | "weak" | "upcoming";

export const BUCKET_ORDER: BucketKey[] = [
  "excellent",
  "great",
  "good",
  "ok",
  "weak",
  "upcoming",
];

type BucketDef = {
  key: BucketKey;
  label: string;
  description: string;
  barClass: string;
  textClass: string;
  borderClass: string;
};

export const BUCKETS: Record<BucketKey, BucketDef> = {
  excellent: {
    key: "excellent",
    label: "Excellent",
    description: "Score ≥ 9.0",
    barClass: "bg-emerald-500",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-300/60 dark:border-emerald-700/40",
  },
  great: {
    key: "great",
    label: "Great",
    description: "8.5 – 9.0",
    barClass: "bg-sky-500",
    textClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-sky-300/60 dark:border-sky-700/40",
  },
  good: {
    key: "good",
    label: "Good",
    description: "7.5 – 8.5",
    barClass: "bg-green-500",
    textClass: "text-green-700 dark:text-green-300",
    borderClass: "border-green-300/60 dark:border-green-700/40",
  },
  ok: {
    key: "ok",
    label: "Ok",
    description: "6.5 – 7.5",
    barClass: "bg-amber-400",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-300/60 dark:border-amber-700/40",
  },
  weak: {
    key: "weak",
    label: "Weak",
    description: "< 6.5",
    barClass: "bg-red-500",
    textClass: "text-red-700 dark:text-red-300",
    borderClass: "border-red-300/60 dark:border-red-700/40",
  },
  upcoming: {
    key: "upcoming",
    label: "Upcoming",
    description: "Not yet reported",
    barClass: "bg-zinc-300 dark:bg-zinc-700",
    textClass: "text-zinc-700 dark:text-zinc-300",
    borderClass: "border-zinc-300/60 dark:border-zinc-700/40",
  },
};

export const bucketForScore = (score: number): Exclude<BucketKey, "upcoming"> => {
  if (score >= 9) return "excellent";
  if (score >= 8.5) return "great";
  if (score >= 7.5) return "good";
  if (score > 6.5) return "ok";
  return "weak";
};

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
      supabase.from("concall_analysis").select("company_code, score, fy, qtr"),
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
