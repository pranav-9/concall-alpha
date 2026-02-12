"use client";

import Link from "next/link";
import { ArrowUpDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import { DataTable } from "./data-table";

const AverageScoreChip = ({ value, label }: { value: number; label: string }) => (
  <div className="inline-flex items-center gap-2 rounded-md border border-sky-300 bg-sky-50 px-2 py-1 dark:border-sky-700/40 dark:bg-sky-950/40">
    <span className="text-xs font-semibold tabular-nums text-sky-800 dark:text-sky-200">{value.toFixed(2)}</span>
    <span className="text-[10px] uppercase tracking-wide text-sky-700/80 dark:text-sky-300/80">{label}</span>
  </div>
);

export type CompanyRow = {
  company: string;
  trendDirection?: "improving" | "declining" | "stable";
  trendDescription?: string;
  trendChange?: number;
  trendRecentAvg?: number;
  trendHistoricalAvg?: number;
  // Dynamic quarter columns keyed by label, e.g. "Q1 FY26"
  [key: string]: string | number | null | undefined;
};

function buildColumns(quarterLabels: string[]): ColumnDef<CompanyRow>[] {
  const cols: ColumnDef<CompanyRow>[] = [
    {
      id: "rank",
      header: "#",
      cell: ({ table, row }) => {
        const rank =
          table.getRowModel().rows.findIndex((r) => r.id === row.id) + 1;
        return <span className="text-muted-foreground text-xs">{rank}.</span>;
      },
    },
    {
      accessorKey: "company",
      header: ({ column }) => (
        <Button
          variant="ghost"
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
            <div className="underline">
              <Link href={`/company/${name}`}>
                <p>{name}</p>
              </Link>
            </div>
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
        return <ConcallScore score={score} />;
      },
    });
  });

  cols.push({
    accessorKey: "Latest 4Q Avg",
    header: ({ column }) => (
      <Button
        variant="ghost"
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
  return <DataTable columns={columns} data={data} />;
}
