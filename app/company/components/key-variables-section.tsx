import type {
  NormalizedKeyVariableDeepTreatmentItem,
  NormalizedKeyVariableDiscoverySummary,
  NormalizedKeyVariableKpiHistory,
  NormalizedKeyVariableKpiHistoryRow,
  NormalizedKeyVariableListItem,
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
  thesisEffectBarClass,
  thesisEffectPillLabel,
  thesisEffectTextClass,
  thesisEffectTintClass,
} from "./thesis-effect";
import { chipToneClasses } from "./chip-tone";
import { cn } from "@/lib/utils";
import { formatPeriodDelta, getPeriodOverPeriodDelta } from "@/lib/period-delta";
import {
  asNumericValue,
  classifyUnit,
  firstSentence,
  formatFirstToLatestChange,
  formatMetricNumber,
  normalizeVariableName,
  periodNounLong,
  shortPeriodLabel,
  spanLabel,
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
const violetTint = chipToneClasses.violet;
const hoverColor = "transition-colors duration-150";

/** The hero bars and the "Also tracked" table show this many trailing periods. */
const SHOWN_PERIODS = 3;
/** Tallest bar, in px, inside the h-28 band. */
const BAR_MAX_PX = 76;
/** Height reserved under the bars for the period label row. */
const PERIOD_LABEL_PX = 18;

/**
 * "Also tracked" columns: metric | older periods | latest | change. Fixed widths
 * from `sm` (the spec's 52/52/60/58), content-sized tracks on a phone so the
 * metric name keeps most of a 318px card. Keyed by how many periods are shown;
 * literal strings so Tailwind's scanner sees every variant.
 */
const alsoTrackedGridClass: Record<number, string> = {
  1: "grid-cols-[minmax(0,1fr)_auto_auto] sm:grid-cols-[minmax(0,1fr)_60px_58px]",
  2: "grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:grid-cols-[minmax(0,1fr)_52px_60px_58px]",
  3: "grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] sm:grid-cols-[minmax(0,1fr)_52px_52px_60px_58px]",
};

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

const padIndex = (index: number) => String(index).padStart(2, "0");

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
/* Synthesis row: headline + paragraph on the left, 13 → 5 → 2 funnel right  */
/* ------------------------------------------------------------------------ */

function FunnelStep({
  value,
  label,
  valueClass,
}: {
  value: number;
  label: string;
  valueClass: string;
}) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className={cn(displayFont, "text-[26px] leading-none", valueClass)}>{value}</span>
      <span
        className={cn(
          dataFont,
          hoverColor,
          "text-[10px] text-muted-foreground group-hover:text-foreground",
        )}
      >
        {label}
      </span>
    </span>
  );
}

