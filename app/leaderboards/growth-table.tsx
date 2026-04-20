"use client";

import Link from "next/link";
import ConcallScore from "@/components/concall-score";
import { DataTable } from "@/app/company/data-table";
import type { ColumnDef } from "@tanstack/react-table";

export type GrowthRowTable = {
  leaderboardRank: number;
  companyCode: string;
  companyName: string;
  isNew: boolean;
  updatedAt?: string | null;
  growthScore?: number | null;
  baseDisplay?: string | null;
  upsideDisplay?: string | null;
  downsideDisplay?: string | null;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

const renderGrowthPctCell = (value: string | null) => {
  const display = value ?? "—";
  return (
    <span
      className="inline-block max-w-[5.5rem] truncate align-middle text-foreground lg:max-w-[7rem]"
      title={value ?? undefined}
    >
      {display}
    </span>
  );
};

const growthColumns: ColumnDef<GrowthRowTable>[] = [
  {
    id: "rank",
    header: "#",
    cell: ({ row }) => (
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {row.original.leaderboardRank}
      </span>
    ),
  },
  {
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => {
      const name = row.original.companyName || row.original.companyCode;
      const code = row.original.companyCode;
      return (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/company/${code}`}
            prefetch={false}
            className="font-semibold text-foreground hover:underline"
          >
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
    accessorKey: "growthScore",
    header: "Growth score",
    cell: ({ row }) => {
      const score = row.getValue("growthScore") as number | null;
      return (
        <div className="flex justify-center">
          {typeof score === "number" ? (
            <ConcallScore score={score} />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm text-muted-foreground">
              -
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "baseDisplay",
    header: "Base %",
    cell: ({ row }) => {
      const value = row.getValue("baseDisplay") as string | null;
      return renderGrowthPctCell(value);
    },
  },
  {
    accessorKey: "upsideDisplay",
    header: "Upside %",
    cell: ({ row }) => {
      const value = row.getValue("upsideDisplay") as string | null;
      return renderGrowthPctCell(value);
    },
  },
  {
    accessorKey: "downsideDisplay",
    header: "Downside %",
    cell: ({ row }) => {
      const value = row.getValue("downsideDisplay") as string | null;
      return renderGrowthPctCell(value);
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-foreground">{formatDate(row.getValue("updatedAt") as string | null)}</span>
    ),
  },
];

export function GrowthTable({ data }: { data: GrowthRowTable[] }) {
  return <DataTable columns={growthColumns} data={data} />;
}
