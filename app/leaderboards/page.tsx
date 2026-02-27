import { LeaderboardTable } from "@/app/company/leaderboard-table";
import { getConcallData } from "@/app/company/get-concall-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { GrowthTable } from "./growth-table";

type GrowthRow = {
  company: string;
  fiscal_year?: string | number | null;
  run_timestamp?: string | null;
  base_growth_pct?: string | number | null;
  upside_growth_pct?: string | number | null;
  downside_growth_pct?: string | number | null;
  growth_score?: string | number | null;
  growth_score_formula?: string | null;
  growth_score_steps?: string[] | null;
};

type CompanyRow = {
  code: string;
  name?: string | null;
};

type GrowthEntry = {
  companyCode: string;
  companyName: string;
  fiscalYear?: string | null;
  updatedAt?: string | null;
  base?: number | null;
  upside?: number | null;
  downside?: number | null;
  growthScore?: number | null;
  growthFormula?: string | null;
  growthSteps?: string[] | null;
};

export const metadata: Metadata = {
  title: "Leaderboards – Story of a Stock",
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
  const [{ data: companiesData, error: companiesError }, { data: growthData, error: growthError }] =
    await Promise.all([
      supabase.from("company").select("code, name"),
      supabase
        .from("growth_outlook")
        .select("company, fiscal_year, run_timestamp, base_growth_pct, upside_growth_pct, downside_growth_pct, growth_score, growth_score_formula, growth_score_steps")
        .order("run_timestamp", { ascending: false }),
    ]);

  if (companiesError) throw companiesError;
  if (growthError) throw growthError;

  const companies = (companiesData ?? []) as CompanyRow[];
  const rows = (growthData ?? []) as GrowthRow[];
  const latestByCompany = new Map<string, GrowthRow>();
  const companyByCode = new Map<string, CompanyRow>();
  const companyByName = new Map<string, CompanyRow>();

  companies.forEach((company) => {
    const codeKey = company.code?.toUpperCase();
    if (codeKey) companyByCode.set(codeKey, company);
    const nameKey = company.name?.toUpperCase();
    if (nameKey) companyByName.set(nameKey, company);
  });

  rows.forEach((row) => {
    const key = row.company?.toUpperCase();
    if (!key) return;
    if (!latestByCompany.has(key)) {
      latestByCompany.set(key, row);
    }
  });

  const entriesMap = new Map<string, GrowthEntry>();

  companies.forEach((company) => {
    entriesMap.set(company.code, {
      companyCode: company.code,
      companyName: company.name ?? company.code,
      fiscalYear: null,
      updatedAt: null,
      base: null,
      upside: null,
      downside: null,
      growthScore: null,
      growthFormula: null,
      growthSteps: null,
    });
  });

  latestByCompany.forEach((row, rowKey) => {
    const matchedCompany = companyByCode.get(rowKey) ?? companyByName.get(rowKey);
    const companyCode = matchedCompany?.code ?? row.company;
    const companyName = matchedCompany?.name ?? row.company;

    entriesMap.set(companyCode, {
      companyCode,
      companyName,
      fiscalYear:
        typeof row.fiscal_year === "string"
          ? row.fiscal_year
          : row.fiscal_year?.toString() ?? null,
      updatedAt: row.run_timestamp ?? null,
      base: parsePct(row.base_growth_pct),
      upside: parsePct(row.upside_growth_pct),
      downside: parsePct(row.downside_growth_pct),
      growthScore: parsePct(row.growth_score),
      growthFormula: row.growth_score_formula ?? null,
      growthSteps: Array.isArray(row.growth_score_steps) ? row.growth_score_steps : null,
    });
  });

  const entries: GrowthEntry[] = Array.from(entriesMap.values()).sort((a, b) => {
      const aScore = typeof a.growthScore === "number" ? a.growthScore : null;
      const bScore = typeof b.growthScore === "number" ? b.growthScore : null;

      if (aScore != null && bScore != null) {
        if (bScore !== aScore) return bScore - aScore;
        const aBaseTie = a.base ?? Number.NEGATIVE_INFINITY;
        const bBaseTie = b.base ?? Number.NEGATIVE_INFINITY;
        if (bBaseTie !== aBaseTie) return bBaseTie - aBaseTie;
        return a.companyName.localeCompare(b.companyName);
      }
      if (aScore != null) return -1;
      if (bScore != null) return 1;

      const aHasAnyPct = a.base != null || a.upside != null || a.downside != null;
      const bHasAnyPct = b.base != null || b.upside != null || b.downside != null;
      if (aHasAnyPct && !bHasAnyPct) return -1;
      if (!aHasAnyPct && bHasAnyPct) return 1;

      const aBase = a.base ?? Number.NEGATIVE_INFINITY;
      const bBase = b.base ?? Number.NEGATIVE_INFINITY;
      if (bBase !== aBase) return bBase - aBase;
      return a.companyName.localeCompare(b.companyName);
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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Leaderboards</h1>
        <p className="text-sm text-muted-foreground">
          Switch between concall sentiment and growth outlook rankings.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full sm:w-auto overflow-x-auto border border-border bg-muted/70">
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
            <GrowthTable data={growthEntries} />
          )}
        </TabsContent>
      </Tabs>

      <Link href="/" prefetch={false} className="text-sm text-emerald-700 dark:text-emerald-300 underline">
        Back to home
      </Link>
    </div>
  );
}
