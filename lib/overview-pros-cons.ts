// The Overview's pros and cons (2026-10-06): the clearly good and the clearly
// bad readings across a company's sections, ranked, at most five a side.
//
// Every item restates a verdict or a number its section already shows: the
// forensic checks, returns, financials and ownership on the Quality tab, the
// moat read, the concall score path, the growth outlook, the valuation
// verdict, management's guidance record, the backing behind the live
// guidance, and the lead market's capital cycle. Nothing is generated here. A
// rule fires only when a reading is clearly good or clearly bad by its own
// section's bands, so a company with two strengths shows two, not five; the
// middle of every scale (a "Mixed" record, a "Fair" price, a "Moderate" growth
// band, a narrow moat on weak barriers) says nothing.
//
// Left out on purpose:
//   - Key variables: a card's verdict headline and its metric's direction often
//     disagree ("Stainless sales have gone flat…" sits on a rising series), so
//     the side would be a guess.
//   - Filings: story reads deliberately carry no good/bad verdict.
//   - Industry tailwind/headwind counts: written in near-equal numbers for
//     almost every company, so the tally carries no signal.
//
// Pure: no React, no Supabase. lib/overview-signal-board.ts gathers the inputs
// through each section's own normalizer; tests/overview-pros-cons.test.ts pins
// the rules.

