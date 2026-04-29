import { buildNewCompanySet } from "@/lib/company-freshness";
import { normalizeGrowthPct } from "@/lib/growth-pct-normalizer";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import { MOAT_RATING_ORDER, moatTierRank } from "@/lib/moat-analysis/rank";
import type { MoatAnalysisRow, MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type CompanyRow = {
  code: string;
  name?: string | null;
  created_at?: string | null;
};

type LeaderboardContext = {
  supabase: SupabaseServerClient;
  companies: CompanyRow[];
  newCompanySet: Set<string>;
};

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

export type GrowthEntry = {
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

export type MoatRowTable = {
  leaderboardRank: number;
  companyCode: string;
  companyName: string;
  isNew: boolean;
  moatRating: MoatRatingKey;
  moatLabel: string;
  moatTier: MoatTier | null;
  appliesSourceCount: number;
  totalSourceCount: number;
  cycleTested: boolean | null;
  updatedAt?: string | null;
};

const parsePct = (val: string | number | null | undefined): number | null => {
  if (val == null) return null;
  if (typeof val === "number") return val;
  const parsed = parseFloat(val);
  return Number.isFinite(parsed) ? parsed : null;
};

const sortTimestamp = (value: string | null | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
};

async function fetchGrowthLeaders(ctx: LeaderboardContext): Promise<GrowthEntry[]> {
  const { supabase, companies, newCompanySet } = ctx;
  const { data: growthData, error: growthError } = await supabase
    .from("growth_outlook")
    .select("company, fiscal_year, run_timestamp, base_growth_pct, upside_growth_pct, downside_growth_pct, growth_score, growth_score_formula, growth_score_steps")
    .order("run_timestamp", { ascending: false });

  if (growthError) throw growthError;

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

  return assignCompetitionRanks(
    sortedEntries,
    (item) => (typeof item.growthScore === "number" ? item.growthScore : null),
  );
}

async function fetchMoatLeaders(ctx: LeaderboardContext): Promise<MoatRowTable[]> {
  const { supabase, companies, newCompanySet } = ctx;
  const { data: moatData, error: moatError } = await supabase
    .from("moat_analysis")
    .select(
      "id, company_code, company_name, industry, rating, tier, gatekeeper_answer, cycle_tested, assessment_payload, assessment_version, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (moatError) throw moatError;

  const rows = (moatData ?? []) as MoatAnalysisRow[];
  const latestByCompany = new Map<string, NonNullable<ReturnType<typeof normalizeMoatAnalysis>>>();
  rows.forEach((row) => {
    const normalized = normalizeMoatAnalysis(row);
    if (!normalized) return;
    const key = normalized.companyCode.toUpperCase();
    if (!latestByCompany.has(key)) latestByCompany.set(key, normalized);
  });

  const items = companies
    .map((company) => {
      const normalized = latestByCompany.get(company.code.toUpperCase());
      if (normalized) {
        return {
          companyCode: normalized.companyCode,
          companyName: normalized.companyName ?? normalized.companyCode,
          isNew: newCompanySet.has(normalized.companyCode.toUpperCase()),
          moatRating: normalized.moatRating,
          moatLabel: normalized.moatRatingLabel,
          moatTier: normalized.moatTier,
          appliesSourceCount: normalized.sources.filter((s) => s.applies).length,
          totalSourceCount: normalized.sources.length,
          cycleTested: normalized.cycleTested,
          updatedAt: normalized.updatedAtRaw,
          updatedAtSort: sortTimestamp(normalized.updatedAtRaw),
        };
      }
      return {
        companyCode: company.code,
        companyName: company.name ?? company.code,
        isNew: newCompanySet.has(company.code.toUpperCase()),
        moatRating: "unknown" as const,
        moatLabel: "Unknown",
        moatTier: null,
        appliesSourceCount: 0,
        totalSourceCount: 0,
        cycleTested: null,
        updatedAt: null,
        updatedAtSort: Number.NEGATIVE_INFINITY,
      };
    })
    .sort((a, b) => {
      const ratingDiff = MOAT_RATING_ORDER[a.moatRating] - MOAT_RATING_ORDER[b.moatRating];
      if (ratingDiff !== 0) return ratingDiff;
      const tierDiff = moatTierRank(a.moatTier) - moatTierRank(b.moatTier);
      if (tierDiff !== 0) return tierDiff;
      if (b.appliesSourceCount !== a.appliesSourceCount) return b.appliesSourceCount - a.appliesSourceCount;
      const aCycle = a.cycleTested === true ? 0 : a.cycleTested === false ? 1 : 2;
      const bCycle = b.cycleTested === true ? 0 : b.cycleTested === false ? 1 : 2;
      if (aCycle !== bCycle) return aCycle - bCycle;
      if (b.updatedAtSort !== a.updatedAtSort) return b.updatedAtSort - a.updatedAtSort;
      return a.companyName.localeCompare(b.companyName);
    });

  return items.map((item, index) => {
    const { updatedAtSort, ...rest } = item;
    void updatedAtSort;
    return { ...rest, leaderboardRank: index + 1 } satisfies MoatRowTable;
  });
}

export async function fetchLeaderboardData(): Promise<{
  growthEntries: GrowthEntry[];
  moatEntries: MoatRowTable[];
}> {
  const supabase = await createClient();
  const { data: companiesData, error: companiesError } = await supabase
    .from("company")
    .select("code, name, created_at");
  if (companiesError) throw companiesError;

  const companies = (companiesData ?? []) as CompanyRow[];
  const newCompanySet = buildNewCompanySet(
    companies.map((company) => ({
      code: company.code,
      created_at: company.created_at ?? null,
    })),
  );

  const ctx: LeaderboardContext = { supabase, companies, newCompanySet };
  const [growthEntries, moatEntries] = await Promise.all([
    fetchGrowthLeaders(ctx),
    fetchMoatLeaders(ctx),
  ]);
  return { growthEntries, moatEntries };
}
