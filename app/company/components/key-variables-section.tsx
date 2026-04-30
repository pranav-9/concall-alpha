import type {
  NormalizedKeyVariableDiscoverySummary,
  NormalizedKeyVariableKpiHistory,
  NormalizedKeyVariableSourceBasis,
  NormalizedKeyVariablesSnapshot,
} from "@/lib/key-variables-snapshot/types";
import { Button } from "@/components/ui/button";
import { KpiSparkline } from "./kpi-sparkline-lazy";
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

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const deltaFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const formatCellValue = (value: string | number | null | undefined) => {
  if (typeof value === "number") return numberFormatter.format(value);
  if (typeof value === "string") return value;
  return "—";
};

const asNumericValue = (value: string | number | null | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getPeriodOverPeriodGrowth = (
  periods: string[],
  valuesByPeriod: Record<string, string | number | null>,
  period: string,
) => {
  const periodIndex = periods.indexOf(period);
  if (periodIndex <= 0) return null;

  const currentValue = asNumericValue(valuesByPeriod[periods[periodIndex]]);
  const previousValue = asNumericValue(valuesByPeriod[periods[periodIndex - 1]]);

  if (currentValue == null || previousValue == null || previousValue === 0) {
    return null;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
};

const formatDeltaPercentValue = (value: number | null | undefined) => {
  if (value == null) return null;
  const formatted = deltaFormatter.format(Math.abs(value));
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatted}%`;
};

const getInlineDeltaClassName = (value: number | null | undefined) => {
  if (value == null) return "text-muted-foreground";
  if (value > 0) return "text-emerald-700/80 dark:text-emerald-300/80";
  if (value < 0) return "text-rose-700/80 dark:text-rose-300/80";
  return "text-muted-foreground";
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
  unknown: {
    label: "Source basis not tagged",
    className: "border-border/60 bg-muted/60 text-foreground",
  },
};

const compactLabel = (value: string | null) =>
  value?.replace(/[_>]+/g, " ").replace(/\s+/g, " ").trim() ?? null;

const summaryChip = (
  label: string,
  value: number | null,
  suffix?: string,
) => {
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

function KeyVariablesDiscoveryDrawer({
  snapshot,
}: {
  snapshot: NormalizedKeyVariablesSnapshot;
}) {
  const hasDiscoveryLayer =
    Boolean(snapshot.discoverySummary) || snapshot.fullVariableList.length > 0;

  if (!hasDiscoveryLayer) return null;

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full border-border/60 bg-background/70 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-none hover:bg-accent"
        >
          View Discovery
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-full max-w-xl">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle>Key Variables Discovery</DrawerTitle>
          <DrawerDescription>
            Broader variable selection context behind the deep-treatment shortlist.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Discovery Summary
            </p>
            <DiscoverySummary summary={snapshot.discoverySummary} />
          </div>

          {snapshot.fullVariableList.length > 0 ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Full Variable List
                </p>
                <p className="text-sm text-muted-foreground">
                  Variables identified as relevant, including those not promoted into deep treatment.
                </p>
              </div>

              <div className="space-y-3">
                {snapshot.fullVariableList.map((item) => {
                  const basisDisplay = sourceBasisDisplay[item.sourceBasis];

                  return (
                    <div
                      key={item.variable}
                      className="rounded-xl border border-border/25 bg-background/70 px-3.5 py-3"
                    >
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
                        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
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
    </Drawer>
  );
}

function KpiHistoryTable({ history }: { history: NormalizedKeyVariableKpiHistory }) {
  const periodsFromRows = history.rows.flatMap((row) => Object.keys(row.valuesByPeriod));
  const periods = history.periods.length > 0 ? history.periods : Array.from(new Set(periodsFromRows));

  if (periods.length === 0 || history.rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/30 bg-muted/20">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border/30">
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Metric
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
            {history.rows.map((row) => (
              <tr key={row.metric} className="border-b border-border/20 last:border-b-0">
                <td className="px-3 py-2.5 text-[12px] font-medium text-foreground">
                  {row.metric}
                </td>
                <td className="px-3 py-2.5">
                  <KpiSparkline
                    ariaLabel={`${row.metric} trend across ${periods.length} periods`}
                    points={periods.map((period) => ({
                      period,
                      value: asNumericValue(row.valuesByPeriod[period]),
                    }))}
                  />
                </td>
                {periods.map((period) => {
                  const yoyValue = getPeriodOverPeriodGrowth(
                    periods,
                    row.valuesByPeriod,
                    period,
                  );
                  const yoyLabel = formatDeltaPercentValue(yoyValue);

                  return (
                    <td key={period} className="px-3 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[12px] text-muted-foreground">
                          {formatCellValue(row.valuesByPeriod[period])}
                        </span>
                        {yoyLabel ? (
                          <span
                            className={`text-[10px] leading-none ${getInlineDeltaClassName(
                              yoyValue,
                            )}`}
                          >
                            {yoyLabel}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KeyVariablesSection({
  snapshot,
}: {
  snapshot: NormalizedKeyVariablesSnapshot;
}) {
  return (
    <div className="space-y-4">
      {snapshot.deepTreatment.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <KeyVariablesDiscoveryDrawer snapshot={snapshot} />
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {snapshot.deepTreatment.map((item, index) => (
              <div
                key={`${item.variable}-${index}`}
                className="rounded-2xl border border-border/35 bg-background/75 p-4 shadow-md shadow-black/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold leading-snug text-foreground">
                    {item.variable}
                  </p>
                  <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                    Variable {index + 1}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {item.kpiHistory ? <KpiHistoryTable history={item.kpiHistory} /> : null}

                  {item.currentRead ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Current Read
                      </p>
                      <p className="text-[12px] leading-relaxed text-foreground">
                        {item.currentRead}
                      </p>
                    </div>
                  ) : null}

                  {item.whatItTracks ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        What It Tracks
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {item.whatItTracks}
                      </p>
                    </div>
                  ) : null}

                  {item.whyItMattersNow ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Why It Matters Now
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {item.whyItMattersNow}
                      </p>
                    </div>
                  ) : null}

                  {item.trendInterpretation ? (
                    <div className="rounded-xl border border-sky-200/35 bg-sky-50/45 px-3 py-3 dark:border-sky-700/30 dark:bg-sky-950/10">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                        Trend Interpretation
                      </p>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-foreground">
                        {item.trendInterpretation}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
