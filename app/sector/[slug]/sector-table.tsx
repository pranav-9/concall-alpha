"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  STICKY_NAME_CELL,
  STICKY_NAME_HEAD,
  TABLE_SCROLL_HINT,
} from "@/lib/design/shell";
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
import { bandForScore, BANDS } from "@/lib/score-band";
import { bandForGrowthScore, GROWTH_BANDS } from "@/lib/growth-band";
import { bandForValuationScore, VALUATION_BANDS } from "@/lib/valuation-band";
import {
  BOARD_READS,
  classifyBoardRead,
  type BoardReadKey,
} from "@/lib/board-read";

export type SectorTableRow = {
  companyCode: string;
  companyName: string;
  subSector: string | null;
  isNew: boolean;
  /** Single latest print (the "this quarter" marker). */
  latestConcallScore: number | null;
  growthScore: number | null;
  /** Flat trailing 4-quarter mean, shown in the Trailing column. */
  avg4ConcallScore: number | null;
  /** Recency-weighted 4Q blend — the quarter leg the Read ranks on. */
  blendQuarterScore: number | null;
  /** Valuation already rescaled to 0-10 (higher = cheaper). */
  valuationScore: number | null;
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

// Number-over-band-word cell, in the app's shared band grammar — same as the
// /sectors listing and the Overall leaderboard.
function quarterBand(score: number) {
  const def = BANDS[bandForScore(score)];
  return { label: def.label, textClass: def.textClass };
}
function growthBand(score: number) {
  const def = GROWTH_BANDS[bandForGrowthScore(score)];
  return { label: def.label, textClass: def.textClass };
}
function valuationBand(score: number) {
  const def = VALUATION_BANDS[bandForValuationScore(score)];
  return { label: def.label, textClass: def.textClass };
}

function ScoreCell({
  score,
  band,
  className = "",
}: {
  score: number | null;
  band: (s: number) => { label: string; textClass: string };
  className?: string;
}) {
  if (score == null) {
    return (
      <TableCell className={cn("px-3 py-3 text-right align-middle", className)}>
        <span className="text-muted-foreground">—</span>
      </TableCell>
    );
  }
  const b = band(score);
  return (
    <TableCell className={cn("px-3 py-3 text-right align-middle", className)}>
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[15px] font-semibold tabular-nums text-foreground">
          {score.toFixed(1)}
        </span>
        <span className={`text-[11px] font-medium ${b.textClass}`}>{b.label}</span>
      </div>
    </TableCell>
  );
}

type SortKey =
  | "rank"
  | "companyName"
  | "moatTag"
  | "latestConcallScore"
  | "avg4ConcallScore"
  | "growthScore"
  | "valuationScore"
  | "read";

type SortDirection = "asc" | "desc";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

const DEFAULT_SORT: SortState = {
  key: "read",
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
  align = "left",
}: {
  active: boolean;
  direction: SortDirection;
  children: ReactNode;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-auto rounded-none border-0 bg-transparent px-0 py-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground shadow-none hover:bg-transparent hover:text-foreground",
        align === "right" && "flex-row-reverse",
      )}
      onClick={onClick}
    >
      {children}
      {active ? (
        direction === "asc" ? (
          <ChevronUp className={align === "right" ? "mr-1 h-3.5 w-3.5" : "ml-1 h-3.5 w-3.5"} />
        ) : (
          <ChevronDown className={align === "right" ? "mr-1 h-3.5 w-3.5" : "ml-1 h-3.5 w-3.5"} />
        )
      ) : (
        <ArrowUpDown
          className={cn(
            "h-3.5 w-3.5 opacity-50",
            align === "right" ? "mr-1" : "ml-1",
          )}
        />
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
  align = "left",
}: {
  label: string;
  columnKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  subtitle?: string;
  align?: "left" | "right";
}) {
  const active = sort.key === columnKey;
  const direction = active ? sort.direction : defaultDirectionForKey(columnKey);

  return (
    <div className={cn("flex flex-col gap-0.5", align === "right" && "items-end")}>
      <SortButton active={active} direction={direction} onClick={() => onSort(columnKey)} align={align}>
        {label}
      </SortButton>
      {subtitle ? (
        <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}

type EnrichedRow = SectorTableRow & {
  readScore: number | null;
  readKey: BoardReadKey;
  leaderboardRank: number | null;
};

function enrichRows(rows: SectorTableRow[]): EnrichedRow[] {
  // Per-company Read, computed exactly as the Overall board does it
  // (lib/board-read): the recency-weighted quarter blend tilted against price.
  const withRead = rows.map((row) => {
    const read = classifyBoardRead({
      concallScore: row.blendQuarterScore,
      growthScore: row.growthScore,
      valuationScore: row.valuationScore,
    });
    return { ...row, readScore: read.score, readKey: read.key };
  });

  const sortedForRank = [...withRead].sort((a, b) => {
    const readDiff = compareNumber(a.readScore, b.readScore, "desc");
    if (readDiff !== 0) return readDiff;
    return compareText(a.companyName, b.companyName, "asc");
  });
  const ranked = assignCompetitionRanks(sortedForRank, (row) => row.readScore);
  const rankByCode = new Map<string, number>();
  ranked.forEach((row) => {
    if (row.readScore != null) rankByCode.set(row.companyCode, row.leaderboardRank);
  });

  return withRead.map((row) => ({
    ...row,
    leaderboardRank: rankByCode.get(row.companyCode) ?? null,
  }));
}

function sortRows(rows: EnrichedRow[], sort: SortState): EnrichedRow[] {
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
          diff = moatTierRank(a.moatTier) - moatTierRank(b.moatTier);
        }
        break;
      case "latestConcallScore":
        diff = compareNumber(a.latestConcallScore, b.latestConcallScore, sort.direction);
        break;
      case "avg4ConcallScore":
        diff = compareNumber(a.avg4ConcallScore, b.avg4ConcallScore, sort.direction);
        break;
      case "growthScore":
        diff = compareNumber(a.growthScore, b.growthScore, sort.direction);
        break;
      case "valuationScore":
        diff = compareNumber(a.valuationScore, b.valuationScore, sort.direction);
        break;
      case "read":
        diff = compareNumber(a.readScore, b.readScore, sort.direction);
        break;
    }
    if (diff !== 0) return diff;
    // Tie-break: Read, then name.
    const tie = compareNumber(a.readScore, b.readScore, "desc");
    if (tie !== 0) return tie;
    return compareText(a.companyName, b.companyName, "asc");
  });
}

