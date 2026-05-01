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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import ConcallScore from "@/components/concall-score";
import type {
  NormalizedGrowthOutlook,
  NormalizedGrowthScenario,
} from "@/lib/growth-outlook/types";
import { formatShortDate, pctFormatter } from "../[code]/page-helpers";
import {
  formatCatalystQuantifiedLabel,
  formatCompactLabel,
  getCatalystConfidenceDisplay,
  getCatalystImpactPillDisplay,
  getCatalystStatusDisplay,
  getGrowthScoreComponentLabel,
  getTimelineStageDisplay,
  splitCatalystQuantifiedLabel,
  toDisplayLabel,
} from "../[code]/display-tokens";
import { SectionCard } from "./section-card";
import { MissingSectionState } from "./missing-section-state";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";

function getScenarioTone(scenarioKey: "base" | "upside" | "downside") {
  return scenarioKey === "base"
    ? {
        accentClass: "border-l-emerald-500/70",
        growthBadgeClass:
          "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/35 dark:text-emerald-100",
      }
    : scenarioKey === "upside"
      ? {
          accentClass: "border-l-sky-500/70",
          growthBadgeClass:
            "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/35 dark:text-sky-100",
        }
      : {
          accentClass: "border-l-amber-500/70",
          growthBadgeClass:
            "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/35 dark:text-amber-100",
        };
}

