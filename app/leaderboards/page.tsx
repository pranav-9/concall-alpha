import { LeaderboardTable } from "@/app/company/leaderboard-table";
import { getConcallData } from "@/app/company/get-concall-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildNewCompanySet } from "@/lib/company-freshness";
import { normalizeGrowthPct } from "@/lib/growth-pct-normalizer";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
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
  created_at?: string | null;
};

type GrowthEntry = {
  leaderboardRank: number;
  companyCode: string;
  companyName: string;
  isNew: boolean;
  fiscalYear?: string | null;
  updatedAt?: string | null;
  baseDisplay?: string | null;
  upsideDisplay?: string | null;
  downsideDisplay?: string | null;
  baseSort?: number | null;
  upsideSort?: number | null;
  downsideSort?: number | null;
  growthScore?: number | null;
  growthFormula?: string | null;
  growthSteps?: string[] | null;
};

export const metadata: Metadata = {
  title: "Leaderboards – Story of a Stock",
  description: "Concall sentiment and growth outlook leaderboards.",
};

const PAGE_BACKGROUND_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.78),_transparent_62%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.34),_transparent_62%)]";

const PAGE_SHELL_CLASS =
  "mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5 lg:px-8";

const HERO_CARD_CLASS =
  "rounded-[1.6rem] border border-sky-200/35 bg-gradient-to-br from-background/97 via-background/92 to-sky-50/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_18px_36px_-30px_rgba(15,23,42,0.26)] backdrop-blur-sm dark:border-sky-700/25 dark:from-background/90 dark:via-background/84 dark:to-sky-950/12";

const PANEL_CARD_CLASS =
  "rounded-[1.45rem] border border-sky-200/25 bg-gradient-to-br from-background/97 via-background/93 to-sky-50/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_28px_-26px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-sky-700/20 dark:from-background/90 dark:via-background/84 dark:to-sky-950/10";

const CHIP_CLASS =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors";

const CHIP_PRIMARY_CLASS =
  "border-sky-200/60 bg-sky-100/70 text-sky-800 dark:border-sky-700/35 dark:bg-sky-900/30 dark:text-sky-200";

