"use client";

import Link from "next/link";
import { Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { moatTierClass } from "@/lib/moat-analysis/tier-class";
import type { MoatRatingKey } from "@/lib/moat-analysis/types";
import type { MoatRowTable } from "./data";

export type { MoatRowTable };

const TABLE_CARD_CLASS =
  "overflow-hidden rounded-[1.45rem] border border-sky-200/25 bg-gradient-to-br from-background/97 via-background/93 to-sky-50/10 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.24)] backdrop-blur-sm dark:border-sky-700/20 dark:from-background/90 dark:via-background/84 dark:to-sky-950/10";

const TIER_SECTIONS: { key: MoatRatingKey; label: string }[] = [
  { key: "wide_moat", label: "Wide Moat" },
  { key: "narrow_moat", label: "Narrow Moat" },
  { key: "moat_at_risk", label: "Moat at Risk" },
  { key: "no_moat", label: "No Moat" },
  { key: "unknown", label: "Unassessed" },
];

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

export function MoatTable({ data }: { data: MoatRowTable[] }) {
  const tierGroups = TIER_SECTIONS.map((tier) => ({
    tier,
    rows: data.filter((r) => r.moatRating === tier.key),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className={TABLE_CARD_CLASS}>
      <Table className="w-full text-sm">
        <TableHeader className="bg-background/70">
          <TableRow className="border-b border-border/35 bg-background/70">
            <TableHead className="w-12 px-3 py-3 text-foreground">#</TableHead>
            <TableHead className="px-3 py-3 text-foreground">Company</TableHead>
            <TableHead className="w-40 px-3 py-3 text-foreground">
              <span title="Moat sources where the company shows presence (out of total assessed)">
                Active sources
              </span>
            </TableHead>
            <TableHead className="w-32 px-3 py-3 text-foreground">Cycle-tested</TableHead>
            <TableHead className="w-32 px-3 py-3 text-foreground">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tierGroups.map(({ tier, rows }) => (
            <Fragment key={tier.key}>
              <TableRow className="border-b border-border/35 bg-background/40 hover:bg-background/40">
                <TableCell colSpan={5} className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none ${moatTierClass(tier.key)}`}
                    >
                      {tier.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {rows.length} {rows.length === 1 ? "company" : "companies"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
              {rows.map((row) => (
                <TableRow
                  key={row.companyCode}
                  className="border-b border-border/45 transition-colors hover:bg-sky-50/25 dark:hover:bg-sky-950/10"
                >
                  <TableCell className="px-3 py-3 align-middle">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {row.leaderboardRank}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/company/${row.companyCode}`}
                        prefetch={false}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {row.companyName || row.companyCode}
                      </Link>
                      {row.isNew && (
                        <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                          New
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3 align-middle">
                    {row.totalSourceCount === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="text-foreground">
                        {row.appliesSourceCount}
                        <span className="text-muted-foreground"> / {row.totalSourceCount}</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-middle">
                    {row.cycleTested === true && (
                      <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-100/80 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                        Yes
                      </span>
                    )}
                    {row.cycleTested === false && (
                      <span className="inline-flex items-center rounded-full border border-rose-200/60 bg-rose-50/70 px-2 py-0.5 text-[10px] font-medium text-rose-800 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-200">
                        No
                      </span>
                    )}
                    {row.cycleTested === null && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-middle">
                    <span className="text-foreground">{formatDate(row.updatedAt)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