import { formatCr, formatPct, formatPp } from "@/lib/company-quality/format";
import type { ForensicCheck, NormalizedCompanyQuality } from "@/lib/company-quality/types";
import type { AmbitionLabel, EvidenceBand } from "@/lib/guidance-snapshot/types";
import { bandForGrowthScore } from "@/lib/growth-band";
import type { MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";
import type { ValuationVerdict } from "@/lib/valuation-check/types";
import { MIN_COMMITMENTS_FOR_GRADE } from "@/lib/walk-the-talk/grade-utils";
import type { CredibilityVerdictKey } from "@/lib/walk-the-talk/types";

export type ProsConsSide = "good" | "bad";

export type ProsConsSource =
  | "forensics"
  | "returns"
  | "financials"
  | "ownership"
  | "moat"
  | "concall"
  | "growth"
  | "valuation"
  | "track_record"
  | "guidance"
  | "industry";

/** Where each item comes from: the label it prints and the tab it opens. */
export const PROS_CONS_SOURCES: Record<ProsConsSource, { label: string; sectionId: string }> = {
  forensics: { label: "Forensic checks", sectionId: "quality" },
  returns: { label: "Returns", sectionId: "quality" },
  financials: { label: "Financials", sectionId: "quality" },
  ownership: { label: "Ownership", sectionId: "quality" },
  moat: { label: "Moat", sectionId: "quality" },
  concall: { label: "Concall", sectionId: "sentiment-score" },
  growth: { label: "Growth", sectionId: "future-growth" },
  valuation: { label: "Valuation", sectionId: "valuation-check" },
  track_record: { label: "Track record", sectionId: "guidance-history" },
  guidance: { label: "Guidance", sectionId: "guidance-history" },
  industry: { label: "Industry", sectionId: "industry-context" },
};

export type ProsConsItem = {
  /** Stable key, `<source>:<rule>`. */
  id: string;
  side: ProsConsSide;
  source: ProsConsSource;
  /** Rank weight, 0–100. Higher = matters more to the call. */
  weight: number;
  /** The point in plain words. */
  claim: string;
  /** The number or verdict behind it, as its section shows it. */
  evidence: string | null;
};

export type ProsCons = { good: ProsConsItem[]; bad: ProsConsItem[] };

export type ProsConsInputs = {
  quality: NormalizedCompanyQuality | null;
  moat: { rating: MoatRatingKey; tier: MoatTier | null; headline: string | null } | null;
  /** Concall scores, oldest → newest (the Overview's score path). */
  concallPath: { period: string; value: number }[];
  growth: { score: number; base: string | null; horizonYears: number | null } | null;
  /** Only when the Valuation card shows a verdict (rateable and fresh). */
  valuation: { verdict: ValuationVerdict; headline: string | null } | null;
  /** The Guidance tab's credibility verdict and its "met / graded" count. */
  trackRecord: { tier: CredibilityVerdictKey; metCount: number; countedCount: number } | null;
  /** Live commitments, and how many were lowered while still open. */
  liveBook: { liveCount: number; revisedDownCount: number } | null;
  /** Deep-track forward strength, when the snapshot carries it. */
  guidance: {
    ambition: AmbitionLabel;
    evidence: EvidenceBand;
    liveTotal: number;
    orderBacked: number;
    aspiration: number;
  } | null;
  /** The lead market's capital-cycle stage (the Industry tab's "Where it sits"). */
  industry: { stage: string; market: string | null } | null;
};

export const PROS_CONS_LIMIT = 5;

// Rank weights, kept together so the order can be read in one place. Red
// flags in the accounts and management's record lead; then the business's
// edge, the price, and growth history and outlook; then returns, the backing
// behind the live guide and the latest call; ownership and the industry cycle
// rank last. A few rules scale inside a small band by how far past their
// threshold the reading sits (see the rules).
const W = {
  forensicFlag: {
    auditor: 96,
    profit_to_cash: 92,
    promoter_pledge: 90,
    related_party: 89,
    debt_load: 88,
    receivable_days: 86,
    contingent_liabilities: 84,
    equity_dilution: 80,
    other_income: 78,
  } satisfies Record<ForensicCheck["id"], number>,
  // A Watch sits below every other con (34–40), in the same order as the flags.
  forensicWatchBase: 34,
  forensicClean: 76,
  netCash: 56,
  lossMaking: 84,
  revenueShrinking: 66,
  profitShrinking: 62,
  profitLagging: 54,
  revenueCompounding: 54, // + up to 12 as growth runs past 20%
  profitOutpacing: 58,
  returnsHigh: 66, // ≥ 25%, + up to 8
  returnsSolid: 56, // 20–25%
  returnsRising: 60,
  returnsLow: 58,
  returnsSlipping: 54,
  moatWideStrong: 86,
  moatWide: 80,
  moatNarrowStrong: 72,
  moatNarrowMid: 58,
  moatAtRisk: 74,
  noMoat: 70,
  deepValue: 84,
  undervalued: 74,
  expensive: 60,
  richlyPriced: 72,
  trustHigh: 82,
  trustErratic: 62,
  trustLow: 84,
  guidanceWell: { ambitious: 70, measured: 64, conservative: 58 } satisfies Record<AmbitionLabel, number>,
  guidanceThin: { ambitious: 64, measured: 52, conservative: 48 } satisfies Record<AmbitionLabel, number>,
  revisedDown: 52, // + 3 per further target, up to 60
  growthExceptional: 76,
  growthStrong: 66,
  growthSoft: 58,
  growthWeak: 64,
  callStrong: 60, // ≥ 8.0, + up to 10
  callRising: 50, // + up to 10
  callBearish: 62,
  callFalling: 50, // + up to 10
  promoterBuying: 52,
  promoterFalling: 46,
  cycleEarly: 46,
  cycleRecovery: 42,
  cycleLate: 46,
  cycleBoom: 48,
  cycleDown: 50,
} as const;

/** When a source fires on both a level and a trend, the merged item ranks this much higher. */
const BOTH_BONUS = 3;

// One item per source a side, so the list draws on several sections; the
// forensic checks get two because each flag is its own question.
const SOURCE_CAP: Partial<Record<ProsConsSource, number>> = { forensics: 2 };

// Equal weights fall back to this order, then to the item id.
const SOURCE_ORDER: ProsConsSource[] = [
  "forensics",
  "track_record",
  "moat",
  "valuation",
  "financials",
  "growth",
  "returns",
  "guidance",
  "concall",
  "ownership",
  "industry",
];

const one = (value: number) => value.toFixed(1);
const pct0 = (value: number) => formatPct(value, 0);
const capped = (base: number, extra: number, max: number) => base + Math.min(max, Math.max(0, extra));
const quartersWord = (n: number) => (n === 1 ? "one quarter" : `${n} quarters`);
const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0] ?? text;

