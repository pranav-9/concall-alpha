import type {
  NormalizedKeyVariableDeepTreatmentItem,
  NormalizedKeyVariableDiscoverySummary,
  NormalizedKeyVariableKpiHistory,
  NormalizedKeyVariableKpiHistoryRow,
  NormalizedKeyVariableSourceBasis,
  NormalizedKeyVariablesSnapshot,
  ThesisEffect,
} from "@/lib/key-variables-snapshot/types";
import { Button } from "@/components/ui/button";
import { KpiHistoryTrendCell } from "./kpi-history-trend-cell";
import { ScrollToLatest } from "./scroll-to-latest";
import { ExpandableText } from "./expandable-text";
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
import { BlockFeedbackButton } from "./block-feedback-button";
import {
  elevatedBlockClass,
  nestedDetailClass,
  snapshotSubsectionClass,
} from "./surface-tokens";
import { getDeltaToneClass } from "./delta-tone";
import {
  getThesisEffect,
  thesisEffectLineClass,
  thesisEffectTextClass,
} from "./thesis-effect";
import { cn } from "@/lib/utils";
import { formatPeriodDelta, getPeriodOverPeriodDelta } from "@/lib/period-delta";
import {
  asNumericValue,
  buildTrendGeometry,
  classifyUnit,
  compactPeriodLabel,
  formatMetricNumber,
  formatTrendChange,
  formatValueWithUnit,
  normalizeVariableName,
  periodNounLong,
  trendSpanPhrase,
  splitMetricName,
  splitUnitAffixes,
} from "@/lib/key-variables-snapshot/presentation";

/* ------------------------------------------------------------------------ */
/* Type + tone tokens (the section is violet; effects are emerald/rose/amber) */
/* ------------------------------------------------------------------------ */

const displayFont = "font-[family-name:var(--font-display)] font-bold";
const dataFont = "font-[family-name:var(--font-data)] tabular-nums";
const eyebrowClass = "text-[10px] font-semibold uppercase tracking-[0.16em]";
const violetText = "text-violet-700 dark:text-violet-300";
const hoverColor = "transition-colors duration-150";

/** The hero trend plots up to this many trailing periods. */
const TREND_PERIODS = 8;

const formatCellValue = (value: string | number | null | undefined) => {
  if (typeof value === "number") return formatMetricNumber(value);
  if (typeof value === "string") return value;
  return "—";
};

const toNumericValuesByPeriod = (
  valuesByPeriod: Record<string, string | number | null>,
): Record<string, number | null> => {
  const result: Record<string, number | null> = {};
  for (const key of Object.keys(valuesByPeriod)) {
    result[key] = asNumericValue(valuesByPeriod[key]);
  }
  return result;
};

const sourceBasisDisplay: Record<
  NormalizedKeyVariableSourceBasis,
  { label: string; className: string }
> = {
  both: {
    label: "Industry + management",
    className:
      "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
  },
  industry_standard: {
    label: "Industry standard",
    className:
      "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
  },
  management_tracked: {
    label: "Management tracked",
    className:
      "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
  },
  concall: {
    label: "Concall",
    className:
      "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
  },
  presentation: {
    label: "Presentation",
    className:
      "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
  },
  annual_report: {
    label: "Annual report",
    className: "border-border/60 bg-muted/60 text-foreground",
  },
  unknown: {
    label: "Source basis not tagged",
    className: "border-border/60 bg-muted/60 text-foreground",
  },
};

const compactLabel = (value: string | null) =>
  value?.replace(/[_>]+/g, " ").replace(/\s+/g, " ").trim() ?? null;

/** History periods, falling back to the union of row keys when the list is empty. */
const resolvePeriods = (history: NormalizedKeyVariableKpiHistory) => {
  if (history.periods.length > 0) return history.periods;
  return Array.from(new Set(history.rows.flatMap((row) => Object.keys(row.valuesByPeriod))));
};

/* ------------------------------------------------------------------------ */
/* Discovery drawer (unchanged content; now opened from the funnel)           */
/* ------------------------------------------------------------------------ */

const summaryChip = (label: string, value: number | null, suffix?: string) => {
  if (value == null) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
      {label}: {value}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
};

