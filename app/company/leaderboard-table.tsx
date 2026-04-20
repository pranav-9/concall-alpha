"use client";

import Link from "next/link";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { ArrowUpDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import { DataTable } from "./data-table";

const AverageScoreChip = ({ value, label }: { value: number; label: string }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/60 bg-sky-100/70 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-sky-700/35 dark:bg-sky-900/30">
    <span className="text-xs font-semibold tabular-nums text-sky-800 dark:text-sky-200">{value.toFixed(2)}</span>
    <span className="text-[10px] uppercase tracking-[0.16em] text-sky-700/80 dark:text-sky-300/80">{label}</span>
  </div>
);

export type CompanyRow = {
  company: string;
  leaderboardRank?: number;
  isNew?: boolean;
  trendDirection?: "improving" | "declining" | "stable";
  trendDescription?: string;
  trendChange?: number;
  trendRecentAvg?: number;
  trendHistoricalAvg?: number;
  // Dynamic quarter columns keyed by label, e.g. "Q1 FY26"
  [key: string]: string | number | boolean | null | undefined;
};

function buildColumns(quarterLabels: string[]): ColumnDef<CompanyRow>[] {
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
          className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-semibold text-foreground shadow-none hover:bg-transparent hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const name: string = row.getValue("company");
        const direction = row.original.trendDirection;

        let trendIcon = <Minus className="h-3 w-3 text-muted-foreground" />;
        let trendColor = "text-muted-foreground";
        let trendText = "Stable";

        if (direction === "improving") {
          trendIcon = <TrendingUp className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />;
          trendColor = "text-emerald-700 dark:text-emerald-300";
          trendText = "Improving";
        } else if (direction === "declining") {
          trendIcon = <TrendingDown className="h-3 w-3 text-red-700 dark:text-red-400" />;
          trendColor = "text-red-700 dark:text-red-300";
          trendText = "Declining";
        }

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
            {direction && (
              <span className={`flex items-center gap-1 text-[11px] ${trendColor}`}>
                {trendIcon}
                <span>{trendText}</span>
              </span>
            )}
          </div>
        );
      },
    },
  ];

  quarterLabels.forEach((label) => {
    cols.push({
      accessorKey: label,
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-semibold text-foreground shadow-none hover:bg-transparent hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {label}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const raw = row.getValue(label);
        if (raw == null || raw === "") {
          return <span className="text-muted-foreground">—</span>;
        }
        const score = Number(raw);
        if (Number.isNaN(score)) {
          return <span className="text-muted-foreground">—</span>;
        }
        return <ConcallScore score={score} size="sm" />;
      },
    });
  });

  cols.push({
    accessorKey: "Latest 4Q Avg",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-semibold text-foreground shadow-none hover:bg-transparent hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Latest 4Q Avg
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const raw = row.getValue("Latest 4Q Avg");
      if (raw == null || raw === "") {
        return <span className="text-muted-foreground">—</span>;
      }
      const score = Number(raw);
      if (Number.isNaN(score)) {
        return <span className="text-muted-foreground">—</span>;
      }
      return <AverageScoreChip value={score} label="4Q avg" />;
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
    const raw = item[latestQuarterLabel];
    if (raw == null || raw === "") return null;
    const score = Number(raw);
    return Number.isFinite(score) ? score : null;
  });

  return <DataTable columns={columns} data={rankedData} />;
}
