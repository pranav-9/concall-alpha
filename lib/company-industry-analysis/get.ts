import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { normalizeCompanyIndustryAnalysis } from "./normalize";
import type { CompanyIndustryAnalysisRow } from "./types";

export const getCompanyIndustryAnalysis = cache(async (code: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_industry_analysis")
    .select(
      "company, generated_at, sector, sub_sector, industry_positioning, value_chain, sub_sector_identification, types_of_players, sub_sector_cards, profit_pools, company_fit, competition, regulatory_changes, tailwinds, headwinds, sources, details",
    )
    .eq("company", code)
    .limit(1);

  return normalizeCompanyIndustryAnalysis(
    (data?.[0] as CompanyIndustryAnalysisRow | undefined) ?? null,
  );
});