// ---- Forensic checks ---------------------------------------------------------

const FLAG_CLAIM: Record<ForensicCheck["id"], string> = {
  profit_to_cash: "Profit isn't turning into cash",
  receivable_days: "Customers take a long time to pay",
  debt_load: "Debt is heavy for what it earns",
  related_party: "Much of revenue runs through related parties",
  promoter_pledge: "A large slice of promoter shares is pledged",
  auditor: "The auditor did not sign off cleanly",
  contingent_liabilities: "Large contingent claims against net worth",
  other_income: "Most of the profit is not from operations",
  equity_dilution: "Heavy issue of new shares",
};

const WATCH_CLAIM: Record<ForensicCheck["id"], string> = {
  profit_to_cash: "Some profit hasn't arrived as cash",
  receivable_days: "Collections are slow or slowing",
  debt_load: "Debt is worth watching",
  related_party: "Some revenue runs through related parties",
  promoter_pledge: "Some promoter shares are pledged",
  auditor: "The auditor raised points to read",
  contingent_liabilities: "Sizeable contingent claims",
  other_income: "A slice of profit is other income",
  equity_dilution: "Some new shares were issued",
};

// The check's own metric, plus the part of its note that explains the status
// when the metric alone doesn't: a debt flag can come from thin interest
// cover, a receivables watch from a rising trend, an auditor watch from CARO
// remarks under a clean opinion. The notes are templated in
// lib/company-quality/forensics.ts; anything unmatched falls back to the metric.
function forensicEvidence(check: ForensicCheck): string {
  switch (check.id) {
    case "debt_load": {
      const cover = /Interest cover (-?[\d.,]+×)/.exec(check.note)?.[1];
      return cover ? `${check.metric}, interest cover ${cover}` : check.metric;
    }
    case "receivable_days": {
      const trend = /;\s*((?:up|down) from [^.;]+|flat since [^.;]+)\./.exec(check.note)?.[1];
      return trend ? `${check.metric}, ${trend}` : check.metric;
    }
    case "equity_dilution":
      return `Paid-up capital up ${check.metric}`;
    case "auditor":
      return check.metric === "Unqualified" ? "Clean opinion, with CARO or emphasis-of-matter remarks" : `${check.metric} audit opinion`;
    default:
      return check.metric;
  }
}

function forensicItems(quality: NormalizedCompanyQuality | null): ProsConsItem[] {
  const forensics = quality?.forensics;
  if (!forensics) return [];
  const items: ProsConsItem[] = [];
  for (const check of forensics.checks) {
    if (check.status !== "flag" && check.status !== "watch") continue;
    const flag = check.status === "flag";
    const flagWeight = W.forensicFlag[check.id];
    items.push({
      id: `forensics:${check.id}`,
      side: "bad",
      source: "forensics",
      weight: flag ? flagWeight : W.forensicWatchBase + (flagWeight - W.forensicFlag.other_income) / 3,
      claim: flag ? FLAG_CLAIM[check.id] : WATCH_CLAIM[check.id],
      evidence: forensicEvidence(check),
    });
  }
  // "Clean" needs most of the screen to have run — two clean checks are not a record.
  const { tally } = forensics;
  if (tally.assessed >= 5 && tally.flag === 0 && tally.watch === 0) {
    items.push({
      id: "forensics:clean",
      side: "good",
      source: "forensics",
      weight: W.forensicClean,
      claim: "No red flags in the accounts",
      evidence: `Clean on all ${tally.assessed} checks we can run`,
    });
  }
  const debt = forensics.checks.find((check) => check.id === "debt_load");
  if (debt?.status === "clean" && debt.metric === "Net cash") {
    items.push({
      id: "forensics:net_cash",
      side: "good",
      source: "forensics",
      weight: W.netCash,
      claim: "More cash than debt",
      evidence: firstSentence(debt.note),
    });
  }
  return items;
}

