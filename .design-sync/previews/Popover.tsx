import { Popover, PopoverContent, PopoverTrigger } from "concall-alpha";
import { Info } from "lucide-react";

// The portal's canonical Popover is ColumnInfo
// (app/company/components/column-info.tsx): a 12px Info glyph in a dense table
// header that opens the column's definition. Popover, not Tooltip, because the
// panel portals out of the table's overflow-x-auto container — and because a
// title= tooltip does not exist on touch.
//
// Every story is authored OPEN; closed, a Popover screenshots as a bare glyph.

const TRIGGER_CLASS =
  "relative inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground data-[state=open]:text-foreground";

const LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground";

export const ColumnExplainer = () => (
  <div className="flex min-h-64 items-start justify-start">
    <Popover open>
      <PopoverTrigger aria-label="What Read means" className={TRIGGER_CLASS}>
        <Info className="h-3 w-3" />
      </PopoverTrigger>
      <PopoverContent className="text-[12px] font-normal leading-relaxed text-muted-foreground">
        <p className={LABEL_CLASS}>Read</p>
        <p className="mt-2">
          The composite: 88% quarter leg, 12% growth leg. The quarter leg is a
          recency-weighted mean of the last four ConcallScores — the latest
          quarter counts double.
        </p>
        <p className="mt-2">
          It is not a target price and not a recommendation. Ranks are computed
          inside the covered universe only.
        </p>
      </PopoverContent>
    </Popover>
  </div>
);

export const WhyThisScore = () => (
  <div className="flex min-h-64 items-start justify-start">
    <Popover open>
      <PopoverTrigger
        aria-label="Why this score"
        className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        Why 8.2?
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="text-[12px] leading-relaxed text-muted-foreground"
      >
        <p className={LABEL_CLASS}>Neuland Laboratories · Q1 FY27</p>
        <dl className="mt-3 space-y-1.5">
          <div className="flex items-baseline justify-between gap-4">
            <dt>Demand commentary</dt>
            <dd className="font-medium tabular-nums text-foreground">8.5</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt>Margin trajectory</dt>
            <dd className="font-medium tabular-nums text-foreground">8.0</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt>Capex and balance sheet</dt>
            <dd className="font-medium tabular-nums text-foreground">7.5</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt>Management candour</dt>
            <dd className="font-medium tabular-nums text-foreground">8.5</dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-border/60 pt-2">
          Weighted sum, then capped by the worst downside lean. Scored from the
          transcript; the deck is used only for figures management stated.
        </p>
      </PopoverContent>
    </Popover>
  </div>
);

export const PeerContextNote = () => (
  <div className="flex min-h-64 items-start justify-start">
    <Popover open>
      <PopoverTrigger
        aria-label="Peer ROCE context"
        className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      >
        ROCE 14.2% · below peers
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="text-[12px] leading-relaxed text-muted-foreground"
      >
        <p className={LABEL_CLASS}>Peer context</p>
        <p className="mt-2">
          Pricol earns 14.2% ROCE against a covered auto-ancillary median of
          19.8%. The valuation read discloses the gap rather than adjusting the
          multiple for it.
        </p>
        <p className="mt-2 text-foreground">
          Compared against 11 covered peers priced in the same refresh window.
        </p>
      </PopoverContent>
    </Popover>
  </div>
);
