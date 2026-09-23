import assert from "node:assert/strict";

import { buildForensicChecks, tallyChecks } from "../lib/company-quality/forensics";
import { cagrPct, formatPp, growthPhrase } from "../lib/company-quality/format";
import { normalizeCompanyQuality } from "../lib/company-quality/normalize";
import { financialsRead, forensicRead, laggingProfitYears, returnsRead } from "../lib/company-quality/reads";
import { parseCompanyQualityPayload, type CompanyQualityV1, type QualityFiscalYear } from "../lib/company-quality/types";

// A compact industrial payload shaped like the TDPOWERSYS sandbox row: net cash,
// a weak FY25 (profit +8% on +23% revenue), steady promoter, no AR checks yet.
const fy = (
  label: string,
  o: Partial<QualityFiscalYear> & { revenue: number; net_profit: number },
): QualityFiscalYear => ({
  period: `Mar 20${label.slice(2)}`,
  label,
  expenses: null,
  operating_profit: null,
  opm_pct: null,
  other_income: null,
  interest: null,
  depreciation: null,
  pbt: null,
  tax_pct: null,
  eps: null,
  equity_capital: null,
  reserves: null,
  borrowings: null,
  cash: null,
  trade_receivables: null,
  inventories: null,
  cfo: null,
  capex: null,
  fcf: null,
  debtor_days: null,
  inventory_days: null,
  material_cost_pct: null,
  gross_margin_pct: null,
  ebitda_margin_pct: null,
  net_margin_pct: null,
  roce_pct: null,
  roe_pct: null,
  roic_pct: null,
  net_debt: null,
  ...o,
});

const base: CompanyQualityV1 = {
  schema_version: "company_quality_v1",
  company_code: "TEST",
  company_name: "Test Ltd",
  statement_model: "industrial",
  source: { provider: "screener", variant: "consolidated", url: "https://www.screener.in/company/TEST/consolidated/", scraped_at: "2026-09-23T00:00:00+00:00", notes: [] },
  fiscal_years: [
    fy("FY22", { revenue: 170, net_profit: 6, cfo: 5, operating_profit: 15, depreciation: 4, interest: 2, other_income: 1, pbt: 8, equity_capital: 10, reserves: 100, borrowings: 20, cash: 30, net_debt: -10, debtor_days: 118, roce_pct: 13.5, roe_pct: 11.2, roic_pct: 10.8, gross_margin_pct: 22.4, ebitda_margin_pct: 8.9, net_margin_pct: 3.5 }),
    fy("FY23", { revenue: 240, net_profit: 10, cfo: 9, operating_profit: 22, depreciation: 4, interest: 2, other_income: 1, pbt: 13, equity_capital: 10, reserves: 110, borrowings: 20, cash: 32, net_debt: -12, debtor_days: 110, roce_pct: 16, roe_pct: 14, roic_pct: 13, gross_margin_pct: 23, ebitda_margin_pct: 9.2, net_margin_pct: 4.2 }),
    fy("FY24", { revenue: 315, net_profit: 16, cfo: 14, operating_profit: 30, depreciation: 5, interest: 3, other_income: 1, pbt: 21, equity_capital: 10, reserves: 125, borrowings: 20, cash: 35, net_debt: -15, debtor_days: 104, roce_pct: 19, roe_pct: 16, roic_pct: 15, gross_margin_pct: 25, ebitda_margin_pct: 9.5, net_margin_pct: 5.1 }),
    fy("FY25", { revenue: 388, net_profit: 17.3, cfo: 6, operating_profit: 34, depreciation: 5, interest: 4, other_income: 1, pbt: 23, equity_capital: 10, reserves: 140, borrowings: 25, cash: 30, net_debt: -5, debtor_days: 118, roce_pct: 15, roe_pct: 13, roic_pct: 12, gross_margin_pct: 23, ebitda_margin_pct: 8.8, net_margin_pct: 4.5 }),
    fy("FY26", { revenue: 498, net_profit: 27.5, cfo: 22, operating_profit: 54, depreciation: 6, interest: 4, other_income: 2, pbt: 36, equity_capital: 10, reserves: 165, borrowings: 25, cash: 40, net_debt: -15, debtor_days: 104, roce_pct: 17.8, roe_pct: 16.4, roic_pct: 14.6, gross_margin_pct: 25.2, ebitda_margin_pct: 10.9, net_margin_pct: 5.5 }),
  ],
  shareholding: {
    quarters: [
      { period: "Jun 2025", promoters: 61.2, fiis: 2.1, diis: 4.8, government: null, public: 31.9, others: 0, shareholders: 10000 },
      { period: "Sep 2025", promoters: 61.2, fiis: 3.4, diis: 5.1, government: null, public: 30.3, others: 0, shareholders: 10500 },
      { period: "Dec 2025", promoters: 60.8, fiis: 4.2, diis: 6.3, government: null, public: 28.7, others: 0, shareholders: 11000 },
      { period: "Mar 2026", promoters: 60.8, fiis: 5.0, diis: 6.9, government: null, public: 27.3, others: 0, shareholders: 11500 },
      { period: "Jun 2026", promoters: 60.9, fiis: 5.6, diis: 7.4, government: null, public: 26.1, others: 0, shareholders: 12000 },
    ],
  },
  annual_report_checks: { as_of: null, related_party_pct_revenue: null, promoter_pledge_pct: null, auditor: null, contingent_liabilities_pct_networth: null },
  reads: { financials: null, returns: null, forensic: null },
};

