// The hero's anchor: an ILLUSTRATIVE read equation — Concall + Growth +
// Valuation = THE READ — laid out per the approved mockup. The numbers are a
// fixed example, deliberately NOT tied to any live company, so the hero reads as
// "here's how the four lenses combine", not a standing call on a real name. The
// live, per-company version of this lives on each company page and the compare
// table below.
//
// Each leg is a score circle with its label under it, joined by + and =, and the
// read sits in its own card with a plain-language verdict badge. Circle colours
// still come from the real band ramp so the example stays truthful to the system.
//
// Motion: the legs fade in left→right, then the READ card settles. CSS-only
// (eq-leg / eq-read in globals.css) with a prefers-reduced-motion guard.

import { BANDS, bandForScore } from "@/lib/score-band";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";

import { LegCircle } from "./leg-circle";

// Example figures (match the mockup). Not live data — see the header comment.
const EXAMPLE = {
  concall: 8.2,
  growth: 8.7,
  valuation: 7.4,
  read: 8.1,
  verdict: "Quality at a fair price",
} as const;

export default function ReadEquation() {
  const { concall: q, growth: g, valuation: v, read: r } = EXAMPLE;

  const legs = [
    { key: "concall", label: "Concall", value: q, band: BANDS[bandForScore(q)] },
    { key: "growth", label: "Growth", value: g, band: GROWTH_BANDS[bandForGrowthScore(g)] },
    { key: "valuation", label: "Valuation", value: v, band: VALUATION_BANDS[bandForValuationScore(v)] },
  ] as const;

  const readBand = BANDS[bandForScore(r)];

  const ariaLabel =
    `Example read: Concall ${q} plus Growth ${g} plus Valuation ${v} ` +
    `resolve to a read of ${EXAMPLE.verdict}, ${r} out of 10.`;

  const Operator = ({ symbol }: { symbol: string }) => (
    <span aria-hidden className="house-data select-none text-2xl font-light text-[var(--ink-soft)]">
      {symbol}
    </span>
  );

  // One leg: circle on top, label beneath — the mockup's arrangement.
  const Leg = ({ leg, i }: { leg: (typeof legs)[number]; i: number }) => (
    <div
      className="eq-leg flex flex-col items-center gap-2"
      style={{ ["--eq-delay" as string]: `${60 + i * 110}ms` }}
    >
      <LegCircle value={leg.value} band={leg.band} size="lg" legLabel={leg.label} />
      <span className="house-data house-micro text-[var(--ink-soft)]">{leg.label}</span>
    </div>
  );

  const ReadCard = () => (
    <div className="eq-read flex flex-col items-center gap-2 rounded-2xl border border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4">
      <span className="house-data house-micro text-[var(--ink-soft)]">The read</span>
      <LegCircle value={r} band={readBand} size="lg" legLabel="The read" />
      <span className="house-data hero-verdict-badge text-[0.7rem]">{EXAMPLE.verdict}</span>
    </div>
  );

  return (
    <figure aria-label={ariaLabel} className="flex flex-col items-center">
      {/* Desktop / tablet: the equation on one line, centered. */}
      <div className="hidden flex-wrap items-center justify-center gap-x-5 gap-y-4 sm:flex">
        <Leg leg={legs[0]} i={0} />
        <Operator symbol="+" />
        <Leg leg={legs[1]} i={1} />
        <Operator symbol="+" />
        <Leg leg={legs[2]} i={2} />
        <Operator symbol="=" />
        <ReadCard />
      </div>

      {/* Mobile: the horizontal line doesn't fit 375px — stack the legs, then a
       * ↓, then the full read card. */}
      <div className="flex w-full flex-col items-stretch gap-2 sm:hidden">
        {legs.map((leg, i) => (
          <div
            key={leg.key}
            className="eq-leg flex items-center justify-between rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] px-3 py-2"
            style={{ ["--eq-delay" as string]: `${60 + i * 100}ms` }}
          >
            <span className="house-data house-micro text-[var(--ink-soft)]">{leg.label}</span>
            <LegCircle value={leg.value} band={leg.band} size="sm" legLabel={leg.label} />
          </div>
        ))}
        <div aria-hidden className="text-center leading-none text-[var(--ink-soft)]">
          ↓
        </div>
        <ReadCard />
      </div>
    </figure>
  );
}
