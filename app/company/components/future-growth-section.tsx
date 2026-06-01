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
import { History } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import ConcallScore from "@/components/concall-score";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import type {
  NormalizedGrowthOutlook,
  NormalizedGrowthScenario,
} from "@/lib/growth-outlook/types";
import { formatShortDate, pctFormatter } from "../[code]/page-helpers";
import {
  formatCatalystQuantifiedLabel,
  formatCompactLabel,
  getCatalystStatusDisplay,
  getGrowthScoreComponentLabel,
  getPercentileTone,
  getTimelineStageDisplay,
  splitCatalystQuantifiedLabel,
  toDisplayLabel,
} from "../[code]/display-tokens";
import { SectionCard, type SectionHeaderRankPill } from "./section-card";
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
  const scenarioChipTone = getScenarioChipTone("base");

  return (
    <div className={`${elevatedBlockClass} flex flex-col p-3 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <span className={chipClass("slate")}>Base case</span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {growthValue && (
            <span className={chipClass(scenarioChipTone)}>
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

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-foreground/90 font-semibold">
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
        <div className={`${nestedDetailClass} space-y-1.5 p-3`}>
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300 font-semibold">
              Drivers
            </p>
            {drivers.length > 0 && (
              <span className={chipClass("emerald")}>{drivers.length}</span>
            )}
          </div>
          <ul className="space-y-1">
            {drivers.length > 0 ? (
              drivers.map((driver, idx) => (
                <li
                  key={idx}
                  className="text-[11px] leading-snug text-foreground"
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

        <div className={`${nestedDetailClass} space-y-1.5 p-3`}>
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300 font-semibold">
              Risks
            </p>
            {risks.length > 0 && (
              <span className={chipClass("rose")}>{risks.length}</span>
            )}
          </div>
          <ul className="space-y-1">
            {risks.length > 0 ? (
              risks.map((risk, idx) => (
                <li
                  key={idx}
                  className="text-[11px] leading-snug text-foreground"
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
  const scenarioChipTone = getScenarioChipTone(scenarioKey);
  const hasDetailContent =
    visibleDrivers.length > 0 || visibleRisks.length > 0 || Boolean(riskWatchValue);
  const detailsLabel =
    visibleDrivers.length > 0 || visibleRisks.length > 0
      ? `Show details (${visibleDrivers.length} drivers, ${visibleRisks.length} risks)`
      : "Show details";

  return (
    <div
      key={scenarioKey}
      className={`${elevatedBlockClass} flex h-full flex-col p-3 space-y-3`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`${chipClass("slate")} capitalize`}>
          {scenarioKey} case
        </span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {growthValue && (
            <span className={chipClass(scenarioChipTone)}>
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
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-foreground/90 font-semibold">
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
      )}
    </div>
  );
}

type FutureGrowthSectionProps = {
  outlook: NormalizedGrowthOutlook | null;
  companyCode: string;
  companyName: string | null;
  rankInfo?: {
    rank: number;
    total: number;
    percentile: number;
    href?: string;
  } | null;
};

function buildGrowthRankPills(
  rankInfo: FutureGrowthSectionProps["rankInfo"],
): SectionHeaderRankPill[] {
  if (!rankInfo || rankInfo.rank == null || rankInfo.total <= 0) return [];
  const tone = getPercentileTone(rankInfo.percentile);
  return [
    {
      label: `Growth Rank ${rankInfo.rank}/${rankInfo.total}`,
      tone,
      href: rankInfo.href,
    },
    {
      label: `Top ${Math.round(rankInfo.percentile)}%`,
      tone,
      href: rankInfo.href,
    },
  ];
}

export function FutureGrowthSection({
  outlook,
  companyCode,
  companyName,
  rankInfo = null,
}: FutureGrowthSectionProps) {
  const growthScore = outlook?.growthScore ?? null;
  const growthBand =
    typeof growthScore === "number"
      ? GROWTH_BANDS[bandForGrowthScore(growthScore)]
      : null;
  const growthUpdatedAt = formatShortDate(outlook?.updatedAtRaw, true);
  const hasDeepDive = Boolean(
    outlook?.scenarios?.base ||
      outlook?.scenarios?.upside ||
      outlook?.scenarios?.downside,
  );
  const headerRankPills = buildGrowthRankPills(rankInfo);

  return (
    <SectionCard
      id="future-growth"
      title="Future Growth Prospects"
      headerRankPills={headerRankPills}
      feedbackEnabled={Boolean(outlook)}
      feedbackCompanyCode={companyCode}
      feedbackCompanyName={companyName}
      headerAction={
        growthUpdatedAt ? (
          <span className="text-[11px] text-muted-foreground">
            Updated: {growthUpdatedAt}
          </span>
        ) : undefined
      }
    >
        {outlook ? (
          <div className="flex flex-col gap-4">
            {(outlook.summaryBullets.length > 0 ||
              outlook.growthScoreComponents.length > 0) && (
              <div className={`${elevatedBlockClass} p-4 space-y-2`}>
                {outlook.summaryBullets.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-foreground/90 font-semibold">
                        Summary
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {outlook.growthScoreComponents.length > 0 && (
                          <Drawer direction="right">
                            <DrawerTrigger asChild>
                              <button
                                type="button"
                                aria-label="View growth score breakdown"
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
                                  {outlook.growthScoreComponents.map((component) => (
                                    <div
                                      key={component.key}
                                      className={`${nestedDetailClass} px-3 py-2.5`}
                                    >
                                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                        {getGrowthScoreComponentLabel(component.key)}
                                      </p>
                                      <p className="mt-1 text-2xl font-semibold leading-none text-foreground">
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
                      </div>
                    </div>
                    {outlook.summaryBullets[0] && (
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {outlook.summaryBullets[0]}
                      </p>
                    )}
                    {outlook.summaryBullets.length > 1 && (
                      <ul className="space-y-1 border-l border-border/50 pl-3">
                        {outlook.summaryBullets.slice(1, 5).map((bullet, idx) => (
                          <li
                            key={idx}
                            className="text-[11px] leading-snug text-muted-foreground"
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

              </div>
            )}

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
                      return (
                        <CarouselItem key={idx} className="basis-full md:basis-1/2 xl:basis-1/3">
                          <article
                            className={`${nestedDetailClass} relative flex h-full flex-col overflow-hidden p-4 before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-sky-500/80`}
                          >
                            <div className="flex h-full flex-1 flex-col gap-4">
                              <div className="space-y-3">
                                <div className="flex min-h-[2.6rem] items-start gap-2">
                                  {c.catalyst && (
                                    <p className="line-clamp-2 flex-1 text-base font-semibold leading-snug text-foreground">
                                      {c.catalyst}
                                    </p>
                                  )}
                                  {hasTimelineDetails && (
                                    <Drawer direction="right">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <DrawerTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon-sm"
                                              aria-label="Open catalyst tracker"
                                              className="relative size-7 rounded-full border-border/60 bg-background/70 text-muted-foreground shadow-none hover:bg-accent hover:text-foreground"
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
                                            {c.catalyst
                                              ? c.catalyst
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
                                                    key={`${idx}-timeline-drawer-${tIdx}`}
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
                                    <span className={chipClass("sky")}>
                                      {toDisplayLabel(c.type) ?? c.type}
                                    </span>
                                  )}
                                  {priorityLabel && (
                                    <span className={chipClass("slate")}>
                                      {priorityLabel}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className={`${nestedDetailClass} p-3`}>
                                <div className="space-y-2">
                                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                    Growth Impact
                                  </p>
                                  {quantifiedLabel ? (
                                    <div className="space-y-1">
                                      <p className="text-2xl font-semibold leading-[1.02] tracking-tight text-foreground">
                                        {quantifiedDisplay.headline ?? quantifiedLabel}
                                      </p>
                                      {quantifiedDisplay.subline && (
                                        <p className="max-w-[28rem] text-[11px] leading-relaxed text-muted-foreground">
                                          {quantifiedDisplay.subline}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-[13px] text-muted-foreground">
                                      Not quantified
                                    </p>
                                  )}
                                </div>
                              </div>

                              {(whatIsChanging || whyItMatters) && (
                                <div className="space-y-2">
                                  {whatIsChanging && (
                                    <div className={`${nestedDetailClass} p-3 space-y-1`}>
                                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                        What&apos;s Changing
                                      </p>
                                      <p className="text-[12px] leading-relaxed text-foreground">
                                        {whatIsChanging}
                                      </p>
                                    </div>
                                  )}
                                  {whyItMatters && (
                                    <div className={`${nestedDetailClass} p-3 space-y-1`}>
                                      <div className="flex items-center gap-2">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300 font-semibold">
                                          Why It Matters
                                        </p>
                                      </div>
                                      <p className="text-[12px] leading-relaxed text-foreground">
                                        {whyItMatters}
                                      </p>
                                    </div>
                                  )}
                                </div>
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/90">
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
