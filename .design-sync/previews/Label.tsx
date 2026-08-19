import { Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "concall-alpha";

// Label is the portal's form-field caption. Two treatments exist in the app:
// the plain shadcn default (auth forms) and the uppercase micro-label used by
// components/request-intake-form.tsx, which is the house style for anything
// rendered inside the portal chrome.

const MICRO_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

export const WithInput = () => (
  <div className="w-full max-w-sm space-y-2">
    <Label htmlFor="lbl-email">Email</Label>
    <Input id="lbl-email" type="email" placeholder="you@example.com" />
    <p className="text-xs text-muted-foreground">
      Default weight — used by the sign-in and sign-up forms.
    </p>
  </div>
);

export const MicroLabel = () => (
  <div className="grid w-full max-w-[34rem] grid-cols-2 gap-5">
    <div className="space-y-2">
      <Label htmlFor="ml-target" className={MICRO_LABEL}>
        Stock / Topic / Module
      </Label>
      <Input id="ml-target" defaultValue="HFCL" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="ml-type" className={MICRO_LABEL}>
        Request Type
      </Label>
      <Select defaultValue="stock_addition">
        <SelectTrigger id="ml-type" className="w-full">
          <SelectValue placeholder="Select request type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="feedback">Feedback</SelectItem>
          <SelectItem value="stock_addition">Stock Addition</SelectItem>
          <SelectItem value="bug_report">Bug Report</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

export const WithCheckbox = () => (
  <div className="w-full max-w-md space-y-3">
    <Label htmlFor="lbl-cb-1" className="text-sm font-normal">
      <Checkbox id="lbl-cb-1" defaultChecked />
      Only companies with a Q1 FY27 transcript
    </Label>
    <Label htmlFor="lbl-cb-2" className="text-sm font-normal">
      <Checkbox id="lbl-cb-2" />
      Hide scores older than four days
    </Label>
    <p className="text-xs text-muted-foreground">
      Label is a flex row with gap-2, so a control can sit inside it.
    </p>
  </div>
);

export const DisabledField = () => (
  <div className="w-full max-w-[34rem] space-y-5">
    <div className="grid grid-cols-2 gap-5">
      <div className="space-y-2">
        <Label htmlFor="lbl-on">Q1 FY27 — scored</Label>
        <Input id="lbl-on" defaultValue="8.2" />
      </div>
      <div className="group space-y-2" data-disabled="true">
        <Label htmlFor="lbl-off">Q2 FY27 — no transcript yet</Label>
        <Input id="lbl-off" defaultValue="Not rated" disabled />
      </div>
    </div>
    <p className="text-xs text-muted-foreground">
      A <code>group</code> ancestor carrying <code>data-disabled=&quot;true&quot;</code>{" "}
      drops the label to 50% and kills its pointer events — the field on the
      right, next to a live one.
    </p>
  </div>
);
