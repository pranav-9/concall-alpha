"use client";

import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import { DataTable } from "./data-table";

export type CompanyRow = {
  company: string;
  // Dynamic quarter columns keyed by label, e.g. "Q1 FY26"
  [key: string]: string | number | null;
};

function buildColumns(quarterLabels: string[]): ColumnDef<CompanyRow>[] {
  const cols: ColumnDef<CompanyRow>[] = [
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
        return (
          <div className="underline">
            <Link href={`/company/${name}`}>
              <p>{name}</p>
            </Link>
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
