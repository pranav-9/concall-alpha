// The homepage hero exhibit: one covered company's three lenses (ConcallScore,
// Growth, Valuation) drawn as an overlapping Venn that resolves, at the centre,
// into the same composite verdict the leaderboard ranks by.
//
// Design decisions (CEO + design reviewed):
//   - Verdict-first hierarchy: the centre pill is the dominant element; the eye
//     lands on the answer, then discovers it's built from three lenses.
//   - Lens colour = each leg's OWN band colour (score/growth/valuation bands),
//     so the figure reuses the leaderboard's colour language. The verdict pill
//     is NEUTRAL (ink on paper, --rule border) — no green-on-green clash.
//   - Lenses carry text labels, never colour alone (colour-blind safe).
//   - A lie-factor caption states the real weights, since equal circles imply
//     equal weight and the composite is 0.88 quality / 0.12 price.
//   - Mobile (< sm): the Venn is dropped for a stacked "lens chips -> verdict
//     card" translation — three overlapping circles never shrink legibly.
//   - A proof sparkline of the company's own trail redeems the hero's copy
//     ("we analyse the earnings trajectory") and shows the data is real.

import { HomepageModuleLink } from "@/components/homepage-module-link";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import { BANDS, bandForScore } from "@/lib/score-band";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";

import type { FeaturedRead } from "@/lib/home-featured-read";

