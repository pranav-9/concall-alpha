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
        // The before: block is the tap target, not the glyph — a 12px icon is a
        // quarter of the 44px floor, and on a board this is the only route to the
        // column's vocabulary. Padding would work but seven columns of it pushes
        // the table past the shell; an absolutely-positioned pseudo-element costs
        // no layout. Centred rather than left-anchored: grown rightward, the last
        // column's target overhung the table edge and added 17px of scroll to a
        // desktop board that otherwise fits. The sort button 2px to the left
        // carries z-10 so it keeps its own clicks where the two overlap.
        className="relative inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors before:absolute before:-inset-y-4 before:left-1/2 before:w-10 before:-translate-x-1/2 before:content-[''] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:text-foreground"
      >
        <Info className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent className="space-y-1.5 text-[12px] font-normal normal-case leading-relaxed tracking-normal text-muted-foreground">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
          {label}
        </p>
        {children}
      </PopoverContent>
    </Popover>
  );
}
