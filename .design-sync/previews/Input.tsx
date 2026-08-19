import { Input, Label } from "concall-alpha";
import { Search } from "lucide-react";

// The portal uses Input in exactly two places: the request-intake form
// (components/request-intake-form.tsx) and the hero company search
// (app/(hero)/searchButton.tsx). Both pair it with the uppercase micro-label
// treatment below, so the field is never a bare box on the page.

const MICRO_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

export const FormField = () => (
  <div className="w-full max-w-md space-y-2">
    <Label htmlFor="subject-target" className={MICRO_LABEL}>
      Stock / Topic / Module
    </Label>
    <Input
      id="subject-target"
      defaultValue="Neuland Laboratories"
      placeholder="Which company should we cover next?"
      maxLength={120}
    />
    <p className="text-xs text-muted-foreground">
      Mid and small caps only — we check the AMFI band before onboarding.
    </p>
  </div>
);

export const SearchField = () => (
  <div className="w-full max-w-md space-y-3">
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search for a company"
        defaultValue="MTAR"
        className="pl-9"
        aria-label="Search for a company"
      />
    </div>
    <p className="text-xs text-muted-foreground">
      Search is deliberately unfiltered — below-cut companies stay findable.
    </p>
  </div>
);

export const Types = () => (
  <div className="grid w-full max-w-[34rem] grid-cols-2 gap-x-5 gap-y-4">
    <div className="space-y-2">
      <Label htmlFor="in-email" className={MICRO_LABEL}>
        Email
      </Label>
      <Input id="in-email" type="email" placeholder="you@example.com" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="in-password" className={MICRO_LABEL}>
        Password
      </Label>
      <Input id="in-password" type="password" defaultValue="concallscore" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="in-score" className={MICRO_LABEL}>
        Minimum read
      </Label>
      <Input
        id="in-score"
        type="number"
        step="0.1"
        min="0"
        max="10"
        defaultValue="6.5"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="in-date" className={MICRO_LABEL}>
        Call date
      </Label>
      <Input id="in-date" type="date" defaultValue="2026-07-24" />
    </div>
  </div>
);

export const States = () => (
  <div className="w-full max-w-md space-y-4">
    <div className="space-y-2">
      <Label htmlFor="st-empty" className={MICRO_LABEL}>
        Empty
      </Label>
      <Input id="st-empty" placeholder="e.g. Fedbank Financial Services" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="st-filled" className={MICRO_LABEL}>
        Filled
      </Label>
      <Input id="st-filled" defaultValue="Pricol" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="st-invalid" className={MICRO_LABEL}>
        Rejected — error message
      </Label>
      <Input id="st-invalid" defaultValue="Reliance Industries" aria-invalid />
      <p className="text-xs text-rose-500">
        Large cap — outside the mid/small-cap coverage band.
      </p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="st-disabled" className={MICRO_LABEL}>
        Disabled
      </Label>
      <Input id="st-disabled" defaultValue="Q1 FY27" disabled />
    </div>
  </div>
);
