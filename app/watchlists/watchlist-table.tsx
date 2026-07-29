"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { ColumnInfo } from "@/app/company/components/column-info";
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
import type { ValuationVerdict } from "@/lib/valuation-check/types";
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
  // Set when latestQuarterScore is the company's OWN newest quarter rather than
  // the board's latest — i.e. it hasn't reported yet. Carries that quarter's
  // label so the cell can say "as of Q4 FY26" instead of showing a bare score
  // that looks like it's for the current quarter.
  latestQuarterAsOf?: string | null;
  avg4QuarterScore: number | null;
  growthScore: number | null;
  trajectoryKey?: TrajectoryKey;
  trendChange: number | null;
  trendDescription: string | null;
  scorePath: ScorePoint[];
  moatLabel: string | null;
  moatRating: MoatRatingKey | null;
  moatTier: MoatTier | null;
  // Published, non-stale valuation read only. Null covers three different things —
  // no verdict, unpublished, or a price too old to stand behind — and the cell
  // renders all of them the same way, because a board cannot explain a caveat.
  valuationVerdict?: ValuationVerdict | null;
  valuationScore?: number | null;
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
// Higher score = cheaper, matching the pills on the company page. Kept as quiet text
// rather than a chip: this column is context beside the quarter score, not a rival to it.
const VALUATION_CLASS: Record<ValuationVerdict, string> = {
  "DEEPLY UNDERVALUED": "text-emerald-700 dark:text-emerald-300",
  UNDERVALUED: "text-emerald-700 dark:text-emerald-300",
  "FAIRLY VALUED": "text-muted-foreground",
  EXPENSIVE: "text-amber-700 dark:text-amber-300",
  "RICHLY PRICED": "text-rose-700 dark:text-rose-300",
};

const VALUATION_SHORT: Record<ValuationVerdict, string> = {
  "DEEPLY UNDERVALUED": "Deep value",
  UNDERVALUED: "Undervalued",
  "FAIRLY VALUED": "Fair",
  EXPENSIVE: "Expensive",
  "RICHLY PRICED": "Richly priced",
};

// Column explainers. Each line restates vocabulary that already exists in code —
// lib/score-band, lib/score-trajectory, lib/growth-band, lib/portfolio-stance,
// schemas/valuation_check_v1.json — so the board can't drift from the pipeline.
const COLUMN_INFO = {
  qtrScore: (
    <>
      <p>
        The ConcallScore for the company&apos;s latest reported quarter, 0–10, read off that
        quarter&apos;s concall. The word beneath it is the band that score falls in.
      </p>
      <p>
        <span className="font-medium text-foreground">4Q</span> is the average of its last four
        quarterly scores. <span className="font-medium text-foreground">as of Qx FYxx</span> means
        the company hasn&apos;t reported the board&apos;s latest quarter yet, so this is its own
        newest print.
      </p>
    </>
  ),
  trend: (
    <>
      <p>
        Direction, not level — where the score is heading. A 7 on the way up is a different stock
        from a 7 on the way down.
      </p>
      <p>
        The number is the latest score minus its own 4-quarter average. Every threshold sits at or
        above the ±0.5 re-score drift band, so a move that drift alone could explain never earns a
        directional label. The line is the shape of the last four quarters, oldest to newest.
      </p>
    </>
  ),
  forward: (
    <>
      <p>
        Growth outlook, 0–10 — a forward read rather than a print. Band labels are fixed absolute
        cuts (Exceptional ≥ 8.5 down to Weak), not percentiles of the cohort, so they stay
        comparable across companies and over time.
      </p>
      <p>
        A <span className="font-medium text-foreground">mgmt</span> line is management&apos;s own
        stated growth guidance for the current financial year — their claim, sitting next to our
        score. Most companies don&apos;t give one.
      </p>
    </>
  ),
  moat: (
    <>
      <p>
        Our durability read. The pill is the rating label; the chip beside it grades the tier within
        that rating (Strong / Mid / Weak).
      </p>
      <p>
        <span className="font-medium text-foreground">—</span> means no assessment we&apos;d stand
        behind yet, which is not the same as a weak moat.
      </p>
    </>
  ),
  valuation: (
    <>
      <p>
        Price read, 0–100, where higher is more attractively valued. It is a valuation lens on the
        current price, independent of the quarter score.
      </p>
      <p>
        Only published, non-stale reads appear here.{" "}
        <span className="font-medium text-foreground">—</span> covers three different things: no
        verdict, not yet published, or a price too old to stand behind.
      </p>
    </>
  ),
  read: (
    <>
      <p>
        The synthesis — one stance per row, derived from that row&apos;s own signals (score, trend,
        outlook, moat). It isn&apos;t a separate model output, so it can never disagree with the
        columns to its left.
      </p>
      <p>
        Sorting by Read orders most-aligned to most-cautionary, which turns the board into a
        decision queue rather than a ranking.
      </p>
    </>
  ),
} as const;

