import assert from "node:assert/strict";

import { normalizeCompanyQuality } from "../lib/company-quality/normalize";
import type { CompanyQualityV1, QualityFiscalYear } from "../lib/company-quality/types";
import {
  buildProsCons,
  collectProsConsCandidates,
  PROS_CONS_LIMIT,
  PROS_CONS_SOURCES,
  rankProsCons,
  type ProsConsInputs,
  type ProsConsItem,
} from "../lib/overview-pros-cons";

const EMPTY: ProsConsInputs = {
  quality: null,
  moat: null,
  concallPath: [],
  growth: null,
  valuation: null,
  trackRecord: null,
  liveBook: null,
  guidance: null,
  industry: null,
};

const ids = (items: ProsConsItem[]) => items.map((item) => item.id);
const find = (inputs: ProsConsInputs, id: string) => collectProsConsCandidates(inputs).find((item) => item.id === id);
const path = (...values: number[]) =>
  values.map((value, index) => ({ period: ["Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27"][index + 4 - values.length], value }));

// ── Quality payloads ──────────────────────────────────────────────────────────

const fy = (label: string, o: Partial<QualityFiscalYear> & { revenue: number; net_profit: number }): QualityFiscalYear => ({
  period: `Mar 20${label.slice(2)}`,
  label,
  ...o,
});

const payload = (overrides: Partial<CompanyQualityV1>): CompanyQualityV1 => ({
  schema_version: "company_quality_v1",
  company_code: "TEST",
  company_name: "Test Ltd",
  statement_model: "industrial",
  source: { provider: "screener", variant: "consolidated", url: "https://www.screener.in/company/TEST/", scraped_at: "2026-10-01T00:00:00+00:00", notes: [] },
  fiscal_years: [],
  shareholding: { quarters: [] },
  annual_report_checks: { as_of: null, related_party_pct_revenue: null, promoter_pledge_pct: null, auditor: null, contingent_liabilities_pct_networth: null },
  reads: { financials: null, returns: null, forensic: null },
  ...overrides,
});

const quarters = (promoters: [number, number]) => [
  { period: "Jun 2025", promoters: promoters[0], fiis: 5, diis: 5, public: 100 - promoters[0] - 10 },
  { period: "Sep 2025", promoters: (promoters[0] + promoters[1]) / 2, fiis: 5, diis: 5, public: 100 - (promoters[0] + promoters[1]) / 2 - 10 },
  { period: "Dec 2025", promoters: promoters[1], fiis: 5, diis: 5, public: 100 - promoters[1] - 10 },
];

const quality = (p: CompanyQualityV1) => {
  const normalized = normalizeCompanyQuality({ company_code: p.company_code, payload: p });
  assert.ok(normalized, "fixture payload parses");
  return normalized;
};

// Clean books, net cash, returns 16% → 34%, revenue +24% a year with profit faster, promoters adding.
const strong = quality(
  payload({
    fiscal_years: [
      fy("FY22", { revenue: 100, net_profit: 8, cfo: 8, operating_profit: 16, depreciation: 3, interest: 1, other_income: 1, pbt: 11, equity_capital: 10, reserves: 60, net_debt: -10, debtor_days: 40, roce_pct: 16, net_margin_pct: 8 }),
      fy("FY23", { revenue: 125, net_profit: 11, cfo: 10, operating_profit: 20, depreciation: 3, interest: 1, other_income: 1, pbt: 15, equity_capital: 10, reserves: 70, net_debt: -12, debtor_days: 42, roce_pct: 20, net_margin_pct: 8.8 }),
      fy("FY24", { revenue: 160, net_profit: 15, cfo: 14, operating_profit: 26, depreciation: 4, interest: 1, other_income: 1, pbt: 20, equity_capital: 10, reserves: 85, net_debt: -15, debtor_days: 41, roce_pct: 24, net_margin_pct: 9.4 }),
      fy("FY25", { revenue: 200, net_profit: 20, cfo: 19, operating_profit: 32, depreciation: 4, interest: 1, other_income: 1, pbt: 27, equity_capital: 10, reserves: 105, net_debt: -18, debtor_days: 40, roce_pct: 29, net_margin_pct: 10 }),
      fy("FY26", { revenue: 240, net_profit: 26, cfo: 25, operating_profit: 40, depreciation: 5, interest: 1, other_income: 1, pbt: 34, equity_capital: 10, reserves: 131, net_debt: -20, debtor_days: 39, roce_pct: 34, net_margin_pct: 10.8 }),
    ],
    shareholding: { quarters: quarters([60, 61.5]) },
    annual_report_checks: {
      as_of: "FY26",
      related_party_pct_revenue: 1,
      promoter_pledge_pct: 0,
      auditor: { name: "A & Co", opinion: "unqualified", tenure_years: 4, caro_remarks: 0 },
      contingent_liabilities_pct_networth: 5,
    },
  }),
);

