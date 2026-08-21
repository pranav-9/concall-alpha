import type { NormalizedValuationCheck, ValuationPill, ValuationVerdict } from "./types";

export const VERDICT_DISPLAY: Record<ValuationVerdict, string> = {
  "DEEPLY UNDERVALUED": "Deeply undervalued",
  UNDERVALUED: "Undervalued",
  "FAIRLY VALUED": "Fairly valued",
  EXPENSIVE: "Expensive",
  "RICHLY PRICED": "Richly priced",
};

// Verdict-only fallback thesis when the pills/zone can't be combined into a sharper one.
const VERDICT_HEADLINE_FALLBACK: Record<ValuationVerdict, string> = {
  "DEEPLY UNDERVALUED": "Trading well below what the fundamentals support.",
  UNDERVALUED: "Trading below what the fundamentals support.",
  "FAIRLY VALUED": "Priced roughly in line with the fundamentals.",
  EXPENSIVE: "Priced above what the fundamentals support.",
  "RICHLY PRICED": "Priced well above what the fundamentals support.",
};

/**
 * Deterministic one-line thesis, templated portal-side (the pipeline emits no headline — only the
 * multi-sentence `reasoning`). It combines two grounded reads: what the OWN-HISTORY multiples say
 * (the lens pills) and what the PRICE assumes (the reverse-DCF zone). When they disagree it draws
 * the tension out; otherwise it states the aligned read. Falls back to a verdict-word sentence.
 * Shared by the Valuation Check section and the company overview.
 */
export function buildValuationHeadline(v: NormalizedValuationCheck): string | null {
  if (!v.verdict) return null;

  const pills = v.lenses.map((l) => l.pill).filter((p): p is ValuationPill => Boolean(p));
  const cheapish = pills.some((p) => p === "Cheap" || p === "In-line");
  const richish = pills.some((p) => p === "Expensive" || p === "Stretched");

  let multiplesClause: string | null = null;
  if (pills.length) {
    if (richish && !cheapish) multiplesClause = "Expensive on its own multiples";
    else if (cheapish && !richish)
      multiplesClause = pills.every((p) => p === "Cheap")
        ? "Cheap on its own multiples"
        : "In line with its own history";
    else multiplesClause = "Mixed against its own history";
  }

  // Only the pricing block carries a zone worth reading against. For financials that block is a
  // residual-income read, so the clause is about return on equity, not growth (Phase E).
  let priceClause: string | null = null;
  if (v.reverseDcfApplicable && v.isResidualIncome) {
    switch (v.zone) {
      case "above_bull":
        priceClause = "the price banks on a return on equity above what it earns";
        break;
      case "base_to_bull":
        priceClause = "the price leans on a return on equity above what it earns";
        break;
      case "at_base":
        priceClause = "the price sits near the return on equity it earns";
        break;
      case "bear_to_base":
        priceClause = "the price implies a return on equity below what it earns";
        break;
      case "below_bear":
        priceClause = "the price implies a return on equity well below what it earns";
        break;
      default:
        priceClause = null;
    }
  } else if (v.reverseDcfApplicable) {
    switch (v.zone) {
      case "above_bull":
        priceClause = "the price banks on growth above anything it has delivered";
        break;
      case "base_to_bull":
        priceClause = "the price leans on growth above its base case";
        break;
      case "at_base":
        priceClause = "the price sits at our base case";
        break;
      case "bear_to_base":
        priceClause = "the price assumes growth below our base case";
        break;
      case "below_bear":
        priceClause = "the price assumes less growth than even our downside case";
        break;
      default:
        priceClause = null;
    }
  }

  if (multiplesClause && priceClause) {
    const priceAggressive = v.zone === "above_bull" || v.zone === "base_to_bull";
    const priceCheap = v.zone === "below_bear" || v.zone === "bear_to_base";
    // "but" when the two reads pull apart; "and" when they agree.
    const disagree =
      (cheapish && !richish && priceAggressive) || (richish && priceCheap);
    const joiner = disagree ? " — but " : ", and ";
    return `${multiplesClause}${joiner}${priceClause}.`;
  }
  if (priceClause) {
    const lead = priceClause.charAt(0).toUpperCase() + priceClause.slice(1);
    return `${lead}.`;
  }
  if (multiplesClause) return `${multiplesClause}.`;
  return VERDICT_HEADLINE_FALLBACK[v.verdict];
}
