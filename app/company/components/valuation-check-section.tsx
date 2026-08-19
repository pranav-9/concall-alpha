// L1 SectionCard shell is provided externally by ValuationCheckPanel in
// company-detail-sections.tsx. This component renders the section interior only.
// (Same pattern as MoatAnalysisSection.)
//
// Phase 12 / Business Analysis Framework v14 Section 6.
//
// Layout is an editorial "plate" (redesign 2026-08-19), adapted into the portal's theme-aware
// research tokens — NOT the light-only mockup literally:
//   1. THE READ hero leads — an eyebrow, the verdict word set large in its band colour, a big score,
//      the templated one-line thesis, the score spectrum, then the reasoning. NOT RATED / stale is a
//      designed state that replaces the hero, not an empty one.
//   2. Lower half is two columns. Left: REVERSE DCF (what growth the price banks on — implied CAGR
//      vs our cases + delivered, NOT a rupee fair value, which the pipeline does not produce) and
//      MULTIPLES (own history as boxplots). Right: PEG (four-band meters, display-only) and SCORE
//      HISTORY (the reading trend).
//   3. Quality/risk overlay + "what would change the call" sit below, then the footer disclosure.
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Minus,
  Plus,
} from "lucide-react";
import type { ReactNode } from "react";

import { chipBaseClass, chipClass, type ChipTone } from "./chip-tone";
import { MultipleBoxplot } from "./multiple-boxplot";
import { PegMeter, PegMeterLegend, pegBandFor, type PegBandKey } from "./valuation-peg-meter";
import { ValuationScoreHistory } from "./valuation-score-history";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import { ValuationHorizonBar, ValuationHorizonLegend } from "./valuation-horizon-bar";
import { ValuationSpectrumBar } from "./valuation-spectrum-bar";
import type { ValuationScorePoint } from "@/lib/valuation-check/history";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";
import type { ValuationStaleness } from "@/lib/valuation-check/normalize";
import type {
  NormalizedValuationCheck,
  NormalizedValuationLens,
  ValuationPill,
  ValuationVerdict,
} from "@/lib/valuation-check/types";
import { cn } from "@/lib/utils";

const eyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

const PILL_TONE: Record<ValuationPill, ChipTone> = {
  Cheap: "emerald",
  "In-line": "slate",
  Expensive: "amber",
  Stretched: "rose",
};