// Loss in FY26, cash going out, slow collections, heavy debt on thin cover,
// a 6% share issue, big pledge / related-party / contingent figures, CARO
// remarks under a clean opinion, promoters down 5 points.
const stressed = quality(
  payload({
    fiscal_years: [
      fy("FY22", { revenue: 100, net_profit: 10, cfo: 2, operating_profit: 20, depreciation: 5, interest: 4, pbt: 13, equity_capital: 10, reserves: 80, net_debt: 40, roce_pct: 18 }),
      fy("FY23", { revenue: 120, net_profit: 12, cfo: 1, operating_profit: 24, depreciation: 6, interest: 5, pbt: 16, equity_capital: 10, reserves: 90, net_debt: 60, roce_pct: 16 }),
      fy("FY24", { revenue: 150, net_profit: 14, cfo: -3, operating_profit: 28, depreciation: 7, interest: 7, pbt: 18, equity_capital: 10, reserves: 100, net_debt: 80, debtor_days: 100, roce_pct: 14 }),
      fy("FY25", { revenue: 180, net_profit: 8, cfo: -2, operating_profit: 26, depreciation: 9, interest: 10, pbt: 10, equity_capital: 10, reserves: 100, net_debt: 100, debtor_days: 130, roce_pct: 8 }),
      fy("FY26", { revenue: 200, net_profit: -5, cfo: -6, operating_profit: 30, depreciation: 10, interest: 12, pbt: -4, equity_capital: 10.6, reserves: 105, net_debt: 120, debtor_days: 160, roce_pct: -3 }),
    ],
    shareholding: { quarters: quarters([60, 55]) },
    annual_report_checks: {
      as_of: "FY26",
      related_party_pct_revenue: 20,
      promoter_pledge_pct: 12,
      auditor: { name: "B & Co", opinion: "unqualified", tenure_years: 2, caro_remarks: 2 },
      contingent_liabilities_pct_networth: 30,
    },
  }),
);

// ── Nothing in, nothing out — never padded ───────────────────────────────────

assert.deepEqual(buildProsCons(EMPTY), { good: [], bad: [] });

// ── The middle of every scale says nothing ───────────────────────────────────

const middling: ProsConsInputs = {
  ...EMPTY,
  moat: { rating: "narrow_moat", tier: "weak", headline: "A slim edge." },
  concallPath: path(7.1, 7.4, 6.9, 7.2),
  growth: { score: 6.6, base: "15-18%", horizonYears: 2 },
  valuation: { verdict: "FAIRLY VALUED", headline: "Priced roughly in line with the fundamentals." },
  trackRecord: { tier: "credible", metCount: 4, countedCount: 6 },
  liveBook: { liveCount: 8, revisedDownCount: 0 },
  guidance: { ambition: "measured", evidence: "partly_evidenced", liveTotal: 8, orderBacked: 3, aspiration: 2 },
  industry: { stage: "mid_upcycle", market: "Cables" },
};
assert.deepEqual(collectProsConsCandidates(middling), [], "middle-of-scale readings fire no rule");
assert.deepEqual(collectProsConsCandidates({ ...middling, growth: { score: 6.0, base: null, horizonYears: null } }), [], "Moderate growth is silent");
assert.deepEqual(collectProsConsCandidates({ ...middling, trackRecord: { tier: "mixed", metCount: 5, countedCount: 6 } }), [], "Mixed record is silent");
assert.deepEqual(collectProsConsCandidates({ ...middling, moat: { rating: "unknown", tier: null, headline: null } }), []);

// ── Quality: forensic checks, returns, financials, ownership ─────────────────