export default function VerdictVenn({ featured }: { featured: FeaturedRead }) {
  const { quarterScore: q, growthScore: g, valuationScore: v } = featured;
  const qBand = BANDS[bandForScore(q)];
  const gBand = GROWTH_BANDS[bandForGrowthScore(g)];
  const vBand = VALUATION_BANDS[bandForValuationScore(v)];

  const ariaLabel =
    `${featured.name}: ConcallScore ${q.toFixed(1)}, Growth ${g.toFixed(1)}, ` +
    `Valuation ${vBand.label}. The three lenses resolve to a read of ` +
    `${featured.readLabel}, ${featured.readScore.toFixed(1)} out of 10.`;

  // Proof sparkline geometry: the featured company's own scored-quarter trail.
  const pts = featured.trail.points;
  const scores = pts.map((p) => p.score);
  const lo = scores.length ? Math.min(...scores) : 0;
  const hi = scores.length ? Math.max(...scores) : 1;
  const span = hi - lo || 1;
  const spark = pts
    .map((p, i) => {
      const x = pts.length <= 1 ? 100 : (i / (pts.length - 1)) * 200;
      const y = 22 - ((p.score - lo) / span) * 18;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lenses = [
    { label: "ConcallScore", value: q.toFixed(1), band: qBand },
    { label: "Growth", value: g.toFixed(1), band: gBand },
    { label: "Valuation", value: vBand.label, band: vBand },
  ] as const;

  return (
    <figure className="flex h-full flex-col justify-center gap-3">
      <figcaption className="flex items-baseline justify-between gap-2 house-data house-micro text-[var(--ink-soft)]">
        <HomepageModuleLink
          module="verdictvenn"
          companyCode={featured.code}
          href={`/company/${featured.code}`}
          className="min-w-0 truncate text-[var(--ink)] underline-offset-4 hover:underline"
          title={featured.name}
        >
          {featured.code}
          {featured.sector ? ` · ${featured.sector}` : ""}
        </HomepageModuleLink>
        <span className="whitespace-nowrap">latest read</span>
      </figcaption>

      {/* Desktop / tablet: the Venn. Capped width so it doesn't balloon to the
       * full 1fr cell (which pushed the exhibit past the viewport). Each circle
       * takes its own band colour via currentColor; the pill stays neutral. */}
      <div className="mx-auto hidden w-full max-w-[24rem] sm:block">
        <svg viewBox="0 0 440 300" role="img" aria-label={ariaLabel} className="h-auto w-full">
          <g className={`${qBand.textClass} venn-lens`} style={{ ["--venn-delay" as string]: "80ms" }}>
            <circle cx="220" cy="104" r="82" stroke="currentColor" strokeWidth="1.25" fill="currentColor" fillOpacity="0.11" />
          </g>
          <g className={`${gBand.textClass} venn-lens`} style={{ ["--venn-delay" as string]: "220ms" }}>
            <circle cx="164" cy="196" r="82" stroke="currentColor" strokeWidth="1.25" fill="currentColor" fillOpacity="0.11" />
          </g>
          <g className={`${vBand.textClass} venn-lens`} style={{ ["--venn-delay" as string]: "360ms" }}>
            <circle cx="276" cy="196" r="82" stroke="currentColor" strokeWidth="1.25" fill="currentColor" fillOpacity="0.11" />
          </g>

          <g textAnchor="middle" className="house-data">
            <text x="220" y="44" fontSize="11" letterSpacing="0.06em" fill="var(--ink-soft)">CONCALLSCORE</text>
            <text x="220" y="65" fontSize="17" fontWeight="700" fill="var(--ink)">{q.toFixed(1)}</text>
            <text x="92" y="234" fontSize="11" letterSpacing="0.06em" fill="var(--ink-soft)">GROWTH</text>
            <text x="92" y="255" fontSize="17" fontWeight="700" fill="var(--ink)">{g.toFixed(1)}</text>
            <text x="348" y="234" fontSize="11" letterSpacing="0.06em" fill="var(--ink-soft)">VALUATION</text>
            <text x="348" y="255" fontSize="14" fontWeight="700" fill="var(--ink)">{vBand.label}</text>
          </g>

          {/* Neutral verdict pill — the dominant, verdict-first element. It
           * settles in last, after the three lenses, so the entrance reads as
           * "three lenses resolving into a read". */}
          <g className="venn-verdict">
            <rect x="128" y="146" width="184" height="58" rx="11" fill="var(--paper-2)" stroke="var(--rule)" strokeWidth="1.5" />
            <text x="220" y="171" textAnchor="middle" className="house-display" fontSize="16.5" fontWeight="800" fill="var(--ink)">
              {featured.readLabel}
            </text>
            <text x="220" y="191" textAnchor="middle" className="house-data" fontSize="11" fill="var(--ink-soft)">
              THE READ · {featured.readScore.toFixed(1)}
            </text>
          </g>
        </svg>
      </div>

      {/* Mobile: stacked lens chips resolving into the verdict card. */}
      <div className="space-y-2 sm:hidden">
        {lenses.map((lens) => (
          <div
            key={lens.label}
            className="flex items-center justify-between rounded border border-[var(--rule)] px-3 py-2"
          >
            <span className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`inline-block h-2.5 w-2.5 rounded-sm ${lens.band.textClass}`}
                style={{ backgroundColor: "currentColor" }}
              />
              {lens.label}
            </span>
            <span className={`house-data text-sm font-bold ${lens.band.textClass}`}>{lens.value}</span>
          </div>
        ))}
        <div aria-hidden className="text-center leading-none text-[var(--ink-soft)]">
          ↓
        </div>
        <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] px-3 py-3 text-center">
          <div className="house-display text-base font-extrabold text-[var(--ink)]">{featured.readLabel}</div>
          <div className="house-data house-micro mt-0.5 text-[var(--ink-soft)]">
            THE READ · {featured.readScore.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Legend — colour + label, so the lenses read without relying on colour. */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 house-data house-micro text-[var(--ink-soft)]">
        {lenses.map((lens) => (
          <span key={lens.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`inline-block h-2 w-2 rounded-sm ${lens.band.textClass}`}
              style={{ backgroundColor: "currentColor" }}
            />
            {lens.label}
          </span>
        ))}
      </div>

      {/* Graphical-integrity caption: the circles are equal, the read is not. */}
      <p className="text-center house-data house-micro text-[var(--ink-soft)]">
        Circles sized equal for clarity — the read weights quality 0.88 / price 0.12.
      </p>

      {/* Proof: the featured company's own scored-quarter trail. */}
      <div className="flex items-center gap-2 border-t border-[var(--rule)] pt-2">
        <span className="house-data house-micro whitespace-nowrap text-[var(--ink-soft)]">
          {pts.length}-qtr trail
        </span>
        <svg viewBox="0 0 200 24" preserveAspectRatio="none" className="h-6 flex-1" aria-hidden>
          <polyline points={spark} fill="none" stroke="var(--signal)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="house-data house-micro whitespace-nowrap text-[var(--ink)]">
          {featured.trail.latest.toFixed(1)}
        </span>
      </div>
    </figure>
  );
}
