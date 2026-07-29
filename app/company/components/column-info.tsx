"use client";

// Per-column explainer for dense boards. A table header can't carry the meaning
// of six independent vocabularies (Band, Trend, Forward, Moat tier, Valuation,
// Read), and title= tooltips don't exist on touch — so each column gets one
// tap/click target that opens its definition. Popover, not Tooltip: the panel
// portals out, so the table's overflow-x-auto container can't clip it.
//
// Copy discipline: every line here restates vocabulary that already exists in
// code (lib/score-trajectory, lib/growth-band, lib/portfolio-stance,
// schemas/valuation_check_v1.json). Don't add a claim the pipeline doesn't make.

import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ColumnInfo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`What ${label} means`}
        className="inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:text-foreground"
      >
        {/* No padding: seven columns' worth of icon padding is enough to push
            the table past the 1440px page shell and force horizontal scroll. */}
        <Info className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent className="space-y-1.5 text-[12px] font-normal normal-case leading-relaxed tracking-normal text-muted-foreground">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
          {label}
        </p>
        {children}
      </PopoverContent>
    </Popover>
  );
}
