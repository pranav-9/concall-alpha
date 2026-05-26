import React from "react";
import { Badge } from "@/components/ui/badge"; // adjust path if needed
import { BANDS, bandForScore } from "@/lib/score-band";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";

type Size = "sm" | "md" | "lg";
type Kind = "quarterly" | "growth";

// Score → colour derives from one of two band schemes: lib/score-band (Quarterly /
// sentiment, default) or lib/growth-band (forward growth outlook). One colour per
// band so the circle, charts and bars all agree.

/** Hex colour for charts — one colour per band, consistent with the score circle. */
export const chartColorFor = (score: number): string =>
  BANDS[bandForScore(score)].chartHex;

/** Badge styling for the score circle — band fill + ring + on-fill text colour. */
export const categoryFor = (score: number, kind: Kind = "quarterly") => {
  const b =
    kind === "growth" ? GROWTH_BANDS[bandForGrowthScore(score)] : BANDS[bandForScore(score)];
  return { label: b.label, bg: b.barClass, ring: b.ringClass, textClass: b.textOnBarClass };
};

interface ConcallScoreProps {
  score: number | string;
  size?: Size; // "sm" | "md" | "lg"
  showLabel?: boolean; // show text label next to the badge
  className?: string;
  kind?: Kind; // which band scheme to use; defaults to "quarterly"
}

const sizeMap: Record<Size, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
};

const ConcallScore: React.FC<ConcallScoreProps> = ({
  score,
  size = "md",
  showLabel = false,
  className = "",
  kind = "quarterly",
}) => {
  const n = Number(score) || 0;
  const cat = categoryFor(n, kind);

  return (
    <div className="inline-flex items-center gap-2">
      <Badge
        aria-label={`Score ${n.toFixed(1)} — ${cat.label}`}
        title={cat.label}
        className={[
          "rounded-full aspect-square grid place-items-center font-extrabold",
          "shadow-sm ring-[3px]",
          sizeMap[size],
          cat.bg,
          cat.ring,
          cat.textClass,
          className,
        ].join(" ")}
      >
        {n.toFixed(1)}
      </Badge>
      {showLabel && (
        <span className="text-sm text-muted-foreground">{cat.label}</span>
      )}
    </div>
  );
};

export default ConcallScore;

// Optional skeleton for loading states
export const ConcallScoreSkeleton = () => (
  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
);