// Verdict word, Title-cased for the hero (the stored value is SHOUTED all-caps).
const VERDICT_DISPLAY: Record<ValuationVerdict, string> = {
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

const PEG_CHIP_TONE: Record<PegBandKey, ChipTone> = {
  cheap: "emerald",
  fair: "slate",
  rich: "amber",
  expensive: "rose",
};

const formatMultiple = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}x`;

/** Section label in the plate's grammar: an eyebrow with an optional right-aligned sub-label. */
function PlateLabel({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
      <p className={eyebrowClass}>{children}</p>
      {sub ? (
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{sub}</p>
      ) : null}
    </div>
  );
}

/**
 * Deterministic one-line thesis, templated portal-side (the pipeline emits no headline — only the
 * multi-sentence `reasoning`). It combines two grounded reads: what the OWN-HISTORY multiples say
 * (the lens pills) and what the PRICE assumes (the reverse-DCF zone). When they disagree it draws
 * the tension out; otherwise it states the aligned read. Falls back to a verdict-word sentence.
 */
function buildHeadline(v: NormalizedValuationCheck): string | null {
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

  // Only the DCF path carries a zone worth reading against.
  let priceClause: string | null = null;
  if (v.reverseDcfApplicable) {
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

// Best-effort direction for a "what would change the call" item, from grounded keywords. Neutral
// is the safe fallback — this is presentation only, never asserted as an input to the score.
type CallDirection = "cheaper" | "richer" | "new" | "neutral";
function callDirection(item: string): CallDirection {
  if (/forensic|credibilit|publish|disclos|coverage/i.test(item)) return "new";
  const cheaper = /\bcheap|undervalued|de-?rate/i.test(item);
  const richer = /\brich|expensive|stretch|widen|overvalued/i.test(item);
  if (cheaper && !richer) return "cheaper";
  if (richer && !cheaper) return "richer";
  return "neutral";
}

const CALL_MARK: Record<
  CallDirection,
  { Icon: typeof ArrowUpRight; className: string }
> = {
  cheaper: { Icon: ArrowUpRight, className: "text-emerald-600 dark:text-emerald-400" },
  richer: { Icon: ArrowDownRight, className: "text-rose-600 dark:text-rose-400" },
  new: { Icon: Plus, className: "text-violet-600 dark:text-violet-400" },
  neutral: { Icon: Minus, className: "text-muted-foreground" },
};

type Props = {
  valuation: NormalizedValuationCheck;
  staleness: ValuationStaleness;
  /** Published score readings over time. Shown only at >=3 points — a one- or two-dot line reads
   * as broken, not as a trend. */
  scoreHistory?: ValuationScorePoint[];
};

/** REVERSE DCF — what growth the price banks on (implied CAGR vs our cases + delivered). */
function ImpliedGrowth({ valuation }: { valuation: NormalizedValuationCheck }) {
  if (!valuation.reverseDcfApplicable) {
    return (
      <div className={cn(elevatedBlockClass, "px-4 py-3.5")}>
        <PlateLabel sub="not applicable">Reverse DCF</PlateLabel>
        <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
          {valuation.reverseDcfNote ??
            "A cash-flow model is not the right tool for this business type."}
        </p>
      </div>
    );
  }

  const { impliedCagrPct, scenarios } = valuation;
  const hasBar = impliedCagrPct !== null;

  return (
    <div className={cn(elevatedBlockClass, "px-4 py-3.5")}>
      <PlateLabel sub="what growth the price banks on">Reverse DCF</PlateLabel>

      {hasBar ? (
        <div className="mt-3 space-y-2">
          <ValuationHorizonBar
            impliedPct={impliedCagrPct}
            scenarios={scenarios}
            delivered={valuation.deliveredCagr}
          />
          <ValuationHorizonLegend hasDelivered={valuation.deliveredCagr.length > 0} />
        </div>
      ) : null}

      {valuation.plausibilityCheck ? (
        <p className="mt-3 text-[12px] leading-snug text-muted-foreground">
          {valuation.plausibilityCheck}
        </p>
      ) : null}
    </div>
  );
}

function LensRow({ lens }: { lens: NormalizedValuationLens }) {
  const band = lens.band;
  return (
    <div className={cn(nestedDetailClass, "px-3 py-2.5")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-semibold text-foreground">{lens.label}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {lens.role}
          </span>
        </div>
        {lens.pill ? (
          <span className={chipClass(PILL_TONE[lens.pill])}>{lens.pill}</span>
        ) : (
          <span className={cn(chipBaseClass, "border-dashed border-border/60 text-muted-foreground")}>
            no band
          </span>
        )}
      </div>

      {band ? (
        <div className="mt-2">
          <MultipleBoxplot band={band} current={lens.current ?? lens.levelWithoutBand} />
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px]">
          <span className="text-foreground">
            now{" "}
            <span className="font-semibold">
              {formatMultiple(lens.current ?? lens.levelWithoutBand)}
            </span>
          </span>
          <span className="text-muted-foreground">no multiple history available</span>
        </div>
      )}

      {lens.interpretation ? (
        <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
          {lens.interpretation}
        </p>
      ) : null}

      {lens.lowInformationBand ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
          <Info className="mt-[1px] h-3 w-3 shrink-0" />
          This band is unusually wide, so its position carries less information than usual —
          the stock re-rated inside the window.
        </p>
      ) : null}
      {lens.shortHistory ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Under three years of history; the band is the longest available.
        </p>
      ) : null}
    </div>
  );
}

/** MULTIPLES — own-history boxplots, with the P/E industry median as block-level context. */
function MultiplesBlock({ valuation }: { valuation: NormalizedValuationCheck }) {
  if (!valuation.lenses.length) return null;
  return (
    <div className={cn(elevatedBlockClass, "px-4 py-3.5")}>
      <PlateLabel sub="own history vs industry">Multiples</PlateLabel>
      <div className="mt-3 space-y-2">
        {valuation.lenses.map((lens) => (
          <LensRow key={lens.id} lens={lens} />
        ))}
      </div>
      {valuation.peerContext?.medianPe ? (
        <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
          Industry median P/E is {valuation.peerContext.medianPe.toFixed(1)}x across{" "}
          {valuation.peerContext.industryN} companies — shown as context only. It is a
          whole-industry median, not a size-matched peer set, so it does not drive the badges above.
        </p>
      ) : null}
      {valuation.peerContext?.qualityContextNote ? (
        <p className="mt-1.5 text-[12px] leading-snug text-foreground/90">
          {valuation.peerContext.qualityContextNote}
        </p>
      ) : null}
    </div>
  );
}

function Overlay({ valuation }: { valuation: NormalizedValuationCheck }) {
  if (!valuation.overlayRows.length) return null;
  return (
    <div>
      <p className={eyebrowClass}>Quality &amp; risk overlay</p>
      <div className="mt-2 space-y-1.5">
        {valuation.overlayRows.map((row) => {
          const unavailable =
            row.verdict === "not available" || row.verdict === "not yet built";
          return (
            <div
              key={row.source}
              className={cn(
                nestedDetailClass,
                "flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 px-3 py-2 text-[12px]",
              )}
            >
              <span className="font-medium text-foreground">{row.source}</span>
              <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={cn(
                    unavailable ? "text-muted-foreground/70 italic" : "text-foreground",
                  )}
                >
                  {row.verdict}
                </span>
                <span className="text-[11px] text-muted-foreground/80">{row.impact}</span>
              </span>
            </div>
          );
        })}
      </div>
      {valuation.overlayInterpretation ? (
        <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
          {valuation.overlayInterpretation}
        </p>
      ) : null}
    </div>
  );
}

/** One PEG leg — big ratio, band badge, meter, and the derivation caption. */
function PegLeg({
  title,
  ratio,
  caption,
}: {
  title: string;
  ratio: number;
  caption: string;
}) {
  const band = pegBandFor(ratio);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </span>
        <span className={chipClass(PEG_CHIP_TONE[band.key])}>{band.label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cn("text-2xl font-bold leading-none tabular-nums", band.textClass)}>
          {ratio.toFixed(1)}
        </span>
        <span className="text-[11px] leading-snug text-muted-foreground">{caption}</span>
      </div>
      <div className="mt-2">
        <PegMeter ratio={ratio} />
      </div>
    </div>
  );
}

/** PEG — display-only context, never an input to the score. */
function PegBlock({ peg }: { peg: NonNullable<NormalizedValuationCheck["peg"]> }) {
  const pe = formatMultiple(peg.pe);
  return (
    <div className={cn(elevatedBlockClass, "px-4 py-3.5")}>
      <PlateLabel sub="price paid for growth">PEG</PlateLabel>
      <div className="mt-3 space-y-3.5">
        {peg.forward ? (
          <PegLeg
            title="Forward"
            ratio={peg.forward.ratio}
            caption={`P/E ${pe} ÷ ${peg.forward.growthPct.toFixed(0)}% base-case growth`}
          />
        ) : null}
        {peg.trailing ? (
          <PegLeg
            title="Trailing"
            ratio={peg.trailing.ratio}
            caption={`P/E ${pe} ÷ ${peg.trailing.growthPct.toFixed(0)}% delivered 5-yr EPS growth`}
          />
        ) : null}
      </div>
      <div className="mt-3">
        <PegMeterLegend />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Context only — neither feeds the score.
        {peg.forward
          ? " The forward leg divides an earnings multiple by our base-case revenue growth (we don't forecast EPS), so read it as directional."
          : ""}
      </p>
      {peg.trailing?.hasLossYear ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
          <Info className="mt-[1px] h-3 w-3 shrink-0" />
          A loss year sits inside the 5-year window, so the trailing growth rate — and its PEG —
          are unreliable.
        </p>
      ) : null}
    </div>
  );
}

/** SCORE HISTORY — the reading trend, its own panel. Only shown at >=3 points. */
function ScoreHistoryBlock({ points }: { points: ValuationScorePoint[] }) {
  return (
    <div className={cn(elevatedBlockClass, "px-4 py-3.5")}>
      <PlateLabel sub={`${points.length} readings`}>Score history</PlateLabel>
      <div className="mt-3">
        <ValuationScoreHistory points={points} />
      </div>
    </div>
  );
}

/** "What would change the call" — presentation-only directional cues; never an input to the score. */
function WhatWouldChange({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={eyebrowClass}>What would change the call</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => {
          const { Icon, className } = CALL_MARK[callDirection(item)];
          return (
            <li key={item} className="flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground">
              <Icon className={cn("mt-[1px] h-3.5 w-3.5 shrink-0", className)} />
              <span>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ValuationCheckSection({ valuation, staleness, scoreHistory }: Props) {
  const showVerdict = valuation.rateable && Boolean(valuation.verdict) && !staleness.stale;
  const headline = showVerdict ? buildHeadline(valuation) : null;
  // A one- or two-dot line reads as broken, not a trend.
  const showScoreTrend = (scoreHistory?.length ?? 0) >= 3;

  // The verdict word is set in the band colour that matches the score's position on the spectrum.
  const heroBand =
    valuation.score !== null
      ? VALUATION_BANDS[bandForValuationScore(valuation.score / 10)]
      : null;
  const verdictColorClass = heroBand?.textClass ?? "text-foreground";

  const hasLowerLeft = valuation.reverseDcfApplicable || valuation.lenses.length > 0;
  const hasLowerRight = Boolean(valuation.peg) || showScoreTrend;

  return (
    <div className="space-y-4">
      {valuation.lensStatement ? (
        <p className="text-[12px] leading-snug text-muted-foreground">{valuation.lensStatement}</p>
      ) : null}

      {/* 1. THE READ hero — or the designed NOT-RATED / stale state. */}
      {showVerdict ? (
        <div className={cn(elevatedBlockClass, "px-4 py-4 sm:px-5")}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={eyebrowClass}>The read</p>
              <p
                className={cn(
                  "mt-1 text-[2rem] font-bold leading-none tracking-[-0.01em] sm:text-4xl",
                  verdictColorClass,
                )}
              >
                {VERDICT_DISPLAY[valuation.verdict!]}
              </p>
            </div>
            {valuation.score !== null ? (
              <div className="shrink-0 text-right">
                <p className="text-[2rem] font-bold leading-none tabular-nums text-foreground sm:text-4xl">
                  {valuation.score}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  of 100 · higher is cheaper
                </p>
              </div>
            ) : null}
          </div>

          {headline ? (
            <p className="mt-3 text-[15px] font-medium leading-snug text-foreground">{headline}</p>
          ) : null}

          {valuation.score !== null ? (
            <div className="mt-4">
              <ValuationSpectrumBar score={valuation.score} hideHeader />
            </div>
          ) : null}

          {valuation.reasoning ? (
            <p className="mt-4 text-[12px] leading-relaxed text-foreground/85">
              {valuation.reasoning}
            </p>
          ) : null}

          {valuation.capsApplied.length ? (
            <ul className="mt-3 space-y-1">
              {valuation.capsApplied.map((cap) => (
                <li
                  key={cap}
                  className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground"
                >
                  <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" />
                  {cap}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        // Designed state, not an empty one — the reader is told what is missing and why,
        // and still gets whatever lenses / reverse DCF computed below.
        <div className={cn(elevatedBlockClass, "px-4 py-4 sm:px-5")}>
          <p className={eyebrowClass}>The read</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={cn(chipBaseClass, "border-dashed border-border/60 text-muted-foreground")}>
              No verdict
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-[12px] leading-snug text-muted-foreground">
            {(staleness.stale
              ? [staleness.reason ?? "this read is out of date"]
              : [...valuation.unratedReasons, ...valuation.incompleteReasons]
            ).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. Lower half — two columns. Left: reverse DCF + multiples. Right: PEG + score history. */}
      {hasLowerLeft || hasLowerRight ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {hasLowerLeft ? (
            <div className="space-y-4">
              <ImpliedGrowth valuation={valuation} />
              <MultiplesBlock valuation={valuation} />
            </div>
          ) : null}

          {hasLowerRight ? (
            <div className="space-y-4">
              {valuation.peg ? <PegBlock peg={valuation.peg} /> : null}
              {showScoreTrend ? <ScoreHistoryBlock points={scoreHistory!} /> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 3. Quality/risk overlay + what-would-change. */}
      {valuation.overlayRows.length || valuation.whatWouldChangeTheCall.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Overlay valuation={valuation} />
          <WhatWouldChange items={valuation.whatWouldChangeTheCall} />
        </div>
      ) : null}

      {/* 4. Footer: pricing note + derivation disclosure. */}
      {valuation.pricedAsOf || valuation.derivation.length ? (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pt-1">
          {valuation.pricedAsOf ? (
            <p className="max-w-[46ch] text-[11px] text-muted-foreground">
              Priced as of {valuation.pricedAsOf}. Unlike the rest of this page, a valuation read
              goes out of date as the price moves.
            </p>
          ) : (
            <span />
          )}
          {valuation.derivation.length ? (
            <details className="group text-right">
              <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                How this score was built
              </summary>
              <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-left text-[11px] leading-snug text-muted-foreground">
                {valuation.derivation.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
