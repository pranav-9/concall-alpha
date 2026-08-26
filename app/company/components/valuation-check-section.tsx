// L1 SectionCard shell is provided externally by ValuationCheckPanel in
// company-detail-sections.tsx. This component renders the section interior only.
// (Same pattern as MoatAnalysisSection.)
//
// Phase 12 / Business Analysis Framework v14 Section 6.
//
// Layout (redesign 2026-08-26), adapted into the portal's theme-aware research tokens:
//   1. THE READ hero — verdict word in its band colour, a radial score dial, the templated
//      one-line thesis, the score spectrum, then the reasoning. Beside it (when >=3 readings
//      exist) the SCORE HISTORY line. NOT RATED / stale is a designed state that replaces the
//      hero, not an empty one.
//   2. WHAT THE PRICE IS ASSUMING — full width: the reverse-DCF implied CAGR (or, for financials,
//      the reverse residual-income implied RoE) as a big figure with a zone chip, placed on the
//      horizon axis against our cases + delivered.
//   3. RATIO EVALUATION — a 2x2 grid: the own-history multiples (P/E + cross-check) as coloured
//      band bars, and both PEG legs (display-only) as four-band meters.
//   4. The footer disclosure (priced-as-of + how-the-score-was-built).
import { AlertTriangle, Info, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { chipBaseClass, chipClass, chipToneClasses, type ChipTone } from "./chip-tone";
import { buildValuationHeadline, VERDICT_DISPLAY } from "@/lib/valuation-check/headline";
import { MultipleBandBar } from "./multiple-band-bar";
import { PegMeter, pegBandFor, type PegBandKey } from "./valuation-peg-meter";
import { ValuationScoreDial } from "./valuation-score-dial";
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
  ValuationZone,
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

// Tailwind fill class for a lens's "now" marker, matching its pill tone.
const PILL_NOW_FILL: Record<ValuationPill, string> = {
  Cheap: "fill-teal-500",
  "In-line": "fill-foreground/70",
  Expensive: "fill-amber-500",
  Stretched: "fill-rose-500",
};

// Where the current multiple sits against its own band, worded to agree with the pill (so the
// short descriptor never contradicts the chip beside it).
const PILL_BAND_POSITION: Record<ValuationPill, string> = {
  Cheap: "below band",
  "In-line": "in band",
  Expensive: "past band",
  Stretched: "past band",
};

const PEG_CHIP_TONE: Record<PegBandKey, ChipTone> = {
  cheap: "emerald",
  fair: "slate",
  rich: "amber",
  expensive: "rose",
};

// The reverse-DCF zone → a compact chip for the "what the price is assuming" header. Grounded in
// the stored zone only; direction drives the arrow. `null` when the zone is unknown.
type ZoneChip = { label: string; tone: ChipTone; dir: "up" | "down" | "flat" };
const ZONE_CHIP: Record<ValuationZone, ZoneChip | null> = {
  above_bull: { label: "above our upside", tone: "rose", dir: "up" },
  base_to_bull: { label: "paying above base", tone: "amber", dir: "up" },
  at_base: { label: "at our base case", tone: "slate", dir: "flat" },
  bear_to_base: { label: "below our base case", tone: "emerald", dir: "down" },
  below_bear: { label: "below our downside", tone: "emerald", dir: "down" },
  unknown: null,
};
const ZONE_RANGE: Record<ValuationZone, string | null> = {
  above_bull: "above our upside case",
  base_to_bull: "between our base and upside cases",
  at_base: "around our base case",
  bear_to_base: "between our downside and base cases",
  below_bear: "below our downside case",
  unknown: null,
};
// Residual-income (financials) reads the zone as return-on-equity, not growth.
const ZONE_CHIP_ROE: Record<ValuationZone, ZoneChip | null> = {
  above_bull: { label: "above what it earns", tone: "rose", dir: "up" },
  base_to_bull: { label: "above what it earns", tone: "amber", dir: "up" },
  at_base: { label: "near what it earns", tone: "slate", dir: "flat" },
  bear_to_base: { label: "below what it earns", tone: "emerald", dir: "down" },
  below_bear: { label: "well below what it earns", tone: "emerald", dir: "down" },
  unknown: null,
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

function ZoneChipBadge({ chip }: { chip: ZoneChip }) {
  const Icon = chip.dir === "up" ? TrendingUp : chip.dir === "down" ? TrendingDown : Minus;
  return (
    <span className={cn(chipBaseClass, chipToneClasses[chip.tone], "gap-1")}>
      <Icon className="h-3 w-3" />
      {chip.label}
    </span>
  );
}

type Props = {
  valuation: NormalizedValuationCheck;
  staleness: ValuationStaleness;
  /** Published score readings over time. Shown only at >=3 points — a one- or two-dot line reads
   * as broken, not as a trend. */
  scoreHistory?: ValuationScorePoint[];
};

/**
 * THE READ hero — verdict word in band colour, the radial score dial, thesis, spectrum, reasoning.
 */
function TheRead({ valuation }: { valuation: NormalizedValuationCheck }) {
  const headline = buildValuationHeadline(valuation);
  const heroBand =
    valuation.score !== null
      ? VALUATION_BANDS[bandForValuationScore(valuation.score / 10)]
      : null;
  const verdictColorClass = heroBand?.textClass ?? "text-foreground";

  return (
    <div className={cn(elevatedBlockClass, "flex h-full flex-col px-4 py-4 sm:px-5")}>
      <PlateLabel sub="valuation score">The read</PlateLabel>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[1.9rem] font-bold leading-[1.05] tracking-[-0.01em] sm:text-[2.15rem]",
              verdictColorClass,
            )}
          >
            {VERDICT_DISPLAY[valuation.verdict!]}.
          </p>
        </div>
        {valuation.score !== null ? <ValuationScoreDial score={valuation.score} /> : null}
      </div>

      {valuation.reasoning ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-foreground/85">
          {valuation.reasoning}
        </p>
      ) : headline ? (
        <p className="mt-3 text-[13px] font-medium leading-snug text-foreground">{headline}</p>
      ) : null}

      {valuation.score !== null ? (
        <div className="mt-auto pt-4">
          <ValuationSpectrumBar score={valuation.score} hideHeader />
        </div>
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
  );
}

/** SCORE HISTORY — the reading trend, beside THE READ. Only rendered at >=3 points. */
function ScoreHistoryCard({ points }: { points: ValuationScorePoint[] }) {
  return (
    <div className={cn(elevatedBlockClass, "flex h-full flex-col px-4 py-4 sm:px-5")}>
      <PlateLabel sub={`${points.length} readings`}>Valuation score · history</PlateLabel>
      <div className="flex flex-1 items-center pt-3">
        <div className="w-full">
          <ValuationScoreHistory points={points} />
        </div>
      </div>
    </div>
  );
}

/**
 * WHAT THE PRICE IS ASSUMING — the §9.4 pricing block, full width. For most companies this is the
 * reverse DCF (implied growth CAGR vs our cases + delivered). For financials it is the reverse
 * residual-income model (Phase E): the implied SUSTAINABLE RETURN ON EQUITY the price bakes in.
 */
function PriceAssumes({ valuation }: { valuation: NormalizedValuationCheck }) {
  const ri = valuation.isResidualIncome;

  if (!valuation.reverseDcfApplicable) {
    return (
      <div className={cn(elevatedBlockClass, "px-4 py-3.5 sm:px-5")}>
        <PlateLabel sub="not applicable">What the price is assuming</PlateLabel>
        <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
          {valuation.reverseDcfNote ??
            "A cash-flow model is not the right tool for this business type."}
        </p>
      </div>
    );
  }

  if (ri) {
    const impliedRoe = valuation.impliedRoePct;
    const deliveredRoe = valuation.deliveredRoePct;
    const chip = ZONE_CHIP_ROE[valuation.zone];
    const deliveredMarker =
      deliveredRoe !== null
        ? [{ key: "roe", label: `Delivered RoE ${deliveredRoe.toFixed(1)}%`, pct: deliveredRoe }]
        : [];
    return (
      <div className={cn(elevatedBlockClass, "px-4 py-3.5 sm:px-5")}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <PlateLabel>What the price is assuming</PlateLabel>
          {chip ? <ZoneChipBadge chip={chip} /> : null}
        </div>
        {impliedRoe !== null ? (
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-3xl font-bold leading-none tabular-nums text-orange-600 dark:text-orange-400">
              {impliedRoe.toFixed(1)}%
            </span>
            <span className="text-[12px] leading-snug text-muted-foreground">
              sustainable return on equity, implied by today&rsquo;s price
            </span>
          </div>
        ) : null}
        {impliedRoe !== null ? (
          <div className="mt-3 space-y-2">
            <ValuationHorizonBar
              impliedPct={impliedRoe}
              scenarios={{ downside: null, base: null, upside: null }}
              delivered={deliveredMarker}
              metric="roe"
            />
            <ValuationHorizonLegend hasDelivered={deliveredMarker.length > 0} metric="roe" />
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

  const { impliedCagrPct, scenarios } = valuation;
  const chip = ZONE_CHIP[valuation.zone];
  const range = ZONE_RANGE[valuation.zone];

  return (
    <div className={cn(elevatedBlockClass, "px-4 py-3.5 sm:px-5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PlateLabel>What the price is assuming</PlateLabel>
        {chip ? <ZoneChipBadge chip={chip} /> : null}
      </div>

      {impliedCagrPct !== null ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="text-3xl font-bold leading-none tabular-nums text-orange-600 dark:text-orange-400">
            {impliedCagrPct.toFixed(1)}%
          </span>
          <span className="text-[12px] leading-snug text-muted-foreground">
            revenue growth a year, implied by today&rsquo;s price
            {range ? ` — ${range}` : ""}
          </span>
        </div>
      ) : null}

      {impliedCagrPct !== null ? (
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

/** One multiple as a ratio-evaluation card: level, pill, coloured band bar, interpretation. */
function MultipleCard({
  lens,
  peer,
}: {
  lens: NormalizedValuationLens;
  peer: { value: number; label: string } | null;
}) {
  const band = lens.band;
  const descriptors: string[] = ["now"];
  if (lens.pill) descriptors.push(PILL_BAND_POSITION[lens.pill]);
  if (peer && lens.current !== null) {
    descriptors.push(lens.current < peer.value ? "below peers" : "above peers");
  }

  return (
    <div className={cn(nestedDetailClass, "px-3.5 py-3")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[12.5px] font-semibold text-foreground">{lens.label}</span>
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
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

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className="text-2xl font-bold leading-none tabular-nums text-foreground">
          {formatMultiple(lens.current ?? lens.levelWithoutBand)}
        </span>
        <span className="text-[11px] text-muted-foreground">{descriptors.join(" · ")}</span>
      </div>

      {band ? (
        <div className="mt-2.5">
          <MultipleBandBar
            band={band}
            current={lens.current ?? lens.levelWithoutBand}
            peer={peer}
            nowFillClass={lens.pill ? PILL_NOW_FILL[lens.pill] : "fill-foreground/70"}
            gradientId={`mbb-${lens.id}`}
          />
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] text-muted-foreground">no multiple history available</p>
      )}

      {lens.interpretation ? (
        <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">
          {lens.interpretation}
        </p>
      ) : null}

      {lens.lowInformationBand ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
          <Info className="mt-[1px] h-3 w-3 shrink-0" />
          Band widened during a re-rating, so it carries less information than usual.
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

// Templated, band-derived interpretation for each PEG leg (display-only — never asserts a score).
const PEG_FORWARD_READ: Record<PegBandKey, string> = {
  cheap: "Cheap: priced for less growth than we model.",
  fair: "Fair: roughly priced for the growth we model.",
  rich: "Rich: paying up for growth still ahead.",
  expensive: "Expensive: the price demands more growth than we model.",
};
const PEG_TRAILING_READ: Record<PegBandKey, string> = {
  cheap: "Cheap: delivered growth more than covers today's multiple.",
  fair: "Fair: past growth roughly justifies today's multiple.",
  rich: "Rich: today's multiple runs ahead of delivered growth.",
  expensive: "Expensive: well ahead of what earnings have delivered.",
};

/** One PEG leg as a ratio-evaluation card. */
function PegCard({
  title,
  ratio,
  caption,
  leg,
  hasLossYear,
}: {
  title: string;
  ratio: number;
  caption: string;
  leg: "forward" | "trailing";
  hasLossYear?: boolean;
}) {
  const band = pegBandFor(ratio);
  const lead =
    leg === "forward"
      ? "An earnings multiple over base-case revenue growth (we don't forecast EPS) — directional only."
      : "The same multiple over delivered 5-yr EPS growth.";
  const read = leg === "forward" ? PEG_FORWARD_READ[band.key] : PEG_TRAILING_READ[band.key];
  return (
    <div className={cn(nestedDetailClass, "px-3.5 py-3")}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[12.5px] font-semibold text-foreground">PEG</span>
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{title}</span>
        </div>
        <span className={chipClass(PEG_CHIP_TONE[band.key])}>{band.label}</span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className={cn("text-2xl font-bold leading-none tabular-nums", band.textClass)}>
          {ratio.toFixed(2)}
        </span>
        <span className="text-[11px] leading-snug text-muted-foreground">{caption}</span>
      </div>

      <div className="mt-2.5">
        <PegMeter ratio={ratio} />
      </div>

      <p className="mt-2 text-[11.5px] leading-snug text-muted-foreground">
        {lead} {read}
      </p>

      {hasLossYear ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-amber-700 dark:text-amber-300">
          <Info className="mt-[1px] h-3 w-3 shrink-0" />
          A loss year sits inside the 5-year window, so this growth rate — and its PEG — are unreliable.
        </p>
      ) : null}
    </div>
  );
}

/** RATIO EVALUATION — the multiples and PEG legs as an equal-weight 2x2 grid. */
function RatioEvaluation({ valuation }: { valuation: NormalizedValuationCheck }) {
  const medianPe = valuation.peerContext?.medianPe ?? null;
  const peg = valuation.peg;
  const pe = peg ? formatMultiple(peg.pe) : null;

  const cards: ReactNode[] = [];
  for (const lens of valuation.lenses) {
    const peer =
      lens.id === "pe" && medianPe !== null ? { value: medianPe, label: "peers" } : null;
    cards.push(<MultipleCard key={`lens-${lens.id}`} lens={lens} peer={peer} />);
  }
  if (peg?.forward) {
    cards.push(
      <PegCard
        key="peg-forward"
        title="Forward"
        leg="forward"
        ratio={peg.forward.ratio}
        caption={`P/E ${pe} ÷ ${peg.forward.growthPct.toFixed(0)}% base-case growth`}
      />,
    );
  }
  if (peg?.trailing) {
    cards.push(
      <PegCard
        key="peg-trailing"
        title="Trailing"
        leg="trailing"
        ratio={peg.trailing.ratio}
        caption={`P/E ${pe} ÷ ${peg.trailing.growthPct.toFixed(0)}% delivered 5-yr EPS growth`}
        hasLossYear={peg.trailing.hasLossYear}
      />,
    );
  }

  if (!cards.length) return null;

  return (
    <div className={cn(elevatedBlockClass, "px-4 py-3.5 sm:px-5")}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className={eyebrowClass}>Ratio evaluation</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground/70" />
            now
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-[2px] border border-foreground/25 bg-foreground/[0.06]" />
            own 5-yr band
          </span>
          {medianPe !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              industry median
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">{cards}</div>

      {medianPe !== null ? (
        <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
          Industry median P/E is {medianPe.toFixed(1)}x
          {valuation.peerContext?.industryN
            ? ` across ${valuation.peerContext.industryN} companies`
            : ""}{" "}
          — a whole-industry median, not a size-matched peer set, so it is context only and does not
          drive the badges above.
        </p>
      ) : null}
      {valuation.peerContext?.qualityContextNote ? (
        <p className="mt-1.5 text-[12px] leading-snug text-foreground/90">
          {valuation.peerContext.qualityContextNote}
        </p>
      ) : null}
      {peg ? (
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          PEG is context only — it doesn&rsquo;t feed the score, and the forward leg uses base-case
          revenue growth (we don&rsquo;t forecast EPS). Bands: cheap &lt;1.0 · fair 1.0–1.5 · rich
          1.5–2.0 · expensive &gt;2.0.
        </p>
      ) : null}
    </div>
  );
}

export function ValuationCheckSection({ valuation, staleness, scoreHistory }: Props) {
  const showVerdict = valuation.rateable && Boolean(valuation.verdict) && !staleness.stale;
  // A one- or two-dot line reads as broken, not a trend.
  const showScoreTrend = (scoreHistory?.length ?? 0) >= 3;

  const hasRatioBlock =
    valuation.lenses.length > 0 || Boolean(valuation.peg);

  return (
    <div className="space-y-4">
      {valuation.lensStatement ? (
        <p className="text-[12px] leading-snug text-muted-foreground">{valuation.lensStatement}</p>
      ) : null}

      {/* 1. THE READ hero (+ score history when we have a trend) — or the designed NOT-RATED / stale state. */}
      {showVerdict ? (
        showScoreTrend ? (
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <TheRead valuation={valuation} />
            <ScoreHistoryCard points={scoreHistory!} />
          </div>
        ) : (
          <TheRead valuation={valuation} />
        )
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

      {/* 2. WHAT THE PRICE IS ASSUMING — full width. */}
      {valuation.reverseDcfApplicable ? <PriceAssumes valuation={valuation} /> : null}

      {/* 3. RATIO EVALUATION — multiples + PEG in a 2x2 grid. */}
      {hasRatioBlock ? <RatioEvaluation valuation={valuation} /> : null}

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
