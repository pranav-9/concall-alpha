import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import type { PricePhasesRow } from "./types";

const SELECT = "company_code, schema_version, as_of, generated_at, payload, updated_at";

/**
 * One `price_phases` row per company (the Price journey block). A missing table or
 * row is a normal state — the substrate is promoted with the valuation refresh — and
 * resolves to null, so the block simply does not render.
 */
export const getPricePhasesRow = cache(async (companyCode: string): Promise<PricePhasesRow | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_phases")
    .select(SELECT)
    .eq("company_code", companyCode)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as PricePhasesRow;
});
