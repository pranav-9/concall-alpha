import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { TOUCH_TARGET_ICON } from "@/lib/design/shell";
import { History } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConcallScore from "@/components/concall-score";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import type {
  NormalizedGrowthCatalyst,
  NormalizedGrowthOutlook,
  NormalizedGrowthScenario,
  NormalizedGrowthTimelineItem,
} from "@/lib/growth-outlook/types";
import { formatShortDate } from "../[code]/page-helpers";
import { formatGrowthScoreComponent } from "@/lib/growth-outlook/component-format";
import {
  formatCatalystQuantifiedLabel,
  formatCompactLabel,
  getCatalystStatusDisplay,
  getGrowthScoreComponentLabel,
  getTimelineStageDisplay,
  splitCatalystQuantifiedLabel,
  toDisplayLabel,
} from "../[code]/display-tokens";
import { buildGrowthSummary, isEarningsBridged, rankCatalysts, type GrowthSummary } from "@/lib/growth-outlook/summary";
import type { StrategyNarrative } from "@/lib/guidance-snapshot/types";
import { SectionCard, SectionUpdatedAt } from "./section-card";
import { StrategyNarrativeCard } from "./strategy-narrative-card";
import { MissingSectionState } from "./missing-section-state";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";
import { chipClass, type ChipTone } from "./chip-tone";

function getScenarioChipTone(
  scenarioKey: "base" | "upside" | "downside",
): ChipTone {
  if (scenarioKey === "base") return "emerald";
  if (scenarioKey === "upside") return "sky";
  return "amber";
}

