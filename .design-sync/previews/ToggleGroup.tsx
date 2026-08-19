import { ToggleGroup, ToggleGroupItem } from "concall-alpha";

// ToggleGroup is the company page's in-section switcher. Three live call sites:
// the Table/Graph view toggle in historical-economics-data-pack.tsx, the
// quarterly/annual granularity switch in segment-history-panel.tsx, and the
// guidance-family pill tabs in guidance-history-section.tsx.

export const ViewToggle = () => (
  <div className="space-y-3">
    <ToggleGroup type="single" defaultValue="table" variant="outline" size="sm" className="w-fit">
      <ToggleGroupItem value="table" aria-label="Show table view">
        Table
      </ToggleGroupItem>
      <ToggleGroupItem value="graph" aria-label="Show graph view">
        Graph
      </ToggleGroupItem>
    </ToggleGroup>
    <p className="text-xs text-muted-foreground">
      Historical Economics — the reader flips the same ten-year series between
      a table and a chart.
    </p>
  </div>
);

export const Granularity = () => (
  <div className="w-full max-w-lg rounded-xl border bg-card p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Segment revenue — MTAR Technologies</p>
        <p className="text-xs text-muted-foreground">₹ crore · year-end (derived)</p>
      </div>
      <ToggleGroup
        type="single"
        size="sm"
        defaultValue="quarterly"
        aria-label="Segment table granularity"
      >
        <ToggleGroupItem value="quarterly" className="text-[10px] px-2 py-0.5">
          Quarterly
        </ToggleGroupItem>
        <ToggleGroupItem value="annual" className="text-[10px] px-2 py-0.5">
          Annual
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  </div>
);

export const FamilyTabs = () => (
  <div className="w-full max-w-2xl space-y-3">
    <ToggleGroup
      type="single"
      defaultValue="growth"
      variant="outline"
      size="sm"
      aria-label="Filter guidance threads by family"
      className="w-fit max-w-full flex-wrap gap-2 shadow-none data-[variant=outline]:shadow-none"
    >
      {[
        { id: "growth", label: "Growth", count: 7 },
        { id: "margins", label: "Margins", count: 4 },
        { id: "capex", label: "Capex", count: 3 },
        { id: "others", label: "Others", count: 2 },
      ].map((tab) => (
        <ToggleGroupItem
          key={tab.id}
          value={tab.id}
          aria-label={`Show ${tab.label} guidance`}
          className="!flex-none w-auto min-w-fit rounded-full border px-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap data-[variant=outline]:border data-[variant=outline]:first:border-l data-[variant=outline]:border-l data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:[&_span]:text-background/70"
        >
          {tab.label}
          <span className="ml-1.5 text-muted-foreground">{tab.count}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
    <p className="text-xs text-muted-foreground">
      Guidance History — pill tabs carrying the thread count per family.
    </p>
  </div>
);

const BANDS = ["Bullish", "Neutral", "Bearish", "Not rated"];

export const MultipleSelection = () => (
  <div className="w-full max-w-lg space-y-5">
    {(
      [
        { on: [] as string[], caption: "Nothing selected — every band shows" },
        {
          on: ["bullish", "neutral"],
          caption: "Bullish + Neutral held down — data-[state=on] takes bg-accent",
        },
      ]
    ).map((row, i) => (
      <div key={i} className="space-y-1.5">
        <ToggleGroup
          type="multiple"
          defaultValue={row.on}
          variant="outline"
          size="sm"
          aria-label="Filter the board by read band"
          className="w-fit"
        >
          {BANDS.map((band) => (
            <ToggleGroupItem key={band} value={band.toLowerCase().replace(" ", "")}>
              {band}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-xs text-muted-foreground">{row.caption}</p>
      </div>
    ))}
  </div>
);