// ---- Returns & margins -----------------------------------------------------

function returnsItems(quality: NormalizedCompanyQuality | null): ProsConsItem[] {
  if (!quality?.returns) return [];
  const key = quality.statementModel === "financial" ? "roe" : "roce";
  const row = quality.returns.returns.find((r) => r.key === key);
  const points = (row?.points ?? []).filter(
    (p): p is { label: string; value: number } => p.value != null,
  );
  if (!row || points.length < 2) return [];
  const first = points[0];
  const last = points[points.length - 1];
  const change = last.value - first.value;
  // A trend needs three years; two is one year's move.
  const hasTrend = points.length >= 3;
  const level = `${row.label} ${pct0(last.value)} in ${last.label}`;
  const items: ProsConsItem[] = [];

  const high = last.value >= 25;
  const solid = !high && last.value >= 20;
  const rising = hasTrend && change >= 8 && last.value >= 18;
  if (high || solid || rising) {
    const levelWeight = high ? capped(W.returnsHigh, (last.value - 25) * 0.4, 8) : solid ? W.returnsSolid : 0;
    const weight = Math.max(levelWeight, rising ? W.returnsRising : 0) + ((high || solid) && rising ? BOTH_BONUS : 0);
    items.push({
      id: "returns:strong",
      side: "good",
      source: "returns",
      weight,
      claim: high ? "High returns on capital" : solid ? "Solid returns on capital" : "Returns on capital are rising",
      evidence: rising ? `${level}, up from ${pct0(first.value)} in ${first.label}` : level,
    });
  }

  // A loss already says it (the Financials item); negative returns would repeat it.
  const lossNow = (quality.financials?.netProfitLatest ?? 0) < 0;
  const low = last.value < 10;
  const slipping = hasTrend && change <= -10 && last.value < 20;
  if (!lossNow && (low || slipping)) {
    items.push({
      id: "returns:weak",
      side: "bad",
      source: "returns",
      weight: Math.max(low ? W.returnsLow : 0, slipping ? W.returnsSlipping : 0) + (low && slipping ? BOTH_BONUS : 0),
      claim: low ? "Low returns on capital" : "Returns on capital are slipping",
      evidence: slipping ? `${level}, down from ${pct0(first.value)} in ${first.label}` : level,
    });
  }
  return items;
}

// ---- Financials --------------------------------------------------------------

function financialsItems(quality: NormalizedCompanyQuality | null): ProsConsItem[] {
  const financials = quality?.financials;
  // Growth rates need at least three years; two is one year's move.
  if (!financials || financials.years.length < 3) return [];
  const range = financials.yearRange;
  const latestYear = financials.years[financials.years.length - 1];
  const rev = financials.revenueCagrPct;
  const pat = financials.netProfitCagrPct;
  const profit = financials.netProfitLatest;
  const items: ProsConsItem[] = [];
  const bad = (id: string, weight: number, claim: string, evidence: string) =>
    items.push({ id: `financials:${id}`, side: "bad", source: "financials", weight, claim, evidence });
  const good = (id: string, weight: number, claim: string, evidence: string) =>
    items.push({ id: `financials:${id}`, side: "good", source: "financials", weight, claim, evidence });

  if (profit != null && profit < 0) {
    bad("loss", W.lossMaking, "Loss-making", `Net loss of ₹${formatCr(Math.abs(profit))} cr in ${latestYear}`);
  } else if (rev != null && rev < 0) {
    bad("revenue_shrinking", W.revenueShrinking, "Revenue is shrinking", `Down ${pct0(-rev)} a year, ${range}`);
  } else if (pat != null && pat < 0) {
    bad("profit_shrinking", W.profitShrinking, "Profit is shrinking", `Down ${pct0(-pat)} a year, ${range}`);
  } else if (rev != null && pat != null && rev >= 5 && pat <= rev - 10) {
    bad(
      "profit_lagging",
      W.profitLagging,
      "Profit is lagging sales",
      `Profit up ${pct0(pat)} a year against revenue ${pct0(rev)}, ${range}`,
    );
  }

  if (rev != null && rev >= 20) {
    const profitClause = pat != null && pat >= rev + 5 ? `; profit ${pct0(pat)} a year` : "";
    good(
      "revenue_growth",
      capped(W.revenueCompounding, (rev - 20) * 0.5, 12),
      "Sales are compounding fast",
      `Revenue up ${pct0(rev)} a year, ${range}${profitClause}`,
    );
  } else if (rev != null && pat != null && pat >= 20 && pat >= rev + 10 && profit != null && profit > 0) {
    good(
      "profit_outpacing",
      W.profitOutpacing,
      "Profit is growing faster than sales",
      `Profit up ${pct0(pat)} a year against revenue ${pct0(rev)}, ${range}`,
    );
  }
  return items;
}

