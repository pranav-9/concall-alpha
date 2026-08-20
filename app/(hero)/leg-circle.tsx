// A filled score circle for the homepage equation + compare-sectors table.
//
// Mirrors the look of components/concall-score.tsx (rounded-full, ring-[3px],
// band fill, white/ink number) but is BAND-AGNOSTIC: the caller passes the band
// object, so it can colour the valuation and read legs correctly. The shared
// ConcallScore only knows the quarterly/growth schemes, so it can't do this.
//
// The band class literals (bg-teal-700, ring-*, text-white, …) live in lib/*-band.ts,
// which tailwind.config scans, so nothing here is purged.

type Size = "sm" | "md" | "lg";

/** The subset of a *-band def this needs. score-band / growth-band /
 *  valuation-band all satisfy it identically. */
export type LegBand = {
  barClass: string;
  ringClass: string;
  textOnBarClass: string;
  /** Human band label — feeds the aria description. */
  label: string;
};

const sizeMap: Record<Size, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
};

export function LegCircle({
  value,
  band,
  size = "md",
  legLabel,
  className = "",
}: {
  value: number;
  band: LegBand;
  size?: Size;
  /** e.g. "ConcallScore" — prefixes the aria label so the circle reads in context. */
  legLabel?: string;
  className?: string;
}) {
  const shown = value.toFixed(1);
  const aria = `${legLabel ? `${legLabel} ` : ""}${shown} — ${band.label}`;

  return (
    <span
      role="img"
      aria-label={aria}
      title={band.label}
      className={[
        "grid aspect-square place-items-center rounded-full font-extrabold shadow-sm ring-[3px]",
        sizeMap[size],
        band.barClass,
        band.ringClass,
        band.textOnBarClass,
        className,
      ].join(" ")}
    >
      {shown}
    </span>
  );
}

export default LegCircle;
