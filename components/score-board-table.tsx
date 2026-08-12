"use client";

// The score board: four columns in one grammar — a 0-10 number with the band it
// falls in underneath. Quarter (how it just did), Growth (what's ahead),
// Valuation (what you pay), and Read (the composite of the three, plus a word
// naming the configuration).
//
// TWO SURFACES, ONE COMPONENT. The leaderboard "Overall" tab and a watchlist
// render this same board, because a reader who learns the grammar on one must
// not have to relearn it on the other. They differ in exactly two ways, both
// props:
//   - `watchlistId` turns on the per-row Remove action.
//   - `belowCut` on a row greys it (still linked — de-emphasized, not blocked).
//     Only the leaderboard sets it: watchlists are user-owned and deliberately
//     unfiltered by the coverage policy, so a holding never gets greyed out on
//     your own list.
// The `#` column means "rank on this board" in both cases — across the ranked
// hundred on /leaderboards, within the list on /watchlists — which is why it is
// derived from the rows passed in rather than read from a stored rank. Below-cut
// rows carry no number and sit at the bottom; they're rendered, not ranked.
//
// It replaced the old watchlist table (Qtr+4Q / Trend / Forward / Moat Tag /
// Valuation / portfolio-stance Read). Trend is a delta, not a score, and moat is
// categorical — neither can share the number+band format, so both live on their
// own leaderboard tabs.
//
// The columns are deliberately parallel: every cell is bandFor*(score) of the
// number above it, so no cell can contradict its own label, and the Read number
// is the same composite the # column sorts by.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ChevronDown, ChevronUp, X } from "lucide-react";
import type { ReactNode } from "react";
import { Fragment, useState } from "react";

import { ColumnInfo } from "@/app/company/components/column-info";
import { analytics } from "@/lib/analytics";
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
import {
  BOARD_READS,
  boardReadSortRank,
  classifyBoardRead,
  type BoardReadKey,
} from "@/lib/board-read";
import { FreshScoreChip } from "@/components/score-provenance-chips";
import { BANDS, bandForScore } from "@/lib/score-band";
import { formatScoredAt, type ScoreSourceStatus } from "@/lib/score-freshness";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";
import { computeBoardRanks } from "@/lib/leaderboard-rank";

export type ScoreBoardRow = {
  companyCode: string;
  companyName: string;
  /**
   * The quarter leg the Read ranks on: the RECENCY-WEIGHTED 4Q blend ("latest
   * counts double", lib/quarter-composite). NOT shown as its own column — it is
   * reconstructable as 0.2·latest + 0.8·4Q from the two columns that ARE shown —
   * but it feeds classifyBoardRead (the Read number and its label).
   */
  concallScore: number | null;
  /**
   * The flat trailing 4-quarter mean, shown in the "4Q" column. The stable trail
   * beside the fresh print; does not feed the Read. Null when unscored.
   */
  fourConcallScore: number | null;
  /**
   * The single latest print, shown in the "Latest" column with its quarter label.
   * The freshness / unofficial chips attach to THIS, so a one-quarter badge names
   * the one quarter it describes. Null when unscored.
   */
  latestConcallScore: number | null;
  /** Label of that latest print, e.g. "Q1 FY27". */
  latestQuarterLabel: string | null;
  /**
   * True when the company hasn't reported the board's newest quarter, so its
   * latest print is an older one. The quarter label is shown only then — a
   * current-quarter print rides unlabeled.
   */
  latestIsStale?: boolean;
  growthScore: number | null;
  /** ALREADY rescaled to 0-10 by the data layer (lib/valuation-band). */
  valuationScore: number | null;
  /** Below the composite cut: rendered greyed but still linked. Never set on a watchlist. */
  belowCut: boolean;
  /**
   * Provenance and recency of concallScore. Optional because a watchlisted
   * company with no scored quarter is built here as a placeholder row, and a
   * placeholder has no score to qualify.
   */
  quarterSourceStatus?: ScoreSourceStatus;
  concallScoredWithin24h?: boolean;
  /** ISO; feeds the chip titles only. */
  concallScoredAt?: string | null;
};

type DerivedRow = ScoreBoardRow & {
  readKey: BoardReadKey;
  readScore: number | null;
  readDescription: string;
  /** Position key for the default sort. See assignEffectiveRanks. */
  effectiveRank: number;
};

