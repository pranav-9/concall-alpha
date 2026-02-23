import Link from "next/link";
import ConcallScore from "@/components/concall-score";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 120;

type RawQuarterRow = {
  company_code: string;
  score: number;
  fy: number;
  qtr: number;
  quarter_label?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  company?: { name: string | null }[] | { name: string | null } | null;
};

type RawGrowthRow = {
  company: string;
  fiscal_year?: string | number | null;
  growth_score?: string | number | null;
  run_timestamp?: string | null;
};

type UpdateType = "quarter" | "growth";

type UnifiedUpdate = {
  id: string;
  type: UpdateType;
  companyName: string;
  companyCode: string | null;
  score: number | null;
  detail: string;
  atRaw: string | null;
  atMs: number;
};

const parseDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseScore = (value: string | number | null | undefined) => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDate = (value: string | null) => {
  const date = parseDate(value);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const eventTimeMs = (value: string | null | undefined) =>
  parseDate(value)?.getTime() ?? 0;

const typeChipClass = (type: UpdateType) => {
  if (type === "quarter") {
    return "bg-sky-900/30 border-sky-700/40 text-sky-200";
  }
  return "bg-emerald-900/30 border-emerald-700/40 text-emerald-200";
};

const typeLabel = (type: UpdateType) => {
  if (type === "quarter") return "Quarter";
  return "Growth Update";
};

async function getUnifiedUpdates(limit: number) {
  const supabase = await createClient();
  const [{ data: quarterRows }, { data: growthRows }] =
    await Promise.all([
      supabase
        .from("concall_analysis")
        .select(
          "company_code,score,fy,qtr,quarter_label,updated_at,created_at,company(name)"
        )
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("growth_outlook")
        .select("company,fiscal_year,growth_score,run_timestamp")
        .order("run_timestamp", { ascending: false })
        .limit(120),
    ]);

  const updates: UnifiedUpdate[] = [];
  const allQuarterRows = (quarterRows ?? []) as RawQuarterRow[];
  const latestQuarter = allQuarterRows.reduce<{ fy: number; qtr: number } | null>(
    (acc, row) => {
      if (!acc) return { fy: row.fy, qtr: row.qtr };
      if (row.fy > acc.fy) return { fy: row.fy, qtr: row.qtr };
      if (row.fy === acc.fy && row.qtr > acc.qtr) return { fy: row.fy, qtr: row.qtr };
      return acc;
    },
    null
  );

  const latestQuarterPerCompanyQuarter = new Map<string, UnifiedUpdate>();
  allQuarterRows
    .filter((row) =>
      latestQuarter ? row.fy === latestQuarter.fy && row.qtr === latestQuarter.qtr : false
    )
    .forEach((row) => {
    const atRaw = row.updated_at ?? row.created_at ?? null;
    const atMs = eventTimeMs(atRaw);
    const companyNameRaw = Array.isArray(row.company)
      ? row.company[0]?.name
      : row.company?.name;
    const companyName = companyNameRaw ?? row.company_code;
    const quarterLabel = row.quarter_label ?? `Q${row.qtr} FY${row.fy}`;
    const key = `${row.company_code}-${row.fy}-${row.qtr}`;
    const candidate: UnifiedUpdate = {
      id: `quarter-${key}`,
      type: "quarter",
      companyName,
      companyCode: row.company_code ?? null,
      score: parseScore(row.score),
      detail: quarterLabel.replace(/\s+/g, ""),
      atRaw,
      atMs,
    };
    const existing = latestQuarterPerCompanyQuarter.get(key);
    if (!existing || candidate.atMs > existing.atMs) {
      latestQuarterPerCompanyQuarter.set(key, candidate);
    }
  });
  updates.push(...latestQuarterPerCompanyQuarter.values());

  const latestGrowthPerCompany = new Map<string, UnifiedUpdate>();
  ((growthRows ?? []) as RawGrowthRow[]).forEach((row) => {
    const key = row.company?.toUpperCase();
    if (!key) return;
    const companyCode = row.company ?? null;
    const companyName = row.company;
    const fy = row.fiscal_year != null ? String(row.fiscal_year) : null;
    const atRaw = row.run_timestamp ?? null;
    const atMs = eventTimeMs(atRaw);
    const candidate: UnifiedUpdate = {
      id: `growth-${key}`,
      type: "growth",
      companyName,
      companyCode,
      score: parseScore(row.growth_score),
      detail: fy ? `${fy} outlook refreshed` : "Growth outlook refreshed",
      atRaw,
      atMs,
    };
    const existing = latestGrowthPerCompany.get(key);
    if (!existing || candidate.atMs > existing.atMs) {
      latestGrowthPerCompany.set(key, candidate);
    }
  });
  updates.push(...latestGrowthPerCompany.values());

  return updates.sort((a, b) => b.atMs - a.atMs).slice(0, limit);
}

export default async function RecentScoreUpdates({
  heroPanel = false,
}: {
  heroPanel?: boolean;
} = {}) {
  const updates = await getUnifiedUpdates(6);
  if (updates.length === 0) return null;

  return (
    <section className={heroPanel ? "w-full" : "w-[95%] sm:w-[90%] pt-6 sm:pt-8"}>
      {!heroPanel && (
        <div className="mb-2">
          <h2 className="text-base font-bold text-foreground">Latest Updates</h2>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="p-3 sm:p-4 border-b border-border">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Latest Updates
          </h2>
          <p className="text-xs text-muted-foreground">
            Time-ordered feed: quarter score, growth score, and new company updates
          </p>
        </div>

        <div className="divide-y divide-border">
          {updates.map((item) => {
            const row = (
              <div className="flex items-center justify-between gap-2 p-3 hover:bg-accent transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.companyName}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${typeChipClass(item.type)}`}
                    >
                      {item.type === "quarter" ? item.detail : typeLabel(item.type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.atRaw)}
                    </span>
                  </div>
                </div>
                {typeof item.score === "number" ? (
                  <ConcallScore score={item.score} size="sm" />
                ) : null}
              </div>
            );

            if (!item.companyCode) {
              return <div key={item.id}>{row}</div>;
            }

            return (
              <Link
                key={item.id}
                href={`/company/${item.companyCode}`}
                prefetch={false}
              >
                {row}
              </Link>
            );
          })}
        </div>

        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-border">
          <Link
            href="/company"
            prefetch={false}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            View all companies
          </Link>
        </div>
      </div>
    </section>
  );
}
