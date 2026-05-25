"use client";

import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BANDS, bandForScore } from "@/lib/score-band";
import { DataTable } from "@/app/company/data-table";
import type { TrackerEntry } from "./data";

// Q4 FY26 tracker rendered with the SAME platform table (DataTable) the leaderboard
// uses — band + sector as columns, and when the score was created as a column. Score
// circle + colours come from the shared band scheme (lib/score-band), matching the platform.

const headerBtnClass =
  "h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-semibold text-foreground shadow-none hover:bg-transparent hover:text-foreground";

// created_at is a UTC timestamp; render in the viewer's local tz (this is a client component).
const CREATED_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const formatCreatedAt = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : CREATED_FMT.format(d);
};

const COLUMNS: ColumnDef<TrackerEntry>[] = [
  {
    id: "rank",
    header: "#",
    cell: ({ row }) => (
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {row.index + 1}.
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
    accessorKey: "score",
    header: ({ column }) => (
      <Button variant="ghost" className={headerBtnClass} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Q4 FY26
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const s = row.original.score;
      return s == null ? <span className="text-muted-foreground">—</span> : <ConcallScore score={s} size="sm" />;
    },
  },
  {
    id: "createdAt",
    // Raw ISO sorts chronologically as a string; cell renders the local-tz label.
    accessorFn: (e) => e.createdAt ?? "",
    header: ({ column }) => (
      <Button variant="ghost" className={headerBtnClass} onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Scored
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-[12px] tabular-nums text-muted-foreground">
        {formatCreatedAt(row.original.createdAt)}
      </span>
    ),
  },
];

export function TrackerTable({ entries }: { entries: TrackerEntry[] }) {
  return <DataTable columns={COLUMNS} data={entries} />;
}