type SortKey =
  | "coverageRank"
  | "companyName"
  | "latestQuarterScore"
  | "trend"
  | "growthScore"
  | "moatTag"
  | "valuation"
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
  ariaLabel,
}: {
  active: boolean;
  direction: SortDirection;
  children: ReactNode;
  onClick: () => void;
  /** Spoken name, when the visible label isn't one (e.g. "#"). */
  ariaLabel?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={ariaLabel}
      // z-10 keeps this above ColumnInfo's oversized tap target, which is
      // centred on the icon 2px to the right and overlaps this button's edge.
      className="relative z-10 h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-semibold text-foreground shadow-none hover:bg-transparent hover:text-foreground"
      onClick={onClick}
    >
      {children}
      {active ? (
        direction === "asc" ? (
          <ChevronUp className="ml-1.5 h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
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
  ariaLabel,
  info,
}: {
  label: string;
  columnKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  subtitle?: string;
  ariaLabel?: string;
  /** Column vocabulary, opened on tap. See ColumnInfo for the copy rule. */
  info?: ReactNode;
}) {
  const active = sort.key === columnKey;
  const direction = active ? sort.direction : defaultDirectionForKey(columnKey);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <SortButton
          active={active}
          direction={direction}
          ariaLabel={ariaLabel}
          onClick={() => onSort(columnKey)}
        >
          {label}
        </SortButton>
        {info ? <ColumnInfo label={label}>{info}</ColumnInfo> : null}
      </div>
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
      case "valuation": {
        const diff = compareNumber(a.valuationScore ?? null, b.valuationScore ?? null, sort.direction);
        if (diff !== 0) return diff;
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
// columns (Qtr / Trend / Forward / ...) scroll horizontally on narrow screens.
// The base has to be fully opaque or the scrolling cells show through it — which
// also means it can't take the row's translucent hover tint. STICKY_COL_BODY
// re-applies that tint as an overlay on top of the opaque base, so the pinned
// cell lights up with the rest of the row instead of staying a dead slab.
// The width cap is load-bearing on mobile, not cosmetic. Uncapped, the longest
// company name sized this column to 373px inside a 364px viewport, so the pinned
// cell filled the screen and every decision column sat off it — the board opened
// as a list of names with no signal at all. Capped, Qtr Score clears the fold
// beside the name, which is the pair a reader needs first.
const STICKY_COL = "sticky left-0 max-w-[11.5rem] bg-background sm:max-w-none";

const STICKY_COL_BODY = `${STICKY_COL} before:pointer-events-none before:absolute before:inset-0 before:bg-sky-50/25 before:opacity-0 before:transition-opacity group-hover:before:opacity-100 dark:before:bg-sky-950/10`;

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
  // Rank and Company share one pinned cell (rank prefixes the name), so there's
  // no second sticky column to offset against.
  const columnCount = 7 + (showRemove ? 1 : 0);

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
    // The scroll container lives inside <Table>, so the fade is a sibling
    // pinned over its right edge rather than a child that would scroll away
    // with the content. It is the only cue that six more columns exist — the
    // container carried no shadow, no mask, and no scrollbar on touch.
    // Hidden from xl up, where 1000px of table fits the shell without scrolling.
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-30 w-10 bg-gradient-to-l from-background to-transparent xl:hidden"
      />
      <Table className="min-w-[1000px] w-full text-sm">
      <TableHeader className="bg-background/70">
        <TableRow className="border-b border-border/35 bg-background/70">
          {/* Rank and Company are two sort keys in one cell, so aria-sort reports
              whichever of them is active — hardwiring it to companyName told a
              screen reader the table was unsorted while it was sorted by rank. */}
          <TableHead
            aria-sort={
              sort.key === "coverageRank" || sort.key === "companyName"
                ? sortDirectionLabel(sort.key)
                : "none"
            }
            className={`${STICKY_COL} z-20 px-3 py-3 text-foreground`}
          >
            {/* Rank first, matching the body cell where it prefixes the name. */}
            <div className="flex items-baseline gap-3">
              {showRank
                ? renderSortHead({
                    label: "#",
                    columnKey: "coverageRank",
                    sort,
                    onSort: handleSort,
                    ariaLabel: "Overall rank",
                  })
                : null}
              {renderSortHead({
                label: "Company",
                columnKey: "companyName",
                sort,
                onSort: handleSort,
              })}
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
              subtitle: "Band below",
              info: COLUMN_INFO.qtrScore,
            })}
          </TableHead>
          <TableHead aria-sort={sortDirectionLabel("trend")} className="px-3 py-3 text-foreground">
            {renderSortHead({
              label: "Trend",
              columnKey: "trend",
              sort,
              onSort: handleSort,
              subtitle: "Direction",
              info: COLUMN_INFO.trend,
            })}
          </TableHead>
          <TableHead aria-sort={sortDirectionLabel("growthScore")} className="px-3 py-3 text-foreground">
            {renderSortHead({
              label: "Forward",
              columnKey: "growthScore",
              sort,
              onSort: handleSort,
              subtitle: "Outlook",
              info: COLUMN_INFO.forward,
            })}
          </TableHead>
          <TableHead aria-sort={sortDirectionLabel("moatTag")} className="px-3 py-3 text-foreground">
            {renderSortHead({
              label: "Moat Tag",
              columnKey: "moatTag",
              sort,
              onSort: handleSort,
              subtitle: "Rating label",
              info: COLUMN_INFO.moat,
            })}
          </TableHead>
          <TableHead aria-sort={sortDirectionLabel("valuation")} className="px-3 py-3 text-foreground">
            {renderSortHead({
              label: "Valuation",
              columnKey: "valuation",
              sort,
              onSort: handleSort,
              // The number is meaningless without its direction, and the schema's
              // own words are "higher = more attractively valued" (0-100 integer,
              // schemas/valuation_check_v1.json). Direction is the part that can't
              // wait for a click, so it goes here; the 0-100 range lives in the
              // explainer. Spelling out both overflowed the shell by ~36px.
              subtitle: "Higher = cheaper",
              info: COLUMN_INFO.valuation,
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
              info: COLUMN_INFO.read,
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
              className="group border-b border-border/45 transition-colors last:border-0 hover:bg-sky-50/25 dark:hover:bg-sky-950/10"
            >
              <TableCell className={`${STICKY_COL_BODY} z-10 px-3 py-3`}>
                {/* Above the hover overlay, which is absolutely positioned. */}
                <div className="relative z-[1] flex items-baseline gap-2">
                  {showRank && (
                    <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {row.coverageRank ?? "—"}
                    </span>
                  )}
                  {/* min-w-0 lets truncate actually engage inside the flex row.
                      Only bites under the sm cap; full names show from sm up. */}
                  <Link
                    href={`/company/${row.companyCode}`}
                    prefetch={false}
                    title={row.companyName}
                    className="min-w-0 truncate font-semibold text-foreground hover:underline"
                  >
                    {row.companyName}
                  </Link>
                </div>
              </TableCell>
              {/* Score and band are one value, not two: the band is bandForScore() of the
                  number above it. Stacked in a single cell the same way Forward already
                  renders its score over its band label. */}
              <TableCell className="px-3 py-3">
                {row.latestQuarterScore != null ? (
                  <div className="leading-tight">
                    <div className="flex items-baseline gap-2">
                      <span className="tabular-nums font-semibold text-foreground">
                        {row.latestQuarterScore.toFixed(1)}
                      </span>
                      {row.avg4QuarterScore != null && (
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          4Q {row.avg4QuarterScore.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <ScoreBandPill score={row.latestQuarterScore} />
                      {row.latestQuarterAsOf && (
                        <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                          as of {row.latestQuarterAsOf}
                        </span>
                      )}
                    </div>
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
              <TableCell className="px-3 py-3">
                {row.valuationVerdict ? (
                  <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className={`text-[12px] font-medium ${VALUATION_CLASS[row.valuationVerdict]}`}>
                      {VALUATION_SHORT[row.valuationVerdict]}
                    </span>
                    {row.valuationScore != null && (
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {row.valuationScore}
                      </span>
                    )}
                  </span>
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
            <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
              No results.
            </TableCell>
          </TableRow>
        )}
        </TableBody>
      </Table>
    </div>
  );
}