const CHIP_NEUTRAL_CLASS =
  "border-border/60 bg-background/80 text-foreground";

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
      supabase.from("company").select("code, name, created_at"),
      supabase
        .from("growth_outlook")
        .select("company, fiscal_year, run_timestamp, base_growth_pct, upside_growth_pct, downside_growth_pct, growth_score, growth_score_formula, growth_score_steps")
        .order("run_timestamp", { ascending: false }),
    ]);

  if (companiesError) throw companiesError;
  if (growthError) throw growthError;

  const companies = (companiesData ?? []) as CompanyRow[];
  const newCompanySet = buildNewCompanySet(
    companies.map((company) => ({
      code: company.code,
      created_at: company.created_at ?? null,
    })),
  );
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
      leaderboardRank: 0,
      companyCode: company.code,
      companyName: company.name ?? company.code,
      isNew: newCompanySet.has(company.code.toUpperCase()),
      fiscalYear: null,
      updatedAt: null,
      baseDisplay: null,
      upsideDisplay: null,
      downsideDisplay: null,
      baseSort: null,
      upsideSort: null,
      downsideSort: null,
      growthScore: null,
      growthFormula: null,
      growthSteps: null,
    });
  });

  latestByCompany.forEach((row, rowKey) => {
    const matchedCompany = companyByCode.get(rowKey) ?? companyByName.get(rowKey);
    const companyCode = matchedCompany?.code ?? row.company;
    const companyName = matchedCompany?.name ?? row.company;
    const basePct = normalizeGrowthPct(row.base_growth_pct);
    const upsidePct = normalizeGrowthPct(row.upside_growth_pct);
    const downsidePct = normalizeGrowthPct(row.downside_growth_pct);

    entriesMap.set(companyCode, {
      leaderboardRank: 0,
      companyCode,
      companyName,
      isNew: matchedCompany ? newCompanySet.has(companyCode.toUpperCase()) : false,
      fiscalYear:
        typeof row.fiscal_year === "string"
          ? row.fiscal_year
          : row.fiscal_year?.toString() ?? null,
      updatedAt: row.run_timestamp ?? null,
      baseDisplay: basePct.rawText,
      upsideDisplay: upsidePct.rawText,
      downsideDisplay: downsidePct.rawText,
      baseSort: basePct.sortValue,
      upsideSort: upsidePct.sortValue,
      downsideSort: downsidePct.sortValue,
      growthScore: parsePct(row.growth_score),
      growthFormula: row.growth_score_formula ?? null,
      growthSteps: Array.isArray(row.growth_score_steps) ? row.growth_score_steps : null,
    });
  });

  const sortedEntries: Omit<GrowthEntry, "leaderboardRank">[] = Array.from(entriesMap.values())
    .map((item) => {
      const { leaderboardRank, ...entry } = item;
      void leaderboardRank;
      return entry;
    })
    .sort((a, b) => {
      const aScore = typeof a.growthScore === "number" ? a.growthScore : null;
      const bScore = typeof b.growthScore === "number" ? b.growthScore : null;

      if (aScore != null && bScore != null) {
        if (bScore !== aScore) return bScore - aScore;
        const aBaseTie = a.baseSort ?? Number.NEGATIVE_INFINITY;
        const bBaseTie = b.baseSort ?? Number.NEGATIVE_INFINITY;
        if (bBaseTie !== aBaseTie) return bBaseTie - aBaseTie;
        return a.companyName.localeCompare(b.companyName);
      }
      if (aScore != null) return -1;
      if (bScore != null) return 1;

      const aHasAnyPct =
        a.baseDisplay != null ||
        a.upsideDisplay != null ||
        a.downsideDisplay != null ||
        a.baseSort != null ||
        a.upsideSort != null ||
        a.downsideSort != null;
      const bHasAnyPct =
        b.baseDisplay != null ||
        b.upsideDisplay != null ||
        b.downsideDisplay != null ||
        b.baseSort != null ||
        b.upsideSort != null ||
        b.downsideSort != null;
      if (aHasAnyPct && !bHasAnyPct) return -1;
      if (!aHasAnyPct && bHasAnyPct) return 1;

      const aBase = a.baseSort ?? Number.NEGATIVE_INFINITY;
      const bBase = b.baseSort ?? Number.NEGATIVE_INFINITY;
      if (bBase !== aBase) return bBase - aBase;
      return a.companyName.localeCompare(b.companyName);
    });

  const entries: GrowthEntry[] = assignCompetitionRanks(
    sortedEntries,
    (item) => (typeof item.growthScore === "number" ? item.growthScore : null),
  );

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

  const latestQuarterLabel = quarterLabels[0] ?? null;

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL_CLASS}>
        <section className={HERO_CARD_CLASS}>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Leaderboards</span>
                <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
                  Sentiment rows: {rows.length}
                </span>
                <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
                  Growth rows: {growthEntries.length}
                </span>
                {latestQuarterLabel && (
                  <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
                    Latest quarter: {latestQuarterLabel}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                Leaderboards
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Switch between concall sentiment and growth outlook rankings in a single research
                shell.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className={PANEL_CARD_CLASS}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Sentiment rows
                </p>
                <p className="mt-2 text-2xl font-black leading-none text-foreground">
                  {rows.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Rank by quarter coverage and 4Q average.
                </p>
              </div>
              <div className={PANEL_CARD_CLASS}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Growth rows
                </p>
                <p className="mt-2 text-2xl font-black leading-none text-foreground">
                  {growthEntries.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Growth outlook ranking and percentage spread.
                </p>
              </div>
              <div className={PANEL_CARD_CLASS}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Latest quarter
                </p>
                <p className="mt-2 text-2xl font-black leading-none text-foreground">
                  {latestQuarterLabel ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Current sentiment lens for the company board.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue={defaultTab} className="w-full space-y-4">
          <TabsList className="inline-flex h-auto w-fit rounded-full border border-sky-200/35 bg-background/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm dark:border-sky-700/20">
            <TabsTrigger
              value="sentiment"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800 data-[state=active]:shadow-sm dark:data-[state=active]:bg-sky-900/30 dark:data-[state=active]:text-sky-200"
            >
              Sentiment
            </TabsTrigger>
            <TabsTrigger
              value="growth"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800 data-[state=active]:shadow-sm dark:data-[state=active]:bg-sky-900/30 dark:data-[state=active]:text-sky-200"
            >
              Growth
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sentiment" className="mt-4">
            <LeaderboardTable quarterLabels={quarterLabels} data={rows} />
          </TabsContent>

          <TabsContent value="growth" className="mt-4">
            {growthEntries.length === 0 ? (
              <div className={PANEL_CARD_CLASS}>
                <p className="text-muted-foreground">No growth outlook data available yet.</p>
              </div>
            ) : (
              <GrowthTable data={growthEntries} />
            )}
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Tables use the same layered shell language as the company pages.
          </p>
          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