function DiscoverySummary({ summary }: { summary: NormalizedKeyVariableDiscoverySummary | null }) {
  if (!summary) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {summaryChip("Candidates", summary.totalCandidatesConsidered)}
      {summaryChip("Full list", summary.selectedFullListCount)}
      {summaryChip("Deep treatment", summary.selectedDeepTreatmentCount)}
      {summary.selectionPriorityStack ? (
        <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/45 px-2.5 py-1 text-[10px] font-medium text-foreground">
          Priority: {compactLabel(summary.selectionPriorityStack)}
        </span>
      ) : null}
    </div>
  );
}

function DiscoveryDrawerBody({ snapshot }: { snapshot: NormalizedKeyVariablesSnapshot }) {
  return (
    <DrawerContent className="w-full max-w-xl">
      <DrawerHeader className="border-b border-border">
        <DrawerTitle>Key Variables Discovery</DrawerTitle>
        <DrawerDescription>
          Broader variable selection context behind the deep-treatment shortlist.
        </DrawerDescription>
      </DrawerHeader>

      <div className="space-y-4 overflow-y-auto p-4">
        <div className="space-y-2">
          <p className={cn(eyebrowClass, "text-muted-foreground")}>Discovery Summary</p>
          <DiscoverySummary summary={snapshot.discoverySummary} />
        </div>

        {snapshot.fullVariableList.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className={cn(eyebrowClass, "text-muted-foreground")}>Full Variable List</p>
              <p className="text-sm text-muted-foreground">
                Variables identified as relevant, including those not promoted into deep treatment.
              </p>
            </div>

            <div className="space-y-3">
              {snapshot.fullVariableList.map((item) => {
                const basisDisplay = sourceBasisDisplay[item.sourceBasis];

                return (
                  <div key={item.variable} className={cn(nestedDetailClass, "px-3 py-3")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold leading-snug text-foreground">
                        {item.variable}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${basisDisplay.className}`}
                      >
                        {basisDisplay.label}
                      </span>
                    </div>
                    {item.whyFlagged ? (
                      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground lg:text-[12px]">
                        {item.whyFlagged}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <DrawerFooter className="border-t border-border">
        <DrawerClose asChild>
          <Button variant="outline">Close</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}

/* ------------------------------------------------------------------------ */
/* Synthesis row: the headline carries the section; the funnel is one quiet line */
/* ------------------------------------------------------------------------ */

function SelectionFunnel({ snapshot }: { snapshot: NormalizedKeyVariablesSnapshot }) {
  const summary = snapshot.discoverySummary;
  const steps = [
    { value: summary?.totalCandidatesConsidered ?? null, label: "considered" },
    { value: summary?.selectedFullListCount ?? null, label: "ranked" },
    { value: summary?.selectedDeepTreatmentCount ?? null, label: "deep-tracked" },
  ].filter((step): step is { value: number; label: string } => step.value != null);

  if (steps.length === 0) return null;

  const ariaLabel = `Variable selection: ${steps.map((s) => `${s.value} ${s.label}`).join(", ")}. Open the selection context.`;

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <button
          type="button"
          data-drawer-type="variable-selection-context"
          aria-label={ariaLabel}
          className={cn(
            dataFont,
            hoverColor,
            "group inline-flex cursor-pointer flex-wrap items-baseline gap-x-1.5 rounded-sm text-left text-[10.5px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {steps.map((step, index) => (
            <span key={step.label} className="inline-flex items-baseline gap-x-1.5">
              {index > 0 ? <span aria-hidden="true">→</span> : null}
              <span>
                <span
                  className={cn(
                    "font-semibold",
                    index === steps.length - 1 ? violetText : "text-foreground/80",
                  )}
                >
                  {step.value}
                </span>{" "}
                {step.label}
              </span>
            </span>
          ))}
        </button>
      </DrawerTrigger>
      <DiscoveryDrawerBody snapshot={snapshot} />
    </Drawer>
  );
}

function SynthesisRow({ snapshot }: { snapshot: NormalizedKeyVariablesSnapshot }) {
  const hasText = Boolean(snapshot.sectionHeadline || snapshot.sectionSynthesis);
  const summary = snapshot.discoverySummary;
  const hasFunnel = Boolean(
    summary &&
      (summary.totalCandidatesConsidered != null ||
        summary.selectedFullListCount != null ||
        summary.selectedDeepTreatmentCount != null),
  );

  if (!hasText && !hasFunnel) return null;

  return (
    <div className="border-b border-border/60 pb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className={cn(eyebrowClass, violetText)}>The synthesis</p>
        {hasFunnel ? <SelectionFunnel snapshot={snapshot} /> : null}
      </div>
      {snapshot.sectionHeadline ? (
        <h3
          className={cn(
            displayFont,
            "mt-2.5 text-pretty text-[21px] leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[25px] lg:text-[28px]",
          )}
        >
          {snapshot.sectionHeadline}
        </h3>
      ) : null}
      {snapshot.sectionSynthesis ? (
        <div className="mt-3">
          <ExpandableText
            text={snapshot.sectionSynthesis}
            className="text-pretty text-[14px] leading-[1.6] text-muted-foreground sm:text-[15px]"
            previewLines={4}
            mobileOnly
          />
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Full KPI table (kept verbatim; now lives behind the "All N quarters" link) */
/* ------------------------------------------------------------------------ */

function KpiHistoryTable({ history }: { history: NormalizedKeyVariableKpiHistory }) {
  const periods = resolvePeriods(history);

  if (periods.length === 0 || history.rows.length === 0) return null;

  return (
    <div className={snapshotSubsectionClass}>
      <ScrollToLatest>
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border/20">
              {/* Sticky: ScrollToLatest opens the table at the newest quarter,
                  which on a phone scrolled the metric names off the left edge
                  and left unlabeled rows of numbers. The label column pins so
                  every row is named at any scroll position. */}
              <th className="sticky left-0 z-10 bg-background px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-3">
                Metric
              </th>
              {/* Trend sparkline is desktop-only: at 390px it cost 100px of a
                  table that already scrolls, and the deltas under each value
                  carry the direction. */}
              <th className="hidden px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:table-cell">
                Trend
              </th>
              {periods.map((period) => (
                <th
                  key={period}
                  className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.rows.map((row) => {
              const numericValuesByPeriod = toNumericValuesByPeriod(row.valuesByPeriod);
              return (
                <tr key={row.metric} className="border-b border-border/20 last:border-b-0">
                  <td className="sticky left-0 z-10 bg-background px-2 py-2 text-[11px] font-medium leading-snug text-foreground sm:px-3 sm:text-[12px]">
                    {/* max-width is ignored on table cells; the inner block is
                        what caps the pinned column at ~7.5rem on a phone so the
                        period columns keep most of the width. */}
                    <div className="max-w-[7.5rem] sm:max-w-none">{row.metric}</div>
                  </td>
                  <KpiHistoryTrendCell
                    ariaLabel={`${row.metric} trend across ${periods.length} periods`}
                    points={periods.map((period) => ({
                      period,
                      value: numericValuesByPeriod[period] ?? null,
                    }))}
                  />
                  {periods.map((period) => {
                    const delta = getPeriodOverPeriodDelta(periods, numericValuesByPeriod, period);
                    const formatted = formatPeriodDelta(delta);

                    return (
                      <td key={period} className="px-3 py-2 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[12px] text-muted-foreground">
                            {formatCellValue(row.valuesByPeriod[period])}
                          </span>
                          {formatted ? (
                            <span
                              className={`text-[10px] leading-none ${getDeltaToneClass(
                                formatted.toneValue,
                              )}`}
                            >
                              {formatted.label}
                            </span>
                          ) : (
                            <span className="text-[10px] leading-none text-muted-foreground">
                              &nbsp;
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollToLatest>
    </div>
  );
}

/** Everything the card leaves out: the read, why it matters, and every period we hold. */
function VariableDrawerBody({
  item,
  index,
  companyCode,
  companyName,
}: {
  item: NormalizedKeyVariableDeepTreatmentItem;
  index: number;
  companyCode: string;
  companyName?: string | null;
}) {
  const secondary =
    item.transition === "promoted" && item.transitionReason
      ? { lead: "Why promoted —", text: item.transitionReason }
      : item.whyItMattersNow
        ? { lead: "Why now —", text: item.whyItMattersNow }
        : null;
  const history = item.kpiHistory && item.kpiHistory.rows.length > 0 ? item.kpiHistory : null;

  return (
    <DrawerContent className="w-full max-w-xl">
      <DrawerHeader className="border-b border-border">
        <DrawerTitle>{item.variable}</DrawerTitle>
        {item.whatItTracks ? <DrawerDescription>{item.whatItTracks}</DrawerDescription> : null}
      </DrawerHeader>
      <div className="space-y-5 overflow-y-auto p-4">
        {item.trendInterpretation || secondary ? (
          <div>
            <p className={cn(eyebrowClass, "text-muted-foreground")}>The read</p>
            {item.trendInterpretation ? (
              <p className="mt-1.5 text-pretty text-[14px] leading-[1.55] text-foreground/90">
                {item.trendInterpretation}
              </p>
            ) : null}
            {secondary ? (
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground/80">{secondary.lead}</span> {secondary.text}
              </p>
            ) : null}
          </div>
        ) : null}
        {history ? (
          <div>
            <p className={cn(eyebrowClass, "mb-2 text-muted-foreground")}>
              Every {periodNounLong(resolvePeriods(history)).replace(/s$/, "")} we hold
            </p>
            <KpiHistoryTable history={history} />
          </div>
        ) : null}
      </div>
      <DrawerFooter className="flex-row items-center justify-between border-t border-border">
        <BlockFeedbackButton
          companyCode={companyCode}
          companyName={companyName}
          sectionId="key-variables"
          sectionTitle="Key Variables"
          blockId={`key-variable-${index + 1}`}
          blockTitle={item.variable}
        />
        <DrawerClose asChild>
          <Button variant="outline">Close</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}

/* ------------------------------------------------------------------------ */
/* Deep-tracked card                                                          */
/* ------------------------------------------------------------------------ */

type LeadMetric = {
  row: NormalizedKeyVariableKpiHistoryRow;
  name: string;
  unitPrefix: string;
  unitSuffix: string;
  latestPeriod: string;
  latestValue: number | null;
  /** The trend's periods: up to TREND_PERIODS, starting at the first one with a value. */
  trendPeriods: string[];
  trendValues: Array<number | null>;
  /** First plotted → latest, over the trend. */
  change: { label: string; delta: number } | null;
  effect: ThesisEffect;
};

const buildLeadMetric = (item: NormalizedKeyVariableDeepTreatmentItem): LeadMetric | null => {
  const history = item.kpiHistory;
  if (!history || history.rows.length === 0) return null;
  const periods = resolvePeriods(history);
  if (periods.length === 0) return null;

  const row = history.rows[item.leadMetricIndex] ?? history.rows[0];
  const { name, unit: parsedUnit } = splitMetricName(row.metric);
  const unit = item.leadUnit ?? parsedUnit;
  const { prefix, suffix } = splitUnitAffixes(unit);

  const latestPeriod = periods[periods.length - 1];
  const latestValue = asNumericValue(row.valuesByPeriod[latestPeriod]);

  const recent = periods.slice(-TREND_PERIODS);
  const recentValues = recent.map((period) => asNumericValue(row.valuesByPeriod[period]));
  const firstIndex = recentValues.findIndex((value) => value != null);
  const trendPeriods = firstIndex > 0 ? recent.slice(firstIndex) : recent;
  const trendValues = firstIndex > 0 ? recentValues.slice(firstIndex) : recentValues;
  // One plotted period has no "first → latest": a lone value must not print "0 pp".
  const change =
    trendPeriods.length >= 2
      ? formatTrendChange(trendValues[0] ?? null, latestValue, classifyUnit(unit))
      : null;
  const direction = item.metricDirections?.[row.metric] ?? "higher_is_better";

  return {
    row,
    name,
    unitPrefix: prefix,
    unitSuffix: suffix,
    latestPeriod,
    latestValue,
    trendPeriods,
    trendValues,
    change,
    effect: getThesisEffect(change?.delta ?? null, direction),
  };
};

/** Left-anchored at the first point, right-anchored at the last, centred between. */
const anchorClass = (x: number) =>
  x <= 0 ? "" : x >= 100 ? "-translate-x-full" : "-translate-x-1/2";

function HeroTrend({
  lead,
  guide,
}: {
  lead: LeadMetric;
  guide: NormalizedKeyVariableDeepTreatmentItem["guide"];
}) {
  const geometry = buildTrendGeometry(lead.trendPeriods, lead.trendValues, guide?.value ?? null);
  if (!geometry) return null;

  const { points, periodX, guideY, guideLabel } = geometry;
  const first = points[0];
  const last = points[points.length - 1];
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
  const area = `${line} L${last.x} 100 L${first.x} 100 Z`;
  const label = (value: number) => formatValueWithUnit(value, lead.unitPrefix, lead.unitSuffix);
  const lastPeriodIndex = lead.trendPeriods.length - 1;
  // On a phone a long axis keeps every other label, counted back from the latest.
  const thinOnPhone = lead.trendPeriods.length > 5;
  const ariaLabel = `${lead.name}: ${points
    .map((point) => `${point.period} ${label(point.value)}`)
    .join(", ")}${guide ? `; ${guide.label}` : ""}`;

  return (
    <div role="img" aria-label={ariaLabel} className={cn("mt-6", thesisEffectLineClass[lead.effect])}>
      <div className="relative h-36 sm:h-40">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <path d={area} fill="currentColor" fillOpacity={0.1} />
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {guide && guideY != null && guideLabel ? (
          <div className="pointer-events-none absolute inset-x-0" style={{ top: `${guideY}%` }}>
            <div className="border-t border-dashed border-foreground/35" />
            <span
              className={cn(
                dataFont,
                "absolute whitespace-nowrap text-[10px] leading-none text-muted-foreground",
                guideLabel.side === "above" ? "bottom-1.5" : "top-1.5",
                anchorClass(guideLabel.x),
              )}
              style={{ left: `${guideLabel.x}%` }}
            >
              {guide.label}
            </span>
          </div>
        ) : null}
        {points.map((point) => {
          const isLast = point === last;
          return (
            <span
              key={point.period}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                isLast ? "size-3 bg-current" : "size-[7px] border-[1.5px] border-current bg-background",
              )}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            />
          );
        })}
        <span
          className={cn(dataFont, "absolute left-0 -translate-y-full pb-2.5 text-[11px] leading-none text-muted-foreground")}
          style={{ top: `${first.y}%` }}
        >
          {label(first.value)}
        </span>
        <span
          className={cn(
            dataFont,
            "absolute right-0 -translate-y-full pb-3.5 text-[11.5px] font-semibold leading-none text-foreground",
          )}
          style={{ top: `${last.y}%` }}
        >
          {label(last.value)}
        </span>
      </div>
      <div className="relative mt-3 h-3">
        {lead.trendPeriods.map((period, index) => {
          const isLatest = index === lastPeriodIndex;
          const dropOnPhone = thinOnPhone && (lastPeriodIndex - index) % 2 === 1;
          return (
            <span
              key={period}
              className={cn(
                dataFont,
                "absolute top-0 whitespace-nowrap text-[10px] leading-none",
                anchorClass(periodX[index]),
                isLatest ? "font-semibold text-foreground" : "text-muted-foreground",
                dropOnPhone ? "hidden sm:inline" : null,
              )}
              style={{ left: `${periodX[index]}%` }}
            >
              {compactPeriodLabel(period)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function HeroValue({ lead }: { lead: LeadMetric }) {
  const span = trendSpanPhrase(lead.trendPeriods);
  const arrow = lead.change ? (lead.change.delta > 0 ? "▲" : lead.change.delta < 0 ? "▼" : "•") : null;
  const tightSuffix = lead.unitSuffix === "%" || lead.unitSuffix.toLowerCase() === "x";

  return (
    <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
      <p className={cn(displayFont, "text-[44px] leading-none tracking-[-0.03em] text-foreground sm:text-[54px]")}>
        {lead.unitPrefix ? <span>{lead.unitPrefix}</span> : null}
        {lead.latestValue != null ? formatMetricNumber(lead.latestValue) : "—"}
        {lead.unitSuffix ? (
          <span className={cn("text-[20px] tracking-[-0.01em] sm:text-[22px]", tightSuffix ? "ml-0.5" : "ml-1.5")}>
            {lead.unitSuffix.toLowerCase() === "x" ? "×" : lead.unitSuffix}
          </span>
        ) : null}
      </p>
      {lead.change ? (
        <span className={cn(dataFont, "text-[12.5px] font-semibold", thesisEffectTextClass[lead.effect])}>
          {arrow} {lead.change.label}
          {span ? ` ${span}` : ""}
        </span>
      ) : (
        <span className={cn(dataFont, "text-[11px] text-muted-foreground")}>{lead.latestPeriod}</span>
      )}
    </div>
  );
}

function DeepCard({
  item,
  index,
  companyCode,
  companyName,
}: {
  item: NormalizedKeyVariableDeepTreatmentItem;
  index: number;
  companyCode: string;
  companyName?: string | null;
}) {
  const lead = buildLeadMetric(item);
  const roleTone =
    lead && lead.effect !== "neutral" ? thesisEffectTextClass[lead.effect] : "text-foreground/80";
  // With a verdict headline the variable's own name moves up into the eyebrow.
  const eyebrowName = item.headline ? item.variable : (lead?.name ?? null);
  const showEyebrowName =
    eyebrowName != null && normalizeVariableName(eyebrowName) !== normalizeVariableName(item.headline ?? item.variable);
  const hasMore = Boolean(
    item.trendInterpretation || item.whyItMattersNow || item.transitionReason || item.whatItTracks || lead,
  );

  // The card is the claim and the number behind it, nothing else. The read, the
  // other metrics and every period sit one click away, behind the whole card.
  return (
    <div
      className={cn(
        elevatedBlockClass,
        hoverColor,
        "relative flex flex-col rounded-[18px] px-5 py-6 sm:px-8 sm:py-7",
        hasMore ? "hover:border-foreground/25" : null,
      )}
    >
      <p className={cn(eyebrowClass, "leading-[1.5] text-muted-foreground")}>
        {item.thesisRole ? (
          <span className={roleTone}>{item.thesisRole}</span>
        ) : !showEyebrowName ? (
          <span>Variable {index + 1}</span>
        ) : null}
        {item.thesisRole && showEyebrowName ? <span aria-hidden="true"> · </span> : null}
        {showEyebrowName ? <span>{eyebrowName}</span> : null}
      </p>

      <h4
        className={cn(
          displayFont,
          "mt-2.5 text-pretty text-[22px] leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[27px]",
        )}
      >
        {item.headline ?? item.variable}
      </h4>

      {lead ? <HeroValue lead={lead} /> : null}
      {lead ? <HeroTrend lead={lead} guide={item.guide} /> : null}

      {hasMore ? (
        <Drawer direction="right">
          <DrawerTrigger asChild>
            <button
              type="button"
              data-drawer-type="key-variable-read"
              aria-label={`${item.variable}: open the read and the full history`}
              className="absolute inset-0 cursor-pointer rounded-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </DrawerTrigger>
          <VariableDrawerBody item={item} index={index} companyCode={companyCode} companyName={companyName} />
        </Drawer>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Section                                                                    */
/* ------------------------------------------------------------------------ */

export function KeyVariablesSection({
  snapshot,
  companyCode,
  companyName,
}: {
  snapshot: NormalizedKeyVariablesSnapshot;
  companyCode: string;
  companyName?: string | null;
}) {
  const hasDeepTreatment = snapshot.deepTreatment.length > 0;
  const hasSynthesis = Boolean(snapshot.sectionSynthesis || snapshot.sectionHeadline);

  return (
    <div className="flex flex-col gap-4">
      <SynthesisRow snapshot={snapshot} />

      {hasDeepTreatment ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-gate-cut>
          {snapshot.deepTreatment.map((item, index) => (
            <DeepCard
              key={`${item.variable}-${index}`}
              item={item}
              index={index}
              companyCode={companyCode}
              companyName={companyName}
            />
          ))}
        </div>
      ) : !hasSynthesis ? (
        <div className={cn(snapshotSubsectionClass, "p-4")}>
          <p className="text-sm text-muted-foreground">
            No deep-treatment variables surfaced for this company.
          </p>
        </div>
      ) : null}

    </div>
  );
}
