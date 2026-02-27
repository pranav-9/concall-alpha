"use client";

import Link from "next/link";
import ConcallScore from "@/components/concall-score";
import { DataTable } from "@/app/company/data-table";
import type { ColumnDef } from "@tanstack/react-table";

export type GrowthRowTable = {
  companyCode: string;
  companyName: string;
  updatedAt?: string | null;
  growthScore?: number | null;
  base?: number | null;
  upside?: number | null;
  downside?: number | null;
};

const formatPct = (value: number | null | undefined) => {
  if (value == null) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
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

const growthColumns: ColumnDef<GrowthRowTable>[] = [
  {
    id: "rank",
    header: "#",
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.index + 1}</span>,
  },
  {
    accessorKey: "companyName",
    header: "Company",
    cell: ({ row }) => {
      const name = row.original.companyName || row.original.companyCode;
      const code = row.original.companyCode;
      return (
        <Link
          href={`/company/${code}`}
          prefetch={false}
          className="hover:underline font-semibold text-foreground"
        >
          {name}
        </Link>
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
            <div className="h-10 w-10 rounded-full border border-border bg-muted flex items-center justify-center text-sm text-muted-foreground">
              -
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "base",
    header: "Base %",
    cell: ({ row }) => (
      <span className="text-foreground">{formatPct(row.getValue("base") as number | null)}</span>
    ),
  },
  {
    accessorKey: "upside",
    header: "Upside %",
    cell: ({ row }) => (
      <span className="text-foreground">{formatPct(row.getValue("upside") as number | null)}</span>
    ),
  },
  {
    accessorKey: "downside",
    header: "Downside %",
    cell: ({ row }) => (
      <span className="text-foreground">{formatPct(row.getValue("downside") as number | null)}</span>
    ),
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
