import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CHIP_BASE,
  CHIP_NEUTRAL,
  HERO_CARD,
  INNER_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_SKY,
} from "@/lib/design/shell";

export const metadata: Metadata = {
  title: "How Scores Are Calculated – Story of a Stock",
  description: "How quarterly and growth scores are calculated in Story of a Stock.",
};

const microChips = ["Fast scan", "Evidence-backed", "Comparable over time"];

const scoreSteps = [
  {
    index: "1",
    title: "Read the quarter context",
    description: "Concall transcripts and disclosures are parsed into trackable signals.",
    bullets: [
      "Management commentary, Q&A, and reported numbers are captured in one place.",
      "Noise is reduced so the same structure is used across companies.",
    ],
  },
  {
    index: "2",
    title: "Evaluate core factors",
    description: "The model checks quality, delivery, and risk from multiple angles.",
    bullets: [
      "Financial trajectory, guidance vs delivery, unit economics, and competitive position.",
      "Risk/overhangs, capital allocation, and evidence quality to avoid fluff-heavy scoring.",
    ],
  },
  {
    index: "3",
    title: "Assign quarterly score + category",
    description: "A 1-10 quarterly score is generated with a confidence level.",
    bullets: [
      "Outputs include a category label (e.g. Mildly Bullish, Strongly Bullish).",
      "Confidence helps you judge how strongly the evidence supports the score.",
    ],
  },
  {
    index: "4",
    title: "Output actionable fields",
    description: "Results are returned in a format you can quickly review and compare.",
    bullets: [
      "Rationale, quarter summary, results summary, guidance, and key risks.",
      "Period fields (`fy`, `qtr`) make trend tracking consistent over time.",
    ],
  },
];

const returnedFieldGroups = [
  { title: "Core", fields: ["score", "category", "confidence"] },
  {
    title: "Context",
    fields: ["quarter_summary", "results_summary", "guidance", "rationale", "risks"],
  },
  { title: "Period", fields: ["fy", "qtr"] },
];

const growthCards = [
  {
    title: "Catalyst Strength (30%)",
    body: "Higher-conviction business catalysts lift the score when they are concrete, near-term, and commercially meaningful.",
  },
  {
    title: "Scenario Strength (25%)",
    body: "Base, Upside, and Downside cases are read together to assess expected growth range and balance of outcomes.",
  },
  {
    title: "Guidance Strength (15%)",
    body: "Clear, quantified guidance and execution milestones increase confidence in the forward growth path.",
  },
  {
    title: "Execution Confidence (15%)",
    body: "Feasibility, adoption readiness, unit economics, and timing quality indicate how investable the growth plan is.",
  },
  {
    title: "Management Sentiment (10%, when available)",
    body: "Recent management tone and commentary can reinforce or soften the growth view.",
  },
  {
    title: "Industry Context (5%, when available)",
    body: "Sector tailwinds, headwinds, and cycle position provide context for how much of growth is structural versus cyclical.",
  },
];

const growthScenarioReadPoints = [
  "Base, Upside, and Downside are interpreted together, not in isolation.",
  "Confidence quality influences how much conviction the scenario set deserves.",
  "More durable drivers support higher conviction, while visible risks pull confidence lower.",
  "The model applies directional stress so upside and downside are not treated as equal-quality paths.",
];

const growthReturnedFields = [
  "Base case growth view",
  "Upside case potential",
  "Downside risk case",
  "Final Growth Score (0-10)",
  "Score rationale",
  "Step-by-step breakdown",
];

