import assert from "node:assert/strict";

import { buildGrowthSummary, isEarningsBridged, rankCatalysts } from "../lib/growth-outlook/summary";
import type {
  NormalizedGrowthCatalyst,
  NormalizedGrowthOutlook,
  NormalizedGrowthScenario,
} from "../lib/growth-outlook/types";

// The Growth tab's summary card is templated from the outlook the page
// already renders (lib/growth-outlook/summary.ts). These pin the sparse-data
// rules: a line shows only when its field exists, the earnings read follows
// the same bridged-only rule as the scenario cards, and an outlook with
// nothing to say yields no card.

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

const scenario = (overrides: Partial<NormalizedGrowthScenario> = {}): NormalizedGrowthScenario =>
  ({
    growth: null,
    summary: null,
    confidence: null,
    riskWatch: null,
    drivers: [],
    risks: [],
    earningsGrowth: null,
    earningsBasis: null,
    marginAtHorizon: null,
    ...overrides,
  }) as NormalizedGrowthScenario;

const catalyst = (name: string | null, weightedPriority: number | null): NormalizedGrowthCatalyst =>
  ({
    catalyst: name,
    priority: weightedPriority == null ? null : { weightedPriority },
    timelineItems: [],
    evidenceLines: [],
  }) as unknown as NormalizedGrowthCatalyst;

const outlook = (overrides: Partial<NormalizedGrowthOutlook> = {}): NormalizedGrowthOutlook =>
  ({
    growthScore: null,
    baseGrowthPct: null,
    upsideGrowthPct: null,
    downsideGrowthPct: null,
    horizonYears: null,
    summaryBullets: [],
    catalysts: [],
    scenarios: null,
    marginPath: null,
    earningsLadder: null,
    ...overrides,
  }) as NormalizedGrowthOutlook;

const bridged = { basis: "guided_margin_ebitda", metric: "ebitda", currentMarginPct: 28, horizonYearsUsed: 3, note: null };

test("full outlook: base + range + bridged earnings + top catalyst by weighted priority", () => {
  const s = buildGrowthSummary(
    outlook({
      growthScore: 7.5,
      horizonYears: 3,
      earningsLadder: bridged,
      scenarios: {
        base: scenario({ growth: "18-22%", earningsGrowth: "14-20%", earningsBasis: "guided_margin_ebitda", marginAtHorizon: "32-33%" }),
        upside: scenario({ growth: ">25%" }),
        downside: scenario({ growth: "10-12%" }),
      },
      catalysts: [catalyst("Second", 4), catalyst("First", 9), catalyst("Unranked", null)],
    }),
  );
  assert.ok(s);
  assert.equal(s.revenueGrowth, "18-22%");
  assert.equal(s.bearGrowth, "10-12%");
  assert.equal(s.bullGrowth, ">25%");
  assert.equal(s.horizonYears, 3);
  assert.deepEqual(s.earnings, { growth: "14-20%", metricLabel: "EBITDA", marginAtHorizon: "32-33%" });
  assert.equal(s.topCatalyst?.catalyst, "First");
});

test("earnings are suppressed unless the ladder is guided_margin-bridged", () => {
  for (const basis of ["flat_margin", "loss_making", "implausible_margin_path", null]) {
    const s = buildGrowthSummary(
      outlook({
        earningsLadder: basis ? { ...bridged, basis } : null,
        scenarios: { base: scenario({ growth: "20%", earningsGrowth: "20%", earningsBasis: basis }), upside: null, downside: null },
      }),
    );
    assert.equal(s?.earnings, null, `basis ${basis}`);
  }
  assert.equal(isEarningsBridged(outlook({ earningsLadder: bridged })), true);
  assert.equal(isEarningsBridged(null), false);
});

test("bridged ladder but the base scenario carries no earnings figure → no earnings line", () => {
  const s = buildGrowthSummary(
    outlook({ earningsLadder: bridged, scenarios: { base: scenario({ growth: "20%" }), upside: null, downside: null } }),
  );
  assert.equal(s?.earnings, null);
});

test("no base scenario: falls back to the promoted base column, and drops the range without a base", () => {
  const withColumn = buildGrowthSummary(outlook({ baseGrowthPct: " 15% ", upsideGrowthPct: "22%" }));
  assert.equal(withColumn?.revenueGrowth, "15%");
  assert.equal(withColumn?.bullGrowth, "22%");
  const noBase = buildGrowthSummary(outlook({ growthScore: 6, upsideGrowthPct: "22%", downsideGrowthPct: "8%" }));
  assert.equal(noBase?.revenueGrowth, null);
  assert.equal(noBase?.bearGrowth, null);
  assert.equal(noBase?.bullGrowth, null);
});

test("catalyst-only and score-only outlooks still summarise; unnamed catalysts are skipped", () => {
  const c = buildGrowthSummary(outlook({ catalysts: [catalyst(null, 10), catalyst("Named", 2)] }));
  assert.equal(c?.topCatalyst?.catalyst, "Named");
  assert.equal(c?.revenueGrowth, null);
  const sc = buildGrowthSummary(outlook({ growthScore: 5 }));
  assert.ok(sc);
  assert.equal(sc.topCatalyst, null);
});

test("nothing to summarise → null (no empty card); zero/invalid horizon dropped", () => {
  assert.equal(buildGrowthSummary(null), null);
  assert.equal(buildGrowthSummary(outlook()), null);
  assert.equal(buildGrowthSummary(outlook({ summaryBullets: ["prose only"] })), null);
  assert.equal(buildGrowthSummary(outlook({ growthScore: 5, horizonYears: 0 }))?.horizonYears, null);
});

test("rankCatalysts: copy, priority desc, unranked last in stored order", () => {
  const input = [catalyst("u1", null), catalyst("low", 1), catalyst("u2", null), catalyst("high", 8)];
  const ranked = rankCatalysts(input).map((c) => c.catalyst);
  assert.deepEqual(ranked, ["high", "low", "u1", "u2"]);
  assert.equal(input[0].catalyst, "u1");
});

console.log("growth-summary: all passed");