// ---- Ownership -----------------------------------------------------------------

function ownershipItems(quality: NormalizedCompanyQuality | null): ProsConsItem[] {
  const ownership = quality?.ownership;
  // No promoter group (stance null) or a single quarter: nothing to read.
  if (!ownership || ownership.promoters.stance == null) return [];
  const promoters = ownership.summary.find((s) => s.band === "promoters");
  const change = promoters?.change;
  const latest = promoters?.latest;
  if (change == null || latest == null) return [];
  const evidence = `${formatPp(change)} pts over ${quartersWord(ownership.quarters.length - 1)}, to ${formatPct(latest)}`;
  if (change >= 1) {
    return [{ id: "ownership:promoter_buying", side: "good", source: "ownership", weight: W.promoterBuying, claim: "Promoters are adding to their stake", evidence }];
  }
  if (change <= -2) {
    return [{ id: "ownership:promoter_falling", side: "bad", source: "ownership", weight: W.promoterFalling, claim: "Promoter stake is falling", evidence }];
  }
  return [];
}

// ---- Moat --------------------------------------------------------------------

// Same reading as edgePhrase (lib/moat-analysis/plain-language): a narrow moat
// on weak barriers is a slim edge, neither a strength nor a weakness.
function moatItems(moat: ProsConsInputs["moat"]): ProsConsItem[] {
  if (!moat) return [];
  const item = (side: ProsConsSide, weight: number, claim: string): ProsConsItem[] => [
    { id: `moat:${moat.rating}`, side, source: "moat", weight, claim, evidence: moat.headline },
  ];
  switch (moat.rating) {
    case "wide_moat":
      return moat.tier === "strong"
        ? item("good", W.moatWideStrong, "A wide, well-protected competitive edge")
        : item("good", W.moatWide, "A wide competitive edge");
    case "narrow_moat":
      if (moat.tier === "strong") return item("good", W.moatNarrowStrong, "A solid, defensible competitive edge");
      if (moat.tier === "weak") return [];
      return item("good", W.moatNarrowMid, "A moderate competitive edge");
    case "moat_at_risk":
      return item("bad", W.moatAtRisk, "Its competitive edge is under threat");
    case "no_moat":
      return item("bad", W.noMoat, "No durable competitive edge");
    default:
      return [];
  }
}

// ---- Concall score -------------------------------------------------------------

