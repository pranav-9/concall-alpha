import { History } from "lucide-react";
import type {
  NormalizedGuidanceSnapshot,
  NormalizedPriorTwoYearAccuracyRow,
} from "@/lib/guidance-snapshot/types";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPctLabel } from "../[code]/page-helpers";
import {
  formatCompactLabel,
  getGuidanceAccuracyVerdictDisplay,
  getGuidanceCredibilityVerdictDisplay,
  getGuidanceSignalTrendDisplay,
  getGuidanceSnapshotStyleDisplay,
} from "../[code]/display-tokens";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";

function AccuracyRow({
  row,
  index,
}: {
  row: NormalizedPriorTwoYearAccuracyRow;
  index: number;
}) {
  const verdictDisplay = getGuidanceAccuracyVerdictDisplay(row.verdict);
  // When the verdict is "not_assessable" the producer fills `signalSummary`
  // and `reason` with placeholder strings ("No tracked guidance targets fall
  // in this FY." / "No guidance threads with target_period in this FY.").
  // Suppress those blocks and show a single explanatory line instead so the
  // card doesn't render half-empty boilerplate.
  const isNotAssessable = row.verdict === "not_assessable";

  return (
    <div
      key={`${row.fiscalYear ?? "year"}-${index}`}
      className={`${nestedDetailClass} p-3 space-y-1.5`}
    >
      <div className="flex flex-wrap items-start justify-between gap-1.5">
        <p className="text-[11px] font-semibold text-foreground">
          {row.fiscalYear ?? "Prior year"}
        </p>
        {verdictDisplay && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] ${verdictDisplay.className}`}
          >
            {verdictDisplay.label}
          </span>
        )}
      </div>

      {/*
        Section order: Guidance given → Actual outcome → Why.
        Reader's question is "did management hit FY?". You need the promise
        before the result before the explanation. Placing the actual outcome
        after the guidance keeps the reading flow intuitive.
      */}
      {!isNotAssessable && row.signalSummary && (
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            Guidance given
          </p>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {row.signalSummary}
          </p>
        </div>
      )}
      {row.actualOutcome && (
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            Actual outcome
          </p>
          <p className="text-[10px] leading-relaxed text-foreground">{row.actualOutcome}</p>
        </div>
      )}
      {!isNotAssessable && row.reason && (
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
            Why
          </p>
          <p className="text-[10px] leading-relaxed text-muted-foreground/90">{row.reason}</p>
        </div>
      )}
      {isNotAssessable && (
        <p className="text-[10px] leading-relaxed text-muted-foreground italic">
          No tracked guidance targets had {row.fiscalYear ?? "this FY"} as their target period — verdict not assessable.
        </p>
      )}
    </div>
  );
}

export function GuidanceSnapshotSummary({
  snapshot,
}: {
  snapshot: NormalizedGuidanceSnapshot | null;
}) {
  if (!snapshot) return null;

  const styleCard = snapshot.guidanceStyleClassification;
  const bigPicture = snapshot.bigPictureGrowthGuidance;
  const currentYear = snapshot.currentYearRevenueGuidance;
  const priorAccuracy = snapshot.priorTwoYearAccuracy;
  const credibilityVerdict = snapshot.credibilityVerdict;
  const styleDisplay = styleCard
    ? getGuidanceSnapshotStyleDisplay(styleCard.style)
    : null;
  const bigPictureTrendDisplay = bigPicture
    ? getGuidanceSignalTrendDisplay(bigPicture.statusSinceFirst)
    : null;
  const currentYearTrendDisplay = currentYear
    ? getGuidanceSignalTrendDisplay(currentYear.signalTrend)
    : null;
  const credibilityVerdictDisplay = credibilityVerdict
    ? getGuidanceCredibilityVerdictDisplay(credibilityVerdict.verdict)
    : null;

  if (
    !styleCard &&
    !bigPicture &&
    !currentYear &&
    !credibilityVerdict &&
    priorAccuracy.length === 0
  )
    return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <section className={`${elevatedBlockClass} p-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Direction style
              </p>
            </div>

            {styleDisplay && (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${styleDisplay.className}`}
              >
                {styleDisplay.label}
              </span>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {styleCard?.rationale ? (
              <p className="text-[12px] leading-relaxed text-foreground">{styleCard.rationale}</p>
            ) : null}
          </div>
        </section>

        <section className={`${elevatedBlockClass} p-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Big picture growth
              </p>
            </div>

            {bigPictureTrendDisplay && (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${bigPictureTrendDisplay.className}`}
              >
                {bigPictureTrendDisplay.label}
              </span>
            )}
          </div>

          {(bigPicture?.headlineStatement || bigPicture?.currentStatement) && (
            <p className="mt-3 text-[12px] font-semibold leading-relaxed text-foreground">
              {bigPicture.headlineStatement ?? bigPicture.currentStatement}
            </p>
          )}
        </section>

        <section className={`${elevatedBlockClass} p-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Credibility verdict
              </p>
            </div>

            {credibilityVerdictDisplay && (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${credibilityVerdictDisplay.className}`}
              >
                {credibilityVerdictDisplay.label}
              </span>
            )}
          </div>

          {credibilityVerdict?.supportingLine ? (
            <p className="mt-3 text-[12px] leading-relaxed text-foreground">
              {credibilityVerdict.supportingLine}
            </p>
          ) : null}
        </section>
      </div>

      {(currentYear || priorAccuracy.length > 0) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {currentYear && (
            <section className={`${elevatedBlockClass} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    This year guidance
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {currentYear.fiscalYear && (
                    <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                      {currentYear.fiscalYear}
                    </span>
                  )}
                  {currentYear.officialCurrentGuidancePercent != null && (
                    <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                      {formatPctLabel(currentYear.officialCurrentGuidancePercent)}
                    </span>
                  )}
                  {currentYearTrendDisplay && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${currentYearTrendDisplay.className}`}
                    >
                      {currentYearTrendDisplay.label}
                    </span>
                  )}
                  {/*
                    The previous "Anchored Q4 FY26" chip and the per-quarter
                    "Guidance evolution" sidebar are now rolled into a single
                    icon-button drawer trigger — same pattern as the per-thread
                    trail on the Guidance Tracker. The drawer header surfaces
                    the anchored quarter; the body shows the per-quarter
                    timeline.
                  */}
                  {currentYear.sourceQuarterTimeline.length > 0 ? (
                    <Drawer direction="right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DrawerTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label="Open guidance evolution"
                              className="relative size-7 rounded-full border-border/60 bg-background/70 text-muted-foreground shadow-none hover:bg-accent hover:text-foreground"
                            >
                              <History className="size-3.5" />
                              <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full border border-background bg-emerald-500 px-1 text-[10px] font-semibold leading-4 text-background">
                                {currentYear.sourceQuarterTimeline.length}
                              </span>
                            </Button>
                          </DrawerTrigger>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>
                          View guidance evolution
                        </TooltipContent>
                      </Tooltip>
                      <DrawerContent className="w-full max-w-xl">
                        <DrawerHeader className="border-b border-border">
                          <DrawerTitle className="text-[14px] leading-snug">
                            Guidance evolution
                          </DrawerTitle>
                          <DrawerDescription>
                            <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              {currentYear.fiscalYear ? (
                                <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {currentYear.fiscalYear}
                                </span>
                              ) : null}
                              {currentYear.officialCurrentGuidanceSourceQuarter ? (
                                <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  Anchored {currentYear.officialCurrentGuidanceSourceQuarter}
                                </span>
                              ) : null}
                              <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {currentYear.sourceQuarterTimeline.length} quarter
                                {currentYear.sourceQuarterTimeline.length === 1 ? "" : "s"}
                              </span>
                            </span>
                          </DrawerDescription>
                        </DrawerHeader>
                        <div className="space-y-2 overflow-y-auto px-4 py-4">
                          {currentYear.sourceQuarterTimeline.map((entry, index) => (
                            <div
                              key={`${entry.quarter ?? "quarter"}-${index}`}
                              className={`${nestedDetailClass} space-y-1.5 px-3 py-2.5`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  {entry.quarter && (
                                    <p className="text-[10px] font-semibold text-foreground">
                                      {entry.quarter}
                                    </p>
                                  )}
                                  {entry.guidanceType && (
                                    <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                      {formatCompactLabel(entry.guidanceType)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {entry.guidancePercent != null && (
                                    <span className="rounded-full border border-emerald-200/70 bg-emerald-100/70 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                                      {formatPctLabel(entry.guidancePercent)}
                                    </span>
                                  )}
                                  {entry.sourceReference && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {entry.sourceReference}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {entry.whatWasSaid && (
                                <p className="text-[10px] leading-relaxed text-muted-foreground">
                                  {entry.whatWasSaid}
                                </p>
                              )}
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
                  ) : null}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {(currentYear.officialCurrentGuidanceText ||
                  currentYear.consolidatedStatement) && (
                  <div className={`${nestedDetailClass} p-3`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Guidance line
                    </p>
                    <p className="mt-2 text-[12px] font-semibold leading-relaxed text-foreground">
                      {currentYear.officialCurrentGuidanceText ??
                        currentYear.consolidatedStatement}
                    </p>
                    {currentYear.consolidatedStatement &&
                      currentYear.consolidatedStatement !==
                        currentYear.officialCurrentGuidanceText && (
                        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                          {currentYear.consolidatedStatement}
                        </p>
                      )}
                  </div>
                )}

                {currentYear.inYearRevisionNote && (
                  <div className={`${nestedDetailClass} p-3`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
                      Revision note
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-foreground">
                      {currentYear.inYearRevisionNote}
                    </p>
                  </div>
                )}
                {/*
                  The "Evidence quarters" row of bare quarter pills used to
                  live here. Removed because the per-quarter timeline drawer
                  (triggered by the History icon button in the card header)
                  shows the same quarters with richer per-quarter context.
                */}
              </div>
            </section>
          )}

          {priorAccuracy.length > 0 && (
            <section className={`${elevatedBlockClass} p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Previous two-year guidance data
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {priorAccuracy.length} year{priorAccuracy.length === 1 ? "" : "s"} tracked
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5 xl:grid-cols-2">
                {priorAccuracy.map((row, index) => (
                  <AccuracyRow key={`${row.fiscalYear ?? "year"}-${index}`} row={row} index={index} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