function renderScenarioDetails(scenario: NormalizedGrowthScenario) {
  const visibleDrivers = scenario.drivers.slice(0, 2);
  const visibleRisks = scenario.risks.slice(0, 2);
  const primaryRisk = (scenario.risks[0] ?? "").trim();
  const riskWatch = (scenario.riskWatch ?? "").trim();
  const riskWatchValue = riskWatch || primaryRisk;
  if (
    visibleDrivers.length === 0 &&
    visibleRisks.length === 0 &&
    !riskWatchValue
  ) {
    return null;
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
        <span className="group-open:hidden">Show details</span>
        <span className="hidden group-open:inline">Hide details</span>
      </summary>
      <div className="mt-2 space-y-2">
        {visibleDrivers.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300 font-semibold">
                Drivers
              </p>
              <span className={chipClass("emerald")}>
                {visibleDrivers.length}
              </span>
            </div>
            <ul className="space-y-1">
              {visibleDrivers.map((driver, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-foreground leading-snug"
                >
                  {driver}
                </li>
              ))}
            </ul>
          </div>
        )}
        {visibleRisks.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300 font-semibold">
                Risks
              </p>
              <span className={chipClass("rose")}>
                {visibleRisks.length}
              </span>
            </div>
            <ul className="space-y-1">
              {visibleRisks.map((risk, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-foreground leading-snug"
                >
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
        {riskWatchValue && (
          <div className={`${nestedDetailClass} px-3 py-2`}>
            <p className="text-[10px] uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300 font-semibold">
              Risk watch
            </p>
            <p className="mt-1 text-[11px] leading-snug text-foreground">
              {riskWatchValue}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

function CatalystTrackerDrawer({
  catalyst,
  timelineItems,
}: {
  catalyst: NormalizedGrowthCatalyst;
  timelineItems: NormalizedGrowthTimelineItem[];
}) {
  return (
    <Drawer direction="right">
      <Tooltip>
        <TooltipTrigger asChild>
          <DrawerTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Open catalyst tracker"
              data-drawer-type="catalyst-tracker"
              className={`size-7 rounded-full border-border/60 bg-background/70 text-muted-foreground shadow-none hover:bg-accent hover:text-foreground ${TOUCH_TARGET_ICON}`}
            >
              <History className="size-3.5" />
              <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full border border-background bg-sky-500 px-1 text-[10px] font-semibold leading-4 text-white">
                {timelineItems.length}
              </span>
            </Button>
          </DrawerTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>
          Open tracker
        </TooltipContent>
      </Tooltip>
      <DrawerContent className="w-full max-w-xl">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle>Catalyst tracker</DrawerTitle>
          <DrawerDescription>
            {catalyst.catalyst
              ? catalyst.catalyst
              : `${timelineItems.length} tracker updates.`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 py-4">
          <div className="relative pl-6 before:absolute before:left-[8px] before:top-1 before:bottom-1 before:w-px before:bg-border/60">
            <ul className="space-y-4">
              {timelineItems.map((t, tIdx) => {
                const stageMeta = getTimelineStageDisplay(t.stage);
                const period = t.period ?? "";
                const source = t.source ?? "";
                const quote = t.quote ?? "";
                const delta = t.delta ?? "";

                return (
                  <li
                    key={`timeline-drawer-${tIdx}`}
                    className="relative space-y-1.5 pl-4"
                  >
                    <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full border-2 border-background bg-sky-500" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full uppercase tracking-[0.16em] text-[10px] ${stageMeta.className}`}
                      >
                        {stageMeta.label}
                      </span>
                      {(period || source) && (
                        <span className="text-[11px] text-muted-foreground">
                          {period}
                          {period && source ? " · " : ""}
                          {source}
                        </span>
                      )}
                    </div>
                    {quote && (
                      <p className="text-[13px] leading-relaxed lg:text-[12px] text-foreground">
                        {quote}
                      </p>
                    )}
                    {delta && (
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {delta}
                      </p>
                    )}
                  </li>
                );
              })}
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
}

// The page in one card: the base case and its range, the bridged earnings
// read, and the single biggest lever — every figure is one the sections below
// already show (lib/growth-outlook/summary.ts), so this is a summary and not a
// second opinion.
function GrowthSummaryCard({
  summary,
  scorePill,
}: {
  summary: GrowthSummary;
  scorePill: React.ReactNode;
}) {
  const { topCatalyst } = summary;
  const impact = topCatalyst
    ? splitCatalystQuantifiedLabel(formatCatalystQuantifiedLabel(topCatalyst))
    : null;
  const range =
    summary.bearGrowth && summary.bullGrowth
      ? `${summary.bearGrowth} bear → ${summary.bullGrowth} bull`
      : summary.bearGrowth
        ? `${summary.bearGrowth} bear`
        : summary.bullGrowth
          ? `${summary.bullGrowth} bull`
          : null;
  return (
    <div className={`${elevatedBlockClass} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/90">
          Growth summary
        </p>
        {scorePill}
      </div>
      {summary.revenueGrowth ? (
        <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Base-case revenue growth
              {summary.horizonYears ? ` · ${summary.horizonYears}Y view` : ""}
            </p>
            <p className="mt-1 text-[28px] font-black leading-none tracking-[-0.02em] text-emerald-700 dark:text-emerald-300">
              {summary.revenueGrowth}
            </p>
            {range ? (
              <p className="mt-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">{range}</p>
            ) : null}
          </div>
          {summary.earnings ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {summary.earnings.metricLabel ? `${summary.earnings.metricLabel} growth` : "Earnings growth"}
              </p>
              <p className="mt-1 text-[28px] font-black leading-none tracking-[-0.02em] text-foreground">
                {summary.earnings.growth}
              </p>
              {summary.earnings.marginAtHorizon ? (
                <p className="mt-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  at {summary.earnings.marginAtHorizon} margin
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {topCatalyst?.catalyst ? (
        <div className="mt-4 border-t border-border/30 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Biggest lever
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
            {topCatalyst.catalyst}
            {impact?.headline ? (
              <span className="font-normal text-muted-foreground"> · {impact.headline}</span>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function GrowthScorePill({
  outlook,
  growthScore,
  growthBand,
}: {
  outlook: NormalizedGrowthOutlook;
  growthScore: number | null;
  growthBand: (typeof GROWTH_BANDS)[keyof typeof GROWTH_BANDS] | null;
}) {
  if (outlook.growthScoreComponents.length === 0) return null;
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label="View growth score breakdown"
          data-drawer-type="growth-score-breakdown"
          className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 shadow-none transition-colors hover:bg-accent"
        >
          {typeof growthScore === "number" && growthBand ? (
            <>
              <span className="inline-flex items-center gap-0.5">
                <ConcallScore score={growthScore} size="sm" kind="growth" />
                <span className="text-[11px] font-medium text-muted-foreground">
                  /10
                </span>
              </span>
              <span
                className={`text-[13px] font-semibold ${growthBand.tone}`}
              >
                {growthBand.label}
              </span>
            </>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">
              View score breakdown
            </span>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent className="w-full max-w-xl">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle>Growth score breakdown</DrawerTitle>
          <DrawerDescription>
            Component-level view of what is currently driving the forward growth score.
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {outlook.growthScoreComponents.map((component) => {
              const display = formatGrowthScoreComponent(
                component.key,
                component.score,
              );
              if (!display) return null;
              return (
                <div
                  key={component.key}
                  className={`${nestedDetailClass} px-3 py-2.5`}
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                    {getGrowthScoreComponentLabel(component.key)}
                  </p>
                  <p className="mt-1 text-2xl font-semibold leading-none text-foreground">
                    {display.value}
                    {display.suffix && (
                      <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                        {display.suffix}
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
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
}

type FutureGrowthSectionProps = {
  outlook: NormalizedGrowthOutlook | null;
  // details.strategy_narrative from the guidance deep-track, when the company
  // has one (~half of coverage). Null = the summary card takes the full row.
  growthEngine?: StrategyNarrative | null;
  growthEngineAsOf?: string | null;
  companyCode: string;
  companyName: string | null;
};


export function FutureGrowthSection({
  outlook,
  growthEngine = null,
  growthEngineAsOf = null,
  companyCode,
  companyName,
}: FutureGrowthSectionProps) {
  const summary = buildGrowthSummary(outlook);
  const growthScore = outlook?.growthScore ?? null;
  const growthBand =
    typeof growthScore === "number"
      ? GROWTH_BANDS[bandForGrowthScore(growthScore)]
      : null;
  const growthUpdatedAt = formatShortDate(outlook?.updatedAtRaw);
  const hasDeepDive = Boolean(
    outlook?.scenarios?.base ||
      outlook?.scenarios?.upside ||
      outlook?.scenarios?.downside,
  );
  // Earnings ladder (Phase 5 v8). The cards lead with revenue growth (the
  // issuer-guided read); an earnings line is shown only when the pipeline
  // bridged it through a quantified issuer margin target — a flat-margin
  // fallback would just repeat the revenue number under a stronger label.
  const marginPath = outlook?.marginPath ?? null;
  const earningsLadder = outlook?.earningsLadder ?? null;
  const earningsBridged = isEarningsBridged(outlook);
  const marginMetricLabel = (earningsLadder?.metric ?? marginPath?.metric ?? "").toUpperCase();
  const currentMarginLabel =
    typeof marginPath?.currentPct === "number" ? `${marginPath.currentPct.toFixed(1)}%` : null;

  return (
    <SectionCard
      id="future-growth"
      title="Future Growth Prospects"
      feedbackEnabled={Boolean(outlook)}
      feedbackCompanyCode={companyCode}
      feedbackCompanyName={companyName}
      headerAction={<SectionUpdatedAt date={growthUpdatedAt} />}
    >
        {outlook ? (
          <div className="flex flex-col gap-4">
            {summary && (
              <div
                className={
                  growthEngine
                    ? "grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]"
                    : undefined
                }
              >
                <GrowthSummaryCard
                  summary={summary}
                  scorePill={
                    <GrowthScorePill outlook={outlook} growthScore={growthScore} growthBand={growthBand} />
                  }
                />
                {growthEngine ? (
                  <StrategyNarrativeCard strategy={growthEngine} asOf={growthEngineAsOf} />
                ) : null}
              </div>
            )}
            {!summary && growthEngine ? (
              <StrategyNarrativeCard strategy={growthEngine} asOf={growthEngineAsOf} />
            ) : null}

            {outlook.catalysts.length > 0 && (
              <div className={`${elevatedBlockClass} p-4 space-y-3`}>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-foreground/90 font-semibold">
                      Top 3 Growth Catalysts
                    </p>
                    {outlook.alsoConsidered.length > 0 && (
                      <Drawer direction="right">
                        <DrawerTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            data-drawer-type="other-catalysts"
                            className="h-7 rounded-full border-border/60 bg-background/70 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground shadow-none hover:bg-accent"
                          >
                            Other catalysts
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent className="w-full max-w-xl">
                          <DrawerHeader className="border-b border-border">
                            <DrawerTitle>Other catalysts</DrawerTitle>
                            <DrawerDescription>
                              Secondary growth candidates screened but not included in the top catalyst set.
                            </DrawerDescription>
                          </DrawerHeader>
                          <div className="space-y-3 overflow-y-auto px-4 py-4">
                            {outlook.alsoConsideredNote && (
                              <div className={`${nestedDetailClass} px-3 py-2.5`}>
                                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                  Note
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                                  {outlook.alsoConsideredNote}
                                </p>
                              </div>
                            )}
                            {outlook.alsoConsidered
                              .slice(0, 2)
                              .map((item, idx) => (
                                <div
                                  key={`also-considered-drawer-visible-${idx}`}
                                  className={`${nestedDetailClass} px-3 py-2.5 space-y-1.5`}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    {item.catalyst && (
                                      <p className="text-[12px] font-medium leading-snug text-foreground">
                                        {item.catalyst}
                                      </p>
                                    )}
                                    {item.currentStage && (
                                      <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                        {toDisplayLabel(item.currentStage) ?? formatCompactLabel(item.currentStage)}
                                      </span>
                                    )}
                                  </div>
                                  {item.whyNotTop3 && (
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                                      {item.whyNotTop3}
                                    </p>
                                  )}
                                </div>
                              ))}
                            {outlook.alsoConsidered.length > 2 && (
                              <details className="border-t border-border/35 pt-2">
                                <summary className="cursor-pointer list-none text-[10px] text-muted-foreground hover:text-foreground">
                                  Show more ({outlook.alsoConsidered.length - 2})
                                </summary>
                                <div className="mt-2 space-y-3">
                                  {outlook.alsoConsidered
                                    .slice(2)
                                    .map((item, idx) => (
                                      <div
                                        key={`also-considered-drawer-extra-${idx}`}
                                        className={`${nestedDetailClass} px-3 py-2.5 space-y-1.5`}
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          {item.catalyst && (
                                            <p className="text-[12px] font-medium leading-snug text-foreground">
                                              {item.catalyst}
                                            </p>
                                          )}
                                          {item.currentStage && (
                                            <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                              {toDisplayLabel(item.currentStage) ?? formatCompactLabel(item.currentStage)}
                                            </span>
                                          )}
                                        </div>
                                        {item.whyNotTop3 && (
                                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                                            {item.whyNotTop3}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </details>
                            )}
                          </div>
                          <DrawerFooter className="border-t border-border">
                            <DrawerClose asChild>
                              <Button variant="outline">Close</Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </DrawerContent>
                      </Drawer>
                    )}
                  </div>
                </div>
                <ol className="mt-1">
                  {rankCatalysts(outlook.catalysts)
                    .slice(0, 3)
                    .map((c, idx) => {
                      const timelineItems = c.timelineItems;
                      const hasTimelineDetails = timelineItems.length > 0;
                      const statusDisplay = getCatalystStatusDisplay(c.statusTag);
                      const quantifiedLabel = formatCatalystQuantifiedLabel(c);
                      const quantifiedDisplay = splitCatalystQuantifiedLabel(quantifiedLabel);
                      const whatIsChanging =
                        c.whatIsChanging ??
                        c.evidenceLines.map((line) => line.text).find((line) => Boolean(line)) ??
                        null;
                      const whyItMatters =
                        c.whyItMatters ??
                        c.evidenceLines.map((line) => line.text).find((line) => line !== whatIsChanging) ??
                        null;
                      return (
                        <li
                          key={idx}
                          className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-t border-border/35 py-3.5 first:border-t-0 md:grid-cols-[1.75rem_minmax(0,1fr)_minmax(11rem,13rem)] md:items-center md:gap-4"
                        >
                          <span
                            aria-hidden="true"
                            className="text-lg font-bold leading-none text-sky-300 tabular-nums dark:text-sky-500/80"
                          >
                            {idx + 1}
                          </span>

                          <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              {c.catalyst && (
                                <p className="text-[15px] font-semibold leading-snug text-foreground">
                                  {c.catalyst}
                                </p>
                              )}
                              {statusDisplay && (
                                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] ${statusDisplay.className}`}>
                                  {statusDisplay.label}
                                </span>
                              )}
                              {c.type && (
                                <span className={chipClass("sky")}>
                                  {toDisplayLabel(c.type) ?? c.type}
                                </span>
                              )}
                              {hasTimelineDetails && (
                                <CatalystTrackerDrawer
                                  catalyst={c}
                                  timelineItems={timelineItems}
                                />
                              )}
                            </div>
                            {(whatIsChanging || whyItMatters) && (
                              <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                                {whatIsChanging}
                                {whatIsChanging && whyItMatters ? " — " : ""}
                                {whyItMatters}
                              </p>
                            )}
                          </div>

                          <div className="col-start-2 md:col-start-3 md:text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Growth Impact
                            </p>
                            {quantifiedLabel ? (
                              <>
                                <p className="text-lg font-bold leading-[1.1] tracking-tight text-foreground">
                                  {quantifiedDisplay.headline ?? quantifiedLabel}
                                </p>
                                {quantifiedDisplay.subline && (
                                  <p className="text-[11px] leading-snug text-muted-foreground">
                                    {quantifiedDisplay.subline}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-[13px] text-muted-foreground">
                                Not quantified
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ol>
              </div>
            )}
            {hasDeepDive && (
              <div className={`${nestedDetailClass} px-3 py-2.5 space-y-3`}>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/90">
                    Scenario Analysis
                  </p>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Bear, base, and bull cases side by side — base case is the anchor read.
                  </p>
                  {earningsBridged && marginPath ? (
                    <div className="space-y-1">
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Revenue growth is the headline. Earnings growth is bridged from it through the
                        issuer&rsquo;s own {marginMetricLabel} margin target
                        {currentMarginLabel ? `: ${currentMarginLabel}` : ""}
                        {marginPath.currentPeriod ? ` in ${marginPath.currentPeriod}` : ""}
                        {marginPath.guidedPct ? ` to ${marginPath.guidedPct}` : ""}
                        {marginPath.guidedPeriod ? ` by ${marginPath.guidedPeriod}` : ""}
                        {earningsLadder?.metric && earningsLadder.metric !== "pat"
                          ? `. ${marginMetricLabel} growth stands in for earnings growth.`
                          : "."}
                      </p>
                      {(marginPath.currentSnippet || marginPath.guidedSnippet) && (
                        <details className="group">
                          <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
                            <span className="group-open:hidden">Margin source</span>
                            <span className="hidden group-open:inline">Hide margin source</span>
                          </summary>
                          <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-muted-foreground">
                            {marginPath.currentSnippet && (
                              <li>&ldquo;{marginPath.currentSnippet}&rdquo;</li>
                            )}
                            {marginPath.guidedSnippet && (
                              <li>&ldquo;{marginPath.guidedSnippet}&rdquo;</li>
                            )}
                          </ul>
                        </details>
                      )}
                    </div>
                  ) : marginPath?.direction && marginPath.direction !== "unknown" ? (
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      Earnings are read as growing with revenue: the issuer describes
                      {marginMetricLabel ? ` ${marginMetricLabel}` : ""} margins as{" "}
                      {marginPath.direction} but gives no quantified target.
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-start">
                  {(["downside", "base", "upside"] as const).map((key) => {
                    const scenario = outlook.scenarios?.[key] as
                      | NormalizedGrowthScenario
                      | null
                      | undefined;
                    if (!scenario) return null;
                    const isBase = key === "base";
                    const tone = getScenarioChipTone(key);
                    const label =
                      key === "downside"
                        ? "Bear"
                        : key === "upside"
                          ? "Bull"
                          : "Base case";
                    const conf =
                      typeof scenario.confidence === "number"
                        ? Math.round(scenario.confidence * 100)
                        : null;
                    return (
                      <div
                        key={key}
                        className={`${nestedDetailClass} flex flex-col gap-2 p-3 ${
                          isBase
                            ? "border-emerald-300/60 shadow-md shadow-black/20 dark:border-emerald-700/40"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={
                              isBase
                                ? chipClass("emerald")
                                : `${chipClass("slate")} capitalize`
                            }
                          >
                            {label}
                          </span>
                          {conf != null && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {conf}% conf.
                            </span>
                          )}
                        </div>
                        {scenario.growth && (
                          <div className="space-y-0.5">
                            {earningsBridged && (
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Revenue
                              </p>
                            )}
                            <p
                              className={`text-2xl font-bold leading-none ${
                                isBase
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-foreground"
                              }`}
                            >
                              {String(scenario.growth)}
                            </p>
                          </div>
                        )}
                        {earningsBridged && scenario.earningsGrowth && (
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Earnings
                            </span>
                            <span
                              className={`text-sm font-semibold tabular-nums ${
                                isBase
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-foreground"
                              }`}
                            >
                              {scenario.earningsGrowth}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {scenario.earningsBasis?.startsWith("guided_margin") &&
                              scenario.marginAtHorizon
                                ? `at ${scenario.marginAtHorizon} ${marginMetricLabel} margin`
                                : "margins held flat"}
                            </span>
                          </div>
                        )}
                        {conf != null && (
                          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                tone === "emerald"
                                  ? "bg-emerald-500"
                                  : tone === "sky"
                                    ? "bg-sky-500"
                                    : "bg-amber-500"
                              }`}
                              style={{ width: `${conf}%` }}
                            />
                          </div>
                        )}
                        {scenario.summary && (
                          <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
                            {scenario.summary}
                          </p>
                        )}
                        {renderScenarioDetails(scenario)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        ) : (
          <MissingSectionState
            companyCode={companyCode}
          companyName={companyName}
          sectionId="future-growth"
          sectionTitle="Future Growth Prospects"
          description="We have not generated forward growth outlook analysis for this company yet."
        />
      )}
    </SectionCard>
  );
}