// Level and trend on one item a side. The trend reads the latest print against
// the average of up to three before it, and only counts where it doesn't fight
// the level: a fall from 9 to 8 is still a strongly bullish call.
function concallItems(path: ProsConsInputs["concallPath"]): ProsConsItem[] {
  if (path.length === 0) return [];
  const latest = path[path.length - 1];
  const prior = path.slice(-4, -1);
  const average = prior.length >= 2 ? prior.reduce((sum, p) => sum + p.value, 0) / prior.length : null;
  const delta = average != null ? latest.value - average : null;
  const score = `Concall score ${one(latest.value)} in ${latest.period}`;
  const trend = (direction: "up" | "down") =>
    `${one(latest.value)} in ${latest.period}, ${direction} from a ${one(average ?? 0)} average over the ${prior.length} calls before`;
  const items: ProsConsItem[] = [];

  const strong = latest.value >= 8;
  const rising = delta != null && delta >= 1 && latest.value >= 6.5;
  if (strong || rising) {
    items.push({
      id: "concall:upbeat",
      side: "good",
      source: "concall",
      weight:
        Math.max(
          strong ? capped(W.callStrong, (latest.value - 8) * 10, 10) : 0,
          rising ? capped(W.callRising, ((delta ?? 0) - 1) * 8, 10) : 0,
        ) + (strong && rising ? BOTH_BONUS : 0),
      claim: strong ? "Strongly bullish latest call" : "Calls are turning more upbeat",
      evidence: rising ? trend("up") : score,
    });
  }

  const bearish = latest.value < 4.5;
  const falling = delta != null && delta <= -1 && latest.value < 7;
  if (bearish || falling) {
    items.push({
      id: "concall:downbeat",
      side: "bad",
      source: "concall",
      weight:
        Math.max(
          bearish ? W.callBearish : 0,
          falling ? capped(W.callFalling, (-(delta ?? 0) - 1) * 8, 10) : 0,
        ) + (bearish && falling ? BOTH_BONUS : 0),
      claim: bearish ? "Bearish latest call" : "Calls are turning less upbeat",
      evidence: falling ? trend("down") : score,
    });
  }
  return items;
}

// ---- Growth outlook ------------------------------------------------------------

// The Growth band's own words. Solid and Moderate sit in the middle and say nothing.
function growthItems(growth: ProsConsInputs["growth"]): ProsConsItem[] {
  if (!growth) return [];
  const evidence = growth.base
    ? `Base-case revenue growth ${growth.base}${growth.horizonYears ? `, ${growth.horizonYears}-year view` : ""}`
    : `Growth score ${one(growth.score)}`;
  const item = (side: ProsConsSide, weight: number, claim: string): ProsConsItem[] => [
    { id: `growth:${side}`, side, source: "growth", weight, claim, evidence },
  ];
  switch (bandForGrowthScore(growth.score)) {
    case "exceptional":
      return item("good", W.growthExceptional, "Exceptional growth outlook");
    case "strong":
      return item("good", W.growthStrong, "Strong growth outlook");
    case "soft":
      return item("bad", W.growthSoft, "Soft growth outlook");
    case "weak":
      return item("bad", W.growthWeak, "Weak growth outlook");
    default:
      return [];
  }
}

// ---- Valuation -----------------------------------------------------------------

function valuationItems(valuation: ProsConsInputs["valuation"]): ProsConsItem[] {
  if (!valuation) return [];
  const item = (side: ProsConsSide, weight: number, claim: string): ProsConsItem[] => [
    { id: `valuation:${side}`, side, source: "valuation", weight, claim, evidence: valuation.headline },
  ];
  switch (valuation.verdict) {
    case "DEEPLY UNDERVALUED":
      return item("good", W.deepValue, "Deeply undervalued at today's price");
    case "UNDERVALUED":
      return item("good", W.undervalued, "Undervalued at today's price");
    case "EXPENSIVE":
      return item("bad", W.expensive, "Expensive at today's price");
    case "RICHLY PRICED":
      return item("bad", W.richlyPriced, "Richly priced at today's price");
    default:
      return [];
  }
}

// ---- Guidance: the record, and the live book -------------------------------------