{
  const result = buildProsCons({ ...EMPTY, quality: strong });
  assert.deepEqual(ids(result.good), [
    "forensics:clean",
    "returns:strong",
    "financials:revenue_growth",
    "forensics:net_cash",
    "ownership:promoter_buying",
  ]);
  assert.deepEqual(result.bad, []);
  const [clean, returns, revenue, cash, promoters] = result.good;
  assert.equal(clean.claim, "No red flags in the accounts");
  assert.equal(clean.evidence, "Clean on all 9 checks we can run");
  // A level and a trend on one item.
  assert.equal(returns.claim, "High returns on capital");
  assert.equal(returns.evidence, "ROCE 34% in FY26, up from 16% in FY22");
  assert.equal(revenue.evidence, "Revenue up 24% a year, FY22–FY26; profit 34% a year");
  assert.equal(cash.claim, "More cash than debt");
  assert.equal(cash.evidence, "Cash exceeds borrowings by ₹20 cr.");
  assert.equal(promoters.evidence, "+1.5 pts over 2 quarters, to 61.5%");
}

{
  const candidates = collectProsConsCandidates({ ...EMPTY, quality: stressed });
  const get = (id: string) => candidates.find((item) => item.id === id);
  // Each flag gets its own item, with the part of the note that explains it.
  assert.equal(get("forensics:debt_load")?.evidence, "Net debt / EBITDA 4×, interest cover 1.7×");
  assert.equal(get("forensics:receivable_days")?.evidence, "160 days, up from 100 in FY24");
  assert.equal(get("forensics:equity_dilution")?.evidence, "Paid-up capital up 6% in FY26");
  assert.equal(get("forensics:auditor")?.claim, "The auditor raised points to read");
  assert.equal(get("forensics:auditor")?.evidence, "Clean opinion, with CARO or emphasis-of-matter remarks");
  // A Watch ranks below every other con.
  assert.ok((get("forensics:auditor")?.weight ?? 99) < 41);
  assert.equal(get("financials:loss")?.evidence, "Net loss of ₹5 cr in FY26");
  // The loss already says it: no "low returns" on top.
  assert.equal(get("returns:weak"), undefined);
  // No "clean" pro with flags on the board; no net-cash pro with net debt.
  assert.equal(get("forensics:clean"), undefined);
  assert.equal(get("forensics:net_cash"), undefined);

  const result = rankProsCons(candidates);
  // Two forensic flags at most, then the next source.
  assert.deepEqual(ids(result.bad), [
    "forensics:profit_to_cash",
    "forensics:promoter_pledge",
    "financials:loss",
    "ownership:promoter_falling",
  ]);
  assert.equal(result.bad[0].claim, "Profit isn't turning into cash");
  assert.equal(result.bad[3].evidence, "−5 pts over 2 quarters, to 55%");
}

// Clean needs most of the screen to have run.
{
  const thin = quality(
    payload({
      fiscal_years: [
        fy("FY25", { revenue: 100, net_profit: 10, operating_profit: 15, depreciation: 2, net_debt: -5 }),
        fy("FY26", { revenue: 110, net_profit: 11, operating_profit: 16, depreciation: 2, net_debt: -6 }),
      ],
    }),
  );
  assert.equal(thin.forensics?.tally.flag, 0);
  assert.ok((thin.forensics?.tally.assessed ?? 0) < 5);
  assert.equal(find({ ...EMPTY, quality: thin }, "forensics:clean"), undefined);
  // Two years is one year's move: no growth rates, no returns trend.
  assert.equal(find({ ...EMPTY, quality: thin }, "financials:revenue_growth"), undefined);
}

// Returns slipping, without a loss.
{
  const slipping = quality(
    payload({
      fiscal_years: [
        fy("FY22", { revenue: 100, net_profit: 10, roce_pct: 31 }),
        fy("FY23", { revenue: 105, net_profit: 9, roce_pct: 25 }),
        fy("FY24", { revenue: 110, net_profit: 9, roce_pct: 16 }),
      ],
    }),
  );
  const item = find({ ...EMPTY, quality: slipping }, "returns:weak");
  assert.equal(item?.claim, "Returns on capital are slipping");
  assert.equal(item?.evidence, "ROCE 16% in FY24, down from 31% in FY22");
  // Falling profit outranks every softer financials reading.
  assert.equal(find({ ...EMPTY, quality: slipping }, "financials:profit_shrinking")?.evidence, "Down 5% a year, FY22–FY24");
  assert.equal(find({ ...EMPTY, quality: slipping }, "financials:profit_lagging"), undefined);
}

// ── Moat ─────────────────────────────────────────────────────────────────────