export function SectorTable({ rows, sector }: { rows: SectorTableRow[]; sector: string }) {
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const enrichedRows = enrichRows(rows);
  const sortedRows = sortRows(enrichedRows, sort);

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

  const READ_HEAD_TINT = "bg-amber-50/40 dark:bg-amber-950/[0.12]";

  return (
    <div className="relative">
      <div aria-hidden className={TABLE_SCROLL_HINT} />
      <Table className="min-w-[1180px] w-full text-sm">
        <TableHeader className="bg-background/70">
          <TableRow className="border-b border-border/35 bg-background/70">
            <TableHead aria-sort={sortDirectionLabel("rank")} className="w-12 px-3 py-3 text-foreground">
              {renderSortHead({ label: "#", columnKey: "rank", sort, onSort: handleSort })}
            </TableHead>
            <TableHead
              aria-sort={sortDirectionLabel("companyName")}
              className={cn("px-3 py-3 text-foreground", STICKY_NAME_HEAD)}
            >
              {renderSortHead({ label: "Company", columnKey: "companyName", sort, onSort: handleSort })}
            </TableHead>
            <TableHead aria-sort={sortDirectionLabel("moatTag")} className="px-3 py-3 text-foreground">
              {renderSortHead({
                label: "Moat Tag",
                columnKey: "moatTag",
                sort,
                onSort: handleSort,
                subtitle: "rating label",
              })}
            </TableHead>
            <TableHead
              aria-sort={sortDirectionLabel("latestConcallScore")}
              className="px-3 py-3 text-right text-foreground"
            >
              {renderSortHead({
                label: "ConcallScore",
                columnKey: "latestConcallScore",
                sort,
                onSort: handleSort,
                subtitle: "latest",
                align: "right",
              })}
            </TableHead>
            <TableHead
              aria-sort={sortDirectionLabel("avg4ConcallScore")}
              className="px-3 py-3 text-right text-foreground"
            >
              {renderSortHead({
                label: "Trailing",
                columnKey: "avg4ConcallScore",
                sort,
                onSort: handleSort,
                subtitle: "4Q avg",
                align: "right",
              })}
            </TableHead>
            <TableHead
              aria-sort={sortDirectionLabel("growthScore")}
              className="px-3 py-3 text-right text-foreground"
            >
              {renderSortHead({
                label: "Growth",
                columnKey: "growthScore",
                sort,
                onSort: handleSort,
                subtitle: "forward",
                align: "right",
              })}
            </TableHead>
            <TableHead
              aria-sort={sortDirectionLabel("valuationScore")}
              className="px-3 py-3 text-right text-foreground"
            >
              {renderSortHead({
                label: "Valuation",
                columnKey: "valuationScore",
                sort,
                onSort: handleSort,
                subtitle: "higher = cheaper",
                align: "right",
              })}
            </TableHead>
            <TableHead
              aria-sort={sortDirectionLabel("read")}
              className={cn("border-l border-border/70 px-3 py-3 text-right text-foreground", READ_HEAD_TINT)}
            >
              {renderSortHead({
                label: "Read",
                columnKey: "read",
                sort,
                onSort: handleSort,
                subtitle: "the three, combined",
                align: "right",
              })}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.length ? (
            sortedRows.map((row) => {
              const readDef = BOARD_READS[row.readKey];
              return (
                <TableRow
                  key={row.companyCode}
                  className="border-b border-border/45 transition-colors last:border-0 hover:bg-sky-50/25 dark:hover:bg-sky-950/10"
                >
                  <TableCell className="px-3 py-3 align-middle text-sm font-semibold tabular-nums text-muted-foreground">
                    {row.leaderboardRank ?? "—"}
                  </TableCell>
                  <TableCell className={cn("px-3 py-3 align-middle", STICKY_NAME_CELL)}>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/company/${row.companyCode}`}
                        prefetch={false}
                        onClick={() => analytics.sectorCompanyClick(sector, row.companyCode)}
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
                  <TableCell className="px-3 py-3 align-middle">
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
                  <ScoreCell score={row.latestConcallScore} band={quarterBand} />
                  <ScoreCell score={row.avg4ConcallScore} band={quarterBand} />
                  <ScoreCell score={row.growthScore} band={growthBand} />
                  <ScoreCell score={row.valuationScore} band={valuationBand} />
                  <TableCell
                    className={cn("border-l border-border/70 px-3 py-3 align-middle", READ_HEAD_TINT)}
                  >
                    <div className="flex flex-col items-end leading-tight">
                      {row.readScore != null ? (
                        <span className="text-[15px] font-semibold tabular-nums text-foreground">
                          {row.readScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      <span className={`text-[11px] font-medium ${readDef.textClass}`}>
                        {readDef.label}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No companies match the current filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