// ── Validation gate mirrors the schema ────────────────────────────────────────
assert.ok(parseCompanyQualityPayload(base), "base payload parses");
assert.equal(parseCompanyQualityPayload({ ...base, statement_model: "bank" }), null, "unknown statement model rejected");
assert.equal(parseCompanyQualityPayload({ ...base, extra: 1 }), null, "additional top-level keys rejected");
assert.equal(parseCompanyQualityPayload({ ...base, fiscal_years: [] }), null, "empty fiscal_years rejected");
assert.equal(normalizeCompanyQuality({ company_code: "X", payload: { nope: true } }), null, "garbage row → null");
assert.equal(normalizeCompanyQuality(null), null);

// ── Formatting helpers ────────────────────────────────────────────────────────
assert.equal(formatPp(3.5), "+3.5");
assert.equal(formatPp(-0.3), "−0.3");
assert.equal(formatPp(0.04), "0.0");
assert.equal(Math.round(cagrPct(170, 498, 4)!), 31);
assert.equal(cagrPct(-5, 10, 4), null, "no CAGR through a negative endpoint");
assert.equal(growthPhrase(170, 498), "roughly tripled");
assert.equal(growthPhrase(100, 130), "grew 1.3×");

// ── Financials read + lagging years ───────────────────────────────────────────
const years = base.fiscal_years;
assert.deepEqual(laggingProfitYears(years), ["FY25"], "FY25 (+8% profit on +23% revenue) is the lagging year");
const fin = financialsRead(years);
assert.match(fin.headline, /Profit grew faster than revenue: 46% vs 31% a year/);
assert.ok(fin.bullets.some((b) => b.startsWith("FY25 was the weak year: profit grew 8% on 23% more revenue")), fin.bullets.join(" | "));
assert.ok(fin.bullets.length >= 2 && fin.bullets.length <= 4);

// Loss in the latest year: no CAGR claim on profit, the swing is named.
const lossYears = [...years.slice(0, 4), fy("FY26", { revenue: 600, net_profit: -12 })];
const lossRead = financialsRead(lossYears);
assert.match(lossRead.headline, /closed in a loss/);
assert.ok(lossRead.bullets.some((b) => /swung to a loss/.test(b)), lossRead.bullets.join(" | "));

// ── Returns read ──────────────────────────────────────────────────────────────
const ret = returnsRead(years, false);
assert.match(ret.headline, /Returns improved: ROCE 18%, from 14% in FY22/);
assert.ok(ret.bullets.some((b) => /Gross margin stayed in a 22–25% band/.test(b)), ret.bullets.join(" | "));
assert.ok(ret.bullets.some((b) => /ROCE dipped to 15% in FY25, then recovered to 18%/.test(b)), ret.bullets.join(" | "));

// ── Forensic thresholds ───────────────────────────────────────────────────────
const checks = buildForensicChecks(base);
const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
assert.equal(checks.length, 9);
assert.deepEqual(
  checks.map((c) => c.id),
  ["profit_to_cash", "receivable_days", "debt_load", "related_party", "promoter_pledge", "auditor", "contingent_liabilities", "other_income", "equity_dilution"],
  "fixed order",
);
assert.equal(byId.profit_to_cash.status, "watch", "CFO/PAT 56/76.8 = 0.73 → watch");
assert.equal(byId.profit_to_cash.metric, "CFO / PAT 0.73×");
assert.equal(byId.receivable_days.status, "watch", "104 days → watch");
assert.equal(byId.debt_load.status, "clean");
assert.equal(byId.debt_load.metric, "Net cash");
assert.equal(byId.other_income.status, "clean");
assert.equal(byId.equity_dilution.status, "clean");
assert.equal(byId.equity_dilution.metric, "No new shares");
for (const id of ["related_party", "promoter_pledge", "auditor", "contingent_liabilities"] as const) {
  assert.equal(byId[id].status, "not_assessed", `${id} needs the annual report`);
}
const tally = tallyChecks(checks);
assert.deepEqual(tally, { clean: 3, watch: 2, flag: 0, assessed: 5 }, "not-assessed checks stay out of the tally");
const fr = forensicRead(checks, tally);
assert.match(fr.headline, /^No flags; the open questions are profit → cash, receivable days\.$/);
assert.match(fr.body, /4 checks .* need the annual report/);