/**
 * The # column is the board's own ordering of the Read column, computed here
 * rather than read from the stored coverage_rank.
 *
 * Why not the stored rank. coverage_rank is written by a reviewed MANUAL step
 * (concallyser/scripts/compute_composite_score.py), so between runs it's a
 * snapshot of whatever the legs looked like last time. Displayed beside a Read
 * computed live from the current legs, the two disagree: the first build of
 * this board showed rank 6 carrying a Read of 8.5 above rank 1's 8.3, because
 * the stored ranks still came from the old two-leg formula. A board whose rank
 * column contradicts the number it claims to rank on is worse than one with no
 * ranks at all. It also left companies onboarded since the last run with no
 * rank, dangling below the greyed tail with a strong Read.
 *
 * Deriving it means # and Read agree by construction, always, with no compute
 * run required. The stored value still governs which companies are greyed out
 * (belowCut) — that's a reviewed membership decision and must not be recomputed
 * in the browser. The two converge once the script is re-run and applied.
 *
 * It is also what lets a watchlist share this component: the same code numbers
 * 8 rows 1-8 by their Read without needing a universe to rank against.
 *
 * Below-cut rows ARE numbered here (redesign 2026-08-11): the board numbers the
 * whole universe by Read and pins the greyed rows at the bottom, so a greyed row
 * shows its true Read position (e.g. #118) rather than a bare "—". The ranking
 * itself lives in lib/leaderboard-rank computeBoardRanks so the daily snapshot
 * writer (which feeds the Δ column) ranks the identical universe the identical
 * way — otherwise Δ would compare a rank to itself computed two ways.
 */
function assignEffectiveRanks(rows: Array<Omit<DerivedRow, "effectiveRank">>): DerivedRow[] {
  const rankByCode = computeBoardRanks(rows);
  return rows.map((row) => ({
    ...row,
    effectiveRank: rankByCode.get(row.companyCode) ?? Number.POSITIVE_INFINITY,
  }));
}

function deriveRows(rows: ScoreBoardRow[]): DerivedRow[] {
  return assignEffectiveRanks(
    rows.map((row) => {
      const read = classifyBoardRead({
        concallScore: row.concallScore,
        growthScore: row.growthScore,
        valuationScore: row.valuationScore,
      });
      return {
        ...row,
        readKey: read.key,
        readScore: read.score,
        readDescription: read.description,
      };
    }),
  );
}

// Every line restates vocabulary that already exists in code — lib/score-band,
// lib/growth-band, lib/valuation-band, lib/board-read — so the board can't drift
// from the pipeline. Don't add a claim the pipeline doesn't make.
const COLUMN_INFO = {
  latest: (
    <>
      <p>
        The company&apos;s <span className="font-medium text-foreground">single newest</span>{" "}
        ConcallScore, 0–10, with its quarter label — the freshest print on its own, before it is
        averaged into anything. The word beneath is the band it falls in.
      </p>
      <p>
        <span className="font-medium text-foreground">New · 24h</span> means this print was written
        or re-written in the last twenty-four hours.
      </p>
    </>
  ),
  fourQ: (
    <>
      <p>
        The <span className="font-medium text-foreground">trailing four-quarter average</span>{" "}
        ConcallScore, 0–10 — the stable read on how the company has been doing across its four newest
        scored quarters, next to the single fresh print on its left.
      </p>
      <p>
        This is also the leg the coverage ranking uses. The Read, though, leans on a{" "}
        <span className="font-medium text-foreground">recency-weighted</span> version of these two —
        see the Read column.
      </p>
    </>
  ),
  growth: (
    <>
      <p>
        Growth outlook, 0–10 — a forward read rather than a print. Band cuts are fixed and
        absolute (Exceptional ≥ 8.5 down to Weak), not percentiles of the cohort, so they stay
        comparable across companies and over time.
      </p>
    </>
  ),
  valuation: (
    <>
      <p>
        Price read, 0–10, where higher is more attractively valued — a lens on the current price,
        independent of the ConcallScore.
      </p>
      <p>
        Only published, non-stale reads appear.{" "}
        <span className="font-medium text-foreground">—</span> covers three different things: no
        verdict, not yet published, or a price too old to stand behind.
      </p>
    </>
  ),
  read: (
    <>
      <p>
        The synthesis, and the number the board is ranked by:{" "}
        <span className="font-medium text-foreground">0.88 × the average of Quarter and Growth,
        plus 0.12 × Valuation</span> — where Quarter is a recency-weighted blend of the two columns
        on the left, <span className="font-medium text-foreground">0.2 × Latest + 0.8 × 4Q</span> (so
        the latest quarter counts double any single earlier one). Quality counts roughly twice what
        price does.
      </p>
      <p>
        The weights aren&apos;t round because they answer the spread of each input — valuation
        varies almost four times as widely across companies as quality does, so an even split
        would have ranked this board on cheapness alone.
      </p>
      <p>
        The word names the configuration behind the number, which an average alone would hide: a
        soft quarter against a strong outlook reads{" "}
        <span className="font-medium text-foreground">Outlook-led</span>, not just &ldquo;7.2&rdquo;.
        It describes the setup — it is not a buy or sell call.
      </p>
    </>
  ),
} as const;

