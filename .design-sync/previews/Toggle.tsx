import { Toggle } from "concall-alpha";
import { Eye, EyeOff, LineChart, Percent, Table2 } from "lucide-react";

// Toggle is the single on/off sibling of ToggleGroup. On the company page it
// belongs on a chart toolbar — one setting the reader flips while looking at
// the same series (YoY overlay, log axis, hide below-cut rows).

export const ChartToolbar = () => (
  <div className="w-full max-w-lg rounded-xl border bg-card p-4">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium">Revenue by segment — 12 quarters</p>
      <div className="flex items-center gap-1">
        <Toggle variant="outline" size="sm" defaultPressed aria-label="Show year-on-year overlay">
          <Percent />
          YoY
        </Toggle>
        <Toggle variant="outline" size="sm" aria-label="Show as table">
          <Table2 />
          Table
        </Toggle>
      </div>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">
      Pricol — Q2 FY24 through Q1 FY27, consolidated.
    </p>
  </div>
);

export const Variants = () => (
  <div className="flex flex-col gap-5">
    <div className="flex items-center gap-3">
      <span className="w-20 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        default
      </span>
      <Toggle defaultPressed>Quarterly</Toggle>
      <Toggle>Annual</Toggle>
    </div>
    <div className="flex items-center gap-3">
      <span className="w-20 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        outline
      </span>
      <Toggle variant="outline" defaultPressed>
        Quarterly
      </Toggle>
      <Toggle variant="outline">Annual</Toggle>
    </div>
  </div>
);

export const Sizes = () => (
  <div className="flex items-center gap-3">
    <Toggle variant="outline" size="sm" defaultPressed>
      <LineChart />
      Small
    </Toggle>
    <Toggle variant="outline" size="default" defaultPressed>
      <LineChart />
      Default
    </Toggle>
    <Toggle variant="outline" size="lg" defaultPressed>
      <LineChart />
      Large
    </Toggle>
  </div>
);

export const States = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <Toggle variant="outline">
        <EyeOff />
        Off — below-cut rows hidden
      </Toggle>
    </div>
    <div className="flex items-center gap-3">
      <Toggle variant="outline" defaultPressed>
        <Eye />
        On — below-cut rows shown
      </Toggle>
    </div>
    <div className="flex items-center gap-3">
      <Toggle variant="outline" disabled>
        <Eye />
        Disabled — no scored quarter
      </Toggle>
    </div>
  </div>
);
