"use client";

import Link from "next/link";
import { ArrowUpDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import { DataTable } from "./data-table";

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
        const change = row.original.trendChange ?? null;
        const recentAvg = row.original.trendRecentAvg;
        const historicalAvg = row.original.trendHistoricalAvg;

        let trendIcon = <Minus className="h-3 w-3 text-muted-foreground" />;
        let trendColor = "text-muted-foreground";
        let trendText = "Stable";

        if (direction === "improving") {
          trendIcon = <TrendingUp className="h-3 w-3 text-emerald-400" />;
          trendColor = "text-emerald-300";
          trendText = "Improving";
        } else if (direction === "declining") {
          trendIcon = <TrendingDown className="h-3 w-3 text-red-400" />;
          trendColor = "text-red-300";
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
                {recentAvg != null && historicalAvg != null && (
                  <span className="text-[10px] text-muted-foreground">
                    {recentAvg.toFixed(2)} vs {historicalAvg.toFixed(2)}
                  </span>
                )}
                {change != null && Math.abs(change) > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    ({change > 0 ? "+" : ""}
                    {change.toFixed(2)})
                  </span>
                )}
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
