import { LeaderboardTable } from "@/app/company/leaderboard-table";
import { getConcallData } from "@/app/company/get-concall-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { GrowthTable, type GrowthRowTable } from "./growth-table";

type GrowthRow = {
  company: string;
  fiscal_year?: string | number | null;
  base_growth_pct?: string | number | null;
  upside_growth_pct?: string | number | null;
  downside_growth_pct?: string | number | null;
  growth_score?: string | number | null;
  growth_score_formula?: string | null;
  growth_score_steps?: string[] | null;
};

type GrowthEntry = {
  company: string;
  fiscalYear?: string | null;
  base?: number | null;
  upside?: number | null;
  downside?: number | null;
  growthScore?: number | null;
  growthFormula?: string | null;
  growthSteps?: string[] | null;
};

export const metadata: Metadata = {
  title: "Leaderboards – Concall Alpha",
  description: "Concall sentiment and growth outlook leaderboards.",
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
    .select("company, fiscal_year, base_growth_pct, upside_growth_pct, downside_growth_pct, growth_score, growth_score_formula, growth_score_steps")
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
      growthScore: parsePct(row.growth_score),
      growthFormula: row.growth_score_formula ?? null,
      growthSteps: Array.isArray(row.growth_score_steps) ? row.growth_score_steps : null,
    }))
    .filter((entry) => entry.base != null || entry.upside != null || entry.downside != null)
    .sort((a, b) => {
      const aScore = typeof a.growthScore === "number" ? a.growthScore : null;
      const bScore = typeof b.growthScore === "number" ? b.growthScore : null;

      if (aScore != null && bScore != null) return bScore - aScore;
      if (aScore != null) return -1;
      if (bScore != null) return 1;

      const aBase = a.base ?? a.upside ?? 0;
      const bBase = b.base ?? b.upside ?? 0;
      return bBase - aBase;
    });

  return entries;
};

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolved = await searchParams;
  const defaultTab = resolved?.tab === "growth" ? "growth" : "sentiment";
  const [{ rows, quarterLabels }, growthEntries] = await Promise.all([
    getConcallData(),
    fetchGrowthLeaders(),
  ]);

  return (
    <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Leaderboards</h1>
        <p className="text-sm text-gray-400">
          Switch between concall sentiment and growth outlook rankings.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="bg-gray-900 w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="sentiment" className="mt-4">
          <LeaderboardTable quarterLabels={quarterLabels} data={rows} />
        </TabsContent>

        <TabsContent value="growth" className="mt-4">
          {growthEntries.length === 0 ? (
            <p className="text-muted-foreground">No growth outlook data available yet.</p>
          ) : (
            <GrowthTable data={growthEntries as GrowthRowTable[]} />
          )}
        </TabsContent>
      </Tabs>

      <Link href="/" prefetch={false} className="text-sm text-emerald-300 underline">
        Back to home
      </Link>
    </div>
  );
}
