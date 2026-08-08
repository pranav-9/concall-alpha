"use client";

import Link from "next/link";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { ArrowUpDown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import { ScoreBandPill } from "@/app/company/components/score-band-pill";
import { TrendBadge } from "@/app/company/components/trend-badge";
import { FreshScoreChip, UnofficialChip } from "@/components/score-provenance-chips";
import { BANDS } from "@/lib/score-band";
import { formatScoredAt, type ScoreSourceStatus } from "@/lib/score-freshness";
import { trajectorySortRank, type TrajectoryKey } from "@/lib/score-trajectory";
import type { ValuationVerdict } from "@/lib/valuation-check/types";
import { DataTable } from "./data-table";

export type CompanyRow = {
  company: string;
  leaderboardRank?: number;
  isNew?: boolean;
  /** Inside the mid/small universe but below the composite cut (rank > 100). */
  belowCut?: boolean;
  trajectoryKey?: TrajectoryKey;
  trendDescription?: string;
  trendChange?: number;
  ownLatestScore?: number | null;
  ownLatestQuarterLabel?: string | null;
  /** Provenance of the score in the Latest cell — "unofficial" or null (issuer-filed). */
  latestSourceStatus?: ScoreSourceStatus;
  /** When that score row was written. ISO; used for the chip's title only. */
  latestScoredAt?: string | null;
  /** Server-computed: the Latest score landed inside the last 24h. */
  scoredWithin24h?: boolean;
  valuationVerdict?: ValuationVerdict | null;
  valuationScore?: number | null;
  // Dynamic quarter columns keyed by label, e.g. "Q1 FY26"
  [key: string]: string | number | boolean | null | undefined;
};

const SORT_HEADER_CLASS =
  "h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-semibold text-foreground shadow-none hover:bg-transparent hover:text-foreground";

// Higher score = cheaper, so cheap reads emerald and rich reads rose — the same direction
// as the pills on the company page. Deliberately quieter than the ConcallScore chips: this
// column is context beside a quarter score, not a second thing to rank on.
const VALUATION_CLASS: Record<ValuationVerdict, string> = {
  "DEEPLY UNDERVALUED": "text-emerald-700 dark:text-emerald-300",
  UNDERVALUED: "text-emerald-700 dark:text-emerald-300",
  "FAIRLY VALUED": "text-muted-foreground",
  EXPENSIVE: "text-amber-700 dark:text-amber-300",
  "RICHLY PRICED": "text-rose-700 dark:text-rose-300",
};

const VALUATION_SHORT: Record<ValuationVerdict, string> = {
  "DEEPLY UNDERVALUED": "Deep value",
  UNDERVALUED: "Undervalued",
  "FAIRLY VALUED": "Fair",
  EXPENSIVE: "Expensive",
  "RICHLY PRICED": "Richly priced",
};

const asNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function buildColumns(quarterLabels: string[]): ColumnDef<CompanyRow>[] {
  const latestLabel = quarterLabels[0] ?? null;

  const cols: ColumnDef<CompanyRow>[] = [
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
            <span className="w-6 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {row.original.leaderboardRank ?? row.index + 1}.
            </span>
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
      // Score and band are one value: the band is bandForScore() of the number beside it.
      cell: ({ row }) => {
        const latestScore = asNumber(row.getValue(latestLabel));
        const ownScore = asNumber(row.original.ownLatestScore);
        // No score for the board's latest quarter: fall back to the company's own newest
        // band, labelled with its quarter, rather than a blanket "Upcoming".
        const isStale = latestScore == null && ownScore != null;
        const score = latestScore ?? ownScore;
        return (
          <div className="leading-tight">
            {latestScore != null ? (
              <ConcallScore score={latestScore} size="sm" />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
            <div className="mt-0.5 flex items-baseline gap-1.5">
              {score == null ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${BANDS.upcoming.barClass}`} />
                  <span className={`text-[10px] font-medium ${BANDS.upcoming.textClass}`}>
                    {BANDS.upcoming.label}
                  </span>
                </span>
              ) : (
                <ScoreBandPill score={score} />
              )}
              {isStale && row.original.ownLatestQuarterLabel && (
                <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                  as of {row.original.ownLatestQuarterLabel}
                </span>
              )}
            </div>
            {/* Provenance and recency go on their own line rather than beside
                the band: at 4 quarters + Trend + Valuation the row is already
                wide, and these two must not push the band pill off a phone. */}
            {(row.original.latestSourceStatus === "unofficial" ||
              row.original.scoredWithin24h) && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {row.original.latestSourceStatus === "unofficial" && (
                  <UnofficialChip scoredAt={formatScoredAt(row.original.latestScoredAt)} />
                )}
                {row.original.scoredWithin24h && (
                  <FreshScoreChip scoredAt={formatScoredAt(row.original.latestScoredAt)} />
                )}
              </div>
            )}
          </div>
        );
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
    id: "valuation",
    // Sorted on the score, but the verdict word is what the cell leads with. v14 §9.6 makes
    // the verdict the output and the score only its magnitude within a band; a column that
    // showed the bare number would invert that.
    accessorFn: (row) => row.valuationScore ?? undefined,
    sortUndefined: "last",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className={SORT_HEADER_CLASS}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Valuation
          </span>
          <span>Read</span>
        </span>
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const verdict = row.original.valuationVerdict;
      const score = asNumber(row.original.valuationScore);
      // No verdict is the honest majority state for lenders and thin-history names, and it
      // is not the same as "expensive" — it renders as an em dash, never as a low score.
      if (!verdict) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <span className={`text-[12px] font-medium ${VALUATION_CLASS[verdict]}`}>
            {VALUATION_SHORT[verdict]}
          </span>
          {score != null && (
            <span className="text-[11px] tabular-nums text-muted-foreground">{score}</span>
          )}
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

  return (
    <DataTable
      ariaLabel="Companies by latest quarter score"
      columns={columns}
      data={rankedData}
      stickyColId="company"
    />
  );
}