function renderBaseScenarioCard(outlook: NormalizedGrowthOutlook) {
  const scenario = outlook.scenarios?.base as
    | NormalizedGrowthScenario
    | null
    | undefined;
  if (!scenario) return null;

  const drivers = scenario.drivers.slice(0, 3);
  const risks = scenario.risks.slice(0, 3);
  const fallbackDescription = (scenario.summary ?? "").trim();
  const primaryRisk = (scenario.risks[0] ?? "").trim();
  const riskWatch = (scenario.riskWatch ?? "").trim();
  const riskWatchValue = riskWatch || primaryRisk;
  const growthValue = scenario.growth;
  const marginValue = scenario.ebitdaMargin;
  const tone = getScenarioTone("base");

  return (
    <div className={`${elevatedBlockClass} flex flex-col p-3 space-y-3 border-l-2 ${tone.accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold uppercase tracking-wide">
          Base case
        </span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {growthValue && (
            <span className={`rounded-full border px-3 py-1 text-[18px] font-bold leading-none ${tone.growthBadgeClass}`}>
              {String(growthValue)}
            </span>
          )}
          {typeof scenario.confidence === "number" && (
            <span className="rounded-full border border-border/60 bg-muted/80 px-2.5 py-0.5 text-[10px] font-medium text-foreground">
              Confidence {(scenario.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        {marginValue && (
          <span className="px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/35 dark:text-sky-100 dark:border-sky-700/40">
            EBITDA margin: {String(marginValue)}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
          Quick takeaway
        </p>
        {fallbackDescription ? (
          <p className="text-[11px] text-foreground leading-snug line-clamp-2">
            {fallbackDescription}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground leading-snug">
            No quick takeaway provided.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="space-y-1.5 rounded-lg border border-emerald-200/50 bg-emerald-50/55 p-2.5 dark:border-emerald-700/25 dark:bg-emerald-900/15">
          <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold">
            Drivers
          </p>
          <ul className="space-y-1">
            {drivers.length > 0 ? (
              drivers.map((driver, idx) => (
                <li
                  key={idx}
                  className="rounded-sm border-l border-emerald-400/60 pl-2 text-[11px] leading-snug text-foreground"
                >
                  {driver}
                </li>
              ))
            ) : (
              <li className="text-[11px] leading-snug text-muted-foreground">
                No driver details provided.
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-1.5 rounded-lg border border-rose-200/50 bg-rose-50/55 p-2.5 dark:border-rose-700/25 dark:bg-rose-900/15">
          <p className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold">
            Risks
          </p>
          <ul className="space-y-1">
            {risks.length > 0 ? (
              risks.map((risk, idx) => (
                <li
                  key={idx}
                  className="rounded-sm border-l border-rose-400/60 pl-2 text-[11px] leading-snug text-foreground"
                >
                  {risk}
                </li>
              ))
            ) : (
              <li className="text-[11px] leading-snug text-muted-foreground">
                No risk details provided.
              </li>
            )}
          </ul>
        </div>
      </div>

      {riskWatchValue && (
        <div className="rounded-lg border border-amber-200/50 bg-amber-50/55 px-2.5 py-2 dark:border-amber-700/25 dark:bg-amber-900/15">
          <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold">
            Risk watch
          </p>
          <p className="mt-1 text-[11px] leading-snug text-foreground">
            {riskWatchValue}
          </p>
        </div>
      )}
    </div>
  );
}

function renderCompactScenarioCard(
  outlook: NormalizedGrowthOutlook,
  scenarioKey: "upside" | "downside",
) {
  const scenario = outlook.scenarios?.[scenarioKey] as
    | NormalizedGrowthScenario
    | null
    | undefined;
  if (!scenario) return null;
  const drivers = scenario.drivers;
  const risks = scenario.risks;
  const visibleDrivers = drivers.slice(0, 2);
  const visibleRisks = risks.slice(0, 2);
  const primaryRisk = (risks[0] ?? "").trim();
  const fallbackDescription = (scenario.summary ?? "").trim();
  const riskWatch = (scenario.riskWatch ?? "").trim();
  const riskWatchValue = riskWatch || primaryRisk;
  const growthValue = scenario.growth;
  const marginValue = scenario.ebitdaMargin;
  const tone = getScenarioTone(scenarioKey);
  const hasDetailContent =
    visibleDrivers.length > 0 || visibleRisks.length > 0 || Boolean(riskWatchValue);
  const detailsLabel =
    visibleDrivers.length > 0 || visibleRisks.length > 0
      ? `Show details (${visibleDrivers.length} drivers, ${visibleRisks.length} risks)`
      : "Show details";

  return (
    <div
      key={scenarioKey}
      className={`${elevatedBlockClass} flex h-full flex-col p-3 space-y-3 border-l-2 ${tone.accentClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold uppercase tracking-wide">
          {scenarioKey} case
        </span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {growthValue && (
            <span className={`rounded-full border px-3 py-1 text-[18px] font-bold leading-none ${tone.growthBadgeClass}`}>
              {String(growthValue)}
            </span>
          )}
          {typeof scenario.confidence === "number" && (
            <span className="rounded-full border border-border/60 bg-muted/80 px-2.5 py-0.5 text-[10px] font-medium text-foreground">
              Confidence {(scenario.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        {marginValue && (
          <span className="px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/35 dark:text-sky-100 dark:border-sky-700/40">
            EBITDA margin: {String(marginValue)}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
          Quick takeaway
        </p>
        <div className="space-y-1">
          {fallbackDescription ? (
            <p className="text-[11px] text-foreground leading-snug line-clamp-2">
              {fallbackDescription}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground leading-snug">
              No quick takeaway provided.
            </p>
          )}
          {!fallbackDescription && !riskWatchValue ? (
            <p className="text-[11px] text-muted-foreground leading-snug">
              No primary risk provided.
            </p>
          ) : null}
        </div>
      </div>

      {hasDetailContent && (
        <details className={`group ${nestedDetailClass} px-2 py-1.5`}>
          <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground list-none">
            <span className="group-open:hidden">{detailsLabel}</span>
            <span className="hidden group-open:inline">Hide details</span>
          </summary>
          <div className="mt-2 space-y-2">
            {visibleDrivers.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold">
                  Drivers
                </p>
                <ul className="space-y-1">
                  {visibleDrivers.map((driver, idx) => (
                    <li
                      key={idx}
                      className="text-[11px] text-foreground leading-snug rounded-sm border-l border-emerald-400/60 pl-2"
                    >
                      {driver}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {visibleRisks.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-red-700 dark:text-red-300 font-semibold">
                  Risks
                </p>
                <ul className="space-y-1">
                  {visibleRisks.map((risk, idx) => (
                    <li
                      key={idx}
                      className="text-[11px] text-foreground leading-snug rounded-sm border-l border-red-400/60 pl-2"
                    >
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {riskWatchValue && (
              <div className="rounded-lg border border-amber-200/50 bg-amber-50/55 px-2.5 py-2 dark:border-amber-700/25 dark:bg-amber-900/15">
                <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold">
                  Risk watch
                </p>
                <p className="mt-1 text-[11px] leading-snug text-foreground">
                  {riskWatchValue}
                </p>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function buildHeaderPills(
  outlook: NormalizedGrowthOutlook | null,
  hasDeepDive: boolean,
): string[] {
  if (!outlook) return [];
  return [
    outlook.summaryBullets.length > 0 ||
    outlook.growthScoreComponents.length > 0 ||
    outlook.baseGrowthPct
      ? "Summary"
      : null,
    outlook.catalysts.length > 0 ? "Top catalysts" : null,
    hasDeepDive ? "Scenarios" : null,
  ].filter((value): value is string => Boolean(value));
}

type FutureGrowthSectionProps = {
  outlook: NormalizedGrowthOutlook | null;
  companyCode: string;
  companyName: string | null;
};

export function FutureGrowthSection({
  outlook,
  companyCode,
  companyName,
}: FutureGrowthSectionProps) {
  const growthScore = outlook?.growthScore ?? null;
  const growthUpdatedAt = formatShortDate(outlook?.updatedAtRaw, true);
  const hasDeepDive = Boolean(
    outlook?.scenarios?.base ||
      outlook?.scenarios?.upside ||
      outlook?.scenarios?.downside,
  );
  const headerPills = buildHeaderPills(outlook, hasDeepDive);

  return (
    <SectionCard
      id="future-growth"
      title="Future Growth Prospects"
      headerPills={headerPills}
      headerAction={
        typeof growthScore === "number" ? <ConcallScore score={growthScore} size="sm" /> : undefined
      }
    >
        {outlook ? (
          <div className="flex flex-col gap-4">
            {(outlook.summaryBullets.length > 0 ||
              outlook.growthScoreComponents.length > 0) && (
              <div className={`${elevatedBlockClass} p-3 space-y-2`}>
                {outlook.summaryBullets.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                        Summary
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {outlook.growthScoreComponents.length > 0 && (
                          <Drawer direction="right">
                            <DrawerTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-full border-border/60 bg-background/70 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-none hover:bg-accent"
                              >
                                View score breakdown
                              </Button>
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
                                  {outlook.growthScoreComponents.map((component) => (
                                    <div
                                      key={component.key}
                                      className="rounded-lg border border-border/30 bg-background/70 px-3 py-2.5"
                                    >
                                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                                        {getGrowthScoreComponentLabel(component.key)}
                                      </p>
                                      <p className="mt-1 text-[18px] font-semibold leading-none text-foreground">
                                        {pctFormatter.format(component.score)}
                                        <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                                          /10
                                        </span>
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <DrawerFooter className="border-t border-border">
                                <DrawerClose asChild>
                                  <Button variant="outline">Close</Button>
                                </DrawerClose>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                        )}
                        {growthUpdatedAt && (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-foreground border border-border/60 text-[10px]">
                            Updated: {growthUpdatedAt}
                          </span>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {outlook.summaryBullets.slice(0, 5).map((bullet, idx) => (
                        <li key={idx} className="text-[11px] text-foreground leading-snug">
                          • {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            )}

            {outlook.catalysts.length > 0 && (
              <div className={`${elevatedBlockClass} p-3 space-y-3`}>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-foreground/90 font-semibold">
                      Top 3 Growth Catalysts
                    </p>
                    {outlook.alsoConsidered.length > 0 && (
                      <Drawer direction="right">
                        <DrawerTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-full border-border/60 bg-background/70 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-none hover:bg-accent"
                          >
                            View also considered
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent className="w-full max-w-xl">
                          <DrawerHeader className="border-b border-border">
                            <DrawerTitle>Also considered</DrawerTitle>
                            <DrawerDescription>
                              Secondary growth candidates screened but not included in the top catalyst set.
                            </DrawerDescription>
                          </DrawerHeader>
                          <div className="space-y-3 overflow-y-auto px-4 py-4">
                            {outlook.alsoConsideredNote && (
                              <div className="rounded-lg border border-border/30 bg-muted/25 px-3 py-2.5">
                                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
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
                                  className="rounded-lg border border-border/30 bg-background/70 px-3 py-2.5 space-y-1.5"
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
                                        className="rounded-lg border border-border/30 bg-background/70 px-3 py-2.5 space-y-1.5"
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
                  {outlook.discoverySummary &&
                    (outlook.discoverySummary.selectedCount != null ||
                      outlook.discoverySummary.totalCandidatesConsidered != null ||
                      outlook.discoverySummary.selectionPriorityStack) && (
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {[
                          outlook.discoverySummary.selectedCount != null &&
                          outlook.discoverySummary.totalCandidatesConsidered != null
                            ? `${outlook.discoverySummary.selectedCount} selected from ${outlook.discoverySummary.totalCandidatesConsidered} candidates`
                            : null,
                          outlook.discoverySummary.selectionPriorityStack
                            ? formatCompactLabel(
                                outlook.discoverySummary.selectionPriorityStack,
                              ).replace(/>/g, " > ")
                            : null,
                        ]
                          .filter((value): value is string => Boolean(value))
                          .join(" · ")}
                      </p>
                    )}
                </div>
                <Carousel opts={{ align: "start" }} className="w-full">
                  <CarouselContent className="items-stretch">
                    {[...outlook.catalysts]
                      .sort((a, b) => {
                        const aPriority = a.priority?.weightedPriority;
                        const bPriority = b.priority?.weightedPriority;

                        if (aPriority == null && bPriority == null) return 0;
                        if (aPriority == null) return 1;
                        if (bPriority == null) return -1;
                        return bPriority - aPriority;
                      })
                      .slice(0, 3)
                      .map((c, idx) => {
                      const timelineItems = c.timelineItems;
                      const hasTimelineDetails = timelineItems.length > 0;
                      const statusDisplay = getCatalystStatusDisplay(c.statusTag);
                      const confidenceDisplay = getCatalystConfidenceDisplay(c.pillConfidence);
                      const impactDisplay = getCatalystImpactPillDisplay(c);
                      const quantifiedLabel = formatCatalystQuantifiedLabel(c);
                      const quantifiedDisplay = splitCatalystQuantifiedLabel(quantifiedLabel);
                      const priorityLabel =
                        c.priority?.weightedPriority != null
                          ? `Priority ${pctFormatter.format(c.priority.weightedPriority)}/5`
                          : null;
                      const whatIsChanging =
                        c.whatIsChanging ??
                        c.evidenceLines.map((line) => line.text).find((line) => Boolean(line)) ??
                        null;
                      const whyItMatters =
                        c.whyItMatters ??
                        c.evidenceLines.map((line) => line.text).find((line) => line !== whatIsChanging) ??
                        null;
                      const catalystAccentClass =
                        c.expectedImpact === "revenue"
                          ? "before:bg-emerald-400/90"
                          : c.expectedImpact === "margin"
                            ? "before:bg-sky-400/90"
                            : "before:bg-amber-400/90";
                      const catalystDotClass =
                        c.expectedImpact === "revenue"
                          ? "bg-emerald-500"
                          : c.expectedImpact === "margin"
                            ? "bg-sky-500"
                            : "bg-amber-500";

                      return (
                        <CarouselItem key={idx} className="basis-full md:basis-1/2 xl:basis-1/3">
                          <article
                            className={`${nestedDetailClass} relative flex h-full flex-col overflow-hidden p-4 before:absolute before:inset-x-0 before:top-0 before:h-1.5 ${catalystAccentClass}`}
                          >
                            <div className="flex h-full flex-1 flex-col gap-4">
                              <div className="space-y-3">
                                {c.catalyst && (
                                  <p className="min-h-[2.6rem] line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                                    {c.catalyst}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                  {statusDisplay && (
                                    <span className={`rounded-full border px-2.5 py-0.5 ${statusDisplay.className}`}>
                                      {statusDisplay.label}
                                    </span>
                                  )}
                                  {c.timing && (
                                    <span className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-foreground">
                                      {c.timing}
                                    </span>
                                  )}
                                  {c.type && (
                                    <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/35 dark:text-blue-200">
                                      {toDisplayLabel(c.type) ?? c.type}
                                    </span>
                                  )}
                                  {impactDisplay && (
                                    <span className={`rounded-full border px-2.5 py-0.5 ${impactDisplay.className}`}>
                                      {impactDisplay.label}
                                    </span>
                                  )}
                                  {confidenceDisplay && (
                                    <span className={`rounded-full border px-2.5 py-0.5 ${confidenceDisplay.className}`}>
                                      {confidenceDisplay.label}
                                    </span>
                                  )}
                                  {priorityLabel && (
                                    <span className="rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-violet-800 dark:border-violet-700/40 dark:bg-violet-900/35 dark:text-violet-200">
                                      {priorityLabel}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {quantifiedLabel && (
                                <div className="rounded-xl border border-border/35 bg-muted/15 p-3">
                                  <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                      Quantified change
                                    </p>
                                    <div className="space-y-1">
                                      <p className="text-[18px] font-semibold leading-[1.02] tracking-tight text-foreground sm:text-[20px]">
                                        {quantifiedDisplay.headline ?? quantifiedLabel ?? "Unquantified"}
                                      </p>
                                      {quantifiedDisplay.subline && (
                                        <p className="max-w-[28rem] text-[11px] leading-relaxed text-muted-foreground">
                                          {quantifiedDisplay.subline}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {(whatIsChanging || whyItMatters) && (
                                <div className="space-y-2">
                                  {whatIsChanging && (
                                    <div className="rounded-lg border border-border/35 bg-background/70 p-3 space-y-1">
                                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                        What Is Changing
                                      </p>
                                      <p className="text-[12px] leading-relaxed text-foreground">
                                        {whatIsChanging}
                                      </p>
                                    </div>
                                  )}
                                  {whyItMatters && (
                                    <div className="rounded-lg border border-emerald-200/35 bg-emerald-50/35 p-3 space-y-1 dark:border-emerald-700/25 dark:bg-emerald-900/10">
                                      <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300 font-semibold">
                                        Why It Matters
                                      </p>
                                      <p className="text-[12px] leading-relaxed text-foreground">
                                        {whyItMatters}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {c.pillDependency && (
                                <div className="rounded-lg border border-amber-200/35 bg-amber-50/35 px-3 py-2 dark:border-amber-700/25 dark:bg-amber-900/10">
                                  <p className="text-[10px] uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300 font-semibold">
                                    Key dependency
                                  </p>
                                  <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                                    {c.pillDependency}
                                  </p>
                                </div>
                              )}

                              {timelineItems.length > 0 && (
                                <div className="space-y-2.5">
                                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                    Timeline
                                  </p>
                                </div>
                              )}

                              {hasTimelineDetails && (
                                <details className="group mt-auto border-t border-border/30 pt-3">
                                  <summary className="list-none cursor-pointer">
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/25 px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/35">
                                      <div className="space-y-0.5">
                                        <span className="block text-[11px] font-medium text-foreground">
                                          Open full timeline
                                        </span>
                                        <span className="block text-[10px] text-muted-foreground">
                                          {timelineItems.length} updates across the full catalyst trail
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-medium text-muted-foreground">
                                        <span className="group-open:hidden">Open</span>
                                        <span className="hidden group-open:inline">Hide</span>
                                      </span>
                                    </div>
                                  </summary>
                                  <div className="mt-3 relative pl-6 before:absolute before:left-[8px] before:top-1 before:bottom-1 before:w-px before:bg-border/60">
                                    <ul className="space-y-3">
                                      {timelineItems.map((t, tIdx) => {
                                        const stageMeta = getTimelineStageDisplay(t.stage);
                                        const period = t.period ?? "";
                                        const source = t.source ?? "";
                                        const quote = t.quote ?? "";
                                        const delta = t.delta ?? "";

                                        return (
                                          <li
                                            key={`${idx}-timeline-extra-${tIdx}`}
                                            className="relative space-y-1.5 pl-4"
                                          >
                                            <span className={`absolute left-0 top-2 h-2.5 w-2.5 rounded-full border-2 border-background ${catalystDotClass}`} />
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <span
                                                className={`px-2 py-0.5 rounded-full uppercase tracking-wide text-[10px] ${stageMeta.className}`}
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
                                              <p className="text-[12px] leading-relaxed text-foreground">
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
                                </details>
                              )}
                            </div>
                          </article>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>

                  <div className="mt-2 flex justify-center gap-2 xl:hidden">
                    <div className="flex items-center gap-2">
                      <CarouselPrevious className="static size-9 translate-x-0 translate-y-0 border border-border bg-background/80 text-foreground hover:bg-accent" />
                      <CarouselNext className="static size-9 translate-x-0 translate-y-0 border border-border bg-background/80 text-foreground hover:bg-accent" />
                    </div>
                  </div>
                </Carousel>
              </div>
            )}
            {hasDeepDive && (
              <div className={`${nestedDetailClass} px-3 py-2.5 space-y-3`}>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/90">
                    Scenario Analysis
                  </p>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Base case spans the left column; upside and downside stack on the right.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-stretch">
                  <div>
                    {renderBaseScenarioCard(outlook)}
                  </div>
                  <div className="grid gap-3 md:h-full md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="h-full">
                      {renderCompactScenarioCard(outlook, "upside")}
                    </div>
                    <div className="h-full">
                      {renderCompactScenarioCard(outlook, "downside")}
                    </div>
                  </div>
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
