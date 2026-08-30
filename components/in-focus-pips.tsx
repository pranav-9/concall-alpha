// The "In Focus" meter on theme cards (/themes, /desk, homepage teaser). Reads how
// much a theme is drawing attention right now — earnings momentum, re-rating,
// community buzz — as a 1-5 pip row. It is a METER, not a rating badge: neutral
// currentColor pips only (never gold/red/green), so it never reads as a buy signal
// (external-claims guardrails). Editorial value, hand-set per results season; a null
// value renders nothing at all (no empty widget). Colour is inherited via
// `bg-current`, so each surface sets its own text colour on the wrapper.

import { clampHotness, formatInFocusUpdated } from "@/lib/in-focus";
import { cn } from "@/lib/utils";

export function InFocusPips({
  value,
  updatedAt,
  className,
}: {
  value: number | null | undefined;
  /** ISO timestamp of when the score was last set; dates the tooltip. */
  updatedAt?: string | null;
  className?: string;
}) {
  const v = clampHotness(value);
  if (v == null) return null;

  const when = formatInFocusUpdated(updatedAt);
  const tip =
    `In focus: ${v}/5 — how much this theme is drawing attention now ` +
    `(earnings momentum, re-rating, community buzz).` +
    (when ? ` Updated ${when}.` : "") +
    ` Not investment advice.`;

  return (
    <span title={tip} className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] opacity-60">In focus</span>
      <span
        role="img"
        aria-label={`In focus: ${v} of 5`}
        className="inline-flex items-center gap-[3px]"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            aria-hidden
            className={cn("h-1.5 w-1.5 rounded-full bg-current", i <= v ? "opacity-100" : "opacity-25")}
          />
        ))}
      </span>
    </span>
  );
}