// Annual-report block filled in → those checks grade.
const withAr = buildForensicChecks({
  ...base,
  annual_report_checks: {
    as_of: "FY26",
    related_party_pct_revenue: 1.8,
    promoter_pledge_pct: 0,
    auditor: { name: null, opinion: "unqualified", tenure_years: 6, caro_remarks: 0, note: null },
    contingent_liabilities_pct_networth: 30,
  },
});
const arById = Object.fromEntries(withAr.map((c) => [c.id, c]));
assert.equal(arById.related_party.status, "clean");
assert.equal(arById.promoter_pledge.status, "clean");
assert.equal(arById.auditor.status, "clean");
assert.equal(arById.auditor.metric, "Unqualified");
assert.equal(arById.contingent_liabilities.status, "flag", "30% of net worth → flag");
assert.equal(tallyChecks(withAr).assessed, 9);

// Bonus issue: equity capital doubles, reserves fall by the same amount → not dilution.
const bonus = buildForensicChecks({
  ...base,
  fiscal_years: [...years.slice(0, 4), fy("FY26", { ...years[4], equity_capital: 20, reserves: 130, revenue: 498, net_profit: 27.5 })],
});
assert.equal(bonus.find((c) => c.id === "equity_dilution")!.status, "clean");
assert.match(bonus.find((c) => c.id === "equity_dilution")!.note, /bonus issue/);

// A real 5% issue → flag.
const qip = buildForensicChecks({
  ...base,
  fiscal_years: [...years.slice(0, 4), fy("FY26", { ...years[4], equity_capital: 10.5, reserves: 300, revenue: 498, net_profit: 27.5 })],
});
assert.equal(qip.find((c) => c.id === "equity_dilution")!.status, "flag");

// Levered company: net debt / EBITDA 3.2× → flag even with decent cover.
const levered = buildForensicChecks({
  ...base,
  fiscal_years: [...years.slice(0, 4), fy("FY26", { ...years[4], net_debt: 175, borrowings: 200, cash: 25, operating_profit: 54, revenue: 498, net_profit: 27.5 })],
});
assert.equal(levered.find((c) => c.id === "debt_load")!.status, "flag");

// Financial statement model: cash and leverage checks are not applicable, not clean.
const bank = buildForensicChecks({ ...base, statement_model: "financial" });
for (const id of ["profit_to_cash", "receivable_days", "debt_load"] as const) {
  assert.equal(bank.find((c) => c.id === id)!.status, "not_applicable");
}
assert.equal(tallyChecks(bank).assessed, 2);

// ── Normalized shape ──────────────────────────────────────────────────────────
const n = normalizeCompanyQuality({ company_code: "TEST", payload: base, generated_at: "2026-09-23T00:00:00Z" })!;
assert.ok(n.financials && n.returns && n.ownership && n.forensics);
assert.equal(n.financials!.yearRange, "FY22–FY26");
assert.equal(n.financials!.revenueLatest, 498);
assert.deepEqual(n.financials!.laggingYears, ["FY25"]);
assert.deepEqual(n.returns!.returns.map((r) => r.key), ["roce", "roe", "roic"]);
assert.deepEqual(n.returns!.margins.map((r) => r.key), ["gross", "ebitda", "net"]);
assert.equal(n.ownership!.quarterRange, "Jun 2025–Jun 2026");
assert.equal(n.ownership!.quarters.length, 5);
const publicBand = n.ownership!.quarters[4].bands.public;
assert.ok(Math.abs(publicBand - 26.1) < 0.01, "public band is the remainder to 100");
assert.equal(n.ownership!.takeaway.lead, "Institutions are buying what retail is selling.");
assert.equal(n.ownership!.promoters.stance, "Neutral");
assert.match(n.ownership!.promoters.headline, /^60\.9% promoter stake, holding steady, pledge not tracked yet\.$/);
assert.ok(n.ownership!.promoters.events.some((e) => /Shareholder count up 20%/.test(e.text)));
assert.equal(n.forensics!.asOfLabel, "FY26 statements");

// A producer-supplied read overrides the template.
const override = normalizeCompanyQuality({
  company_code: "TEST",
  payload: { ...base, reads: { ...base.reads, financials: { headline: "Hand-written.", bullets: ["a", "b"] } } },
})!;
assert.equal(override.financials!.read.headline, "Hand-written.");

// Financial model drops the gross-margin row and reads ROE first.
const fin2 = normalizeCompanyQuality({ company_code: "TEST", payload: { ...base, statement_model: "financial" } })!;
assert.deepEqual(fin2.returns!.margins.map((r) => r.key), ["ebitda", "net"]);
assert.match(fin2.returns!.read.headline, /ROE/);

console.log("All company-quality tests passed.");
