"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { ScoreBandPill } from "@/app/company/components/score-band-pill";
import { StanceBadge } from "@/app/company/components/stance-badge";
import { TrendBadge } from "@/app/company/components/trend-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import { MOAT_RATING_ORDER, moatTierRank } from "@/lib/moat-analysis/rank";
import {
  moatTierClass,
  moatTierGradeClass,
  moatTierGradeIconClass,
  moatTierGradeLabel,
} from "@/lib/moat-analysis/tier-class";
import type { MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";
import type { HeadlineGuidance } from "@/lib/guidance-tracking/headline-guidance";
import { classifyStance, compareStance, type StanceKey } from "@/lib/portfolio-stance";
import type { ScorePoint } from "@/lib/score-path";
import { compareTrend, type TrajectoryKey } from "@/lib/score-trajectory";

export type WatchlistTableRow = {
  companyCode: string;
  companyName: string;
  // Overall rank across the covered universe (composite score). Present on the
  // leaderboard "Overall" tab, absent on a real watchlist — the rank column
  // renders only when rows carry it.
  coverageRank?: number | null;
  latestQuarterScore: number | null;
  avg4QuarterScore: number | null;
  growthScore: number | null;
  trajectoryKey?: TrajectoryKey;
  trendChange: number | null;
  trendDescription: string | null;
  scorePath: ScorePoint[];
  moatLabel: string | null;
  moatRating: MoatRatingKey | null;
  moatTier: MoatTier | null;
  // Management's own stated growth guidance for the current FY (the FACT next to
  // our analytical Forward score). Sparse by design — null for most companies.
  guidance?: HeadlineGuidance | null;
};

// Each row's "Read" — the synthesis stance — is derived from the row's own
// signals (lib/portfolio-stance), so it's computed here rather than fetched.
type DerivedRow = WatchlistTableRow & {
  stanceKey: StanceKey;
  stanceDescription: string;
};

function deriveRows(rows: WatchlistTableRow[]): DerivedRow[] {
  return rows.map((row) => {
    const { key, description } = classifyStance(row);
    return { ...row, stanceKey: key, stanceDescription: description };
  });
}

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

// Band is bandForScore(latestQuarterScore) — the same datum as Qtr, bucketed —
// so it isn't an independent sort key. Sorting the level happens on the Qtr
// column; Trend is its own axis (direction); Forward is the growth outlook;
// Read (stance) synthesises them, sorted most-aligned -> most-cautionary so the
// watchlist becomes a decision queue (accumulate setups up top, cracking down).
type SortKey =
  | "coverageRank"
  | "companyName"
  | "latestQuarterScore"
  | "trend"
  | "growthScore"
  | "moatTag"
  | "stance";

type SortDirection = "asc" | "desc";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

const DEFAULT_SORT: SortState = {
  key: "latestQuarterScore",
  direction: "desc",
};

const defaultDirectionForKey = (key: SortKey): SortDirection =>
  key === "companyName" || key === "coverageRank" ? "asc" : "desc";

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

function sortRows(rows: DerivedRow[], sort: SortState) {
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case "coverageRank": {
        // Unranked rows (outside the covered universe) sort last either way.
        const aRank = a.coverageRank ?? Number.POSITIVE_INFINITY;
        const bRank = b.coverageRank ?? Number.POSITIVE_INFINITY;
        if (aRank !== bRank) return sort.direction === "asc" ? aRank - bRank : bRank - aRank;
        return compareText(a.companyName, b.companyName, "asc");
      }
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
      case "trend": {
        const diff = compareTrend(a, b, sort.direction);
        if (diff !== 0) return diff;
        return compareText(a.companyName, b.companyName, "asc");
      }
      case "growthScore": {
        const diff = compareNumber(a.growthScore, b.growthScore, sort.direction);
        if (diff !== 0) return diff;
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
      case "stance": {
        const diff = compareStance(a, b, sort.direction);
        if (diff !== 0) return diff;
        return compareText(a.companyName, b.companyName, "asc");
      }
    }

    return 0;
  });
}

// Sticky first column so the company name stays visible while the decision
// columns (Band / Qtr / Trend / ...) scroll horizontally on narrow screens.
const STICKY_COL = "sticky left-0 bg-background";

