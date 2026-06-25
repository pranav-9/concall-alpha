"use client";

import Link from "next/link";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { ArrowUpDown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import { ScoreBandPill } from "@/app/company/components/score-band-pill";
import { TrendBadge } from "@/app/company/components/trend-badge";
import { BANDS } from "@/lib/score-band";
import { trajectorySortRank, type TrajectoryKey } from "@/lib/score-trajectory";
import { DataTable } from "./data-table";

export type CompanyRow = {
  company: string;
  leaderboardRank?: number;
  isNew?: boolean;
  trajectoryKey?: TrajectoryKey;
  trendDescription?: string;
  trendChange?: number;
  ownLatestScore?: number | null;
  ownLatestQuarterLabel?: string | null;
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
        const latestScore = latestLabel ? asNumber(row.original[latestLabel]) : null;
        const ownScore = asNumber(row.original.ownLatestScore);
        // No score for the leaderboard's latest quarter: fall back to the
        // company's own newest band, labelled with its quarter, instead of
        // a blanket "Upcoming".
        const isStale = latestScore == null && ownScore != null;
        const score = latestScore ?? ownScore;
        return (
          <span className="inline-flex items-center gap-1.5">
            {score == null ? (
              <>
                <span className={`h-1.5 w-1.5 rounded-full ${BANDS.upcoming.barClass}`} />
                <span className={`text-[12px] font-medium ${BANDS.upcoming.textClass}`}>
                  {BANDS.upcoming.label}
                </span>
              </>
            ) : (
              <ScoreBandPill score={score} />
            )}
            {isStale && row.original.ownLatestQuarterLabel && (
              <span className="text-[10px] text-muted-foreground">
                as of {row.original.ownLatestQuarterLabel}
              </span>
            )}
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
    // Sort by taxonomy rank (best trajectory first), Δ tiebreak within a
    // label. undefined + sortUndefined pins no-read rows last in BOTH
    // directions (rank alone would put them first when descending).
    accessorFn: (row) => trajectorySortRank(row.trajectoryKey) ?? undefined,
    sortUndefined: "last",
    sortingFn: (a, b, columnId) => {
      const ra = a.getValue<number>(columnId);
      const rb = b.getValue<number>(columnId);
      if (ra !== rb) return ra - rb;
      const ca = typeof a.original.trendChange === "number" ? a.original.trendChange : 0;
      const cb = typeof b.original.trendChange === "number" ? b.original.trendChange : 0;
      return cb - ca;
    },
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
    cell: ({ row }) => (
      <TrendBadge
        trajectoryKey={row.original.trajectoryKey}
        trendChange={row.original.trendChange}
        trendDescription={row.original.trendDescription}
      />
    ),
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
