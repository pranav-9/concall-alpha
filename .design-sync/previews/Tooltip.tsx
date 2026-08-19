import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "concall-alpha";
import { ListChecks } from "lucide-react";

// Tooltip is the short-label affordance: a column header's one-line definition,
// or the name of an icon-only action (the real one lives in
// app/company/components/future-growth-section.tsx, where the catalyst-tracker
// icon button carries "Open tracker"). Anything longer than a sentence belongs
// in a Popover — see ColumnInfo.
//
// TooltipProvider is mandatory: it owns the shared open/delay state. The
// wrapper is authored explicitly here even though Tooltip self-wraps, because
// a real page mounts ONE provider high up and many tooltips beneath it.
// Every story is authored open — a closed Tooltip screenshots as bare text.

export const ColumnHeaderTooltip = () => (
  <TooltipProvider>
    <div className="flex min-h-32 items-end justify-start pt-16">
      <Tooltip open>
        <TooltipTrigger className="border-b border-dashed border-border text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Latest 4Q blend
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Recency-weighted mean of the last four ConcallScores — the latest
          quarter counts double.
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);

export const IconActionTooltip = () => (
  <TooltipProvider>
    <div className="flex min-h-32 items-end justify-start pt-16">
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label="Open tracker">
            <ListChecks />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Open tracker
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);

export const ProvenanceTooltip = () => (
  <TooltipProvider>
    <div className="flex min-h-32 items-end justify-start pt-16">
      <Tooltip open>
        <TooltipTrigger className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          Unofficial
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} className="max-w-64">
          Scored from a third-party transcript inside the SEBI five-working-day
          window. Re-scored when Fedbank Financial publishes its own.
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);