function SelectionFunnel({ snapshot }: { snapshot: NormalizedKeyVariablesSnapshot }) {
  const summary = snapshot.discoverySummary;
  const steps = [
    { value: summary?.totalCandidatesConsidered ?? null, label: "considered", valueClass: "text-muted-foreground" },
    { value: summary?.selectedFullListCount ?? null, label: "ranked", valueClass: "text-foreground/80" },
    { value: summary?.selectedDeepTreatmentCount ?? null, label: "deep-tracked", valueClass: violetText },
  ].filter((step): step is { value: number; label: string; valueClass: string } => step.value != null);

  if (steps.length === 0) return null;

  const ariaLabel = `Variable selection: ${steps.map((s) => `${s.value} ${s.label}`).join(", ")}. Open the selection context.`;

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <button
          type="button"
          data-drawer-type="variable-selection-context"
          aria-label={ariaLabel}
          className="group flex cursor-pointer items-start gap-3 self-end rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {steps.map((step, index) => (
            <span key={step.label} className="flex items-start gap-3">
              {index > 0 ? (
                <span className={cn(dataFont, "pt-2 text-[12px] leading-none text-border")} aria-hidden="true">
                  →
                </span>
              ) : null}
              <FunnelStep value={step.value} label={step.label} valueClass={step.valueClass} />
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
    <div className="grid grid-cols-1 gap-6 border-b border-border/60 pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
      {hasText ? (
        <div className="min-w-0">
          <p className={cn(eyebrowClass, violetText)}>The synthesis</p>
          {snapshot.sectionHeadline ? (
            <h3
              className={cn(
                displayFont,
                "mt-2.5 text-balance text-[22px] leading-[1.12] tracking-[-0.03em] text-foreground sm:text-[28px]",
              )}
            >
              {snapshot.sectionHeadline}
            </h3>
          ) : null}
          {snapshot.sectionSynthesis ? (
            <div className="mt-2.5 max-w-[68ch]">
              <ExpandableText
                text={snapshot.sectionSynthesis}
                className="text-[13.5px] leading-[1.6] text-muted-foreground"
                previewLines={4}
                mobileOnly
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div />
      )}
      {hasFunnel ? (
        <div className="flex lg:justify-end">
          <SelectionFunnel snapshot={snapshot} />
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

function AllPeriodsDrawer({
  variable,
  history,
  periodCount,
}: {
  variable: string;
  history: NormalizedKeyVariableKpiHistory;
  periodCount: number;
}) {
  const noun = periodNounLong(resolvePeriods(history));
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <button
          type="button"
          data-drawer-type="kpi-history-all-periods"
          className={cn(
            dataFont,
            hoverColor,
            "cursor-pointer text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
          )}
        >
          All {periodCount} {noun}
        </button>
      </DrawerTrigger>
      <DrawerContent className="w-full max-w-xl">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle>{variable}</DrawerTitle>
          <DrawerDescription>Every period we hold for this variable.</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto p-4">
          <KpiHistoryTable history={history} />
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

/* ------------------------------------------------------------------------ */
/* Deep-tracked card                                                          */
/* ------------------------------------------------------------------------ */

type LeadMetric = {
  row: NormalizedKeyVariableKpiHistoryRow;
  name: string;
  unitPrefix: string;
  unitSuffix: string;
  /** The trailing periods the card shows. */
  shownPeriods: string[];
  latestPeriod: string;
  values: Array<number | null>;
  latestValue: number | null;
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

  const shownPeriods = periods.slice(-SHOWN_PERIODS);
  const values = shownPeriods.map((period) => asNumericValue(row.valuesByPeriod[period]));
  const latestValue = values[values.length - 1] ?? null;
  const firstValue = values.find((value): value is number => value != null) ?? null;
  // One shown period has no "first → latest": a lone value must not print "0 pp".
  const change =
    shownPeriods.length >= 2
      ? formatFirstToLatestChange(firstValue, latestValue, classifyUnit(unit), "long")
      : null;
  const direction = item.metricDirections?.[row.metric] ?? "higher_is_better";

  return {
    row,
    name,
    unitPrefix: prefix,
    unitSuffix: suffix,
    shownPeriods,
    latestPeriod: shownPeriods[shownPeriods.length - 1],
    values,
    latestValue,
    change,
    effect: getThesisEffect(change?.delta ?? null, direction),
  };
};

function HeroBars({
  lead,
  guide,
}: {
  lead: LeadMetric;
  guide: NormalizedKeyVariableDeepTreatmentItem["guide"];
}) {
  const numeric = lead.values.filter((value): value is number => value != null);
  const scaleMax = Math.max(...numeric, guide?.value ?? Number.NEGATIVE_INFINITY, 0);
  const heightFor = (value: number | null) =>
    value == null || scaleMax <= 0 ? 0 : Math.max(0, Math.round((value / scaleMax) * BAR_MAX_PX));
  const lastIndex = lead.values.length - 1;
  const ariaLabel = `${lead.name}: ${lead.shownPeriods
    .map((period, index) => `${period} ${formatCellValue(lead.values[index])}`)
    .join(", ")}${guide ? `; ${guide.label}` : ""}`;

  return (
    <div role="img" aria-label={ariaLabel} className="relative h-28 min-w-0">
      {guide && scaleMax > 0 ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-10"
          style={{ bottom: PERIOD_LABEL_PX + heightFor(guide.value) }}
        >
          <div className="relative border-t border-dashed border-foreground/45">
            <span
              className={cn(
                dataFont,
                "absolute bottom-0.5 right-0 bg-card pl-1 text-[9px] leading-none text-muted-foreground",
              )}
            >
              {guide.label}
            </span>
          </div>
        </div>
      ) : null}
      <div
        className="relative grid h-full items-end gap-2.5"
        style={{ gridTemplateColumns: `repeat(${lead.values.length}, minmax(0, 1fr))` }}
      >
        {lead.values.map((value, index) => {
          const isLatest = index === lastIndex;
          const height = heightFor(value);
          return (
            <div key={lead.shownPeriods[index]} className="flex min-w-0 flex-col items-center justify-end">
              <span
                className={cn(
                  dataFont,
                  "mb-1 text-[10px] leading-none",
                  isLatest ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {formatCellValue(value)}
              </span>
              {value != null ? (
                <div
                  className={cn(
                    "w-full rounded-t-[3px]",
                    isLatest ? thesisEffectBarClass[lead.effect] : "bg-muted-foreground/30",
                  )}
                  style={{ height }}
                />
              ) : null}
              <span
                className={cn(
                  dataFont,
                  "flex items-end truncate text-[9.5px] leading-none",
                  isLatest ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
                style={{ height: PERIOD_LABEL_PX }}
              >
                {lead.shownPeriods[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroBand({
  lead,
  guide,
}: {
  lead: LeadMetric;
  guide: NormalizedKeyVariableDeepTreatmentItem["guide"];
}) {
  const span = spanLabel(lead.shownPeriods);
  const arrow = lead.change ? (lead.change.delta > 0 ? "▲" : lead.change.delta < 0 ? "▼" : "•") : null;
  const pillLabel = thesisEffectPillLabel[lead.effect];

  return (
    <div className="mt-5 grid grid-cols-1 gap-5 border-y border-border/60 py-[18px] sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-7">
      <div className="min-w-0">
        <p className={cn(dataFont, "text-[10px] text-muted-foreground")}>
          {lead.name} · {lead.latestPeriod}
        </p>
        <p className={cn(displayFont, "mt-1.5 text-[40px] leading-none tracking-[-0.02em] text-foreground")}>
          {lead.unitPrefix ? <span>{lead.unitPrefix}</span> : null}
          {lead.latestValue != null ? formatMetricNumber(lead.latestValue) : "—"}
          {lead.unitSuffix ? (
            <span className="ml-1 text-[18px] font-semibold tracking-normal text-foreground/80">
              {lead.unitSuffix}
            </span>
          ) : null}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {lead.change ? (
            <span className={cn(dataFont, "text-[11px] font-semibold", thesisEffectTextClass[lead.effect])}>
              {arrow} {lead.change.label}
              {span ? ` · ${span}` : ""}
            </span>
          ) : null}
          {pillLabel ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none",
                thesisEffectTintClass[lead.effect],
              )}
            >
              {pillLabel}
            </span>
          ) : null}
        </div>
      </div>
      <HeroBars lead={lead} guide={guide} />
    </div>
  );
}

function AlsoTrackedTable({
  item,
  lead,
}: {
  item: NormalizedKeyVariableDeepTreatmentItem;
  lead: LeadMetric;
}) {
  const history = item.kpiHistory;
  if (!history) return null;
  const rows = history.rows.filter((row) => row !== lead.row);
  const allPeriods = resolvePeriods(history);
  const shown = lead.shownPeriods;
  const hasMore = allPeriods.length > SHOWN_PERIODS;
  if (rows.length === 0 && !hasMore) return null;

  const gridClass = alsoTrackedGridClass[Math.min(shown.length, SHOWN_PERIODS)] ?? alsoTrackedGridClass[SHOWN_PERIODS];
  const headerCell = cn(dataFont, "text-right text-[9.5px] text-muted-foreground");

  return (
    <div className="mt-1.5 text-[12px]">
      <div className={cn("grid items-end gap-x-2 pb-1.5", gridClass)}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Also tracked
          </span>
          {hasMore ? (
            <AllPeriodsDrawer variable={item.variable} history={history} periodCount={allPeriods.length} />
          ) : null}
        </div>
        {shown.slice(0, -1).map((period) => (
          <span key={period} className={headerCell}>
            {shortPeriodLabel(period)}
          </span>
        ))}
        <span className={headerCell}>{shown[shown.length - 1]}</span>
        <span className={headerCell}>Change</span>
      </div>
      {rows.map((row) => {
        const values = shown.map((period) => asNumericValue(row.valuesByPeriod[period]));
        const first = values.find((value): value is number => value != null) ?? null;
        const latest = values[values.length - 1] ?? null;
        const { unit } = splitMetricName(row.metric);
        const change =
          shown.length >= 2 ? formatFirstToLatestChange(first, latest, classifyUnit(unit), "short") : null;
        const direction = item.metricDirections?.[row.metric] ?? "higher_is_better";
        const effect = getThesisEffect(change?.delta ?? null, direction);
        return (
          <div key={row.metric} className={cn("grid items-center gap-x-2 border-t border-border/60 py-2", gridClass)}>
            <span className="min-w-0 leading-snug text-foreground/85">{row.metric}</span>
            {values.map((value, index) => {
              const isLatest = index === values.length - 1;
              return (
                <span
                  key={shown[index]}
                  className={cn(
                    dataFont,
                    "text-right",
                    isLatest ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {formatCellValue(value ?? row.valuesByPeriod[shown[index]])}
                </span>
              );
            })}
            <span className={cn(dataFont, "text-right font-semibold", thesisEffectTextClass[effect])}>
              {change ? change.label : "—"}
            </span>
          </div>
        );
      })}
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
  const eyebrowTone =
    item.thesisRole && lead && lead.effect !== "neutral"
      ? thesisEffectTextClass[lead.effect]
      : "text-muted-foreground";
  const secondary =
    item.transition === "promoted" && item.transitionReason
      ? { lead: "Why promoted —", text: item.transitionReason }
      : item.whyItMattersNow
        ? { lead: "Why now —", text: item.whyItMattersNow }
        : null;

  return (
    <div className={cn(elevatedBlockClass, "flex flex-col rounded-[14px] px-5 py-5 sm:px-[22px]")}>
      {/* Below sm the pills + feedback button take the row, so the eyebrow gets
          its own line rather than being crushed to a word per line beside them. */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className={cn(dataFont, "text-[11px] font-semibold text-muted-foreground")}>
            {padIndex(index + 1)}
          </span>
          <span className={cn(eyebrowClass, "min-w-0", eyebrowTone)}>
            {item.thesisRole ?? `Variable ${index + 1}`}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
          {item.transition === "promoted" ? (
            <span
              className={cn(
                dataFont,
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
                violetTint,
              )}
            >
              ▲ Promoted this quarter
            </span>
          ) : item.transition === "retained" ? (
            <span
              className={cn(
                dataFont,
                "inline-flex items-center rounded-full border border-border/60 px-2 py-0.5 text-[10px] leading-none text-muted-foreground",
              )}
            >
              Retained
            </span>
          ) : null}
          <BlockFeedbackButton
            companyCode={companyCode}
            companyName={companyName}
            sectionId="key-variables"
            sectionTitle="Key Variables"
            blockId={`key-variable-${index + 1}`}
            blockTitle={item.variable}
          />
        </div>
      </div>

      <h4 className={cn(displayFont, "mt-3 text-[21px] leading-[1.2] tracking-[-0.02em] text-foreground")}>
        {item.variable}
      </h4>
      {item.whatItTracks ? (
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{item.whatItTracks}</p>
      ) : null}

      {lead ? <HeroBand lead={lead} guide={item.guide} /> : null}
      {lead ? <AlsoTrackedTable item={item} lead={lead} /> : null}

      {item.trendInterpretation || secondary ? (
        <div className="mt-3.5 border-t border-border/60 pt-4">
          <p className={cn(eyebrowClass, "text-muted-foreground")}>The read</p>
          {item.trendInterpretation ? (
            <p className="mt-1.5 text-pretty text-[13.5px] leading-[1.55] text-foreground/90">
              {item.trendInterpretation}
            </p>
          ) : null}
          {secondary ? (
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground/80">{secondary.lead}</span> {secondary.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Bottom row: On the radar | Changed this quarter                            */
/* ------------------------------------------------------------------------ */

const bottomBlockClass = cn(elevatedBlockClass, "rounded-[14px] px-5 pb-1.5 pt-4");

function RadarList({
  items,
  startIndex,
}: {
  items: NormalizedKeyVariableListItem[];
  startIndex: number;
}) {
  if (items.length === 0) return null;

  return (
    <div className={bottomBlockClass}>
      <div className="flex items-baseline justify-between gap-4">
        <p className={cn(eyebrowClass, "text-muted-foreground")}>
          On the radar — what else could move the story
        </p>
        <span className={cn(dataFont, "shrink-0 text-[10px] text-muted-foreground")}>Latest · Watch for</span>
      </div>
      <div className="mt-2">
        {items.map((item, offset) => {
          const latest = item.latest;
          return (
            <div
              key={item.variable}
              className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-x-3 border-t border-border/60 py-3.5 sm:grid-cols-[24px_minmax(0,1fr)_128px] sm:gap-x-4"
            >
              <span className={cn(dataFont, "pt-0.5 text-[11px] text-muted-foreground")}>
                {padIndex(startIndex + offset)}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold leading-snug text-foreground">
                  {item.variable}
                  {item.nextToPromote ? (
                    <span className={cn("ml-2 text-[10px] font-semibold", violetText)}>Next to promote</span>
                  ) : null}
                </p>
                {item.watchFor ? (
                  <p className="mt-1 text-pretty text-[12px] leading-[1.5] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Watch for —</span> {item.watchFor}
                  </p>
                ) : item.whyFlagged ? (
                  <p className="mt-1 text-pretty text-[12px] leading-[1.5] text-muted-foreground">
                    {item.whyFlagged}
                  </p>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-col items-end text-right">
                {latest ? (
                  <>
                    <span className={cn(dataFont, "text-[15px] font-semibold leading-tight text-foreground")}>
                      {latest.value}
                    </span>
                    {latest.deltaLabel ? (
                      <span
                        className={cn(
                          dataFont,
                          "mt-0.5 text-[10.5px] font-semibold leading-tight",
                          thesisEffectTextClass[latest.effect],
                        )}
                      >
                        {latest.deltaLabel}
                      </span>
                    ) : null}
                    {latest.asOf ? (
                      <span className={cn(dataFont, "mt-0.5 text-[9.5px] leading-tight text-muted-foreground")}>
                        {latest.asOf}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className={cn(dataFont, "text-[9.5px] leading-tight text-muted-foreground")}>
                    {sourceBasisDisplay[item.sourceBasis].label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChangedThisQuarter({
  snapshot,
  latestPeriod,
}: {
  snapshot: NormalizedKeyVariablesSnapshot;
  latestPeriod: string | null;
}) {
  const promoted = snapshot.deepTreatment.filter((item) => item.transition === "promoted");
  const dropped = snapshot.droppedVariables;
  if (promoted.length === 0 && dropped.length === 0) return null;

  return (
    <div className={bottomBlockClass}>
      <div className="flex items-baseline justify-between gap-4">
        <p className={cn(eyebrowClass, "text-muted-foreground")}>Changed this quarter</p>
        {latestPeriod ? (
          <span className={cn(dataFont, "shrink-0 text-[10px] text-muted-foreground")}>{latestPeriod}</span>
        ) : null}
      </div>
      <div className="mt-2">
        {promoted.map((item) => (
          <div key={`in-${item.variable}`} className="flex flex-col gap-1 border-t border-border/60 py-3.5">
            <p className="flex items-baseline gap-2">
              <span className={cn(dataFont, "text-[10px] font-semibold", violetText)}>▲ In</span>
              <span className="text-[13px] font-semibold leading-snug text-foreground">{item.variable}</span>
            </p>
            {item.transitionReason ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {firstSentence(item.transitionReason)}
              </p>
            ) : null}
          </div>
        ))}
        {dropped.map((item) => (
          <div key={`out-${item.variable}`} className="flex flex-col gap-1 border-t border-border/60 py-3.5">
            <p className="flex items-baseline gap-2">
              <span className={cn(dataFont, "text-[10px] font-semibold text-muted-foreground")}>▼ Out</span>
              <span className="text-[13px] font-semibold leading-snug text-foreground/75">{item.variable}</span>
            </p>
            {item.reason ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">{item.reason}</p>
            ) : null}
          </div>
        ))}
      </div>
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

  const deepNames = new Set(snapshot.deepTreatment.map((item) => normalizeVariableName(item.variable)));
  const radarItems = snapshot.fullVariableList.filter(
    (item) => !deepNames.has(normalizeVariableName(item.variable)),
  );
  const firstHistory = snapshot.deepTreatment[0]?.kpiHistory ?? null;
  const firstPeriods = firstHistory ? resolvePeriods(firstHistory) : [];
  const latestPeriod = firstPeriods.length > 0 ? firstPeriods[firstPeriods.length - 1] : null;
  const hasChanged =
    snapshot.deepTreatment.some((item) => item.transition === "promoted") ||
    snapshot.droppedVariables.length > 0;
  const hasRadar = radarItems.length > 0;

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

      {hasRadar || hasChanged ? (
        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            hasRadar && hasChanged ? "lg:grid-cols-[1.55fr_1fr]" : "lg:grid-cols-1",
          )}
        >
          <RadarList items={radarItems} startIndex={snapshot.deepTreatment.length + 1} />
          <ChangedThisQuarter snapshot={snapshot} latestPeriod={latestPeriod} />
        </div>
      ) : null}
    </div>
  );
}
