import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CHIP_BASE,
  CHIP_NEUTRAL,
  INNER_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_SKY,
} from "@/lib/design/shell";
import { getConcallData } from "@/app/company/get-concall-data";
import { fetchLeaderboardData } from "@/app/leaderboards/data";
import { TRAJECTORIES, TRAJECTORY_ORDER } from "@/lib/score-trajectory";
import {
  computeGrowthBandCounts,
  type BandCount,
} from "@/lib/leaderboard-distribution";
import {
  QuarterlyBandLegend,
  QuarterlyCategoryModel,
  QuarterlyDistributionCurve,
  QuarterlyWeightBars,
  QuarterlyWorkedExample,
} from "./quarterly-model";

export const metadata: Metadata = {
  title: "How Scores Are Calculated – Story of a Stock",
  description: "How quarterly and growth scores are calculated in Story of a Stock.",
};

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

const growthBands = [
  { label: "Exceptional", cut: "≥ 8.5", body: "Top-conviction outlook: strong base, well-supported scenarios, durable catalysts." },
  { label: "Strong", cut: "8.0 – 8.4", body: "Solid base growth and supportive scenarios; visible execution path." },
  { label: "Solid", cut: "7.5 – 7.9", body: "Clearly positive outlook with reasonable conviction; some moving parts to monitor." },
  { label: "Moderate", cut: "7.0 – 7.4", body: "Mixed conviction or lower base growth; needs further evidence to firm up." },
  { label: "Soft", cut: "6.5 – 6.9", body: "Weak conviction or downside-heavy scenarios; growth is unclear." },
  { label: "Weak", cut: "< 6.5", body: "Material concerns on growth visibility or execution." },
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

const PANEL_CARD_CLASS = PANEL_CARD_SKY;

const CARD_CLASS = `${INNER_CARD} p-4`;

const CHIP_CLASS = CHIP_BASE;

const CHIP_NEUTRAL_CLASS = CHIP_NEUTRAL;

const TABS_LIST_CLASS =
  "inline-flex h-auto w-fit rounded-full border border-sky-200/35 bg-background/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm dark:border-sky-700/20";

const TABS_TRIGGER_CLASS =
  "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800 data-[state=active]:shadow-sm dark:data-[state=active]:bg-sky-900/30 dark:data-[state=active]:text-sky-200";

export default async function HowScoresWorkPage() {
  const [{ rows, quarterLabels }, { growthEntries }] = await Promise.all([
    getConcallData(),
    fetchLeaderboardData(),
  ]);
  const latestQuarterLabel = quarterLabels[0] ?? null;
  const quarterLatestScores = latestQuarterLabel
    ? rows.map((r) => {
        const raw = r[latestQuarterLabel];
        if (raw == null || raw === "") return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
      })
    : [];
  const quarterScored = quarterLatestScores.filter((s): s is number => typeof s === "number").length;
  const growthBandCounts = computeGrowthBandCounts(growthEntries.map((e) => e.growthScore));
  const growthScored = growthEntries.filter((e) => typeof e.growthScore === "number").length;

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL_CLASS}>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
            Score framework
          </p>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
            How scores are calculated
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Two lenses on the same company. <span className="text-foreground">Growth Score</span>{" "}
            looks forward; <span className="text-foreground">Quarterly Score</span> measures how the
            latest quarter actually went. Both sit on the same 1–10 scale.
          </p>
        </div>

        <section className={PANEL_CARD_CLASS}>
          <Tabs defaultValue="quarterly" className="space-y-5">
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
                <p className="text-sm font-semibold text-foreground">Score bands</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {growthBands.map((band) => (
                    <div key={band.label} className={CARD_CLASS}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{band.label}</p>
                        <span className="text-[11px] font-mono text-muted-foreground">{band.cut}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{band.body}</p>
                    </div>
                  ))}
                </div>
                <DistributionHistogram
                  total={growthScored}
                  bandCounts={growthBandCounts}
                  caption="Current coverage universe — how the cohort actually distributes across these bands today."
                />
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

            <TabsContent value="quarterly" className="space-y-8">
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Each quarter is rated on six categories, each given a lean from −2 (clearly
                deteriorating) through 0 (in line) to +2 (clearly exceptional). The leans are
                weighted, added to a 5.5 baseline, and a downside cap keeps a strong-looking quarter
                honest. The arithmetic is deterministic — the judgment lives only in the six leans.
              </p>

              <section className="space-y-4">
                <SectionHeading
                  step={1}
                  title="Categories & weights"
                  subtitle="The six things every quarter is read on, and how far each can move the score."
                />
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[7fr_3fr]">
                  <div className={`${INNER_CARD} p-4`}>
                    <p className="text-sm font-semibold text-foreground">The six categories</p>
                    <div className="mt-4">
                      <QuarterlyCategoryModel />
                    </div>
                  </div>
                  <div className={`${INNER_CARD} flex flex-col p-4`}>
                    <p className="text-sm font-semibold text-foreground">
                      How they’re weighted
                      <span className="ml-2 text-xs font-normal text-muted-foreground">sum to 1.00</span>
                    </p>
                    <div className="mt-4 flex-1">
                      <QuarterlyWeightBars />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t border-border/50 pt-8">
                <SectionHeading
                  step={2}
                  title="Worked example"
                  subtitle="How the six leans build to a score, off the 5.5 baseline."
                />
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr]">
                  <div className={`${INNER_CARD} p-4`}>
                    <div className="mb-4 flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">A 7.1 quarter</p>
                      <span className="text-[11px] text-muted-foreground">illustrative leans</span>
                    </div>
                    <QuarterlyWorkedExample />
                  </div>
                  <div className={`${INNER_CARD} space-y-3 p-4`}>
                    <p className="text-sm font-semibold text-foreground">Reading it</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Each bar is one category’s push off the 5.5 baseline (weight × lean). The length
                      bakes in the weight, so a long bar is a category that actually moved the score —
                      here Strategy’s standout +2 barely outweighs Financials’ +1, and a soft industry
                      read trims a little back.
                    </p>
                    <div className="rounded-lg border border-amber-300/50 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-700/30 dark:bg-amber-950/20 dark:text-amber-200">
                      <span className="font-semibold">Cap in action.</span> Had Guidance instead
                      scored −2, this 7.1 would be clamped to 6.0 — one core category breaking down
                      bounds the whole quarter.
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t border-border/50 pt-8">
                <SectionHeading
                  step={3}
                  title="Score bands"
                  subtitle="What a score means, and where the cohort actually lands today."
                />
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className={`${INNER_CARD} p-4`}>
                    <p className="text-sm font-semibold text-foreground">The bands</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Fixed cuts anchored on 5.5 = a typical, all-in-line quarter.
                    </p>
                    <div className="mt-4">
                      <QuarterlyBandLegend />
                    </div>
                  </div>
                  <div className={`${INNER_CARD} p-4`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">Where companies land</p>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {quarterScored} companies
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Latest-quarter cohort, by score — right-skewed toward quality.
                    </p>
                    <div className="mt-4">
                      <QuarterlyDistributionCurve scores={quarterLatestScores} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t border-border/50 pt-8">
                <SectionHeading
                  step={4}
                  title="Trajectory labels"
                  subtitle="Where a score sits is half the story — the Trend column says where it’s heading."
                />
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  A 7 on the way up is a different stock from a 7 on the way down. Every threshold
                  sits at or above the ±0.5 re-scoring noise floor, so a move that noise can explain
                  never earns a directional label.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {TRAJECTORY_ORDER.map((key) => {
                    const def = TRAJECTORIES[key];
                    return (
                      <div key={key} className={CARD_CLASS}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-semibold ${def.textClass}`}>{def.label}</p>
                          {def.cellLabel !== def.label && def.cellLabel !== "—" && (
                            <span className="text-[11px] font-mono text-muted-foreground">
                              shown as “{def.cellLabel}”
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {def.definition}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

            </TabsContent>
          </Tabs>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Two lenses on the same comparable scale. Quarterly grades the latest quarter; Growth
            looks at the forward outlook — read whichever fits your question.
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

function SectionHeading({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-300/50 bg-sky-100/70 text-xs font-bold text-sky-800 dark:border-sky-700/35 dark:bg-sky-900/30 dark:text-sky-200">
        {step}
      </span>
      <div className="space-y-0.5">
        <h2 className="text-base font-bold leading-tight tracking-tight text-foreground">{title}</h2>
        {subtitle ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function DistributionHistogram<K extends string>({
  total,
  bandCounts,
  caption,
}: {
  total: number;
  bandCounts: BandCount<K>[];
  caption?: string;
}) {
  if (total === 0) return null;
  const maxCount = bandCounts.reduce((acc, b) => Math.max(acc, b.count), 0);
  if (maxCount === 0) return null;
  return (
    <div className={`${INNER_CARD} p-4`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Coverage distribution
        </p>
        <p className="text-[11px] tabular-nums text-muted-foreground">{total} companies</p>
      </div>
      <div className="space-y-1.5">
        {bandCounts.map((band) => {
          const pct = maxCount === 0 ? 0 : (band.count / maxCount) * 100;
          const sharePct = total === 0 ? 0 : (band.count / total) * 100;
          return (
            <div key={band.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)_3rem] items-center gap-3">
              <span className="truncate text-[12px] text-foreground/90">{band.label}</span>
              <div className="relative h-2 rounded-full bg-muted/50">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-sky-500/70 dark:bg-sky-400/60"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-right text-[11px] tabular-nums text-muted-foreground">
                {band.count}
                <span className="ml-1 text-[10px] text-muted-foreground/70">({sharePct.toFixed(0)}%)</span>
              </span>
            </div>
          );
        })}
      </div>
      {caption && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{caption}</p>
      )}
    </div>
  );
}
