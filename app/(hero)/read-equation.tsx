// The hero's anchor: one featured company's three lenses read out loud as an
// equation — Concall + Growth + Valuation = THE READ — resolving into the same
// composite verdict the leaderboard ranks by. Laid out per the approved mockup:
// each leg is a score circle with its label UNDER it, joined by + and =, and the
// read sits in its own card with a plain-language verdict badge.
//
// Every number is live (FeaturedRead, the same substrate as the compare table
// and the leaderboard Read column) and the subject links to a real company page.
//
// Motion: the legs fade in left→right, then the READ card settles. CSS-only
// (eq-leg / eq-read in globals.css) with a prefers-reduced-motion guard, so this
// stays a server component — no client JS.

import { HomepageModuleLink } from "@/components/homepage-module-link";
import { BANDS, bandForScore } from "@/lib/score-band";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";
import type { FeaturedRead } from "@/lib/home-featured-read";

import { LegCircle } from "./leg-circle";

export default function ReadEquation({ featured }: { featured: FeaturedRead }) {
  const { concallScore: q, growthScore: g, valuationScore: v, readScore: r } = featured;

  const legs = [
    { key: "concall", label: "Concall", value: q, band: BANDS[bandForScore(q)] },
    { key: "growth", label: "Growth", value: g, band: GROWTH_BANDS[bandForGrowthScore(g)] },
    { key: "valuation", label: "Valuation", value: v, band: VALUATION_BANDS[bandForValuationScore(v)] },
  ] as const;

  const readBand = BANDS[bandForScore(r)];

  const ariaLabel =
    `${featured.name}: Concall ${q.toFixed(1)} plus Growth ${g.toFixed(1)} plus ` +
    `Valuation ${v.toFixed(1)} resolve to a read of ${featured.readLabel}, ` +
    `${r.toFixed(1)} out of 10.`;

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
      <span className="house-data hero-verdict-badge text-[0.7rem]">{featured.readLabel}</span>
    </div>
  );

  return (
    <figure aria-label={ariaLabel} className="flex flex-col items-center gap-3">
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

      {/* The subject — real, and reachable. */}
      <HomepageModuleLink
        module="read-equation"
        companyCode={featured.code}
        href={`/company/${featured.code}`}
        className="house-data house-micro text-[var(--ink-soft)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
        title={featured.name}
      >
        {featured.code}
        {featured.sector ? ` · ${featured.sector}` : ""} · latest read
      </HomepageModuleLink>
    </figure>
  );
}
