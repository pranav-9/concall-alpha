import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function HowScoresWorkPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:py-10 flex justify-center">
      <div className="w-full max-w-5xl space-y-6 sm:space-y-7">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            How Scores Work
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
            Two separate scoring models, explained clearly
          </h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Start with Growth Score (forward outlook), then read Quarterly Score
            (execution). These are separate models and should be read independently.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {microChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <Tabs defaultValue="growth" className="space-y-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="growth">Growth Score</TabsTrigger>
              <TabsTrigger value="quarterly">Quarterly Score</TabsTrigger>
            </TabsList>

            <TabsContent value="growth" className="space-y-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Growth Score Model
                </p>
                <h2 className="mt-1 text-lg sm:text-xl font-bold text-foreground">
                  How the Growth Score is built
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Growth Score is a weighted blend of business catalysts, scenario outcomes,
                  guidance quality, execution confidence, and market context. The final output
                  is a comparable 0-10 score for forward outlook.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {growthCards.map((card) => (
                  <div key={card.title} className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-sm font-semibold text-foreground">{card.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{card.body}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">How scenarios are read</p>
                <ul className="list-disc pl-5 space-y-1 marker:text-muted-foreground">
                  {growthScenarioReadPoints.map((point) => (
                    <li key={point} className="text-sm text-foreground/90 leading-relaxed">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">What gets returned</p>
                <div className="flex flex-wrap gap-2">
                  {growthReturnedFields.map((field) => (
                    <span
                      key={field}
                      className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">How to read this score</p>
                <p className="text-sm text-muted-foreground">
                  Base 18%, Upside 26%, Downside 10%, Growth score 8.4
                </p>
                <ul className="list-disc pl-5 space-y-1 marker:text-muted-foreground">
                  <li className="text-sm text-foreground/90">What supports this: strong catalyst pipeline and clearer execution milestones.</li>
                  <li className="text-sm text-foreground/90">What could pull it lower: weaker adoption pace or demand volatility in key segments.</li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                If some optional context inputs are unavailable, the score still computes from
                available components and stays on the same 0-10 scale.
              </p>
            </TabsContent>

            <TabsContent value="quarterly" className="space-y-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Quarterly Score Model
                </p>
                <h2 className="mt-1 text-lg sm:text-xl font-bold text-foreground">
                  From raw quarter data to a usable score
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Quarterly scores turn dense management commentary into a comparable signal,
                  so you can quickly see what improved, what weakened, and what deserves deeper work.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scoreSteps.map((step) => (
                  <div key={step.index} className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">
                        {step.index}
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    <ul className="list-disc pl-5 space-y-1 marker:text-muted-foreground">
                      {step.bullets.map((bullet) => (
                        <li key={bullet} className="text-sm text-foreground/90 leading-relaxed">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">What gets returned</p>
                {returnedFieldGroups.map((group) => (
                  <div key={group.title} className="space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      {group.title}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.fields.map((field) => (
                        <span
                          key={field}
                          className="rounded-full border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Quarterly example</p>
                <p className="text-sm text-muted-foreground">
                  Score 8.8, Mildly Bullish, Confidence 82%
                </p>
                <ul className="list-disc pl-5 space-y-1 marker:text-muted-foreground">
                  <li className="text-sm text-foreground/90">Driven by margin expansion and guidance consistency.</li>
                  <li className="text-sm text-foreground/90">Watch for working-capital slippage in the next quarter.</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/leaderboards" prefetch={false}>
                View Leaderboards
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/" prefetch={false}>
                Back to Home
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
