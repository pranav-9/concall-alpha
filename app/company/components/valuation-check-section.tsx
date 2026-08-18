// L1 SectionCard shell is provided externally by ValuationCheckPanel in
// company-detail-sections.tsx. This component renders the section interior only.
// (Same pattern as MoatAnalysisSection.)
//
// Phase 12 / Business Analysis Framework v14 Section 6.
//
// Two things shape this layout more than anything else:
//
//   1. The reverse DCF leads, not the multiple table. It is the block that says what the
//      *price* is assuming, which is the part a reader cannot get from a screener.
//   2. NOT RATED is a designed state, not an empty state. 34 of 139 covered companies land
//      there — lenders the framework forbids a DCF for, and companies with no multiple
//      history — so the unrated path shows the lenses it does have and explains the gap.
import { AlertTriangle, Info, Minus, TrendingDown, TrendingUp } from "lucide-react";

import { chipBaseClass, chipClass, type ChipTone } from "./chip-tone";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import type { ValuationStaleness } from "@/lib/valuation-check/normalize";
import type {
  NormalizedValuationCheck,
  NormalizedValuationLens,
  ValuationPill,
  ValuationVerdict,
  ValuationZone,
} from "@/lib/valuation-check/types";
import { cn } from "@/lib/utils";

const sectionTitleClass = "text-[13px] font-semibold leading-tight text-foreground";
const sectionSubtitleClass = "text-[12px] leading-snug text-muted-foreground";

const PILL_TONE: Record<ValuationPill, ChipTone> = {
  Cheap: "emerald",
  "In-line": "slate",
  Expensive: "amber",
  Stretched: "rose",
};

// Higher score = cheaper, so the tone runs the same way as the pills.
const VERDICT_TONE: Record<ValuationVerdict, ChipTone> = {
  "DEEPLY UNDERVALUED": "emerald",
  UNDERVALUED: "emerald",
  "FAIRLY VALUED": "slate",
  EXPENSIVE: "amber",
  "RICHLY PRICED": "rose",
};

const ZONE_LABEL: Record<ValuationZone, string> = {
  below_bear: "below the downside case",
  bear_to_base: "between downside and base",
  at_base: "at the base case",
  base_to_bull: "between base and upside",
  above_bull: "above the upside case",
  unknown: "not comparable",
};

const formatMultiple = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}x`;

// One decimal, not zero: the payload carries 5.5% and the narrator prose quotes 5.5%, so an
// integer headline rendered "6%" directly above a paragraph saying "5.5%" — the section
// disagreeing with its own explanation.
const formatPct = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(1)}%`;

type Props = {
  valuation: NormalizedValuationCheck;
  staleness: ValuationStaleness;
};

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

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px]">
        <span className="text-foreground">
          now <span className="font-semibold">{formatMultiple(lens.current ?? lens.levelWithoutBand)}</span>
        </span>
        {band ? (
          <span className="text-muted-foreground">
            own {band.years}-yr {formatMultiple(band.p25)}–{formatMultiple(band.p75)}
            <span className="opacity-70"> (median {formatMultiple(band.median)})</span>
          </span>
        ) : (
          <span className="text-muted-foreground">no multiple history available</span>
        )}
      </div>

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

/** The hero block: what the current price is assuming, against our own growth case. */
function ImpliedGrowth({ valuation }: { valuation: NormalizedValuationCheck }) {
  const { impliedCagrPct, scenarios, zone } = valuation;
  const basePct = scenarios.base === null ? null : scenarios.base * 100;
  const gap = impliedCagrPct !== null && basePct !== null ? impliedCagrPct - basePct : null;
  const Icon = gap === null ? Minus : gap > 0 ? TrendingUp : TrendingDown;

  if (!valuation.reverseDcfApplicable) {
    return (
      <div className={cn(elevatedBlockClass, "px-4 py-3")}>
        <p className={sectionTitleClass}>What the price is assuming</p>
        <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
          {valuation.reverseDcfNote ??
            "A cash-flow model is not the right tool for this business type."}
        </p>
      </div>
    );
  }

  return (
    <div className={cn(elevatedBlockClass, "px-4 py-3")}>
      <p className={sectionTitleClass}>What the price is assuming</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {formatPct(impliedCagrPct)}
        </span>
        <span className="text-[12px] text-muted-foreground">
          growth a year, implied by today&apos;s price
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            gap === null
              ? "text-muted-foreground"
              : gap > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400",
          )}
        />
        <span className="text-muted-foreground">
          our base case is <span className="font-medium text-foreground">{formatPct(basePct)}</span>
          {" — "}
          {ZONE_LABEL[zone]}
        </span>
      </div>
      {valuation.plausibilityCheck ? (
        <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
          {valuation.plausibilityCheck}
        </p>
      ) : null}
    </div>
  );
}