assert.equal(find({ ...EMPTY, moat: { rating: "wide_moat", tier: "strong", headline: "Why." } }, "moat:wide_moat")?.weight, 86);
assert.equal(find({ ...EMPTY, moat: { rating: "narrow_moat", tier: "mid", headline: "Why." } }, "moat:narrow_moat")?.claim, "A moderate competitive edge");
assert.equal(find({ ...EMPTY, moat: { rating: "narrow_moat", tier: null, headline: null } }, "moat:narrow_moat")?.side, "good");
{
  const item = find({ ...EMPTY, moat: { rating: "no_moat", tier: "weak", headline: "Rivals can copy it." } }, "moat:no_moat");
  assert.equal(item?.side, "bad");
  assert.equal(item?.evidence, "Rivals can copy it.");
}

// ── Concall: level and trend on one item, never fighting each other ──────────

{
  const item = find({ ...EMPTY, concallPath: path(7.0, 7.1, 6.9, 8.6) }, "concall:upbeat");
  assert.equal(item?.claim, "Strongly bullish latest call");
  assert.equal(item?.evidence, "8.6 in Q1 FY27, up from a 7.0 average over the 3 calls before");
  assert.equal(Math.round(item?.weight ?? 0), 69);
}
{
  // A fall from 9+ to 8.1 is still a strongly bullish call — no con.
  const candidates = collectProsConsCandidates({ ...EMPTY, concallPath: path(9.4, 9.2, 9.5, 8.1) });
  assert.deepEqual(ids(candidates), ["concall:upbeat"]);
  assert.equal(candidates[0].evidence, "Concall score 8.1 in Q1 FY27");
}
assert.equal(find({ ...EMPTY, concallPath: path(7.5, 7.4, 7.2, 5.9) }, "concall:downbeat")?.claim, "Calls are turning less upbeat");
assert.equal(find({ ...EMPTY, concallPath: path(4.0) }, "concall:downbeat")?.evidence, "Concall score 4.0 in Q1 FY27");
// One earlier print is not a trend.
assert.deepEqual(collectProsConsCandidates({ ...EMPTY, concallPath: path(5.0, 7.0) }), []);

// ── Growth and valuation: their bands' own words ─────────────────────────────

const growthAt = (score: number, base: string | null = "30-35%") =>
  collectProsConsCandidates({ ...EMPTY, growth: { score, base, horizonYears: 2 } });
assert.equal(growthAt(7.9)[0].claim, "Exceptional growth outlook");
assert.equal(growthAt(7.9)[0].evidence, "Base-case revenue growth 30-35%, 2-year view");
assert.equal(growthAt(7.3)[0].claim, "Strong growth outlook");
assert.deepEqual(growthAt(6.5), []);
assert.equal(growthAt(5.5, null)[0].claim, "Soft growth outlook");
assert.equal(growthAt(5.5, null)[0].evidence, "Growth score 5.5");
assert.equal(growthAt(4.8)[0].side, "bad");

const verdict = (v: NonNullable<ProsConsInputs["valuation"]>["verdict"]) =>
  collectProsConsCandidates({ ...EMPTY, valuation: { verdict: v, headline: "Thesis." } });
assert.equal(verdict("UNDERVALUED")[0].claim, "Undervalued at today's price");
assert.equal(verdict("UNDERVALUED")[0].evidence, "Thesis.");
assert.equal(verdict("DEEPLY UNDERVALUED")[0].weight, 84);
assert.equal(verdict("EXPENSIVE")[0].side, "bad");
assert.ok(verdict("RICHLY PRICED")[0].weight > verdict("EXPENSIVE")[0].weight);
assert.deepEqual(verdict("FAIRLY VALUED"), []);

// ── Guidance: the record, the backing, the cuts ──────────────────────────────

const record = (tier: NonNullable<ProsConsInputs["trackRecord"]>["tier"], metCount: number, countedCount: number) =>
  collectProsConsCandidates({ ...EMPTY, trackRecord: { tier, metCount, countedCount } });
assert.equal(record("reliable", 9, 10)[0].evidence, "9 of 10 graded targets met");
assert.equal(record("high_trust", 2, 2)[0].evidence, null, "under three graded targets the count stays hidden, as on the tab");
assert.deepEqual(record("high_trust", 1, 4), [], "a stored verdict the count contradicts is not a clear reading");
assert.equal(record("low_trust", 1, 7)[0].claim, "Management often misses its guidance");
assert.deepEqual(record("low_trust", 6, 7), []);
assert.equal(record("erratic", 2, 3)[0].side, "bad");
assert.deepEqual(record("credible", 5, 6), []);
assert.deepEqual(record("not_enough_data", 1, 1), []);

