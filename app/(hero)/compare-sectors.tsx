// "Compare across sectors" — a mini leaderboard of the top featured reads, each
// row showing the four scores (Concall / Growth / Valuation / Read) that make up
// the equation above. The top row is the same company the equation features, so
// the hero stays internally consistent.
//
// Every row is one tap target linking to the company page (HomepageModuleLink
// for click analytics). Live data — the same FeaturedRead substrate as the
// equation and the leaderboard's Read column.

import { HomepageModuleLink } from "@/components/homepage-module-link";
import { BANDS, bandForScore } from "@/lib/score-band";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";
import type { FeaturedRead } from "@/lib/home-featured-read";

import { LegCircle } from "./leg-circle";

const HEADS = ["C", "G", "V", "Read"] as const;

export default function CompareSectors({ reads }: { reads: FeaturedRead[] }) {
  if (reads.length === 0) return null;

  return (
    <section aria-labelledby="compare-heading">
      <div className="flex items-baseline justify-between gap-2">
        <p id="compare-heading" className="house-data house-micro text-[var(--ink-soft)]">
          Compare across sectors
        </p>
        <span aria-hidden className="house-data house-micro text-[var(--ink-soft)]">
          Tap a row ↓
        </span>
      </div>

      <div className="mt-3 rounded-2xl border border-[var(--rule)] bg-[var(--paper-2)] px-4">
        {/* Column head — the letters sit over the score cluster via matched cell widths. */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] py-2">
          <span className="house-data house-micro text-[var(--ink-soft)]">Company</span>
          <span className="flex items-center gap-2">
            {HEADS.map((h) => (
              <span
                key={h}
                className="house-data house-micro w-9 text-center text-[var(--ink-soft)]"
              >
                {h}
              </span>
            ))}
          </span>
        </div>

        {reads.map((read) => {
          const circles = [
            { key: "c", value: read.concallScore, band: BANDS[bandForScore(read.concallScore)], label: "Concall" },
            { key: "g", value: read.growthScore, band: GROWTH_BANDS[bandForGrowthScore(read.growthScore)], label: "Growth" },
            { key: "v", value: read.valuationScore, band: VALUATION_BANDS[bandForValuationScore(read.valuationScore)], label: "Valuation" },
            { key: "r", value: read.readScore, band: BANDS[bandForScore(read.readScore)], label: "The read" },
          ] as const;

          return (
            <HomepageModuleLink
              key={read.code}
              module="compare-sectors"
              companyCode={read.code}
              href={`/company/${read.code}`}
              title={read.name}
              className="flex items-center justify-between gap-3 border-b border-[var(--rule)] py-2.5 transition-colors last:border-b-0 hover:bg-[color-mix(in_srgb,var(--signal)_7%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--signal)_7%,transparent)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[var(--ink)]">
                  {read.name}
                </span>
                {read.sector && (
                  <span className="block truncate house-data house-micro text-[var(--ink-soft)]">
                    {read.sector}
                  </span>
                )}
              </span>

              <span className="flex items-center gap-2">
                {circles.map((c) => (
                  <span key={c.key} className="flex w-9 justify-center">
                    <LegCircle value={c.value} band={c.band} size="sm" legLabel={c.label} />
                  </span>
                ))}
              </span>
            </HomepageModuleLink>
          );
        })}
      </div>
    </section>
  );
}