const PAGE_BACKGROUND_CLASS = `h-[30rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

const PAGE_SHELL_CLASS = PAGE_SHELL;

const HERO_CARD_CLASS = HERO_CARD;

const PANEL_CARD_CLASS = PANEL_CARD_SKY;

const CARD_CLASS = `${INNER_CARD} p-4`;

const CHIP_CLASS = CHIP_BASE;

const CHIP_NEUTRAL_CLASS = CHIP_NEUTRAL;

const TABS_LIST_CLASS =
  "inline-flex h-auto w-fit rounded-full border border-sky-200/35 bg-background/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm dark:border-sky-700/20";

const TABS_TRIGGER_CLASS =
  "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800 data-[state=active]:shadow-sm dark:data-[state=active]:bg-sky-900/30 dark:data-[state=active]:text-sky-200";

export default function HowScoresWorkPage() {
  const overviewMetrics = [
    {
      label: "Score models",
      value: "2",
      note: "Forward outlook and execution read",
    },
    {
      label: "Scale",
      value: "0-10",
      note: "Comparable across companies and time",
    },
    {
      label: "Read order",
      value: "Growth → Quarterly",
      note: "Start with outlook, then check delivery",
    },
  ];

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL_CLASS}>
        <section className={HERO_CARD_CLASS}>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {microChips.map((chip) => (
                  <span key={chip} className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
                    {chip}
                  </span>
                ))}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
                Score framework
              </p>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                How scores are calculated
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Growth Score looks forward. Quarterly Score measures execution. Read them as two
                separate lenses inside the same research workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {overviewMetrics.map((metric) => (
                <div key={metric.label} className={CARD_CLASS}>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-xl font-black leading-none text-foreground">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={PANEL_CARD_CLASS}>
          <Tabs defaultValue="growth" className="space-y-5">
            <TabsList className={TABS_LIST_CLASS}>
              <TabsTrigger value="growth" className={TABS_TRIGGER_CLASS}>
                Growth Score
              </TabsTrigger>
              <TabsTrigger value="quarterly" className={TABS_TRIGGER_CLASS}>
                Quarterly Score
              </TabsTrigger>
            </TabsList>

            <TabsContent value="growth" className="space-y-5">
              <div className={`${INNER_CARD} p-4`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Growth score model
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground">
                  How the Growth Score is built
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Growth Score is a weighted blend of business catalysts, scenario outcomes,
                  guidance quality, execution confidence, and market context. The output is a
                  comparable 0-10 score for forward outlook.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {growthCards.map((card) => (
                  <div key={card.title} className={CARD_CLASS}>
                    <p className="text-sm font-semibold text-foreground">{card.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                  </div>
                ))}
              </div>

              <div className={`${INNER_CARD} p-4`}>
                <p className="text-sm font-semibold text-foreground">How scenarios are read</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-muted-foreground">
                  {growthScenarioReadPoints.map((point) => (
                    <li key={point} className="text-sm leading-relaxed text-foreground/90">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">What gets returned</p>
                <div className="flex flex-wrap gap-2">
                  {growthReturnedFields.map((field) => (
                    <span
                      key={field}
                      className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">How to read this score</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className={CARD_CLASS}>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Base 18%, Upside 26%, Downside 10%, Growth score 8.4
                    </p>
                  </div>
                  <div className={CARD_CLASS}>
                    <ul className="space-y-1.5">
                      <li className="text-sm leading-relaxed text-foreground/90">
                        What supports this: strong catalyst pipeline and clearer execution
                        milestones.
                      </li>
                      <li className="text-sm leading-relaxed text-foreground/90">
                        What could pull it lower: weaker adoption pace or demand volatility in key
                        segments.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                If some optional context inputs are unavailable, the score still computes from
                available components and stays on the same 0-10 scale.
              </p>
            </TabsContent>

            <TabsContent value="quarterly" className="space-y-5">
              <div className={`${INNER_CARD} p-4`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Quarterly score model
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground">
                  From raw quarter data to a usable score
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Quarterly scores turn dense management commentary into a comparable signal, so
                  you can quickly see what improved, what weakened, and what deserves deeper work.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {scoreSteps.map((step) => (
                  <div key={step.index} className={CARD_CLASS + " space-y-2"}>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-200/60 bg-sky-100/70 text-xs font-black text-sky-800 dark:border-sky-700/35 dark:bg-sky-900/30 dark:text-sky-200">
                        {step.index}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                    <ul className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
                      {step.bullets.map((bullet) => (
                        <li key={bullet} className="text-sm leading-relaxed text-foreground/90">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">What gets returned</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  {returnedFieldGroups.map((group) => (
                    <div key={group.title} className={CARD_CLASS + " space-y-2"}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {group.title}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.fields.map((field) => (
                          <span
                            key={field}
                            className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Quarterly example</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className={CARD_CLASS}>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Score 8.8, Mildly Bullish, Confidence 82%
                    </p>
                  </div>
                  <div className={CARD_CLASS}>
                    <ul className="space-y-1.5">
                      <li className="text-sm leading-relaxed text-foreground/90">
                        Driven by margin expansion and guidance consistency.
                      </li>
                      <li className="text-sm leading-relaxed text-foreground/90">
                        Watch for working-capital slippage in the next quarter.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Read Growth first, then Quarterly. Both models stay on the same 0-10 scale but answer
            different questions.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className="rounded-full bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">
              <Link href="/leaderboards" prefetch={false}>
                View Leaderboards
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-sky-200/50 bg-background/80 text-foreground hover:bg-sky-50 dark:border-sky-700/30 dark:bg-background/70 dark:hover:bg-sky-950/20"
            >
              <Link href="/" prefetch={false}>
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
