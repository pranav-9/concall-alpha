// The hero's anchor: one featured company's three lenses read out loud as an
// equation — Concall + Growth + Valuation = THE READ — resolving into the same
// composite verdict the leaderboard ranks by.
//
// Every number is live (FeaturedRead, the same substrate as the compare table
// and the leaderboard Read column) and the subject links to a real company page.
//
// Motion: the legs fade in left→right, then the READ cell settles — the
// "three lenses resolving into a read" moment. CSS-only (eq-leg / eq-read in
// globals.css), with a prefers-reduced-motion guard that renders the finished
// figure. So this stays a server component — no client JS.

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
    <span aria-hidden className="house-data select-none text-xl text-[var(--ink-soft)] sm:text-2xl">
      {symbol}
    </span>
  );

  const ReadCell = () => (
    <div className="eq-read flex flex-col items-center gap-1.5 rounded border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-3">
      <span className="house-data house-micro text-[var(--ink-soft)]">The read</span>
      <LegCircle value={r} band={readBand} size="lg" legLabel="The read" />
      <span className="house-display text-sm font-extrabold leading-tight text-[var(--ink)]">
        {featured.readLabel}
      </span>
    </div>
  );

  return (
    <figure aria-label={ariaLabel} className="flex flex-col gap-3">
      {/* Desktop / tablet: the equation on one line. */}
      <div className="hidden flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:flex">
        {legs.map((leg, i) => (
          <div key={leg.key} className="flex items-center gap-x-4">
            {i > 0 && <Operator symbol="+" />}
            <div
              className="eq-leg flex flex-col items-center gap-1.5"
              style={{ ["--eq-delay" as string]: `${60 + i * 110}ms` }}
            >
              <span className="house-data house-micro text-[var(--ink-soft)]">{leg.label}</span>
              <LegCircle value={leg.value} band={leg.band} size="lg" legLabel={leg.label} />
            </div>
          </div>
        ))}
        <Operator symbol="=" />
        <ReadCell />
      </div>

      {/* Mobile: the horizontal line doesn't fit 375px — stack the legs, then a
       * ↓, then the full read cell (mirrors the Venn's mobile translation). */}
      <div className="flex flex-col items-stretch gap-2 sm:hidden">
        {legs.map((leg, i) => (
          <div
            key={leg.key}
            className="eq-leg flex items-center justify-between rounded border border-[var(--rule)] px-3 py-2"
            style={{ ["--eq-delay" as string]: `${80 + i * 120}ms` }}
          >
            <span className="house-data house-micro text-[var(--ink-soft)]">{leg.label}</span>
            <LegCircle value={leg.value} band={leg.band} size="sm" legLabel={leg.label} />
          </div>
        ))}
        <div aria-hidden className="text-center leading-none text-[var(--ink-soft)]">
          ↓
        </div>
        <ReadCell />
      </div>

      {/* The subject — real, and reachable. */}
      <figcaption className="text-center">
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
      </figcaption>
    </figure>
  );
}
