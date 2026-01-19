"use client";

import Link from "next/link";
import ConcallScore from "@/components/concall-score";
import { DataTable } from "@/app/company/data-table";
import type { ColumnDef } from "@tanstack/react-table";

export type GrowthRowTable = {
  company: string;
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

const growthColumns: ColumnDef<GrowthRowTable>[] = [
  {
    id: "rank",
    header: "#",
    cell: ({ row }) => <span className="text-gray-300 text-sm">{row.index + 1}</span>,
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => {
      const name = row.getValue("company") as string;
      return (
        <Link href={`/company/${name}`} prefetch={false} className="hover:underline font-semibold text-white">
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
            <div className="h-10 w-10 rounded-full border border-gray-700 bg-gray-900 flex items-center justify-center text-sm text-gray-400">
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
    cell: ({ row }) => <span className="text-gray-200">{formatPct(row.getValue("base") as number | null)}</span>,
  },
  {
    accessorKey: "upside",
    header: "Upside %",
    cell: ({ row }) => <span className="text-gray-200">{formatPct(row.getValue("upside") as number | null)}</span>,
  },
  {
    accessorKey: "downside",
    header: "Downside %",
    cell: ({ row }) => <span className="text-gray-200">{formatPct(row.getValue("downside") as number | null)}</span>,
  },
];

export function GrowthTable({ data }: { data: GrowthRowTable[] }) {
  return <DataTable columns={growthColumns} data={data} />;
}