{
  const well = collectProsConsCandidates({
    ...EMPTY,
    guidance: { ambition: "ambitious", evidence: "well_evidenced", liveTotal: 18, orderBacked: 7, aspiration: 2 },
  });
  assert.equal(well[0].claim, "Ambitious targets, well evidenced");
  assert.equal(well[0].evidence, "7 of 18 live targets order-backed, 2 aspirational");
  const thin = collectProsConsCandidates({
    ...EMPTY,
    guidance: { ambition: "measured", evidence: "thinly_evidenced", liveTotal: 9, orderBacked: 0, aspiration: 6 },
  });
  assert.equal(thin[0].claim, "Measured targets, thinly evidenced");
  assert.equal(thin[0].evidence, "None of the 9 live targets is order-backed");
  // Thin backing matters more under an ambitious guide.
  const thinAmbitious = collectProsConsCandidates({
    ...EMPTY,
    guidance: { ambition: "ambitious", evidence: "thinly_evidenced", liveTotal: 9, orderBacked: 2, aspiration: 6 },
  });
  assert.ok(thinAmbitious[0].weight > thin[0].weight);
  assert.equal(thinAmbitious[0].evidence, "Only 2 of 9 live targets order-backed");

  // One guidance item a side: the cuts lose to the thin backing.
  const both = rankProsCons(
    collectProsConsCandidates({
      ...EMPTY,
      guidance: { ambition: "ambitious", evidence: "thinly_evidenced", liveTotal: 14, orderBacked: 2, aspiration: 8 },
      liveBook: { liveCount: 14, revisedDownCount: 2 },
    }),
  );
  assert.deepEqual(ids(both.bad), ["guidance:thinly_evidenced"]);
  const cuts = find({ ...EMPTY, liveBook: { liveCount: 14, revisedDownCount: 2 } }, "guidance:revised_down");
  assert.equal(cuts?.claim, "Live targets are being cut");
  assert.equal(cuts?.evidence, "2 of 14 live targets revised down while still open");
  assert.equal(cuts?.weight, 55);
}

// ── Industry cycle ───────────────────────────────────────────────────────────

const stage = (s: string) => collectProsConsCandidates({ ...EMPTY, industry: { stage: s, market: "Power transformers" } });
assert.equal(stage("early_upcycle")[0].claim, "Its main market is early in an upcycle");
assert.equal(stage("early_upcycle")[0].evidence, "Lead market: Power transformers");
assert.equal(stage("Late upcycle")[0].side, "bad", "stage words normalise like the Industry tab's");
assert.equal(stage("downcycle")[0].side, "bad");
assert.deepEqual(stage("mid_upcycle"), []);
assert.deepEqual(stage("defensive_stable"), []);
assert.deepEqual(stage("unclear"), []);

// ── Ranking: strongest first, five a side, one per source, ties by source ────

{
  const result = buildProsCons({
    ...EMPTY,
    quality: strong,
    moat: { rating: "wide_moat", tier: "strong", headline: "Why." },
    growth: { score: 7.9, base: "30-35%", horizonYears: 2 },
    valuation: { verdict: "UNDERVALUED", headline: "Thesis." },
  });
  assert.equal(result.good.length, PROS_CONS_LIMIT);
  // forensics:clean and growth tie at 76 — the forensic checks lead.
  assert.deepEqual(ids(result.good), [
    "moat:wide_moat",
    "forensics:clean",
    "growth:good",
    "valuation:good",
    "returns:strong",
  ]);
  for (let i = 1; i < result.good.length; i += 1) {
    assert.ok(result.good[i - 1].weight >= result.good[i].weight, "sorted strongest first");
  }
}

{
  const item = (id: string, source: ProsConsItem["source"], weight: number): ProsConsItem => ({
    id,
    side: "bad",
    source,
    weight,
    claim: id,
    evidence: null,
  });
  const ranked = rankProsCons([
    item("forensics:a", "forensics", 90),
    item("forensics:b", "forensics", 89),
    item("forensics:c", "forensics", 88),
    item("moat:x", "moat", 70),
    item("moat:y", "moat", 69),
    item("valuation:z", "valuation", 70),
  ]);
  assert.deepEqual(ids(ranked.bad), ["forensics:a", "forensics:b", "moat:x", "valuation:z"]);
  assert.deepEqual(ranked.good, []);
  assert.equal(rankProsCons([item("moat:x", "moat", 70)], 0).bad.length, 0);
}

// Every source names a label and a tab.
for (const [source, meta] of Object.entries(PROS_CONS_SOURCES)) {
  assert.ok(meta.label && meta.sectionId, `${source} has a label and a section`);
}

console.log("overview-pros-cons: ok");
