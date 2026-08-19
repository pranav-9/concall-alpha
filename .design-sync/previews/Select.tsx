import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "concall-alpha";

// A Select renders closed; the trigger is the whole visible surface. The
// portal's only production Select is the sub-sector filter on the sector page
// (app/sector/[slug]/sub-sector-select.tsx) — a pill-shaped h-8 trigger — plus
// the request-type field in the intake form.

const MICRO_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

export const SubSectorFilter = () => (
  <div className="space-y-3">
    <Select defaultValue="API & Intermediates">
      <SelectTrigger className="h-8 w-[15rem] rounded-full border-border/60 bg-background/80 px-3 text-xs">
        <SelectValue placeholder="All sub-sectors" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All sub-sectors (38)</SelectItem>
        <SelectItem value="API & Intermediates">API &amp; Intermediates (12)</SelectItem>
        <SelectItem value="CDMO">CDMO (9)</SelectItem>
        <SelectItem value="Formulations">Formulations (11)</SelectItem>
        <SelectItem value="Speciality Chemicals">Speciality Chemicals (6)</SelectItem>
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">
      The sector page&apos;s sub-sector filter — pill trigger, xs type.
    </p>
  </div>
);

export const Placeholder = () => (
  <div className="w-full max-w-sm space-y-2">
    <Label htmlFor="sel-type" className={MICRO_LABEL}>
      Request Type
    </Label>
    <Select>
      <SelectTrigger id="sel-type" className="w-full">
        <SelectValue placeholder="Select request type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="feedback">Feedback</SelectItem>
        <SelectItem value="stock_addition">Stock Addition</SelectItem>
        <SelectItem value="bug_report">Bug Report</SelectItem>
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">
      Nothing chosen yet — the placeholder takes muted-foreground.
    </p>
  </div>
);

export const Grouped = () => (
  <div className="w-full max-w-sm space-y-2">
    <Label htmlFor="sel-quarter" className={MICRO_LABEL}>
      Compare against
    </Label>
    <Select defaultValue="q4fy26">
      <SelectTrigger id="sel-quarter" className="w-full">
        <SelectValue placeholder="Pick a quarter" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>FY27</SelectLabel>
          <SelectItem value="q1fy27">Q1 FY27 — 8.2</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>FY26</SelectLabel>
          <SelectItem value="q4fy26">Q4 FY26 — 7.6</SelectItem>
          <SelectItem value="q3fy26">Q3 FY26 — 7.1</SelectItem>
          <SelectItem value="q2fy26">Q2 FY26 — 6.4</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">
      Grouped items with labels and a separator inside the content.
    </p>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-col items-start gap-4">
    <div className="space-y-1.5">
      <p className={MICRO_LABEL}>size=&quot;sm&quot;</p>
      <Select defaultValue="neuland">
        <SelectTrigger size="sm" className="w-64">
          <SelectValue placeholder="Pick a company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="neuland">Neuland Laboratories</SelectItem>
          <SelectItem value="mtar">MTAR Technologies</SelectItem>
          <SelectItem value="pricol">Pricol</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1.5">
      <p className={MICRO_LABEL}>size=&quot;default&quot;</p>
      <Select defaultValue="mtar">
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Pick a company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="neuland">Neuland Laboratories</SelectItem>
          <SelectItem value="mtar">MTAR Technologies</SelectItem>
          <SelectItem value="pricol">Pricol</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

export const Disabled = () => (
  <div className="w-full max-w-sm space-y-2">
    <Label htmlFor="sel-off" className={MICRO_LABEL}>
      Sub-sector
    </Label>
    <Select defaultValue="none" disabled>
      <SelectTrigger id="sel-off" className="w-full">
        <SelectValue placeholder="All sub-sectors" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No sub-sector data</SelectItem>
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">
      Disabled while the sector has no sub-sector breakdown.
    </p>
  </div>
);
