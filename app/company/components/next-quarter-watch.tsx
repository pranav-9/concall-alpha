import { Eye } from "lucide-react";

import type { WatchView } from "@/lib/next-quarter-watch/types";
import { nestedDetailClass } from "./surface-tokens";

// Forward read on the Quarter Score page: the open questions heading into next
// quarter (divergence + falling trajectory + swing variables to monitor).
// Derived downstream, attributed, never a numeric prediction. Quiet by design.
export function NextQuarterWatch({
  view,
  trajectoryLabel,
}: {
  view: WatchView;
  trajectoryLabel?: string | null;
}) {
  // Nothing flagged: a single quiet line so the block doesn't silently vanish —
  // and doesn't manufacture false comfort either.
  if (view.items.length === 0) {
    if (!trajectoryLabel) return null;
    return (
      <div className={`${nestedDetailClass} px-4 py-3`}>
        <p className="text-[11px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What to watch next quarter
          </span>{" "}
          — nothing flagged; trajectory {trajectoryLabel.toLowerCase()}, outlook in line.
        </p>
      </div>
    );
  }

  return (
    <div className={`${nestedDetailClass} space-y-2.5 px-4 py-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
          What to watch next quarter
        </span>
        {view.lean === "cautious" && (
          <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/20 dark:text-amber-300">
            setup leans cautious
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {view.items.map((item, i) => (
          <li key={`${item.kind}-${i}`} className="flex gap-2 text-[12px] leading-snug">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                item.tone === "caution" ? "bg-amber-500" : "bg-muted-foreground/50"
              }`}
            />
            <span>
              <span className="font-semibold text-foreground">{item.heading}</span>
              {item.detail ? <span className="text-muted-foreground"> — {item.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