type SortKey = "coverageRank" | "companyName" | "latestScore" | "fourQScore" | "growthScore" | "valuationScore" | "read";
type SortDirection = "asc" | "desc";
type SortState = { key: SortKey; direction: SortDirection };

const defaultDirectionForKey = (key: SortKey): SortDirection =>
  key === "companyName" || key === "coverageRank" ? "asc" : "desc";

const compareText = (a: string, b: string, direction: SortDirection) => {
  const diff = a.trim().localeCompare(b.trim(), undefined, { sensitivity: "base" });
  return direction === "asc" ? diff : -diff;
};

// Null is "we don't have this", never "zero" — unscored rows sort last in BOTH
// directions rather than leading an ascending sort with a phantom low score.
const compareNumber = (
  a: number | null | undefined,
  b: number | null | undefined,
  direction: SortDirection,
) => {
  const av = typeof a === "number" && Number.isFinite(a) ? a : null;
  const bv = typeof b === "number" && Number.isFinite(b) ? b : null;
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return direction === "asc" ? av - bv : bv - av;
};

function sortRows(rows: DerivedRow[], sort: SortState) {
  const byName = (a: DerivedRow, b: DerivedRow) =>
    compareText(a.companyName, b.companyName, "asc");
  return [...rows].sort((a, b) => {
    // Below-cut rows pin to the bottom under EVERY sort key and direction —
    // they are not part of the ranked board, so they aren't competing for a
    // position in it. Doing this only on the default sort would put the greyed
    // tail back in the middle the moment a reader sorted by Quarter, which is
    // the confusion this pin exists to remove. No-op on a watchlist, which
    // never sets belowCut.
    if (a.belowCut !== b.belowCut) return a.belowCut ? 1 : -1;
    let diff = 0;
    switch (sort.key) {
      case "coverageRank": {
        // effectiveRank, not coverageRank: an as-yet-unranked company sits where
        // its Read puts it rather than dangling below the greyed tail.
        const ar = a.effectiveRank;
        const br = b.effectiveRank;
        diff = ar === br ? 0 : sort.direction === "asc" ? ar - br : br - ar;
        // Below-cut rows all share effectiveRank = Infinity, so they tie here and
        // would fall through to the alphabetical byName tie-breaker — the greyed
        // tail read as A→Z, not worst-to-best. Order that tail by Read (desc) so
        // it matches every other block on the default sort.
        if (diff === 0 && a.belowCut && b.belowCut) {
          diff = compareNumber(a.readScore, b.readScore, "desc");
        }
        break;
      }
      case "companyName":
        diff = compareText(a.companyName, b.companyName, sort.direction);
        if (diff === 0) diff = compareText(a.companyCode, b.companyCode, "asc");
        break;
      case "latestScore":
        diff = compareNumber(a.latestConcallScore, b.latestConcallScore, sort.direction);
        break;
      case "fourQScore":
        diff = compareNumber(a.fourConcallScore, b.fourConcallScore, sort.direction);
        break;
      case "growthScore":
        diff = compareNumber(a.growthScore, b.growthScore, sort.direction);
        break;
      case "valuationScore":
        diff = compareNumber(a.valuationScore, b.valuationScore, sort.direction);
        break;
      case "read": {
        // Sorted on the composite, so Read and the # column agree by construction.
        diff = compareNumber(a.readScore, b.readScore, sort.direction);
        if (diff === 0) {
          // Within an identical composite, the better-aligned configuration first.
          const ar = boardReadSortRank(a.readKey);
          const br = boardReadSortRank(b.readKey);
          if (ar == null && br != null) diff = 1;
          else if (ar != null && br == null) diff = -1;
          else if (ar != null && br != null) diff = ar - br;
        }
        break;
      }
    }
    return diff !== 0 ? diff : byName(a, b);
  });
}

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
  ariaLabel?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={ariaLabel}
      // z-10 keeps this above ColumnInfo's oversized tap target, which is centred
      // on the icon and overlaps this button's edge. has-[>svg]:px-0 is load-
      // bearing: the size variant carries has-[>svg]:px-3 and the sort chevron IS
      // a child svg, so plain px-0 loses to it and every label sits 12px right of
      // its own sub-label.
      className="relative z-10 h-auto rounded-none border-0 bg-transparent px-0 py-0 text-[11px] font-bold uppercase tracking-[0.09em] text-current shadow-none has-[>svg]:px-0 hover:bg-transparent hover:text-current hover:opacity-80"
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
  emphasis,
}: {
  label: string;
  columnKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  subtitle?: string;
  ariaLabel?: string;
  info?: ReactNode;
  /** The Read column: label in the house signal-warn colour, not the muted ink. */
  emphasis?: boolean;
}) {
  const active = sort.key === columnKey;
  const direction = active ? sort.direction : defaultDirectionForKey(columnKey);
  return (
    // Colour is set on the wrapper so the SortButton label (text-current) and its
    // sort caret (currentColor) both inherit it — muted ink for a normal column,
    // the warm signal for the Read.
    <div className="flex flex-col gap-0.5" style={{ color: emphasis ? "var(--warn)" : "var(--ink-soft)" }}>
      <div className="flex items-center gap-0.5">
        <SortButton active={active} direction={direction} ariaLabel={ariaLabel} onClick={() => onSort(columnKey)}>
          {label}
        </SortButton>
        {info ? <ColumnInfo label={label}>{info}</ColumnInfo> : null}
      </div>
      {subtitle ? (
        <span className="text-[10px] font-medium lowercase" style={{ color: "var(--ink-soft)", opacity: 0.7 }}>
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}

/**
 * One score cell: the number, and the band it falls in. The shared shape across
 * all four columns — passing the band's own textClass keeps every column on the
 * one teal↔red ramp defined in lib/score-band and its two siblings.
 */
function ScoreCell({
  score,
  bandLabel,
  bandClass,
  note,
  dimmed,
  chips,
}: {
  score: number | null;
  bandLabel: string | null;
  bandClass: string;
  /** e.g. "as of Q4 FY26" — only the Quarter column uses this. */
  note?: string | null;
  dimmed: boolean;
  /** Provenance / recency chips — only the Quarter column passes these. */
  chips?: React.ReactNode;
}) {
  if (score == null || bandLabel == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="leading-tight">
      <div className="tabular-nums font-semibold text-foreground">{score.toFixed(1)}</div>
      <div className="flex items-baseline gap-1.5">
        {/* Below the cut the whole row is de-emphasized, so the band word drops
            to muted rather than carrying its own colour — a greyed row with one
            bright teal label reads as an error, not as de-emphasis. */}
        <span className={`text-[10px] font-medium ${dimmed ? "text-muted-foreground" : bandClass}`}>
          {bandLabel}
        </span>
        {note && (
          <span className="whitespace-nowrap text-[10px] text-muted-foreground">{note}</span>
        )}
      </div>
      {/* Own line, not appended to the band row: this column can already carry
          an "as of Qx FYxx" note, and a third item inline overflowed the cell
          on the sticky-column mobile layout. */}
      {chips && <div className="mt-1 flex flex-wrap items-center gap-1">{chips}</div>}
    </div>
  );
}

/**
 * The Δ column: rank change vs ~7 days ago (lib/leaderboard-snapshot).
 * delta = priorRank − currentRank, so POSITIVE means the company CLIMBED.
 * null prior (no snapshot that old yet, or a company new since then) renders a
 * quiet dot, not a zero — "we have no earlier rank", not "no movement".
 */
function DeltaCell({ delta, dimmed }: { delta: number | null; dimmed: boolean }) {
  if (delta == null) {
    return <span className="text-muted-foreground/40" aria-label="no prior rank">·</span>;
  }
  if (delta === 0) {
    return <span className="text-muted-foreground" aria-label="no change">–</span>;
  }
  const up = delta > 0;
  const tone = dimmed
    ? "text-muted-foreground"
    : up
      ? "text-teal-600 dark:text-teal-400"
      : "text-red-600 dark:text-red-400";
  return (
    <span
      className={`inline-flex items-center gap-0.5 tabular-nums text-xs font-medium ${tone}`}
      aria-label={`${up ? "up" : "down"} ${Math.abs(delta)} places since the previous snapshot`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {Math.abs(delta)}
    </span>
  );
}

// Sticky first column (name stays visible while score columns scroll on a
// phone) lives in the shared shell tokens — STICKY_NAME_HEAD / STICKY_NAME_CELL
// / TABLE_SCROLL_HINT — so this board and the four DataTable/section boards
// share one implementation. The cell token carries the opaque base, the
// group-hover tint overlay, the width cap, and the lg revert.

export function ScoreBoardTable({
  rows,
  watchlistId,
  priorRankByCode,
}: {
  rows: ScoreBoardRow[];
  /**
   * Present on a watchlist, which owns the remove action. Omitted on the
   * leaderboard: same board, whole universe, nothing to remove.
   */
  watchlistId?: number;
  /**
   * UPPERCASE code → rank from ~7 days ago (lib/leaderboard-snapshot). Drives the
   * Δ column. A plain Record, not a Map — it crosses the server→client (ssr:false)
   * boundary. Only the leaderboard passes it: a watchlist's rank is list-local, so
   * its Δ would need its own snapshots. Absent → no Δ column.
   */
  priorRankByCode?: Record<string, number>;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>({ key: "coverageRank", direction: "asc" });
  const [removingCompanyCode, setRemovingCompanyCode] = useState<string | null>(null);
  const sortedRows = sortRows(deriveRows(rows), sort);
  const showRemove = watchlistId != null;
  // Only show Δ once there is prior data to compare against — otherwise the first
  // week (or forever, pre-DDL) would render a column of empty dots.
  const showDelta = priorRankByCode != null && Object.keys(priorRankByCode).length > 0;
  const columnCount = 6 + (showRemove ? 1 : 0);
  // Index of the first greyed row, so a "below the coverage cut" divider row can
  // be dropped in just above the pinned tail. -1 when nothing is below the cut.
  const firstBelowCutIndex = sortedRows.findIndex((row) => row.belowCut);

  const handleSort = (key: SortKey) => {
    const nextDirection =
      sort.key !== key
        ? defaultDirectionForKey(key)
        : sort.direction === "asc"
          ? "desc"
          : "asc";
    analytics.leaderboardSort(showRemove ? "watchlist" : "overall", key, nextDirection);
    setSort({ key, direction: nextDirection });
  };

  const sortDirectionLabel = (key: SortKey) =>
    sort.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : "none";

  const handleRemove = async (row: ScoreBoardRow) => {
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
        analytics.watchlistRemove(row.companyCode, "watchlist");
        router.refresh();
      }
    } finally {
      setRemovingCompanyCode(null);
    }
  };

  return (
    <div className="relative">
      {/* The only cue that more columns exist to the right — the scroll container
          carries no shadow, no mask and no scrollbar on touch. Hidden from lg up,
          where the table fits the shell without scrolling. */}
      <div aria-hidden className={TABLE_SCROLL_HINT} />
      <Table
        aria-label={
          showRemove
            ? "Watchlist companies by read, with ConcallScore, growth outlook and valuation"
            : "Companies by overall rank, with ConcallScore, growth outlook, valuation and read"
        }
        className="min-w-[900px] w-full text-sm"
      >
        <TableHeader>
          <TableRow className="border-b bg-transparent hover:bg-transparent" style={{ borderColor: "var(--rule)" }}>
            {/* Rank and Company are two sort keys in one cell, so aria-sort reports
                whichever is active rather than hardwiring one of them. */}
            <TableHead
              aria-sort={
                sort.key === "coverageRank" || sort.key === "companyName"
                  ? sortDirectionLabel(sort.key)
                  : "none"
              }
              className={`${STICKY_NAME_HEAD} px-3 py-3 text-foreground`}
            >
              <div className="flex items-baseline gap-3">
                {showDelta && (
                  <span
                    className="w-8 shrink-0 text-[11px] font-bold uppercase tracking-[0.09em]"
                    style={{ color: "var(--ink-soft)" }}
                    title="Rank change vs the previous snapshot"
                  >
                    Δ
                  </span>
                )}
                {renderSortHead({
                  label: "#",
                  columnKey: "coverageRank",
                  sort,
                  onSort: handleSort,
                  // Same column, same derivation — the universe it ranks within
                  // is whatever rows the surface passed in.
                  ariaLabel: showRemove ? "Rank in this watchlist" : "Overall rank",
                })}
                {renderSortHead({
                  label: "Company",
                  columnKey: "companyName",
                  sort,
                  onSort: handleSort,
                })}
              </div>
            </TableHead>
            <TableHead aria-sort={sortDirectionLabel("latestScore")} className="px-3 py-3 text-foreground">
              {renderSortHead({
                label: "ConcallScore",
                columnKey: "latestScore",
                sort,
                onSort: handleSort,
                subtitle: "Latest",
                info: COLUMN_INFO.latest,
              })}
            </TableHead>
            <TableHead aria-sort={sortDirectionLabel("fourQScore")} className="px-3 py-3 text-foreground">
              {renderSortHead({
                label: "Trailing ConcallScore",
                columnKey: "fourQScore",
                sort,
                onSort: handleSort,
                subtitle: "4Q Avg",
                info: COLUMN_INFO.fourQ,
              })}
            </TableHead>
            <TableHead aria-sort={sortDirectionLabel("growthScore")} className="px-3 py-3 text-foreground">
              {renderSortHead({
                label: "Growth",
                columnKey: "growthScore",
                sort,
                onSort: handleSort,
                subtitle: "forward",
                info: COLUMN_INFO.growth,
              })}
            </TableHead>
            <TableHead aria-sort={sortDirectionLabel("valuationScore")} className="px-3 py-3 text-foreground">
              {renderSortHead({
                label: "Valuation",
                columnKey: "valuationScore",
                sort,
                onSort: handleSort,
                subtitle: "higher = cheaper",
                info: COLUMN_INFO.valuation,
              })}
            </TableHead>
            <TableHead
              aria-sort={sortDirectionLabel("read")}
              className="border-l px-3 py-3"
              style={{ borderColor: "var(--rule)", backgroundColor: "rgba(180,83,9,0.06)" }}
            >
              {renderSortHead({
                label: "Read",
                columnKey: "read",
                sort,
                onSort: handleSort,
                subtitle: "the three, combined",
                info: COLUMN_INFO.read,
                emphasis: true,
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
            sortedRows.map((row, index) => {
              const dim = row.belowCut;
              const read = BOARD_READS[row.readKey];
              // Δ = where it sat last week minus where it sits now, so a positive
              // number is a climb. Null (no prior rank, or unranked now) → the
              // quiet dot in DeltaCell, never a fake zero.
              const prior = priorRankByCode?.[row.companyCode.toUpperCase()];
              const delta =
                prior != null && Number.isFinite(row.effectiveRank)
                  ? prior - row.effectiveRank
                  : null;
              return (
                <Fragment key={row.companyCode}>
                  {/* The one divider between the ranked universe and the pinned,
                      greyed below-cut tail. Rendered once, just above the first
                      greyed row. */}
                  {index === firstBelowCutIndex && firstBelowCutIndex > 0 && (
                    <TableRow className="border-b border-border/45 hover:bg-transparent">
                      <TableCell
                        colSpan={columnCount}
                        className="px-3 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                      >
                        — below the coverage cut · pinned —
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow
                    // Below the cut: de-emphasized to ~55%. The row still carries
                    // its full data — this is "not in the ranked hundred", not "no
                    // information" — and its name still links: the coverage policy
                    // de-emphasizes these pages, it doesn't block them. Never set
                    // on a watchlist: your own list is not subject to the cut.
                    className={`group border-b border-border/45 transition-colors last:border-0 hover:bg-accent/50 ${
                      dim ? "opacity-55" : ""
                    }`}
                  >
                    <TableCell className={`${STICKY_NAME_CELL} px-3 py-3`}>
                      <div className="relative z-[1] flex items-baseline gap-2">
                        {showDelta && (
                          <span className="w-8 shrink-0 text-right">
                            <DeltaCell delta={delta} dimmed={dim} />
                          </span>
                        )}
                        <span className="w-7 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {Number.isFinite(row.effectiveRank) ? row.effectiveRank : "—"}
                        </span>
                        {/* Below-cut rows link too: the coverage policy de-emphasizes
                            these companies, it doesn't block their pages — search
                            reaches them, so the board should as well. A 2026-08-01
                            session replay showed a visitor rage-clicking the greyed
                            names and leaving. min-w-0 lets truncate engage inside
                            the flex row; only bites under the sm cap. */}
                        {/* Name on top, ticker beneath it (not inline) — the
                            house company-cell shape. */}
                        <div className="flex min-w-0 flex-col leading-tight">
                          <Link
                            href={`/company/${row.companyCode}`}
                            prefetch={false}
                            onClick={() =>
                              analytics.leaderboardRowClick({
                                companyCode: row.companyCode,
                                board: showRemove ? "watchlist" : "overall",
                                belowCut: dim,
                                rank: Number.isFinite(row.effectiveRank)
                                  ? row.effectiveRank
                                  : undefined,
                              })
                            }
                            title={dim ? `${row.companyName} — below the coverage cut` : row.companyName}
                            className="house-display min-w-0 truncate text-sm hover:underline"
                            style={dim ? { color: "var(--ink-soft)" } : { color: "var(--ink)" }}
                          >
                            {row.companyName}
                          </Link>
                          <span
                            className="font-mono text-[10px] uppercase tracking-wide"
                            style={{ color: "var(--ink-soft)", opacity: 0.75 }}
                          >
                            {row.companyCode}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  {/* Latest: the single newest print, its quarter label, and the
                      only place the freshness / unofficial chips live — a
                      one-quarter badge must name the one quarter it describes. */}
                  <TableCell className="px-3 py-3">
                    {row.latestConcallScore != null ? (
                      <div className="leading-tight">
                        <div className="tabular-nums font-semibold text-foreground">
                          {row.latestConcallScore.toFixed(1)}
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`text-[10px] font-medium ${
                              dim
                                ? "text-muted-foreground"
                                : BANDS[bandForScore(row.latestConcallScore)].textClass
                            }`}
                          >
                            {BANDS[bandForScore(row.latestConcallScore)].label}
                          </span>
                          {row.latestIsStale && row.latestQuarterLabel && (
                            <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                              {row.latestQuarterLabel}
                            </span>
                          )}
                        </div>
                        {row.concallScoredWithin24h && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <FreshScoreChip
                              scoredAt={formatScoredAt(row.concallScoredAt)}
                              dimmed={dim}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {/* 4Q: the stable trailing average beside the fresh print. */}
                  <TableCell className="px-3 py-3">
                    <ScoreCell
                      score={row.fourConcallScore}
                      bandLabel={
                        row.fourConcallScore != null
                          ? BANDS[bandForScore(row.fourConcallScore)].label
                          : null
                      }
                      bandClass={
                        row.fourConcallScore != null
                          ? BANDS[bandForScore(row.fourConcallScore)].textClass
                          : ""
                      }
                      dimmed={dim}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <ScoreCell
                      score={row.growthScore}
                      bandLabel={
                        row.growthScore != null
                          ? GROWTH_BANDS[bandForGrowthScore(row.growthScore)].label
                          : null
                      }
                      bandClass={
                        row.growthScore != null
                          ? GROWTH_BANDS[bandForGrowthScore(row.growthScore)].textClass
                          : ""
                      }
                      dimmed={dim}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <ScoreCell
                      score={row.valuationScore}
                      bandLabel={
                        row.valuationScore != null
                          ? VALUATION_BANDS[bandForValuationScore(row.valuationScore)].label
                          : null
                      }
                      bandClass={
                        row.valuationScore != null
                          ? VALUATION_BANDS[bandForValuationScore(row.valuationScore)].textClass
                          : ""
                      }
                      dimmed={dim}
                    />
                  </TableCell>
                  <TableCell
                    className="border-l px-3 py-3"
                    style={{ borderColor: "var(--rule)", backgroundColor: "rgba(180,83,9,0.05)" }}
                  >
                    <div className="leading-tight" title={row.readDescription}>
                      {row.readScore != null ? (
                        <div className="tabular-nums font-semibold text-foreground">
                          {row.readScore.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">—</div>
                      )}
                      <div
                        className={`text-[10px] font-medium ${dim ? "text-muted-foreground" : read.textClass}`}
                      >
                        {read.label}
                      </div>
                    </div>
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
                </Fragment>
              );
            })
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
