import {
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "concall-alpha";

// Drawer is the company page's "second layer": evidence a reader can ask for
// without losing their place in the section. Real call sites all use
// direction="right" with a max-w-xl panel — Key Variables discovery, the growth
// catalyst tracker, the guidance trail. Reserve the bottom direction for short
// mobile-first forms (section feedback).
//
// Authored OPEN so the panel is visible statically; the trigger stays in the
// tree because it is the affordance a reader actually sees on the page.

export const KeyVariablesDiscovery = () => (
  <Drawer open direction="right">
    <DrawerTrigger asChild>
      <Button variant="outline" size="sm">
        Selection context
      </Button>
    </DrawerTrigger>
    <DrawerContent className="w-full max-w-xl">
      <DrawerHeader className="border-b border-border">
        <DrawerTitle>Key Variables Discovery</DrawerTitle>
        <DrawerDescription>
          Broader variable selection context behind the deep-treatment
          shortlist.
        </DrawerDescription>
      </DrawerHeader>

      <div className="space-y-4 overflow-y-auto p-4">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Discovery summary
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Management named eleven variables across the Q1 FY27 call and the
            deck. Four carry a quantified target and a stated timeline, so they
            get deep treatment; the rest are logged and tracked for a
            quantification that has not arrived yet.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Full variable list
          </p>
          <ul className="divide-y divide-border text-sm">
            {[
              ["CDMO order book conversion", "Deep treatment"],
              ["Unit III capacity utilisation", "Deep treatment"],
              ["Peptide capex commissioning", "Deep treatment"],
              ["GDS price realisation", "Deep treatment"],
              ["USFDA inspection outcome", "Tracked, unquantified"],
              ["Rupee cost of imported KSM", "Tracked, unquantified"],
              ["Working-capital days", "Tracked, unquantified"],
            ].map(([variable, treatment]) => (
              <li
                key={variable}
                className="flex items-baseline justify-between gap-4 py-2"
              >
                <span className="text-foreground">{variable}</span>
                <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {treatment}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <DrawerFooter className="border-t border-border">
        <DrawerClose asChild>
          <Button variant="outline">Close</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
);

export const CatalystTracker = () => (
  <Drawer open direction="right">
    <DrawerTrigger asChild>
      <Button variant="outline" size="sm">
        Open tracker
      </Button>
    </DrawerTrigger>
    <DrawerContent className="w-full max-w-xl">
      <DrawerHeader className="border-b border-border">
        <DrawerTitle>Catalyst tracker</DrawerTitle>
        <DrawerDescription>
          MTAR Technologies · what management said would move the numbers, and
          whether it has.
        </DrawerDescription>
      </DrawerHeader>

      <div className="space-y-3 overflow-y-auto p-4">
        {[
          {
            catalyst: "Clean energy order execution",
            said: "Q3 FY26 call",
            status: "Landed",
            note: "Revenue from the segment doubled year on year in Q1 FY27.",
          },
          {
            catalyst: "Export share above 60%",
            said: "Q4 FY26 call",
            status: "On track",
            note: "Exports at 57% this quarter, guided to hold through FY27.",
          },
          {
            catalyst: "Margin recovery to 26%",
            said: "Q1 FY27 call",
            status: "Not yet testable",
            note: "First checkpoint is the Q3 FY27 print.",
          },
        ].map((row) => (
          <div
            key={row.catalyst}
            className="rounded-lg border border-border/60 bg-background/70 p-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {row.catalyst}
              </p>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {row.status}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {row.note}
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Stated on the {row.said}
            </p>
          </div>
        ))}
      </div>

      <DrawerFooter className="border-t border-border">
        <DrawerClose asChild>
          <Button variant="outline">Close</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
);

export const BottomSheetFeedback = () => (
  <Drawer open direction="bottom">
    <DrawerTrigger asChild>
      <Button variant="ghost" size="sm">
        Was this section useful?
      </Button>
    </DrawerTrigger>
    <DrawerContent className="mx-auto w-full max-w-xl">
      <DrawerHeader>
        <DrawerTitle>Tell us about Moat Analysis</DrawerTitle>
        <DrawerDescription>
          One line is enough. It goes to the person who writes the framework.
        </DrawerDescription>
      </DrawerHeader>
      <div className="px-4 pb-2">
        <p className="rounded-lg border border-border/60 bg-background/70 p-3 text-sm leading-relaxed text-muted-foreground">
          The switching-cost argument reads well, but I could not tell which
          quarter&apos;s call it came from.
        </p>
      </div>
      <DrawerFooter>
        <Button>Send feedback</Button>
        <DrawerClose asChild>
          <Button variant="outline">Not now</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
);
