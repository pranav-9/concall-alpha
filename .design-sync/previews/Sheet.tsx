import {
  Button,
  Separator,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "concall-alpha";
import { Menu, SlidersHorizontal } from "lucide-react";

// Sheet is the shell-level overlay: navigation and filters that belong to the
// page frame rather than to one section. (Evidence that belongs to a section
// uses Drawer instead — see the Drawer card.) Sidebar's mobile branch renders a
// left Sheet, which is the pattern MobileNav below reproduces.
//
// Authored OPEN. Closed, a Sheet screenshots as a bare trigger button.
//
// SheetContent renders its own close button absolutely at top-right, over the
// header — so keep SheetTitle/SheetDescription short enough to wrap before they
// reach it, or the copy disappears under the X.

const NAV = [
  ["Desk", "Today's exchange filings and fresh scores"],
  ["Leaderboards", "Overall, quarter, growth and moat boards"],
  ["Sectors", "Covered mid- and small-cap sectors"],
  ["Journal", "Build notes and company write-ups"],
  ["Watchlists", "Your saved companies"],
];

export const MobileNav = () => (
  <Sheet open>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Open navigation">
        <Menu />
      </Button>
    </SheetTrigger>
    <SheetContent side="left">
      <SheetHeader>
        <SheetTitle>Story of a Stock</SheetTitle>
        <SheetDescription>
          100 handpicked mid- and small-caps.
        </SheetDescription>
      </SheetHeader>
      <Separator />
      <nav className="flex flex-col gap-1 px-4">
        {NAV.map(([label, hint]) => (
          <a
            key={label}
            href="#"
            className="rounded-md px-2 py-2 hover:bg-accent"
          >
            <span className="block text-sm font-medium text-foreground">
              {label}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {hint}
            </span>
          </a>
        ))}
      </nav>
    </SheetContent>
  </Sheet>
);

export const BoardFilters = () => (
  <Sheet open>
    <SheetTrigger asChild>
      <Button variant="outline" size="sm">
        <SlidersHorizontal /> Filters
      </Button>
    </SheetTrigger>
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle>Filter the Overall board</SheetTitle>
        <SheetDescription>
          Ranking still uses the recency-weighted 4Q blend; filters only narrow
          which rows are shown.
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-5 px-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Sector
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Pharma & API", "Auto ancillary", "Capital goods", "NBFC"].map(
              (sector) => (
                <span
                  key={sector}
                  className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground"
                >
                  {sector}
                </span>
              ),
            )}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Score band
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Strongly bullish", "Bullish", "Neutral"].map((band) => (
              <span
                key={band}
                className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground"
              >
                {band}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Latest quarter
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Q1 FY27 · 74 of 100 companies scored
          </p>
        </div>
      </div>
      <SheetFooter>
        <Button>Apply filters</Button>
        <SheetClose asChild>
          <Button variant="outline">Reset</Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);

export const AnnouncementDetail = () => (
  <Sheet open>
    <SheetTrigger asChild>
      <Button variant="ghost" size="sm">
        HFCL · Order win
      </Button>
    </SheetTrigger>
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle>HFCL — order win</SheetTitle>
        <SheetDescription>
          BSE filing, 19 Aug 2026 · classified from the announcement text
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          The company disclosed an advance purchase order for optical fibre
          cable from a domestic telecom operator, to be executed over the next
          four quarters.
        </p>
        <dl className="divide-y divide-border text-sm">
          {[
            ["Category", "Order win"],
            ["Impact", "Positive"],
            ["Severity", "Routine"],
            ["Source", "BSE corporate announcement"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Classification is machine-generated from the filing text and is not a
          view on the company.
        </p>
      </div>
      <SheetFooter>
        <Button variant="outline">Open the filing</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