// The Guidance tab's tones: High trust / Reliable read green, Low trust /
// Weak red, Erratic amber; Credible and Mixed sit in the neutral middle. The
// "met / graded" count shows only from three graded targets, as on the tab's
// header pill. A stored verdict can disagree with the raw count (it weighs
// more than hits and misses); when the two pull apart the reading isn't
// clear, so no item.
function trackRecordItems(record: ProsConsInputs["trackRecord"]): ProsConsItem[] {
  if (!record) return [];
  const graded = record.countedCount >= MIN_COMMITMENTS_FOR_GRADE;
  const hitRate = graded ? record.metCount / record.countedCount : null;
  const evidence = graded ? `${record.metCount} of ${record.countedCount} graded targets met` : null;
  const item = (side: ProsConsSide, weight: number, claim: string): ProsConsItem[] => [
    { id: `track_record:${record.tier}`, side, source: "track_record", weight, claim, evidence },
  ];
  switch (record.tier) {
    case "high_trust":
    case "reliable":
      return hitRate != null && hitRate < 0.6 ? [] : item("good", W.trustHigh, "Management delivers what it guides");
    case "erratic":
      return hitRate != null && hitRate >= 0.75 ? [] : item("bad", W.trustErratic, "Management's guidance is hit and miss");
    case "low_trust":
    case "weak":
      return hitRate != null && hitRate >= 0.75 ? [] : item("bad", W.trustLow, "Management often misses its guidance");
    default:
      return [];
  }
}

const AMBITION_WORD: Record<AmbitionLabel, string> = {
  ambitious: "Ambitious",
  measured: "Measured",
  conservative: "Conservative",
};

// The backing behind the live guide, in the Guidance tab's own words: Well
// evidenced reads green, Thinly evidenced red, Partly evidenced says nothing.
// Ambition is not good or bad on its own — it only sets how much thin backing
// matters.
function guidanceItems(guidance: ProsConsInputs["guidance"], liveBook: ProsConsInputs["liveBook"]): ProsConsItem[] {
  const items: ProsConsItem[] = [];
  if (guidance?.evidence === "well_evidenced") {
    const aspiration = guidance.aspiration === 0 ? "none aspirational" : `${guidance.aspiration} aspirational`;
    items.push({
      id: "guidance:well_evidenced",
      side: "good",
      source: "guidance",
      weight: W.guidanceWell[guidance.ambition],
      claim: `${AMBITION_WORD[guidance.ambition]} targets, well evidenced`,
      evidence: `${guidance.orderBacked} of ${guidance.liveTotal} live targets order-backed, ${aspiration}`,
    });
  }
  if (guidance?.evidence === "thinly_evidenced") {
    items.push({
      id: "guidance:thinly_evidenced",
      side: "bad",
      source: "guidance",
      weight: W.guidanceThin[guidance.ambition],
      claim: `${AMBITION_WORD[guidance.ambition]} targets, thinly evidenced`,
      evidence:
        guidance.orderBacked === 0
          ? `None of the ${guidance.liveTotal} live targets is order-backed`
          : `Only ${guidance.orderBacked} of ${guidance.liveTotal} live targets order-backed`,
    });
  }
  const down = liveBook?.revisedDownCount ?? 0;
  if (liveBook && down > 0) {
    items.push({
      id: "guidance:revised_down",
      side: "bad",
      source: "guidance",
      weight: capped(W.revisedDown, (down - 1) * 3, 8),
      claim: down === 1 ? "A live target was cut" : "Live targets are being cut",
      evidence: `${down} of ${liveBook.liveCount} live targets revised down while still open`,
    });
  }
  return items;
}

// ---- Industry cycle ------------------------------------------------------------

// Mid-upcycle, defensive and mixed-signal markets say nothing either way.
function industryItems(industry: ProsConsInputs["industry"]): ProsConsItem[] {
  if (!industry) return [];
  const evidence = industry.market ? `Lead market: ${industry.market}` : null;
  const item = (side: ProsConsSide, weight: number, claim: string): ProsConsItem[] => [
    { id: `industry:${side}`, side, source: "industry", weight, claim, evidence },
  ];
  switch (industry.stage.trim().toLowerCase().replace(/\s+/g, "_")) {
    case "early_upcycle":
      return item("good", W.cycleEarly, "Its main market is early in an upcycle");
    case "recovery":
      return item("good", W.cycleRecovery, "Its main market is recovering from a downcycle");
    case "late_upcycle":
      return item("bad", W.cycleLate, "Its main market is late in its upcycle");
    case "boom":
      return item("bad", W.cycleBoom, "Its main market is at a cyclical peak");
    case "downcycle":
      return item("bad", W.cycleDown, "Its main market is in a downcycle");
    default:
      return [];
  }
}

