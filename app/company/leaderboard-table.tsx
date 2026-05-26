"use client";

import Link from "next/link";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { ArrowUpDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import { BANDS, bandForScore } from "@/lib/score-band";
import { DataTable } from "./data-table";

export type CompanyRow = {
  company: string;
  leaderboardRank?: number;
  isNew?: boolean;
  trendDirection?: "improving" | "declining" | "stable";
  trendDescription?: string;
  trendChange?: number;
  trendLatestScore?: number;
  trendPriorBaseline?: number;
  // Dynamic quarter columns keyed by label, e.g. "Q1 FY26"
  [key: string]: string | number | boolean | null | undefined;
};

const SORT_HEADER_CLASS =
  "h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-semibold text-foreground shadow-none hover:bg-transparent hover:text-foreground";

const asNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function buildColumns(quarterLabels: string[]): ColumnDef<CompanyRow>[] {
  const latestLabel = quarterLabels[0] ?? null;

  const cols: ColumnDef<CompanyRow>[] = [
    {
      id: "rank",
      header: "#",
      cell: ({ row }) => (
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {row.original.leaderboardRank ?? row.index + 1}.
        </span>
      ),
    },
    {
      accessorKey: "company",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className={SORT_HEADER_CLASS}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const name: string = row.getValue("company");
        return (
          <div className="flex items-center gap-2">
            <Link href={`/company/${name}`} className="font-semibold text-foreground hover:underline">
              {name}
            </Link>
            {row.original.isNew && (
              <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                New
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "band",
      header: "Band",
      cell: ({ row }) => {
        const score = latestLabel ? asNumber(row.original[latestLabel]) : null;
        const band = score == null ? BANDS.upcoming : BANDS[bandForScore(score)];
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${band.barClass}`} />
            <span className={`text-[12px] font-medium ${band.textClass}`}>{band.label}</span>
          </span>
        );
      },
    },
  ];

  if (latestLabel) {
    cols.push({
      accessorKey: latestLabel,
      header: ({ column }) => (
        <Button
          variant="ghost"
          className={SORT_HEADER_CLASS}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Latest
            </span>
            <span>{latestLabel}</span>
          </span>
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const score = asNumber(row.getValue(latestLabel));
        if (score == null) return <span className="text-muted-foreground">—</span>;
        return <ConcallScore score={score} size="sm" />;
      },
    });
  }

  cols.push({
    id: "trend",
    accessorFn: (row) => row.trendChange ?? null,
    header: ({ column }) => (
      <Button
        variant="ghost"
        className={SORT_HEADER_CLASS}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Trend
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const direction = row.original.trendDirection;
      const change = row.original.trendChange;
      if (!direction) return <span className="text-muted-foreground">—</span>;

      let icon = <Minus className="h-3 w-3" />;
      let toneClass = "text-muted-foreground";
      if (direction === "improving") {
        icon = <TrendingUp className="h-3 w-3" />;
        toneClass = "text-emerald-700 dark:text-emerald-300";
      } else if (direction === "declining") {
        icon = <TrendingDown className="h-3 w-3" />;
        toneClass = "text-red-700 dark:text-red-300";
      }

      const deltaLabel =
        typeof change === "number" && Number.isFinite(change)
          ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}`
          : null;

      return (
        <span
          className={`inline-flex items-center gap-1 text-[12px] tabular-nums ${toneClass}`}
          title={row.original.trendDescription ?? undefined}
        >
          {icon}
          {deltaLabel && <span>{deltaLabel}</span>}
        </span>
      );
    },
  });

  cols.push({
    accessorKey: "Latest 4Q Avg",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className={SORT_HEADER_CLASS}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        4Q Avg
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const score = asNumber(row.getValue("Latest 4Q Avg"));
      if (score == null) return <span className="text-muted-foreground">—</span>;
      return <ConcallScore score={score} size="sm" />;
    },
  });

  return cols;
}

export function LeaderboardTable({
  quarterLabels,
  data,
}: {
  quarterLabels: string[];
  data: CompanyRow[];
}) {
  const columns = buildColumns(quarterLabels);
  const latestQuarterLabel = quarterLabels[0];
  const rankedData = assignCompetitionRanks(data, (item) => {
    if (!latestQuarterLabel) return null;
    return asNumber(item[latestQuarterLabel]);
  });

  return <DataTable columns={columns} data={rankedData} />;
}
