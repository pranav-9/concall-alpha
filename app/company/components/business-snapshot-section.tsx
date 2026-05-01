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
import type {
  NormalizedBusinessSnapshot,
  NormalizedHistoricalEconomics,
  NormalizedRevenueSplitHistoryRow,
  NormalizedSegmentGrowthCagr3yRow,
} from "@/lib/business-snapshot/types";
import {
  compareNullableNumbers,
  extractSortNumber,
  formatPctLabel,
  formatRangeLabel,
} from "../[code]/page-helpers";
import { formatCompactLabel } from "../[code]/display-tokens";
import { SectionCard } from "./section-card";
import { MissingSectionState } from "./missing-section-state";
import { BusinessSegmentsMosaic } from "./business-segments-mosaic";
import { HistoricalEconomicsDataPack } from "./deferred-company-sections";
import {
  elevatedBlockClass,
  nestedDetailClass,
  snapshotSubsectionClass,
} from "./surface-tokens";

const businessSnapshotSurfaceClass = `${elevatedBlockClass} p-4`;
const businessSnapshotBlockClass = elevatedBlockClass;

type DerivedState = {
  aboutHeading: string | null;
  aboutSupportingText: string | null;
  segmentEntries: NonNullable<NormalizedBusinessSnapshot["revenueBreakdown"]>["bySegment"];
  hasBusinessSegments: boolean;
  historicalEconomics: NormalizedHistoricalEconomics | null;
  hasHistoricalEconomicsSource: boolean;
  hasHistoricalEconomics: boolean;
  hasStructuredBusinessSnapshot: boolean;
  hasLegacyBusinessSnapshot: boolean;
};

function deriveState(snapshot: NormalizedBusinessSnapshot | null): DerivedState {
  const aboutCompany = snapshot?.aboutCompany ?? null;
  const revenueBreakdown = snapshot?.revenueBreakdown ?? null;
  const historicalEconomics = snapshot?.historicalEconomics ?? null;
  const hasHistoricalEconomicsSource = snapshot?.hasHistoricalEconomicsSource ?? false;
  const aboutHeading = aboutCompany?.aboutShort ?? snapshot?.businessSummaryShort ?? null;
  const aboutSupportingText = aboutCompany?.aboutLong ?? snapshot?.businessSummaryLong ?? null;
  const hasHistoricalEconomics = Boolean(
    historicalEconomics?.companyRevenueCagr3y ||
      historicalEconomics?.summary ||
      historicalEconomics?.revenueHistoryBySegment ||
      historicalEconomics?.revenueMixHistoryBySegment ||
      historicalEconomics?.revenueHistoryByUnit ||
      historicalEconomics?.revenueMixHistoryByUnit ||
      hasHistoricalEconomicsSource ||
      (historicalEconomics?.revenueSplitHistory.length ?? 0) > 0 ||
      (historicalEconomics?.segmentGrowthCagr3y.length ?? 0) > 0,
  );
  const hasStructuredBusinessSnapshot = Boolean(
    aboutHeading ||
      aboutSupportingText ||
      hasHistoricalEconomics ||
      (revenueBreakdown?.bySegment.length ?? 0) > 0 ||
      (revenueBreakdown?.byProductOrService.length ?? 0) > 0,
  );
  const hasLegacyBusinessSnapshot = Boolean(
    snapshot?.businessSummaryShort ||
      snapshot?.businessSummaryLong ||
      snapshot?.mixShiftSummary ||
      (snapshot?.topRevenueDrivers.length ?? 0) > 0 ||
      (snapshot?.keyDependencies.length ?? 0) > 0 ||
      (snapshot?.keyRisksToModel.length ?? 0) > 0,
  );
  const segmentEntries = revenueBreakdown?.bySegment ?? [];

  return {
    aboutHeading,
    aboutSupportingText,
    segmentEntries,
    hasBusinessSegments: segmentEntries.length > 0,
    historicalEconomics,
    hasHistoricalEconomicsSource,
    hasHistoricalEconomics,
    hasStructuredBusinessSnapshot,
    hasLegacyBusinessSnapshot,
  };
}

