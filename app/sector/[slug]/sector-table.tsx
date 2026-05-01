"use client";

import Link from "next/link";
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
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { MOAT_RATING_ORDER, moatTierRank } from "@/lib/moat-analysis/rank";
import {
  moatTierClass,
  moatTierGradeClass,
  moatTierGradeIconClass,
  moatTierGradeLabel,
} from "@/lib/moat-analysis/tier-class";
import type { MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";

export type SectorTableRow = {
  companyCode: string;
  companyName: string;
  subSector: string | null;
  isNew: boolean;
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
  | "rank"
  | "companyName"
  | "moatTag"
  | "latestQuarterScore"
  | "growthScore"
  | "avg4QuarterScore"
  | "blendedScore";

type SortDirection = "asc" | "desc";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

const DEFAULT_SORT: SortState = {
  key: "blendedScore",
  direction: "desc",
};

const defaultDirectionForKey = (key: SortKey): SortDirection => {
  if (key === "companyName" || key === "rank") return "asc";
  return "desc";
};

const compareText = (
  a: string | null | undefined,
  b: string | null | undefined,
  direction: SortDirection,
) => {
  const aText = (a ?? "").trim();
  const bText = (b ?? "").trim();
  if (!aText && !bText) return 0;
  if (!aText) return 1;
  if (!bText) return -1;
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

const compareMoatTag = (
  a: MoatRatingKey | null,
  b: MoatRatingKey | null,
  direction: SortDirection,
) => {
  const aOrder = a ? MOAT_RATING_ORDER[a] ?? MOAT_RATING_ORDER.unknown : MOAT_RATING_ORDER.unknown;
  const bOrder = b ? MOAT_RATING_ORDER[b] ?? MOAT_RATING_ORDER.unknown : MOAT_RATING_ORDER.unknown;
  if (aOrder === bOrder) return 0;
  return direction === "desc" ? aOrder - bOrder : bOrder - aOrder;
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
        <span className="text-[10px] font-medium text-muted-foreground normal-case">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}

type RankedSectorRow = SectorTableRow & { leaderboardRank: number | null };

function rankRows(rows: SectorTableRow[]): RankedSectorRow[] {
  const sortedForRank = [...rows].sort((a, b) => {
    const blendDiff = compareNumber(a.blendedScore, b.blendedScore, "desc");
    if (blendDiff !== 0) return blendDiff;
    const qtrDiff = compareNumber(a.latestQuarterScore, b.latestQuarterScore, "desc");
    if (qtrDiff !== 0) return qtrDiff;
    const growthDiff = compareNumber(a.growthScore, b.growthScore, "desc");
    if (growthDiff !== 0) return growthDiff;
    return compareText(a.companyName, b.companyName, "asc");
  });
  const rankedSorted = assignCompetitionRanks(sortedForRank, (row) => row.blendedScore);
  const rankByCode = new Map<string, number>();
  rankedSorted.forEach((row) => {
    if (row.blendedScore != null) rankByCode.set(row.companyCode, row.leaderboardRank);
  });
  return rows.map((row) => ({
    ...row,
    leaderboardRank: rankByCode.get(row.companyCode) ?? null,
  }));
}

function sortRows(rows: RankedSectorRow[], sort: SortState): RankedSectorRow[] {
  return [...rows].sort((a, b) => {
    let diff = 0;
    switch (sort.key) {
      case "rank":
        diff = compareNumber(a.leaderboardRank, b.leaderboardRank, sort.direction);
        break;
      case "companyName":
        diff = compareText(a.companyName, b.companyName, sort.direction);
        break;
      case "moatTag":
        diff = compareMoatTag(a.moatRating, b.moatRating, sort.direction);
        if (diff === 0) {
          diff =
            sort.direction === "desc"
              ? moatTierRank(a.moatTier) - moatTierRank(b.moatTier)
              : moatTierRank(b.moatTier) - moatTierRank(a.moatTier);
        }
        break;
      case "latestQuarterScore":
        diff = compareNumber(a.latestQuarterScore, b.latestQuarterScore, sort.direction);
        break;
      case "growthScore":
        diff = compareNumber(a.growthScore, b.growthScore, sort.direction);
        break;
      case "avg4QuarterScore":
        diff = compareNumber(a.avg4QuarterScore, b.avg4QuarterScore, sort.direction);
        break;
      case "blendedScore":
        diff = compareNumber(a.blendedScore, b.blendedScore, sort.direction);
        if (diff === 0) {
          diff = compareNumber(a.latestQuarterScore, b.latestQuarterScore, sort.direction);
        }
        if (diff === 0) {
          diff = compareNumber(a.growthScore, b.growthScore, sort.direction);
        }
        break;
    }
    if (diff !== 0) return diff;
    return compareText(a.companyName, b.companyName, "asc");
  });
}

export function SectorTable({ rows }: { rows: SectorTableRow[] }) {
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const rankedRows = rankRows(rows);
  const sortedRows = sortRows(rankedRows, sort);

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

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1100px] w-full text-sm">
        <TableHeader className="bg-background/70">
          <TableRow className="border-b border-border/35 bg-background/70">
            <TableHead aria-sort={sortDirectionLabel("rank")} className="w-12 px-3 py-3 text-foreground">
              {renderSortHead({ label: "#", columnKey: "rank", sort, onSort: handleSort })}
            </TableHead>
            <TableHead aria-sort={sortDirectionLabel("companyName")} className="px-3 py-3 text-foreground">
              {renderSortHead({ label: "Company", columnKey: "companyName", sort, onSort: handleSort })}
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
            <TableHead
              aria-sort={sortDirectionLabel("growthScore")}
              className="px-3 py-3 text-foreground"
            >
              {renderSortHead({
                label: "Growth Score",
                columnKey: "growthScore",
                sort,
                onSort: handleSort,
              })}
            </TableHead>
            <TableHead
              aria-sort={sortDirectionLabel("avg4QuarterScore")}
              className="px-3 py-3 text-foreground"
            >
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
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {row.leaderboardRank ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/company/${row.companyCode}`}
                      prefetch={false}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {row.companyName}
                    </Link>
                    {row.isNew && (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                        New
                      </span>
                    )}
                  </div>
                  {row.subSector && (
                    <span className="mt-1 inline-flex items-center rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {row.subSector}
                    </span>
                  )}
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
                      {row.moatTier &&
                        (() => {
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
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-3">
                  {row.growthScore != null ? (
                    <ConcallScore score={row.growthScore} size="sm" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-3">
                  {row.avg4QuarterScore != null ? (
                    <ConcallScore score={row.avg4QuarterScore} size="sm" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
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
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No companies match the current filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
