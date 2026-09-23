import { z } from "zod";

/**
 * Frontend validation gate for the `company_quality` row. Mirrors
 * /schemas/company_quality_v1.json (the structural authority) — accept what it
 * accepts, reject what it rejects. If one changes, change both.
 */

export type CompanyQualityRow = {
  company_code: string;
  schema_version?: string | null;
  generated_at?: string | null;
  source?: unknown;
  payload?: unknown;
  updated_at?: string | null;
};

const num = z.number().nullable();

const fiscalYearSchema = z
  .object({
    period: z.string().min(1),
    label: z.string().min(1),
    revenue: num,
    expenses: num.optional(),
    operating_profit: num.optional(),
    opm_pct: num.optional(),
    other_income: num.optional(),
    interest: num.optional(),
    depreciation: num.optional(),
    pbt: num.optional(),
    tax_pct: num.optional(),
    net_profit: num,
    eps: num.optional(),
    equity_capital: num.optional(),
    reserves: num.optional(),
    borrowings: num.optional(),
    cash: num.optional(),
    trade_receivables: num.optional(),
    inventories: num.optional(),
    cfo: num.optional(),
    capex: num.optional(),
    fcf: num.optional(),
    debtor_days: num.optional(),
    inventory_days: num.optional(),
    material_cost_pct: num.optional(),
    gross_margin_pct: num.optional(),
    ebitda_margin_pct: num.optional(),
    net_margin_pct: num.optional(),
    roce_pct: num.optional(),
    roe_pct: num.optional(),
    roic_pct: num.optional(),
    net_debt: num.optional(),
  })
  .strict();

const shareholdingQuarterSchema = z
  .object({
    period: z.string().min(1),
    promoters: num,
    fiis: num,
    diis: num,
    government: num.optional(),
    public: num,
    others: num.optional(),
    shareholders: z.number().int().nullable().optional(),
  })
  .strict();

const auditorSchema = z
  .object({
    name: z.string().nullable().optional(),
    opinion: z.enum(["unqualified", "qualified", "adverse", "disclaimer"]),
    tenure_years: z.number().int().nullable().optional(),
    caro_remarks: z.number().int().nullable().optional(),
    note: z.string().nullable().optional(),
  })
  .strict();

const bulletReadSchema = z
  .object({
    headline: z.string().min(1).max(140),
    bullets: z.array(z.string().min(1).max(220)).min(2).max(4),
  })
  .strict()
  .nullable();

export const companyQualityV1Schema = z
  .object({
    schema_version: z.literal("company_quality_v1"),
    company_code: z.string().min(1).max(50),
    company_name: z.string().nullable().optional(),
    statement_model: z.enum(["industrial", "financial"]),
    source: z
      .object({
        provider: z.literal("screener"),
        variant: z.enum(["consolidated", "standalone"]),
        url: z.string(),
        scraped_at: z.string(),
        screener_company_id: z.number().int().nullable().optional(),
        notes: z.array(z.string()).optional(),
      })
      .strict(),
    fiscal_years: z.array(fiscalYearSchema).min(1).max(5),
    shareholding: z.object({ quarters: z.array(shareholdingQuarterSchema).max(5) }).strict(),
    annual_report_checks: z
      .object({
        as_of: z.string().nullable().optional(),
        /** Which annual report / note each hand-filled value came from (Step 6 provenance). */
        source_note: z.string().nullable().optional(),
        related_party_pct_revenue: num,
        promoter_pledge_pct: num,
        auditor: auditorSchema.nullable(),
        contingent_liabilities_pct_networth: num,
      })
      .strict(),
    reads: z
      .object({
        financials: bulletReadSchema,
        returns: bulletReadSchema,
        forensic: z
          .object({ headline: z.string().min(1).max(140), body: z.string().min(1).max(600) })
          .strict()
          .nullable(),
      })
      .strict(),
  })
  .strict();

export type CompanyQualityV1 = z.infer<typeof companyQualityV1Schema>;
export type QualityFiscalYear = z.infer<typeof fiscalYearSchema>;
export type QualityShareholdingQuarter = z.infer<typeof shareholdingQuarterSchema>;
export type QualityAuditor = z.infer<typeof auditorSchema>;
export type QualityBulletRead = NonNullable<z.infer<typeof bulletReadSchema>>;

export function parseCompanyQualityPayload(raw: unknown): CompanyQualityV1 | null {
  const result = companyQualityV1Schema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Closed reader-facing vocabulary. `not_assessed` / `not_applicable` render muted and stay out of the tally. */
export type ForensicStatus = "clean" | "watch" | "flag" | "not_assessed" | "not_applicable";

export type ForensicCheck = {
  id:
    | "profit_to_cash"
    | "receivable_days"
    | "debt_load"
    | "related_party"
    | "promoter_pledge"
    | "auditor"
    | "contingent_liabilities"
    | "other_income"
    | "equity_dilution";
  name: string;
  status: ForensicStatus;
  metric: string;
  note: string;
};

export type ForensicTally = { clean: number; watch: number; flag: number; assessed: number };

export type QualitySeriesPoint = { label: string; value: number | null };

export type QualityRatioRow = {
  key: "roce" | "roe" | "roic" | "gross" | "ebitda" | "net";
  label: string;
  points: QualitySeriesPoint[];
  latest: number | null;
  first: number | null;
};

export type QualityRead = { headline: string; bullets: string[] };

export type NormalizedQualityFinancials = {
  yearRange: string;
  years: string[];
  revenue: QualitySeriesPoint[];
  netProfit: QualitySeriesPoint[];
  revenueLatest: number | null;
  netProfitLatest: number | null;
  revenueCagrPct: number | null;
  netProfitCagrPct: number | null;
  /** Year labels where profit growth badly lagged revenue growth (amber bar). */
  laggingYears: string[];
  read: QualityRead;
};

export type NormalizedQualityReturns = {
  yearRange: string;
  returns: QualityRatioRow[];
  margins: QualityRatioRow[];
  read: QualityRead;
};

export type QualityHoldingBand = "promoters" | "fiis" | "diis" | "public";

export type NormalizedQualityOwnership = {
  quarterRange: string;
  quarters: Array<{
    period: string;
    bands: Record<QualityHoldingBand, number>;
  }>;
  summary: Array<{ band: QualityHoldingBand; label: string; latest: number | null; change: number | null }>;
  takeaway: { lead: string; rest: string };
  promoters: {
    headline: string;
    pledgedPct: number | null;
    stance: "Buyer" | "Seller" | "Neutral" | null;
    events: Array<{ when: string; text: string }>;
  };
};

export type NormalizedQualityForensics = {
  asOfLabel: string;
  checks: ForensicCheck[];
  tally: ForensicTally;
  read: { headline: string; body: string };
};

export type NormalizedCompanyQuality = {
  companyCode: string;
  statementModel: "industrial" | "financial";
  generatedAtRaw: string | null;
  sourceVariant: "consolidated" | "standalone";
  sourceNotes: string[];
  financials: NormalizedQualityFinancials | null;
  returns: NormalizedQualityReturns | null;
  ownership: NormalizedQualityOwnership | null;
  forensics: NormalizedQualityForensics | null;
};
