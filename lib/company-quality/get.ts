import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import type { CompanyQualityRow } from "./types";

const SELECT = "company_code, schema_version, generated_at, source, payload, updated_at";

/**
 * One `company_quality` row per company (the Quality tab substrate). Request-
 * deduped with `cache()` so a dev preview and the panel share one query. A
 * missing table or row is a normal state (the substrate is promoted company by
 * company) — it resolves to null and the tab renders its empty cards.
 */
export const getCompanyQualityRow = cache(
  async (companyCode: string): Promise<CompanyQualityRow | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_quality")
      .select(SELECT)
      .eq("company_code", companyCode)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as CompanyQualityRow;
  },
);
