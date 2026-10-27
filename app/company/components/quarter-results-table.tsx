"use client";

import { FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import type { QuarterResults, ResultsChange, ResultsRow } from "@/lib/quarter-results";
import { formatMetricNumber } from "@/lib/key-variables-snapshot/presentation";

import { chipClass } from "./chip-tone";
import { nestedDetailClass } from "./surface-tokens";

const dataFont = "font-[family-name:var(--font-data)] tabular-nums";
const eyebrowClass = "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

const integerFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatValue = (row: ResultsRow, value: number | null) => {
  if (value == null) return "—";
  if (row.unit === "pct") return oneDecimal.format(value);
  if (row.unit === "rs") return formatMetricNumber(value);
  // Rupee crore lines print whole numbers; Screener's table carries none finer.
  return integerFormatter.format(value);
};

const unitLabel: Record<ResultsRow["unit"], string> = { cr: "Cr", pct: "%", rs: "₹" };

const changeText = (change: ResultsChange): string => {
  if (!change) return "—";
  switch (change.kind) {
    case "pct":
      return `${change.value > 0 ? "+" : change.value < 0 ? "−" : ""}${oneDecimal.format(Math.abs(change.value))}%`;
    case "multiple":
      return `${integerFormatter.format(change.value)}×`;
    case "pp":
      return `${change.value > 0 ? "+" : change.value < 0 ? "−" : ""}${oneDecimal.format(Math.abs(change.value))} pp`;
    case "n/m":
      return "n/m";
  }
};

const changeTone = (change: ResultsChange): string => {
  if (!change || change.kind === "n/m") return "text-muted-foreground";
  if (change.kind === "multiple") return "text-emerald-600 dark:text-emerald-400";
  if (change.value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (change.value < 0) return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
};

const changeTitle = (change: ResultsChange): string | undefined => {
  if (change?.kind === "n/m") return "Not meaningful — the base period was a loss or nil";
  if (change?.kind === "multiple") return "Times the base period";
  return undefined;
};

/**
 * The scored quarter's reported P&L — Screener's quarterly table — beside the
 * quarter before and the year-ago quarter. Every number is the stored row's;
 * the changes are arithmetic (lib/quarter-results). On a phone the two
 * comparison columns drop and the YoY / QoQ changes carry the comparison.
 */
export function QuarterResultsTable({
  results,
  quarterLabel,
}: {
  results: QuarterResults;
  /** "Q2 FY27" — the scored quarter, as the rest of the section names it. */
  quarterLabel: string;
}) {
  const numCell = "px-2 py-2.5 text-right align-baseline";
  return (
    <div className={cn(nestedDetailClass, "flex min-w-0 flex-col p-3 sm:p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-[15px] font-semibold leading-tight text-foreground">Results</h3>
          <span className={cn(chipClass("slate"), dataFont, "px-2 py-0.5 text-[10px]")}>{quarterLabel}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {results.basis === "consolidated" ? "Consolidated" : "Standalone"} · Screener
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className={cn(dataFont, "w-full border-collapse text-[12px]")}>
          <thead>
            <tr className={cn(eyebrowClass, "border-b border-border/40")}>
              <th scope="col" className="py-2 pr-2 text-left font-semibold">
                <span className="sr-only">Metric</span>
              </th>
              <th scope="col" className={cn(numCell, "font-semibold")}>YoY</th>
              <th scope="col" className={cn(numCell, "font-semibold")}>QoQ</th>
              <th scope="col" className={cn(numCell, "font-semibold text-foreground")}>{results.quarter.label}</th>
              <th scope="col" className={cn(numCell, "hidden font-semibold sm:table-cell")}>
                {results.previous?.label ?? "Prev qtr"}
              </th>
              <th scope="col" className={cn(numCell, "hidden font-semibold sm:table-cell")}>
                {results.yearAgo?.label ?? "Year ago"}
              </th>
            </tr>
          </thead>
          <tbody>
            {results.rows.map((row) => (
              <tr
                key={row.key}
                className={cn(
                  "border-b border-border/25 last:border-b-0",
                  row.sub && "text-muted-foreground",
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    "py-2.5 pr-2 text-left font-sans text-[12.5px] font-medium text-foreground",
                    row.sub && "pl-4 text-[11.5px] font-normal text-muted-foreground",
                  )}
                >
                  {row.label}
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                    {unitLabel[row.unit]}
                  </span>
                </th>
                <td className={cn(numCell, "text-[11.5px] font-medium", changeTone(row.yoy))} title={changeTitle(row.yoy)}>
                  {changeText(row.yoy)}
                </td>
                <td className={cn(numCell, "text-[11.5px] font-medium", changeTone(row.qoq))} title={changeTitle(row.qoq)}>
                  {changeText(row.qoq)}
                </td>
                <td className={cn(numCell, "text-[13px] font-semibold", row.sub ? "text-foreground/85" : "text-foreground")}>
                  {formatValue(row, row.current)}
                </td>
                <td className={cn(numCell, "hidden text-muted-foreground sm:table-cell")}>
                  {formatValue(row, row.previous)}
                </td>
                <td className={cn(numCell, "hidden text-muted-foreground sm:table-cell")}>
                  {formatValue(row, row.yearAgo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2.5 text-[10px] leading-snug text-muted-foreground">
        Reported figures as Screener tabulates them; operating profit and OPM are Screener&apos;s own
        lines. n/m = change off a loss or nil base.
      </p>
    </div>
  );
}
