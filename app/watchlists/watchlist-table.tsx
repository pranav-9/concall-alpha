"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import ConcallScore from "@/components/concall-score";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MOAT_RATING_ORDER, moatTierRank } from "@/lib/moat-analysis/rank";
import {
  moatTierClass,
  moatTierGradeClass,
  moatTierGradeIconClass,
  moatTierGradeLabel,
} from "@/lib/moat-analysis/tier-class";
import type { MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";

export type WatchlistTableRow = {
  companyCode: string;
  companyName: string;
  latestQuarterScore: number | null;
  growthScore: number | null;
  avg4QuarterScore: number | null;
  blendedScore: number | null;
  moatLabel: string | null;
  moatRating: MoatRatingKey | null;
  moatTier: MoatTier | null;
};

const tierIconFor = (tier: MoatTier) => {
  switch (tier) {
    case "strong":
      return ArrowUp;
    case "mid":
      return Minus;
    case "weak":
      return ArrowDown;
  }
};

type SortKey =
  | "companyName"
  | "latestQuarterScore"
  | "growthScore"
  | "avg4QuarterScore"
  | "blendedScore"
  | "moatTag";

type SortDirection = "asc" | "desc";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

const DEFAULT_SORT: SortState = {
  key: "blendedScore",
  direction: "desc",
};

const defaultDirectionForKey = (key: SortKey): SortDirection =>
  key === "companyName" ? "asc" : "desc";

const compareText = (a: string | null | undefined, b: string | null | undefined, direction: SortDirection) => {
  const aText = (a ?? "").trim();
  const bText = (b ?? "").trim();
  const diff = aText.localeCompare(bText, undefined, { sensitivity: "base" });
  return direction === "asc" ? diff : -diff;
};

const compareNumber = (
  a: number | null | undefined,
  b: number | null | undefined,
  direction: SortDirection,
) => {
  const aValue = typeof a === "number" && Number.isFinite(a) ? a : null;
  const bValue = typeof b === "number" && Number.isFinite(b) ? b : null;

  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return 1;
  if (bValue == null) return -1;

  return direction === "asc" ? aValue - bValue : bValue - aValue;
};

function SortButton({
  active,
  direction,
  children,
  onClick,
}: {
  active: boolean;
  direction: SortDirection;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-semibold text-foreground shadow-none hover:bg-transparent hover:text-foreground"
      onClick={onClick}
    >
      {children}
      {active ? (
        direction === "asc" ? (
          <ChevronUp className="ml-2 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
}

function renderSortHead({
  label,
  columnKey,
  sort,
  onSort,
  subtitle,
}: {
  label: string;
  columnKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  subtitle?: string;
}) {
  const active = sort.key === columnKey;
  const direction = active ? sort.direction : defaultDirectionForKey(columnKey);

  return (
    <div className="flex flex-col gap-0.5">
      <SortButton active={active} direction={direction} onClick={() => onSort(columnKey)}>
        {label}
      </SortButton>
      {subtitle ? (
        <span className="text-[10px] font-medium text-muted-foreground normal-case">{subtitle}</span>
      ) : null}
    </div>
  );
}

function getMoatRatingOrder(rating: MoatRatingKey | null) {
  if (!rating) return MOAT_RATING_ORDER.unknown;
  return MOAT_RATING_ORDER[rating] ?? MOAT_RATING_ORDER.unknown;
}

function compareMoatTag(
  a: MoatRatingKey | null,
  b: MoatRatingKey | null,
  direction: SortDirection,
) {
  const aOrder = getMoatRatingOrder(a);
  const bOrder = getMoatRatingOrder(b);
  if (aOrder === bOrder) return 0;
  return direction === "desc" ? aOrder - bOrder : bOrder - aOrder;
}

function sortRows(rows: WatchlistTableRow[], sort: SortState) {
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case "companyName": {
        const diff = compareText(a.companyName, b.companyName, sort.direction);
        if (diff !== 0) return diff;
        return compareText(a.companyCode, b.companyCode, "asc");
      }
      case "latestQuarterScore": {
        const diff = compareNumber(a.latestQuarterScore, b.latestQuarterScore, sort.direction);
        if (diff !== 0) return diff;
        return compareText(a.companyName, b.companyName, "asc");
      }
      case "growthScore": {
        const diff = compareNumber(a.growthScore, b.growthScore, sort.direction);
        if (diff !== 0) return diff;
        return compareText(a.companyName, b.companyName, "asc");
      }
      case "avg4QuarterScore": {
        const diff = compareNumber(a.avg4QuarterScore, b.avg4QuarterScore, sort.direction);
        if (diff !== 0) return diff;
        return compareText(a.companyName, b.companyName, "asc");
      }
      case "blendedScore": {
        const diff = compareNumber(a.blendedScore, b.blendedScore, sort.direction);
        if (diff !== 0) return diff;
        const latestDiff = compareNumber(a.latestQuarterScore, b.latestQuarterScore, sort.direction);
        if (latestDiff !== 0) return latestDiff;
        const growthDiff = compareNumber(a.growthScore, b.growthScore, sort.direction);
        if (growthDiff !== 0) return growthDiff;
        const avg4Diff = compareNumber(a.avg4QuarterScore, b.avg4QuarterScore, sort.direction);
        if (avg4Diff !== 0) return avg4Diff;
        return compareText(a.companyName, b.companyName, "asc");
      }
      case "moatTag": {
        const diff = compareMoatTag(a.moatRating, b.moatRating, sort.direction);
        if (diff !== 0) return diff;
        const tierDiff =
          sort.direction === "desc"
            ? moatTierRank(a.moatTier) - moatTierRank(b.moatTier)
            : moatTierRank(b.moatTier) - moatTierRank(a.moatTier);
        if (tierDiff !== 0) return tierDiff;
        return compareText(a.companyName, b.companyName, "asc");
      }
    }

    return 0;
  });
}

export function WatchlistTable({ rows }: { rows: WatchlistTableRow[] }) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [removingCompanyCode, setRemovingCompanyCode] = useState<string | null>(null);
  const sortedRows = sortRows(rows, sort);

  const handleSort = (key: SortKey) => {
    setSort((current) => {
      if (current.key !== key) {
        return { key, direction: defaultDirectionForKey(key) };
      }

      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  };

  const sortDirectionLabel = (key: SortKey) =>
    sort.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : "none";

  const handleRemove = async (row: WatchlistTableRow) => {
    if (removingCompanyCode) return;

    const confirmed = window.confirm(`Remove ${row.companyName} from this watchlist?`);
    if (!confirmed) return;

    setRemovingCompanyCode(row.companyCode);
    try {
      const response = await fetch("/api/watchlists/items", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyCode: row.companyCode }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; removed?: boolean; notFound?: boolean; error?: string; code?: string }
        | null;

      if (!response.ok) {
        if (payload?.code === "watchlist_missing") {
          window.alert("Create a watchlist first.");
          return;
        }
        window.alert(payload?.error ?? "Unable to remove company from watchlist.");
        return;
      }

      if (payload?.removed || payload?.notFound) {
        router.refresh();
      }
    } finally {
      setRemovingCompanyCode(null);
    }
  };

  return (
    <Table className="min-w-[1240px] w-full text-sm">
      <TableHeader className="bg-background/70">
        <TableRow className="border-b border-border/35 bg-background/70">
          <TableHead aria-sort={sortDirectionLabel("companyName")} className="px-3 py-3 text-foreground">
            {renderSortHead({
              label: "Company",
              columnKey: "companyName",
              sort,
              onSort: handleSort,
            })}
          </TableHead>
          <TableHead aria-sort={sortDirectionLabel("moatTag")} className="px-3 py-3 text-foreground">
            {renderSortHead({
              label: "Moat Tag",
              columnKey: "moatTag",
              sort,
              onSort: handleSort,
              subtitle: "Rating label",
            })}
          </TableHead>
          <TableHead
            aria-sort={sortDirectionLabel("latestQuarterScore")}
            className="px-3 py-3 text-foreground"
          >
            {renderSortHead({
              label: "Qtr Score",
              columnKey: "latestQuarterScore",
              sort,
              onSort: handleSort,
            })}
          </TableHead>
          <TableHead aria-sort={sortDirectionLabel("growthScore")} className="px-3 py-3 text-foreground">
            {renderSortHead({
              label: "Growth Score",
              columnKey: "growthScore",
              sort,
              onSort: handleSort,
            })}
          </TableHead>
          <TableHead aria-sort={sortDirectionLabel("avg4QuarterScore")} className="px-3 py-3 text-foreground">
            {renderSortHead({
              label: "4Q Avg Score",
              columnKey: "avg4QuarterScore",
              sort,
              onSort: handleSort,
            })}
          </TableHead>
          <TableHead
            aria-sort={sortDirectionLabel("blendedScore")}
            className="border-l border-border/70 px-3 py-3 text-foreground"
          >
            {renderSortHead({
              label: "Avg Score",
              columnKey: "blendedScore",
              sort,
              onSort: handleSort,
              subtitle: "Derived from first 3",
            })}
          </TableHead>
          <TableHead className="px-3 py-3 text-foreground">Remove</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.length ? (
          sortedRows.map((row) => (
            <TableRow
              key={row.companyCode}
              className="border-b border-border/45 transition-colors last:border-0 hover:bg-sky-50/25 dark:hover:bg-sky-950/10"
            >
              <TableCell className="px-3 py-3">
                <Link
                  href={`/company/${row.companyCode}`}
                  prefetch={false}
                  className="font-semibold text-foreground hover:underline"
                >
                  {row.companyName}
                </Link>
              </TableCell>
              <TableCell className="px-3 py-3">
                {row.moatLabel ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`${moatTierClass(row.moatRating)} inline-flex w-fit max-w-[11rem] items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]`}
                      title={row.moatLabel}
                    >
                      {row.moatLabel}
                    </span>
                    {row.moatTier && (() => {
                      const TierIcon = tierIconFor(row.moatTier);
                      return (
                        <span
                          className={`${moatTierGradeClass()} inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]`}
                        >
                          <TierIcon className={`h-3 w-3 ${moatTierGradeIconClass(row.moatTier)}`} />
                          {moatTierGradeLabel(row.moatTier)}
                        </span>
                      );
                    })()}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-3 py-3">
                {row.latestQuarterScore != null ? (
                  <ConcallScore score={row.latestQuarterScore} size="sm" />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="px-3 py-3">
                {row.growthScore != null ? (
                  <ConcallScore score={row.growthScore} size="sm" />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="px-3 py-3">
                {row.avg4QuarterScore != null ? (
                  <ConcallScore score={row.avg4QuarterScore} size="sm" />
                ) : (
                  "—"
                )}
              </TableCell>
          <TableCell className="border-l border-border/70 px-3 py-3">
            {row.blendedScore != null ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-700/40 dark:bg-emerald-950/20">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                  Blend
                    </span>
                    <ConcallScore score={row.blendedScore} size="sm" />
                  </div>
              ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="px-3 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemove(row)}
                  disabled={removingCompanyCode === row.companyCode}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-700/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
                >
                  {removingCompanyCode === row.companyCode ? "Removing..." : "Remove"}
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
