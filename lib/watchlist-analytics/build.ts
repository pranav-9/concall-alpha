import "server-only";

// Assembles the watchlist analytics view model from the batched facts
// (data.ts) through the four pure builders. Shared by the signed-in page
// (app/watchlists/[id]) and the dev preview (app/dev/watchlist-analytics) so
// the two cannot drift. The pros-cons inputs are mapped exactly as the
// Overview maps them in lib/overview-signal-board.ts — same fields, same
// fallbacks — so a rule fires here iff it fires there.

import { moatCellLabel } from "@/lib/board-signals";
import { collectProsConsCandidates, type ProsConsInputs } from "@/lib/overview-pros-cons";

import { selectWatchlistFilings } from "./announcements";
import { buildChangeLedger, type CompanyChangeInputs } from "./changes";
import { fetchWatchlistAnalyticsData, type CompanyFacts } from "./data";
import { buildDistribution } from "./distribution";
import { aggregateProsCons } from "./pros-cons";
import type { WatchlistAnalytics, WatchlistAnalyticsCoverage } from "./types";

/** The Overview's pros-cons inputs, from the batched facts. Mirrors getOverviewSignalExtras. */
export function prosConsInputsFor(facts: CompanyFacts): ProsConsInputs {
  const guidance = facts.guidance;
  const strength = guidance?.forwardStrength ?? null;
  const walk = guidance?.walkTheTalk ?? null;
  return {
    quality: facts.quality,
    moat: facts.moat ? { rating: facts.moat.rating, tier: facts.moat.tier, headline: facts.moat.headline } : null,
    // Oldest → newest, the last eight prints (the Overview's score path).
    concallPath: facts.quarterPrints
      .slice(0, 8)
      .reverse()
      .map((print) => ({ period: print.label, value: print.score })),
    growth:
      facts.growth && typeof facts.growth.score === "number"
        ? {
            score: facts.growth.score,
            base: facts.growth.summary?.revenueGrowth ?? null,
            horizonYears: facts.growth.summary?.horizonYears ?? null,
          }
        : null,
    valuation: facts.valuation?.shownVerdict ?? null,
    trackRecord: guidance?.verdict
      ? { tier: guidance.verdict.tier, metCount: guidance.verdict.metCount, countedCount: guidance.verdict.countedCount }
      : null,
    liveBook: walk ? { liveCount: walk.liveCount, revisedDownCount: walk.liveRevisedDownCount } : null,
    guidance: strength
      ? {
          ambition: strength.ambition.label,
          evidence: strength.evidence.label,
          liveTotal: strength.evidence.liveTotal,
          orderBacked: strength.evidence.orderBacked,
          aspiration: strength.evidence.aspiration,
        }
      : null,
    industry: facts.industry,
  };
}

export function changeInputsFor(facts: CompanyFacts): CompanyChangeInputs {
  return {
    code: facts.code,
    name: facts.name,
    quarterPrints: facts.quarterPrints,
    growthRuns: facts.growth?.runs ?? [],
    valuation: facts.valuation
      ? { score: facts.valuation.score, pricedAsOf: facts.valuation.normalized.pricedAsOf, history: facts.valuation.history }
      : null,
    guidance: facts.guidance
      ? {
          generatedAt: facts.guidance.generatedAt,
          liveCount: facts.guidance.walkTheTalk?.liveCount ?? null,
          tierLabel: facts.guidance.verdict?.tierLabel ?? null,
        }
      : null,
    quality: facts.quality ? { generatedAt: facts.qualityGeneratedAt, tally: facts.quality.forensics?.tally ?? null } : null,
    moat: facts.moat ? { updatedAt: facts.moat.updatedAt, label: moatCellLabel({ rating: facts.moat.rating, tier: facts.moat.tier }) } : null,
    business: facts.businessGeneratedAt ? { generatedAt: facts.businessGeneratedAt } : null,
    keyVariables: facts.keyVariablesGeneratedAt ? { generatedAt: facts.keyVariablesGeneratedAt } : null,
  };
}

function coverageOf(all: CompanyFacts[]): WatchlistAnalyticsCoverage {
  const count = (test: (facts: CompanyFacts) => boolean) => all.filter(test).length;
  return {
    quality: count((f) => f.quality != null),
    moat: count((f) => f.moat != null),
    concall: count((f) => f.quarterPrints.length > 0),
    growth: count((f) => f.growth?.score != null),
    valuation: count((f) => f.valuation?.shownVerdict != null),
    guidance: count((f) => f.guidance != null),
  };
}

export async function buildWatchlistAnalytics(codes: string[], now: Date = new Date()): Promise<WatchlistAnalytics> {
  const data = await fetchWatchlistAnalyticsData(codes, now);
  const all = data.companies.map((company) => data.facts.get(company.code)).filter((f): f is CompanyFacts => Boolean(f));

  return {
    companies: data.companies,
    distribution: buildDistribution(data.companies, data.themes?.memberships ?? [], data.themes?.themes ?? [], data.sectorsWithPage),
    prosCons: aggregateProsCons(
      all.map((facts) => ({ code: facts.code, name: facts.name, items: collectProsConsCandidates(prosConsInputsFor(facts)) })),
    ),
    filings: selectWatchlistFilings(data.filings?.updates ?? [], data.filings?.reads ?? [], now),
    changes: buildChangeLedger(all.map(changeInputsFor), now),
    coverage: coverageOf(all),
  };
}