function buildHeaderPills(
  snapshot: NormalizedBusinessSnapshot | null,
  derived: DerivedState,
  hasMoatAnalysis: boolean,
): string[] {
  const {
    aboutHeading,
    aboutSupportingText,
    hasBusinessSegments,
    hasHistoricalEconomics,
    hasStructuredBusinessSnapshot,
  } = derived;

  return hasStructuredBusinessSnapshot
    ? [
        aboutHeading || aboutSupportingText ? "About" : null,
        hasBusinessSegments ? "Business segments" : null,
        hasHistoricalEconomics ? "Business Momentum" : null,
        snapshot?.mixShiftSummary ? "Mix shift" : null,
        hasMoatAnalysis ? "Moat analysis" : null,
      ].filter((value): value is string => Boolean(value))
    : [
        snapshot?.businessSummaryShort || snapshot?.businessSummaryLong ? "Summary" : null,
        snapshot?.topRevenueDrivers.length ? "Revenue drivers" : null,
        (snapshot?.keyDependencies.length ?? 0) > 0 ||
        (snapshot?.keyRisksToModel.length ?? 0) > 0
          ? "Model watchpoints"
          : null,
        snapshot?.mixShiftSummary ? "Mix shift" : null,
        hasMoatAnalysis ? "Moat analysis" : null,
      ].filter((value): value is string => Boolean(value));
}

