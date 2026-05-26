"use client";

import Link from "next/link";
import ConcallScore from "@/components/concall-score";
import { DataTable } from "@/app/company/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";

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
    id: "band",
    header: "Band",
    cell: ({ row }) => {
      const score = row.original.growthScore;
      if (typeof score !== "number") {
        return <span className="text-muted-foreground">—</span>;
      }
      const band = GROWTH_BANDS[bandForGrowthScore(score)];
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${band.barClass}`} />
          <span className={`text-[12px] font-medium ${band.textClass}`}>{band.label}</span>
        </span>
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
            <ConcallScore score={score} kind="growth" />
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
    id: "scenarios",
    header: "Scenarios",
    cell: ({ row }) => {
      const base = row.original.baseDisplay ?? null;
      const upside = row.original.upsideDisplay ?? null;
      const downside = row.original.downsideDisplay ?? null;
      if (!base && !upside && !downside) {
        return <span className="text-muted-foreground">—</span>;
      }
      const tooltip = [
        base ? `Base ${base}` : null,
        upside ? `Upside ${upside}` : null,
        downside ? `Downside ${downside}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return (
        <div className="flex flex-col leading-tight" title={tooltip}>
          <span className="text-[13px] font-semibold text-foreground">{base ?? "—"}</span>
          {(upside || downside) && (
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              {upside && <span className="text-emerald-700 dark:text-emerald-400">↑ {upside}</span>}
              {upside && downside && <span className="mx-1">·</span>}
              {downside && <span className="text-red-700 dark:text-red-400">↓ {downside}</span>}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-[12px] text-muted-foreground">
        {formatDate(row.getValue("updatedAt") as string | null)}
      </span>
    ),
  },
];

export function GrowthTable({ data }: { data: GrowthRowTable[] }) {
  return <DataTable columns={growthColumns} data={data} />;
}