export function WatchlistTable({
  rows,
  watchlistId,
}: {
  rows: WatchlistTableRow[];
  // Omitted on the leaderboard "Overall" tab: same table, all companies, no
  // per-row Remove. Present on a real watchlist, which owns the remove action.
  watchlistId?: number;
}) {
  const router = useRouter();
  // The leaderboard "Overall" tab passes an overall rank per row; a watchlist
  // doesn't. Show the rank column (and lead with it) only when it's there.
  const showRank = rows.some((row) => row.coverageRank != null);
  const [sort, setSort] = useState<SortState>(
    showRank ? { key: "coverageRank", direction: "asc" } : DEFAULT_SORT,
  );
  const [removingCompanyCode, setRemovingCompanyCode] = useState<string | null>(null);
  const sortedRows = sortRows(deriveRows(rows), sort);
  const showRemove = watchlistId != null;
  // Company stays pinned while the decision columns scroll; the rank column
  // pins to its left, so Company shifts right by the rank column's width.
  const stickyCompany = showRank ? "sticky left-12 bg-background" : STICKY_COL;

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
    if (removingCompanyCode || watchlistId == null) return;

    const confirmed = window.confirm(`Remove ${row.companyName} from this watchlist?`);
    if (!confirmed) return;

    setRemovingCompanyCode(row.companyCode);
    try {
      const response = await fetch("/api/watchlists/items", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyCode: row.companyCode, watchlistId }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; removed?: boolean; notFound?: boolean; error?: string; code?: string }
        | null;

      if (!response.ok) {
        if (payload?.code === "watchlist_missing") {
          window.alert("This watchlist no longer exists.");
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
    <Table className="min-w-[1160px] w-full text-sm">
      <TableHeader className="bg-background/70">
        <TableRow className="border-b border-border/35 bg-background/70">
          {showRank ? (
            <TableHead
              aria-sort={sortDirectionLabel("coverageRank")}
              className={`${STICKY_COL} z-20 w-12 px-3 py-3 text-foreground`}
            >
              {renderSortHead({
                label: "#",
                columnKey: "coverageRank",
                sort,
                onSort: handleSort,
              })}
            </TableHead>
          ) : null}
          <TableHead
            aria-sort={sortDirectionLabel("companyName")}
            className={`${stickyCompany} z-20 px-3 py-3 text-foreground`}
          >
            {renderSortHead({
              label: "Company",
              columnKey: "companyName",
              sort,
              onSort: handleSort,
            })}
          </TableHead>
          <TableHead className="px-3 py-3 text-foreground">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">Band</span>
              <span className="text-[10px] font-medium text-muted-foreground normal-case">Verdict</span>
            </div>
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
              subtitle: "4Q avg below",
            })}
          </TableHead>
          <TableHead aria-sort={sortDirectionLabel("trend")} className="px-3 py-3 text-foreground">
            {renderSortHead({
              label: "Trend",
              columnKey: "trend",
              sort,
              onSort: handleSort,
              subtitle: "Direction",
            })}
          </TableHead>
          <TableHead aria-sort={sortDirectionLabel("growthScore")} className="px-3 py-3 text-foreground">
            {renderSortHead({
              label: "Forward",
              columnKey: "growthScore",
              sort,
              onSort: handleSort,
              subtitle: "Outlook",
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
            aria-sort={sortDirectionLabel("stance")}
            className="border-l border-border/70 bg-muted/30 px-3 py-3 text-foreground"
          >
            {renderSortHead({
              label: "Read",
              columnKey: "stance",
              sort,
              onSort: handleSort,
              subtitle: "Synthesis",
            })}
          </TableHead>
          {showRemove && (
            <TableHead className="px-2 py-3 text-foreground">
              <span className="sr-only">Remove</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.length ? (
          sortedRows.map((row) => (
            <TableRow
              key={row.companyCode}
              className="border-b border-border/45 transition-colors last:border-0 hover:bg-sky-50/25 dark:hover:bg-sky-950/10"
            >
              {showRank ? (
                <TableCell className={`${STICKY_COL} z-10 w-12 px-3 py-3`}>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {row.coverageRank ?? "—"}
                  </span>
                </TableCell>
              ) : null}
              <TableCell className={`${stickyCompany} z-10 px-3 py-3`}>
                <Link
                  href={`/company/${row.companyCode}`}
                  prefetch={false}
                  className="font-semibold text-foreground hover:underline"
                >
                  {row.companyName}
                </Link>
              </TableCell>
              <TableCell className="px-3 py-3">
                <ScoreBandPill score={row.latestQuarterScore} />
              </TableCell>
              <TableCell className="px-3 py-3">
                {row.latestQuarterScore != null ? (
                  <div className="leading-tight">
                    <div className="tabular-nums font-semibold text-foreground">
                      {row.latestQuarterScore.toFixed(1)}
                    </div>
                    {row.avg4QuarterScore != null && (
                      <div className="text-[10px] tabular-nums text-muted-foreground">
                        4Q {row.avg4QuarterScore.toFixed(1)}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-3 py-3">
                <TrendBadge
                  trajectoryKey={row.trajectoryKey}
                  trendChange={row.trendChange}
                  trendDescription={row.trendDescription}
                  scorePath={row.scorePath}
                />
              </TableCell>
              <TableCell className="px-3 py-3">
                <div className="leading-tight">
                  {row.growthScore != null ? (
                    <>
                      <div className="tabular-nums font-semibold text-foreground">
                        {row.growthScore.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {GROWTH_BANDS[bandForGrowthScore(row.growthScore)].label}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {row.guidance && (
                    <div
                      className="mt-1 flex items-baseline gap-1 text-[10px] text-muted-foreground"
                      title={row.guidance.detail}
                    >
                      <span className="rounded bg-muted/60 px-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                        mgmt
                      </span>
                      <span className="tabular-nums">{row.guidance.label}</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-3 py-3">
                {row.moatLabel ? (
                  <div className="flex flex-wrap items-center gap-1.5 opacity-90">
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
              <TableCell className="border-l border-border/70 bg-muted/20 px-3 py-3">
                <StanceBadge stanceKey={row.stanceKey} description={row.stanceDescription} />
              </TableCell>
              {showRemove && (
                <TableCell className="px-2 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void handleRemove(row)}
                    disabled={removingCompanyCode === row.companyCode}
                    aria-label={`Remove ${row.companyName} from this watchlist`}
                    title="Remove from watchlist"
                    className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </TableCell>
              )}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={showRemove ? 8 : 7} className="h-24 text-center text-muted-foreground">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
