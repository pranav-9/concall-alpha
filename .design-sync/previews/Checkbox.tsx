import { Checkbox, Label, Separator } from "concall-alpha";

// Checkbox is a 16px control, so it only reads as a component in a real row:
// a filter line with its label, or a stacked filter panel. Never preview it
// alone on an empty page.

export const FilterRow = () => (
  <div className="flex w-full max-w-lg items-center gap-3 rounded-lg border bg-card px-4 py-3">
    <Checkbox id="cb-canonical" defaultChecked />
    <Label htmlFor="cb-canonical" className="text-sm font-normal">
      Only companies with a Q1 FY27 transcript
    </Label>
    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
      64 of 100
    </span>
  </div>
);

export const States = () => (
  <div className="w-full max-w-md space-y-4">
    {[
      { id: "cb-off", checked: false, disabled: false, text: "Unchecked — include below-cut names" },
      { id: "cb-on", checked: true, disabled: false, text: "Checked — discovery-listed only" },
      { id: "cb-off-dis", checked: false, disabled: true, text: "Disabled — sector filter (no sector data)" },
      { id: "cb-on-dis", checked: true, disabled: true, text: "Disabled checked — locked to mid/small cap" },
    ].map((row) => (
      <div key={row.id} className="flex items-center gap-3">
        <Checkbox id={row.id} defaultChecked={row.checked} disabled={row.disabled} />
        <Label htmlFor={row.id} className="text-sm font-normal">
          {row.text}
        </Label>
      </div>
    ))}
  </div>
);

export const FilterPanel = () => (
  <div className="w-full max-w-sm rounded-xl border bg-card p-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      Sector
    </p>
    <Separator className="my-3" />
    <div className="space-y-3">
      {[
        { id: "sec-pharma", label: "Pharma & CDMO", count: 18, checked: true },
        { id: "sec-auto", label: "Auto Ancillaries", count: 14, checked: true },
        { id: "sec-capgoods", label: "Capital Goods", count: 11, checked: false },
        { id: "sec-telecom", label: "Telecom Equipment", count: 6, checked: false },
        { id: "sec-nbfc", label: "NBFC", count: 9, checked: false },
      ].map((row) => (
        <div key={row.id} className="flex items-center gap-3">
          <Checkbox id={row.id} defaultChecked={row.checked} />
          <Label htmlFor={row.id} className="text-sm font-normal">
            {row.label}
          </Label>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {row.count}
          </span>
        </div>
      ))}
    </div>
  </div>
);
