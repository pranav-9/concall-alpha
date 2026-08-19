import { Tabs, TabsContent, TabsList, TabsTrigger } from "concall-alpha";

// Two live shapes. The company page splits one long page into its analysis
// sections; the leaderboards and /how-scores-work use the pill list — the exact
// class strings below are lifted from app/how-scores-work/page.tsx so the
// rounded-pill treatment stays one thing rather than two.
//
// Radix mounts only the active panel, so each story shows one tab's content;
// give every trigger a real panel or the card reads as broken.

const PILL_LIST_CLASS =
  "inline-flex h-auto w-fit rounded-full border border-sky-200/35 bg-background/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm dark:border-sky-700/20";

const PILL_TRIGGER_CLASS =
  "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800 data-[state=active]:shadow-sm dark:data-[state=active]:bg-sky-900/30 dark:data-[state=active]:text-sky-200";

const BODY_CLASS = "text-sm leading-relaxed text-muted-foreground";

export const CompanySections = () => (
  <Tabs defaultValue="overview" className="w-full">
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="business">Business</TabsTrigger>
      <TabsTrigger value="moat">Moat</TabsTrigger>
      <TabsTrigger value="growth">Growth</TabsTrigger>
      <TabsTrigger value="valuation">Valuation</TabsTrigger>
    </TabsList>

    <TabsContent value="overview" className="pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Neuland Laboratories · Q1 FY27
      </p>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          8.2
        </span>
        <span className={BODY_CLASS}>
          Strongly bullish · up 0.6 from Q4 FY26 · #2 of 100 on the Read
        </span>
      </div>
      <p className={`mt-3 ${BODY_CLASS}`}>
        The composite is 88% quarter leg and 12% growth leg. Both legs moved the
        same way this quarter, which is rarer than it sounds.
      </p>
    </TabsContent>

    <TabsContent value="business" className={`pt-4 ${BODY_CLASS}`}>
      <p>
        Three reportable segments. Custom manufacturing (CMS) carries the
        majority of contribution margin; generic drug substances fund the base.
        Peptides are the newest block and the only one management sizes in
        capacity rather than revenue.
      </p>
      <p className="mt-3">
        Mix has moved roughly nine points toward CMS over eight quarters — the
        single most important line in this section.
      </p>
    </TabsContent>

    <TabsContent value="moat" className={`pt-4 ${BODY_CLASS}`}>
      <p>
        <span className="font-medium text-foreground">Narrow.</span> Switching
        costs are real but shallow: qualification cycles run 18–24 months, which
        deters casual entry without locking a customer in past a price shock.
      </p>
      <p className="mt-3">
        Scale economics in the API block is the stronger of the two sources, and
        the one most likely to widen if Unit III fills.
      </p>
    </TabsContent>

    <TabsContent value="growth" className={`pt-4 ${BODY_CLASS}`}>
      <p>
        Base case holds mid-teens revenue growth through FY28 on committed CMS
        volumes. The bull case needs the peptide line commissioned on time; the
        bear case is a single molecule losing its innovator.
      </p>
      <p className="mt-3">
        Management quantified two of the four catalysts. The other two are
        tracked but not yet testable.
      </p>
    </TabsContent>

    <TabsContent value="valuation" className={`pt-4 ${BODY_CLASS}`}>
      <p>
        Priced 4 days ago. Trading above the base rung of its own historical
        ladder, below the bull rung — the read degrades rather than vetoing.
      </p>
      <p className="mt-3">
        ROCE of 22.1% sits above the covered pharma median, disclosed alongside
        the multiple rather than adjusted into it.
      </p>
    </TabsContent>
  </Tabs>
);

export const LeaderboardPills = () => (
  <Tabs defaultValue="overall" className="w-full space-y-4">
    <TabsList className={PILL_LIST_CLASS}>
      <TabsTrigger value="overall" className={PILL_TRIGGER_CLASS}>
        Overall
      </TabsTrigger>
      <TabsTrigger value="quarter" className={PILL_TRIGGER_CLASS}>
        Quarter
      </TabsTrigger>
      <TabsTrigger value="growth" className={PILL_TRIGGER_CLASS}>
        Growth
      </TabsTrigger>
      <TabsTrigger value="moat" className={PILL_TRIGGER_CLASS}>
        Moat
      </TabsTrigger>
    </TabsList>

    <TabsContent value="overall" className="mt-4">
      <ol className="divide-y divide-border text-sm">
        {[
          ["1", "MTAR Technologies", "8.4"],
          ["2", "Neuland Laboratories", "8.2"],
          ["3", "HFCL", "7.6"],
          ["4", "Pricol", "7.3"],
          ["5", "Fedbank Financial", "7.1"],
        ].map(([rank, name, read]) => (
          <li key={name} className="flex items-baseline gap-4 py-2">
            <span className="w-6 shrink-0 tabular-nums text-muted-foreground">
              {rank}
            </span>
            <span className="flex-1 text-foreground">{name}</span>
            <span className="font-medium tabular-nums text-foreground">
              {read}
            </span>
          </li>
        ))}
      </ol>
    </TabsContent>
    <TabsContent value="quarter" className="mt-4 text-sm text-muted-foreground">
      Q1 FY27 scores only — the flat four-quarter mean, not the recency-weighted
      blend the Overall board ranks on.
    </TabsContent>
    <TabsContent value="growth" className="mt-4 text-sm text-muted-foreground">
      Forward growth scores, refreshed when a new quarter lands.
    </TabsContent>
    <TabsContent value="moat" className="mt-4 text-sm text-muted-foreground">
      Moat tier is categorical — wide, narrow or none — so it keeps its own
      board rather than sharing the number-and-band format.
    </TabsContent>
  </Tabs>
);

export const TwoTabExplainer = () => (
  <Tabs defaultValue="quarterly" className="w-full space-y-5">
    <TabsList className={PILL_LIST_CLASS}>
      <TabsTrigger value="growth" className={PILL_TRIGGER_CLASS}>
        Growth score
      </TabsTrigger>
      <TabsTrigger value="quarterly" className={PILL_TRIGGER_CLASS}>
        Quarterly score
      </TabsTrigger>
    </TabsList>

    <TabsContent value="growth" className={BODY_CLASS}>
      One forward-looking read per company, rebuilt when a new quarter lands.
    </TabsContent>

    <TabsContent value="quarterly" className={`space-y-3 ${BODY_CLASS}`}>
      <p>
        Each quarter is scored from the transcript across seven information
        categories. The model rates the lean of each; the weighted sum and the
        downside cap are arithmetic, not judgement.
      </p>
      <ol className="space-y-1.5">
        {[
          "Read the transcript, not the press release",
          "Rate each category's lean, with the quote that justifies it",
          "Weight, sum, then cap on the worst downside lean",
          "Publish with the provenance of the transcript attached",
        ].map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="w-4 shrink-0 tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </TabsContent>
  </Tabs>
);