function Overlay({ valuation }: { valuation: NormalizedValuationCheck }) {
  if (!valuation.overlayRows.length) return null;
  return (
    <div>
      <p className={sectionTitleClass}>Quality and risk</p>
      <div className="mt-2 space-y-1.5">
        {valuation.overlayRows.map((row) => {
          const unavailable =
            row.verdict === "not available" || row.verdict === "not yet built";
          return (
            <div
              key={row.source}
              className="flex flex-col gap-0.5 text-[12px] sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2"
            >
              <span className="text-muted-foreground">{row.source}</span>
              <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={cn(
                    "font-medium",
                    unavailable ? "text-muted-foreground/70 italic" : "text-foreground",
                  )}
                >
                  {row.verdict}
                </span>
                <span className="text-muted-foreground/80">{row.impact}</span>
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

/** PEG lenses — display-only context, never an input to the score. */
function PegBlock({ peg }: { peg: NonNullable<NormalizedValuationCheck["peg"]> }) {
  return (
    <div className={cn(nestedDetailClass, "px-3 py-2.5")}>
      <p className="text-[12px] font-semibold text-foreground">
        PEG <span className="font-normal text-muted-foreground">— P/E {formatMultiple(peg.pe)} per unit of growth</span>
      </p>
      <div className="mt-2 space-y-1.5">
        {peg.trailing ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px]">
            <span className="text-muted-foreground">
              Trailing <span className="opacity-70">÷ {peg.trailing.growthPct.toFixed(0)}% delivered 5-yr EPS growth</span>
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {peg.trailing.ratio.toFixed(2)}
            </span>
          </div>
        ) : null}
        {peg.forward ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px]">
            <span className="text-muted-foreground">
              Forward <span className="opacity-70">÷ {peg.forward.growthPct.toFixed(0)}% base-case growth</span>
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {peg.forward.ratio.toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        Context only — neither feeds the score below.
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

export function ValuationCheckSection({ valuation, staleness }: Props) {
  const showVerdict = valuation.rateable && Boolean(valuation.verdict) && !staleness.stale;

  return (
    <div className="space-y-4">
      {valuation.lensStatement ? (
        <p className={sectionSubtitleClass}>{valuation.lensStatement}</p>
      ) : null}

      <ImpliedGrowth valuation={valuation} />

      {valuation.lenses.length ? (
        <div>
          <p className={sectionTitleClass}>Against its own history</p>
          <div className="mt-2 space-y-2">
            {valuation.lenses.map((lens) => (
              <LensRow key={lens.id} lens={lens} />
            ))}
          </div>
          {valuation.peerContext?.medianPe ? (
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              Industry median P/E is {valuation.peerContext.medianPe.toFixed(1)}x across{" "}
              {valuation.peerContext.industryN} companies — shown as context only. It is a
              whole-industry median, not a size-matched peer set, so it does not drive the
              badges above.
            </p>
          ) : null}
          {valuation.peerContext?.qualityContextNote ? (
            <p className="mt-1.5 text-[12px] leading-snug text-foreground/90">
              {valuation.peerContext.qualityContextNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {valuation.peg ? <PegBlock peg={valuation.peg} /> : null}

      <Overlay valuation={valuation} />

      {showVerdict ? (
        <div className={cn(elevatedBlockClass, "px-4 py-3")}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={chipClass(VERDICT_TONE[valuation.verdict!])}>
              {valuation.verdict}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {valuation.score}/100 — higher is cheaper
            </span>
          </div>
          {valuation.reasoning ? (
            <p className="mt-2 text-[12px] leading-snug text-foreground/90">
              {valuation.reasoning}
            </p>
          ) : null}

          {valuation.capsApplied.length ? (
            <ul className="mt-2 space-y-1">
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

          {valuation.whatWouldChangeTheCall.length ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                What would change the call
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px] leading-snug text-muted-foreground">
                {valuation.whatWouldChangeTheCall.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {valuation.derivation.length ? (
            <details className="mt-3 group">
              <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                How this score was built
              </summary>
              <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-[11px] leading-snug text-muted-foreground">
                {valuation.derivation.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
          ) : null}
        </div>
      ) : (
        // Designed state, not an empty one — the reader is told what is missing and why,
        // and still gets whatever lenses did compute above.
        <div className={cn(elevatedBlockClass, "px-4 py-3")}>
          <div className="flex flex-wrap items-center gap-2">
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

      {valuation.pricedAsOf ? (
        <p className="text-[11px] text-muted-foreground">
          Priced as of {valuation.pricedAsOf}. Unlike the rest of this page, a valuation read
          goes out of date as the price moves.
        </p>
      ) : null}
    </div>
  );
}