function renderAboutBlock(
  aboutHeading: string | null,
  aboutSupportingText: string | null,
) {
  const aboutMainText = aboutHeading ?? aboutSupportingText ?? null;
  const aboutDrawerText = aboutHeading && aboutSupportingText ? aboutSupportingText : null;
  const aboutMainTextClass = aboutHeading
    ? "text-[17px] sm:text-[19px] font-semibold leading-snug text-foreground"
    : "text-[13px] leading-relaxed text-foreground";

  if (!aboutMainText) return null;

  return (
    <div className="min-w-0 rounded-2xl border border-border/20 bg-background/55 p-3 dark:bg-background/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            About
          </p>
          <p className={aboutMainTextClass}>{aboutMainText}</p>
        </div>

        {aboutDrawerText ? (
          <Drawer direction="right">
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="mt-0.5 h-8 shrink-0 rounded-full border-border/60 bg-background/70 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-none hover:bg-accent"
              >
                Know more
              </Button>
            </DrawerTrigger>
            <DrawerContent className="w-full max-w-xl">
              <DrawerHeader className="border-b border-border">
                <DrawerTitle>About</DrawerTitle>
                <DrawerDescription>
                  Additional context behind the short business summary.
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                <p className="text-[13px] leading-relaxed text-foreground">{aboutDrawerText}</p>
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
  );
}

function renderBusinessSnapshotDrawer({
  title,
  preview,
  children,
}: {
  title: string;
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <details className={`group/business-snapshot-drawer ${businessSnapshotBlockClass}`}>
      <summary className="list-none cursor-pointer px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
              {title}
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground">{preview}</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 text-[10px] font-medium text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
            <span className="group-open/business-snapshot-drawer:hidden">Show more</span>
            <span className="hidden group-open/business-snapshot-drawer:inline">
              Hide details
            </span>
          </span>
        </div>
      </summary>
      <div className="border-t border-border/35 px-4 py-3">{children}</div>
    </details>
  );
}

function renderRevenueSplitRow(
  row: NormalizedRevenueSplitHistoryRow,
  key: string,
) {
  return (
    <div key={key} className={`${snapshotSubsectionClass} p-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold text-foreground">
            {row.year ?? "Period"}
          </p>
          {row.basis && (
            <span className="text-[10px] text-muted-foreground">
              {formatCompactLabel(row.basis)}
            </span>
          )}
        </div>
      </div>
      {row.buckets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {row.buckets.map((bucket) => (
            <span
              key={`${key}-${bucket.name}`}
              className="rounded-full border border-border/55 bg-background/70 px-2 py-0.5 text-[10px] text-foreground"
            >
              {bucket.name}
              {bucket.revenueSharePercent != null
                ? ` ${formatPctLabel(bucket.revenueSharePercent)}`
                : ""}
            </span>
          ))}
        </div>
      )}
      {row.comparabilityNote && (
        <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
          {row.comparabilityNote}
        </p>
      )}
    </div>
  );
}

function renderHistoricalEconomicsCard(history: NormalizedHistoricalEconomics) {
  const hasRichHistoricalEconomics =
    Boolean(history.summary) ||
    (history.revenueHistoryBySegment?.rows.length ?? 0) > 0 ||
    (history.revenueMixHistoryBySegment?.rows.length ?? 0) > 0 ||
    (history.revenueHistoryByUnit?.rows.length ?? 0) > 0 ||
    (history.revenueMixHistoryByUnit?.rows.length ?? 0) > 0;
  const companyRevenueCagr = history.companyRevenueCagr3y;
  const hasCompanyRevenueCagr = Boolean(
    companyRevenueCagr &&
      (companyRevenueCagr.cagrPercent != null ||
        companyRevenueCagr.startYear ||
        companyRevenueCagr.endYear ||
        companyRevenueCagr.scope ||
        companyRevenueCagr.basis),
  );
  const revenueSplitRows = [...history.revenueSplitHistory].sort(
    (a, b) => extractSortNumber(b.year) - extractSortNumber(a.year),
  );
  const visibleRevenueSplitRows = revenueSplitRows.slice(0, 2);
  const extraRevenueSplitRows = revenueSplitRows.slice(2);
  const segmentGrowthRows = [...history.segmentGrowthCagr3y].sort((a, b) =>
    compareNullableNumbers(a.cagrPercent, b.cagrPercent, "desc"),
  );
  const hasSegmentGrowth = segmentGrowthRows.length > 0;
  const hasRevenueSplitHistory = revenueSplitRows.length > 0;
  const historicalMetaColumn = hasCompanyRevenueCagr || hasSegmentGrowth;
  const richSummaryCagr = history.summary?.companyRevenueCagr ?? history.companyRevenueCagr3y;
  const richSegmentRowCount =
    history.revenueHistoryBySegment?.rows.length ??
    history.revenueMixHistoryBySegment?.rows.length ??
    0;
  const richUnitRowCount =
    history.revenueHistoryByUnit?.rows.length ?? history.revenueMixHistoryByUnit?.rows.length ?? 0;
  const richEntityLabel = richSegmentRowCount > 0 ? "segment" : "unit";
  const richPeriods =
    (history.summary?.periods.length ?? 0) > 0
      ? history.summary?.periods ?? []
      : (history.revenueHistoryBySegment?.years.length ?? 0) > 0
        ? history.revenueHistoryBySegment?.years ?? []
      : (history.revenueHistoryByUnit?.periods.length ?? 0) > 0
        ? history.revenueHistoryByUnit?.periods ?? []
        : (history.revenueMixHistoryBySegment?.years.length ?? 0) > 0
          ? history.revenueMixHistoryBySegment?.years ?? []
          : history.revenueMixHistoryByUnit?.periods ?? [];
  const richPeriodCount = richPeriods.length;
  const preview =
    hasRichHistoricalEconomics
      ? [
          richSummaryCagr?.cagrPercent != null
            ? `${formatPctLabel(richSummaryCagr.cagrPercent)} company CAGR`
            : richSummaryCagr
              ? "Company CAGR tracked"
              : null,
          richPeriodCount > 0
            ? `${richPeriodCount} period${richPeriodCount === 1 ? "" : "s"}`
            : null,
          richSegmentRowCount > 0
            ? `${richSegmentRowCount} ${richEntityLabel}${richSegmentRowCount === 1 ? "" : "s"}`
            : richUnitRowCount > 0
              ? `${richUnitRowCount} ${richEntityLabel}${richUnitRowCount === 1 ? "" : "s"}`
              : null,
          history.summary?.overallConfidence
            ? `${formatCompactLabel(history.summary.overallConfidence)} confidence`
            : null,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" · ") || "Open business momentum data pack."
      : [
          companyRevenueCagr?.cagrPercent != null
            ? `${formatPctLabel(companyRevenueCagr.cagrPercent)} company CAGR`
            : hasCompanyRevenueCagr
              ? "Company CAGR tracked"
              : null,
          hasRevenueSplitHistory
            ? `${revenueSplitRows.length} split year${revenueSplitRows.length === 1 ? "" : "s"}`
            : null,
          hasSegmentGrowth
            ? `${segmentGrowthRows.length} segment CAGR row${segmentGrowthRows.length === 1 ? "" : "s"}`
            : null,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" · ") || "Open business momentum history.";

  if (hasRichHistoricalEconomics) {
    return (
      <div className={`${businessSnapshotBlockClass} p-4 space-y-3`}>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
            Business Momentum
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">{preview}</p>
        </div>
        <HistoricalEconomicsDataPack history={history} />
      </div>
    );
  }

  if (!historicalMetaColumn && !hasRevenueSplitHistory) return null;

  return (
    <div className={`${businessSnapshotBlockClass} p-4 space-y-3`}>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
          Business Momentum
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">{preview}</p>
      </div>
      <div
        className={`grid grid-cols-1 gap-3 ${
          historicalMetaColumn && hasRevenueSplitHistory
            ? "xl:grid-cols-[minmax(17rem,0.9fr)_minmax(0,1.1fr)]"
            : ""
        }`}
      >
        {historicalMetaColumn && (
          <div className="space-y-3">
            {hasCompanyRevenueCagr && companyRevenueCagr && (
              <div className={`${snapshotSubsectionClass} p-3`}>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                  Company Revenue CAGR (3Y)
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  {companyRevenueCagr.cagrPercent != null && (
                    <p className="text-[22px] font-semibold leading-none text-foreground">
                      {formatPctLabel(companyRevenueCagr.cagrPercent)}
                    </p>
                  )}
                  {formatRangeLabel(
                    companyRevenueCagr.startYear,
                    companyRevenueCagr.endYear,
                  ) && (
                    <span className="text-[11px] text-muted-foreground">
                      {formatRangeLabel(
                        companyRevenueCagr.startYear,
                        companyRevenueCagr.endYear,
                      )}
                    </span>
                  )}
                </div>
                {(companyRevenueCagr.scope || companyRevenueCagr.basis) && (
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {[companyRevenueCagr.scope, companyRevenueCagr.basis]
                      .filter((value): value is string => Boolean(value))
                      .map((value) => formatCompactLabel(value))
                      .join(" · ")}
                  </p>
                )}
              </div>
            )}

            {hasSegmentGrowth && (
              <div className={`${snapshotSubsectionClass} p-3`}>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                  Segment Growth CAGR (3Y)
                </p>
                <div className="mt-2 space-y-2">
                  {segmentGrowthRows.map((row: NormalizedSegmentGrowthCagr3yRow, idx) => (
                    <div
                      key={`${row.segment}-${idx}`}
                      className={idx === 0 ? "space-y-1" : "space-y-1 border-t border-border/35 pt-2"}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] font-medium text-foreground leading-snug">
                          {row.segment}
                        </p>
                        {row.cagrPercent != null && (
                          <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground shrink-0">
                            {formatPctLabel(row.cagrPercent)}
                          </span>
                        )}
                      </div>
                      {(formatRangeLabel(row.startYear, row.endYear) ||
                        row.comparability ||
                        row.basis) && (
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {[
                            formatRangeLabel(row.startYear, row.endYear),
                            row.comparability
                              ? `${formatCompactLabel(row.comparability)} comparability`
                              : null,
                            row.basis ? formatCompactLabel(row.basis) : null,
                          ]
                            .filter((value): value is string => Boolean(value))
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {hasRevenueSplitHistory && (
          <div className={`${snapshotSubsectionClass} p-3`}>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Revenue Split History
            </p>
            <div className="mt-2 space-y-2">
              {visibleRevenueSplitRows.map((row, idx) =>
                renderRevenueSplitRow(row, `${row.year ?? "period"}-${idx}`),
              )}
            </div>
            {extraRevenueSplitRows.length > 0 && (
              <details className="mt-2 border-t border-border/35 pt-2">
                <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                  Show more ({extraRevenueSplitRows.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {extraRevenueSplitRows.map((row, idx) =>
                    renderRevenueSplitRow(
                      row,
                      `${row.year ?? "period"}-extra-${idx}`,
                    ),
                  )}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderHistoricalEconomicsUnavailableCard() {
  return (
    <div className={`${businessSnapshotBlockClass} p-4 space-y-3`}>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
          Business Momentum
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Data exists, but the current payload is not display-ready yet.
        </p>
      </div>
      <div className={`${snapshotSubsectionClass} p-3 space-y-1.5`}>
        <p className="text-[12px] font-medium text-foreground">
          Business momentum data is available for this company, but the stored
          structure does not match the current display format yet.
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Once this company&apos;s payload is refreshed to the richer
          segment-history
          schema, this section will show the full data pack with tables, charts,
          and insights.
        </p>
      </div>
    </div>
  );
}

type BusinessSnapshotSectionProps = {
  snapshot: NormalizedBusinessSnapshot | null;
  companyCode: string;
  companyName: string | null;
  generatedAtShort: string | null;
  hasMoatAnalysis: boolean;
};

export function BusinessSnapshotSection({
  snapshot,
  companyCode,
  companyName,
  generatedAtShort,
  hasMoatAnalysis,
}: BusinessSnapshotSectionProps) {
  const derived = deriveState(snapshot);
  const headerPills = buildHeaderPills(snapshot, derived, hasMoatAnalysis);
  const {
    aboutHeading,
    aboutSupportingText,
    segmentEntries,
    historicalEconomics,
    hasHistoricalEconomicsSource,
    hasStructuredBusinessSnapshot,
    hasLegacyBusinessSnapshot,
  } = derived;

  const missingState = (
    <MissingSectionState
      companyCode={companyCode}
      companyName={companyName}
      sectionId="business-overview"
      sectionTitle="Business Snapshot"
      description="We have not generated a usable business snapshot for this company yet."
    />
  );

  return (
    <SectionCard
      id="business-overview"
      title="Business Snapshot"
      headerPills={headerPills}
      headerAction={
        generatedAtShort ? (
          <span className="text-[11px] text-muted-foreground">
            {generatedAtShort}
          </span>
        ) : undefined
      }
      >
        <div className="flex flex-col gap-4">
          {snapshot ? (
            <div className={businessSnapshotSurfaceClass}>
              <div className="space-y-4">
                {hasStructuredBusinessSnapshot ? (
                  <div className="space-y-3">
                    {renderAboutBlock(aboutHeading, aboutSupportingText)}

                    <BusinessSegmentsMosaic segments={segmentEntries} />
                    {historicalEconomics
                      ? renderHistoricalEconomicsCard(historicalEconomics)
                      : hasHistoricalEconomicsSource
                        ? renderHistoricalEconomicsUnavailableCard()
                        : null}
                  </div>
                ) : hasLegacyBusinessSnapshot ? (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        {snapshot.businessSummaryShort || snapshot.businessSummaryLong ? (
                          <div className={`${businessSnapshotBlockClass} p-4 space-y-2`}>
                            {snapshot.businessSummaryShort && (
                              <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                                {snapshot.businessSummaryShort}
                              </p>
                            )}
                            {snapshot.businessSummaryLong && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {snapshot.businessSummaryLong}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No business snapshot summary available yet.
                          </p>
                        )}
                      </div>
                    </div>

                    {(snapshot.topRevenueDrivers.length > 0 ||
                      snapshot.keyDependencies.length > 0 ||
                      snapshot.keyRisksToModel.length > 0) && (
                      <div className="space-y-2.5">
                        {snapshot.topRevenueDrivers.length > 0 && (
                          renderBusinessSnapshotDrawer({
                            title: "Top Revenue Drivers",
                            preview: `${snapshot.topRevenueDrivers.length} driver${
                              snapshot.topRevenueDrivers.length === 1 ? "" : "s"
                            } tracked.`,
                            children: (
                              <div className={`${snapshotSubsectionClass} p-3`}>
                                <ul className="space-y-1">
                                  {snapshot.topRevenueDrivers.map((driver, idx) => (
                                    <li
                                      key={idx}
                                      className="text-xs text-foreground leading-snug border-l border-border/70 pl-2"
                                    >
                                      {driver}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ),
                          })
                        )}

                        {(snapshot.keyDependencies.length > 0 ||
                          snapshot.keyRisksToModel.length > 0) && (
                          renderBusinessSnapshotDrawer({
                            title: "Model Watchpoints",
                            preview: [
                              snapshot.keyDependencies.length > 0
                                ? `${snapshot.keyDependencies.length} dependenc${
                                    snapshot.keyDependencies.length === 1 ? "y" : "ies"
                                  }`
                                : null,
                              snapshot.keyRisksToModel.length > 0
                                ? `${snapshot.keyRisksToModel.length} risk${
                                    snapshot.keyRisksToModel.length === 1 ? "" : "s"
                                  }`
                                : null,
                            ]
                              .filter((value): value is string => Boolean(value))
                              .join(" · "),
                            children: (
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {snapshot.keyDependencies.length > 0 && (
                                  <div className={`${snapshotSubsectionClass} p-3`}>
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                                      Dependencies
                                    </p>
                                    <ul className="mt-1.5 space-y-0.5">
                                      {snapshot.keyDependencies.map((dependency, idx) => (
                                        <li
                                          key={idx}
                                          className="text-xs text-foreground leading-snug border-l border-amber-400/50 pl-1.5"
                                        >
                                          {dependency}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {snapshot.keyRisksToModel.length > 0 && (
                                  <div className={`${snapshotSubsectionClass} p-3`}>
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                                      Risks
                                    </p>
                                    <ul className="mt-1.5 space-y-0.5">
                                      {snapshot.keyRisksToModel.map((risk, idx) => (
                                        <li
                                          key={idx}
                                          className="text-xs text-foreground leading-snug border-l border-red-400/50 pl-1.5"
                                        >
                                          {risk}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ),
                          })
                        )}
                      </div>
                    )}

                    {snapshot.mixShiftSummary && (
                      <div className={`${nestedDetailClass} p-3 space-y-0.5`}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Mix Shift
                        </p>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {snapshot.mixShiftSummary}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  missingState
                )}
              </div>
            </div>
        ) : (
          missingState
        )}
      </div>
    </SectionCard>
  );
}