// ---- Assembly ------------------------------------------------------------------

/** Every item any rule fires, unranked and uncapped. */
export function collectProsConsCandidates(inputs: ProsConsInputs): ProsConsItem[] {
  return [
    ...forensicItems(inputs.quality),
    ...returnsItems(inputs.quality),
    ...financialsItems(inputs.quality),
    ...ownershipItems(inputs.quality),
    ...moatItems(inputs.moat),
    ...concallItems(inputs.concallPath),
    ...growthItems(inputs.growth),
    ...valuationItems(inputs.valuation),
    ...trackRecordItems(inputs.trackRecord),
    ...guidanceItems(inputs.guidance, inputs.liveBook),
    ...industryItems(inputs.industry),
  ];
}

/**
 * Strongest first, at most `limit` a side, at most one item per source (two
 * for the forensic checks). Never pads: a side with nothing clear is empty.
 */
export function rankProsCons(candidates: ProsConsItem[], limit = PROS_CONS_LIMIT): ProsCons {
  const sorted = [...candidates].sort(
    (a, b) =>
      b.weight - a.weight ||
      SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source) ||
      a.id.localeCompare(b.id),
  );
  const pick = (side: ProsConsSide) => {
    const used = new Map<ProsConsSource, number>();
    const out: ProsConsItem[] = [];
    for (const item of sorted) {
      if (out.length === limit) break;
      if (item.side !== side) continue;
      const count = used.get(item.source) ?? 0;
      if (count >= (SOURCE_CAP[item.source] ?? 1)) continue;
      used.set(item.source, count + 1);
      out.push(item);
    }
    return out;
  };
  return { good: pick("good"), bad: pick("bad") };
}

export function buildProsCons(inputs: ProsConsInputs): ProsCons {
  return rankProsCons(collectProsConsCandidates(inputs));
}

// ---- The lean -------------------------------------------------------------------

export type ProsConsLeanTone = "good" | "even" | "bad";

export type ProsConsLean = {
  /** The good side's share of the ranked weight, 0–100. */
  score: number;
  word: string;
  tone: ProsConsLeanTone;
};

// Read top-down: the first band the score reaches.
export const PROS_CONS_LEAN_BANDS: { min: number; word: string; tone: ProsConsLeanTone }[] = [
  { min: 80, word: "Clearly good", tone: "good" },
  { min: 60, word: "Leans good", tone: "good" },
  { min: 41, word: "Evenly split", tone: "even" },
  { min: 21, word: "Leans bad", tone: "bad" },
  { min: 0, word: "Clearly bad", tone: "bad" },
];

/**
 * Which way the ranked list leans: the good items' weight as a share of all
 * the weight on the board, 0–100. It reads the SAME weights that order the
 * rows, so a company with one heavy red flag against three light strengths
 * leans bad even though the good column is longer. Null when neither side
 * has anything (the row is left out then anyway).
 */
export function leanProsCons(prosCons: ProsCons): ProsConsLean | null {
  const sum = (items: ProsConsItem[]) => items.reduce((total, item) => total + item.weight, 0);
  const good = sum(prosCons.good);
  const bad = sum(prosCons.bad);
  if (good + bad <= 0) return null;
  const score = Math.round((good / (good + bad)) * 100);
  const band = PROS_CONS_LEAN_BANDS.find((b) => score >= b.min) ?? PROS_CONS_LEAN_BANDS[PROS_CONS_LEAN_BANDS.length - 1];
  return { score, word: band.word, tone: band.tone };
}
