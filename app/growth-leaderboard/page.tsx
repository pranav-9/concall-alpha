import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

type GrowthRow = {
  company: string;
  fiscal_year?: string | number | null;
  base_growth_pct?: string | number | null;
  upside_growth_pct?: string | number | null;
  downside_growth_pct?: string | number | null;
};

type GrowthEntry = {
  company: string;
  fiscalYear?: string | null;
  base?: number | null;
  upside?: number | null;
  downside?: number | null;
};

export const metadata: Metadata = {
  title: "Growth Leaderboard – Concall Alpha",
  description: "Ranking companies by forward-looking growth outlook guidance.",
};

const parsePct = (val: string | number | null | undefined): number | null => {
  if (val == null) return null;
  if (typeof val === "number") return val;
  const parsed = parseFloat(val);
  return Number.isFinite(parsed) ? parsed : null;
};

const fetchGrowthLeaders = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("growth_outlook")
    .select("company, fiscal_year, base_growth_pct, upside_growth_pct, downside_growth_pct")
    .order("run_timestamp", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as GrowthRow[];
  const latestByCompany = new Map<string, GrowthRow>();

  rows.forEach((row) => {
    if (!latestByCompany.has(row.company)) {
      latestByCompany.set(row.company, row);
    }
  });

  const entries: GrowthEntry[] = Array.from(latestByCompany.values())
    .map((row) => ({
      company: row.company,
      fiscalYear: typeof row.fiscal_year === "string" ? row.fiscal_year : row.fiscal_year?.toString() ?? null,
      base: parsePct(row.base_growth_pct),
      upside: parsePct(row.upside_growth_pct),
      downside: parsePct(row.downside_growth_pct),
    }))
    .filter((entry) => entry.base != null || entry.upside != null || entry.downside != null)
    .sort((a, b) => (b.base ?? b.upside ?? 0) - (a.base ?? a.upside ?? 0));

  return entries;
};

const formatPct = (value: number | null | undefined) => {
  if (value == null) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
};

const Pill = ({ label, value }: { label: string; value: string }) => (
  <Badge variant="outline" className="text-[11px] px-2 py-0.5 border-gray-700">
    {label}: {value}
  </Badge>
);

export default async function GrowthLeaderboardPage() {
  const entries = await fetchGrowthLeaders();

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-white">Growth Outlook Leaderboard</h1>
        <p className="text-sm text-gray-400">
          Ranked by base growth % guidance (latest per company).
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="text-muted-foreground">No growth outlook data available yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry, idx) => (
            <div
              key={entry.company}
              className="flex flex-col gap-2 rounded-xl bg-gray-950/70 border border-gray-800 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">#{idx + 1}</span>
                    <p className="text-lg font-semibold text-white leading-tight">
                      {entry.company}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.fiscalYear && (
                      <Pill label="FY" value={entry.fiscalYear.toUpperCase()} />
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Base</p>
                  <p className="text-xl font-bold text-emerald-300">{formatPct(entry.base)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-gray-300">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">Upside</span>
                  <span className="font-medium text-amber-200">{formatPct(entry.upside)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">Downside</span>
                  <span className="font-medium text-rose-200">{formatPct(entry.downside)}</span>
                </div>
                <div className="flex flex-col gap-1 sm:items-end">
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">Trend basis</span>
                  <span className="font-medium text-gray-200">Guidance-based</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Link href="/" prefetch={false} className="text-sm text-emerald-300 underline">
        Back to home
      </Link>
    </div>
  );
}
