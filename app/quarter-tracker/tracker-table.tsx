"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import { FreshScoreChip } from "@/components/score-provenance-chips";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BANDS, bandForScore } from "@/lib/score-band";
import { KpiSparkline } from "@/app/company/components/kpi-sparkline";
import { DataTable } from "@/app/company/data-table";
import type { TrackerEntry } from "./data";

// Quarter tracker rendered with the SAME platform table (DataTable) the leaderboard
// uses. Market-terminal layout: a flat colour-coded score numeral, Δ QoQ, an inline
// 7-quarter sparkline, and a relative "scored" time. Band/Source stay as their own
// columns for the season-ops read. Colours come from the shared band scheme.

const headerBtnClass =
  "h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-semibold text-foreground shadow-none hover:bg-transparent hover:text-foreground";

// scoredAt is a UTC timestamp; render as a relative label ("5h ago"). This is a
// client component, so Date.now() runs on the viewer's clock. Kept coarse — the
// tracker cares about "how recent", not the exact minute.
const formatRelative = (iso: string | null): string => {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
};

const buildColumns = (scoreLabel: string): ColumnDef<TrackerEntry>[] => [
  {
    id: "rank",
    header: "#",
    cell: ({ row }) => (
      <span className="text-[11px] font-semibold tabular-nums tracking-[0.1em] text-muted-foreground">
        {String(row.index + 1).padStart(2, "0")}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" className={headerBtnClass} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Company
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const e = row.original;
      return (
        <Link
          href={`/company/${encodeURIComponent(e.code)}#sentiment-score`}
          prefetch={false}
          className="flex flex-col leading-tight"
        >
          <span className="font-semibold text-foreground hover:underline">{e.name}</span>
          <span className="text-[11px] text-muted-foreground">{e.code}</span>
        </Link>
      );
    },
  },
  {
    accessorKey: "sector",
    header: "Sector",
    cell: ({ row }) => (
      <span className="text-[12px] text-muted-foreground">{row.original.sector ?? "—"}</span>
    ),
  },
  {
    accessorKey: "score",
    header: ({ column }) => (
      <Button variant="ghost" className={headerBtnClass} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        {scoreLabel}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const s = row.original.score;
      if (s == null) return <span className="text-muted-foreground">—</span>;
      const band = BANDS[bandForScore(s)];
      return (
        <span className={cn("text-[15px] font-bold tabular-nums", band.textClass)}>
          {s.toFixed(1)}
        </span>
      );
    },
  },
  {
    id: "band",
    header: "Band",
    cell: ({ row }) => {
      const s = row.original.score;
      const b = s == null ? BANDS.upcoming : BANDS[bandForScore(s)];
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", b.barClass)} />
          <span className={cn("text-[12px] font-medium", b.textClass)}>{b.label}</span>
        </span>
      );
    },
  },
  {
    id: "qoq",
    // Δ vs the most recent prior scored quarter. undefined (no score or no
    // prior) sorts last in both directions rather than reading as a big drop.
    accessorFn: (e) =>
      e.score != null && e.priorScore != null ? e.score - e.priorScore : undefined,
    sortUndefined: "last",
    header: ({ column }) => (
      <Button variant="ghost" className={headerBtnClass} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Δ QoQ
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const e = row.original;
      if (e.score == null || e.priorScore == null) {
        return <span className="text-[12px] text-muted-foreground">—</span>;
      }
      const d = e.score - e.priorScore;
      const cls =
        d > 0
          ? "text-teal-700 dark:text-teal-300"
          : d < 0
            ? "text-red-700 dark:text-red-300"
            : "text-muted-foreground";
      return (
        <span
          className={cn("text-[12px] font-medium tabular-nums", cls)}
          title={e.priorLabel ? `vs ${e.priorLabel}` : undefined}
        >
          {`${d >= 0 ? "+" : ""}${d.toFixed(1)}`}
        </span>
      );
    },
  },
  {
    id: "spark",
    header: "7-Qtr",
    enableSorting: false,
    cell: ({ row }) => (
      <KpiSparkline
        points={row.original.scorePath}
        className="h-6 w-16 shrink-0"
        ariaLabel={`${row.original.name} score trajectory`}
      />
    ),
  },
  {
    id: "source",
    // Unofficial sorts first: this column exists so the reader can pull the
    // provisional scores to the top and see what still owes a re-score.
    accessorFn: (e) => (e.score == null ? 2 : e.sourceStatus === "unofficial" ? 0 : 1),
    header: ({ column }) => (
      <Button variant="ghost" className={headerBtnClass} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Source
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const e = row.original;
      if (e.score == null) return <span className="text-[12px] text-muted-foreground">—</span>;
      // Both states are named here, unlike the leaderboard where only the
      // exception is chipped. This is the season operations board — every row
      // has to answer "is this final?", and a blank cell reads as missing data.
      if (e.sourceStatus !== "unofficial") {
        return <span className="text-[12px] text-muted-foreground">Official</span>;
      }
      return (
        <span
          className="text-[12px] font-medium text-foreground"
          title={
            "Scored from a third-party transcript, published before the company filed its own. " +
            "It will be re-scored when the official transcript lands."
          }
        >
          Unofficial
        </span>
      );
    },
  },
  {
    id: "scoredAt",
    // Raw ISO sorts chronologically as a string; cell renders the local-tz label.
    accessorFn: (e) => e.scoredAt ?? "",
    header: ({ column }) => (
      <Button variant="ghost" className={headerBtnClass} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Scored
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span
          className="text-[12px] tabular-nums text-muted-foreground"
          title={row.original.scoredAt ?? undefined}
        >
          {formatRelative(row.original.scoredAt)}
        </span>
        {row.original.scoredWithin24h && <FreshScoreChip />}
      </span>
    ),
  },
];

export function TrackerTable({
  entries,
  scoreLabel,
}: {
  entries: TrackerEntry[];
  scoreLabel: string;
}) {
  const columns = useMemo(() => buildColumns(scoreLabel), [scoreLabel]);
  return <DataTable columns={columns} data={entries} />;
}
