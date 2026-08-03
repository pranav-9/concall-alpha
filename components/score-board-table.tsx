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
import { useState } from "react";

import { ColumnInfo } from "@/app/company/components/column-info";
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
import { FreshScoreChip, UnofficialChip } from "@/components/score-provenance-chips";
import { BANDS, bandForScore } from "@/lib/score-band";
import { formatScoredAt, type ScoreSourceStatus } from "@/lib/score-freshness";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";

export type ScoreBoardRow = {
  companyCode: string;
  companyName: string;
  quarterScore: number | null;
  /** Set when quarterScore is the company's OWN newest quarter, not the board's. */
  quarterAsOf: string | null;
  growthScore: number | null;
  /** ALREADY rescaled to 0-10 by the data layer (lib/valuation-band). */
  valuationScore: number | null;
  /** Below the composite cut: rendered greyed but still linked. Never set on a watchlist. */
  belowCut: boolean;
  /**
   * Provenance and recency of quarterScore. Optional because a watchlisted
   * company with no scored quarter is built here as a placeholder row, and a
   * placeholder has no score to qualify.
   */
  quarterSourceStatus?: ScoreSourceStatus;
  quarterScoredWithin24h?: boolean;
  /** ISO; feeds the chip titles only. */
  quarterScoredAt?: string | null;
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
 */
function assignEffectiveRanks(rows: Array<Omit<DerivedRow, "effectiveRank">>): DerivedRow[] {
  const ordered = [...rows].sort((a, b) => {
    const av = a.readScore ?? Number.NEGATIVE_INFINITY;
    const bv = b.readScore ?? Number.NEGATIVE_INFINITY;
    if (av !== bv) return bv - av;
    return a.companyName.localeCompare(b.companyName);
  });
  const positionByCode = new Map<string, number>();
  let position = 0;
  ordered.forEach((row) => {
    // Unscored rows get no position — they can't be ranked on a missing number.
    if (row.readScore == null) return;
    // Nor do below-cut rows: the # column is a position in the ranked hundred,
    // and these are by definition not in it. Numbering them interleaved was the
    // visible contradiction — a greyed #40 sitting between two live rows — and
    // it also pushed the genuine 100th name down to ~#103. Skipping them makes
    // the ranked set number 1..N with no gaps, and pairs with the pin below so
    // the greyed tail reads as a tail rather than as a rendering fault.
    if (row.belowCut) return;
    position += 1;
    positionByCode.set(row.companyCode, position);
  });
  return rows.map((row) => ({
    ...row,
    effectiveRank: positionByCode.get(row.companyCode) ?? Number.POSITIVE_INFINITY,
  }));
}

function deriveRows(rows: ScoreBoardRow[]): DerivedRow[] {
  return assignEffectiveRanks(
    rows.map((row) => {
      const read = classifyBoardRead({
        quarterScore: row.quarterScore,
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
  quarter: (
    <>
      <p>
        The ConcallScore for the company&apos;s latest reported quarter, 0–10, read off that
        quarter&apos;s concall. The word beneath is the band that score falls in.
      </p>
      <p>
        <span className="font-medium text-foreground">as of Qx FYxx</span> means the company
        hasn&apos;t reported the board&apos;s latest quarter yet, so this is its own newest print.
      </p>
      <p>
        <span className="font-medium text-foreground">Unofficial</span> means the score was read
        off a third-party transcript, published inside the five working days an issuer has to
        file its own. It is re-scored when the official one lands, so treat it as provisional —
        including in the Read, which is computed from it.
      </p>
      <p>
        <span className="font-medium text-foreground">New · 24h</span> means this score was
        written or re-written in the last twenty-four hours.
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
        independent of the quarter score.
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
        plus 0.12 × Valuation</span>. Quality counts roughly twice what price does.
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

type SortKey = "coverageRank" | "companyName" | "quarterScore" | "growthScore" | "valuationScore" | "read";
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
        break;
      }
      case "companyName":
        diff = compareText(a.companyName, b.companyName, sort.direction);
        if (diff === 0) diff = compareText(a.companyCode, b.companyCode, "asc");
        break;
      case "quarterScore":
        diff = compareNumber(a.quarterScore, b.quarterScore, sort.direction);
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
      className="relative z-10 h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-semibold text-foreground shadow-none has-[>svg]:px-0 hover:bg-transparent hover:text-foreground"
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
  info?: ReactNode;
}) {
  const active = sort.key === columnKey;
  const direction = active ? sort.direction : defaultDirectionForKey(columnKey);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <SortButton active={active} direction={direction} ariaLabel={ariaLabel} onClick={() => onSort(columnKey)}>
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

// Sticky first column so the company name stays visible while the score columns
// scroll on narrow screens. The base must be fully opaque or scrolling cells
// show through it, which also means it can't take the row's translucent hover
// tint — STICKY_COL_BODY re-applies that as an overlay. The width cap is
// load-bearing on mobile: uncapped, the longest company name sized this column
// wider than a 364px viewport and pushed every score off screen.
const STICKY_COL = "sticky left-0 max-w-[11.5rem] bg-background sm:max-w-none";
const STICKY_COL_BODY = `${STICKY_COL} before:pointer-events-none before:absolute before:inset-0 before:bg-accent/50 before:opacity-0 before:transition-opacity group-hover:before:opacity-100`;

export function ScoreBoardTable({
  rows,
  watchlistId,
}: {
  rows: ScoreBoardRow[];
  /**
   * Present on a watchlist, which owns the remove action. Omitted on the
   * leaderboard: same board, whole universe, nothing to remove.
   */
  watchlistId?: number;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>({ key: "coverageRank", direction: "asc" });
  const [removingCompanyCode, setRemovingCompanyCode] = useState<string | null>(null);
  const sortedRows = sortRows(deriveRows(rows), sort);
  const showRemove = watchlistId != null;
  const columnCount = 5 + (showRemove ? 1 : 0);

  const handleSort = (key: SortKey) => {
    setSort((current) =>
      current.key !== key
        ? { key, direction: defaultDirectionForKey(key) }
        : { key, direction: current.direction === "asc" ? "desc" : "asc" },
    );
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-30 w-10 bg-gradient-to-l from-background to-transparent lg:hidden"
      />
      <Table
        aria-label={
          showRemove
            ? "Watchlist companies by read, with quarter score, growth outlook and valuation"
            : "Companies by overall rank, with quarter score, growth outlook, valuation and read"
        }
        className="min-w-[820px] w-full text-sm"
      >
        <TableHeader className="bg-background/70">
          <TableRow className="border-b border-border/35 bg-background/70">
            {/* Rank and Company are two sort keys in one cell, so aria-sort reports
                whichever is active rather than hardwiring one of them. */}
            <TableHead
              aria-sort={
                sort.key === "coverageRank" || sort.key === "companyName"
                  ? sortDirectionLabel(sort.key)
                  : "none"
              }
              className={`${STICKY_COL} z-20 px-3 py-3 text-foreground`}
            >
              <div className="flex items-baseline gap-3">
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
            <TableHead aria-sort={sortDirectionLabel("quarterScore")} className="px-3 py-3 text-foreground">
              {renderSortHead({
                label: "Quarter",
                columnKey: "quarterScore",
                sort,
                onSort: handleSort,
                subtitle: "Latest reported qtr",
                info: COLUMN_INFO.quarter,
              })}
            </TableHead>
            <TableHead aria-sort={sortDirectionLabel("growthScore")} className="px-3 py-3 text-foreground">
              {renderSortHead({
                label: "Growth",
                columnKey: "growthScore",
                sort,
                onSort: handleSort,
                subtitle: "Forward outlook",
                info: COLUMN_INFO.growth,
              })}
            </TableHead>
            <TableHead aria-sort={sortDirectionLabel("valuationScore")} className="px-3 py-3 text-foreground">
              {renderSortHead({
                label: "Valuation",
                columnKey: "valuationScore",
                sort,
                onSort: handleSort,
                subtitle: "Higher = cheaper",
                info: COLUMN_INFO.valuation,
              })}
            </TableHead>
            <TableHead
              aria-sort={sortDirectionLabel("read")}
              className="border-l border-border/70 bg-muted/30 px-3 py-3 text-foreground"
            >
              {renderSortHead({
                label: "Read",
                columnKey: "read",
                sort,
                onSort: handleSort,
                subtitle: "The three, combined",
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
            sortedRows.map((row) => {
              const dim = row.belowCut;
              const read = BOARD_READS[row.readKey];
              return (
                <TableRow
                  key={row.companyCode}
                  // Below the cut: de-emphasized to ~55%. The row still carries
                  // its full data — this is "not in the ranked hundred", not "no
                  // information" — and its name still links: the coverage policy
                  // de-emphasizes these pages, it doesn't block them. Never set
                  // on a watchlist: your own list is not subject to the cut.
                  className={`group border-b border-border/45 transition-colors last:border-0 hover:bg-accent/50 ${
                    dim ? "opacity-55" : ""
                  }`}
                >
                  <TableCell className={`${STICKY_COL_BODY} z-10 px-3 py-3`}>
                    <div className="relative z-[1] flex items-baseline gap-2">
                      <span className="w-7 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {Number.isFinite(row.effectiveRank) ? row.effectiveRank : "—"}
                      </span>
                      {/* Below-cut rows link too: the coverage policy de-emphasizes
                          these companies, it doesn't block their pages — search
                          reaches them, so the board should as well. A 2026-08-01
                          session replay showed a visitor rage-clicking the greyed
                          names and leaving. min-w-0 lets truncate engage inside
                          the flex row; only bites under the sm cap. */}
                      <Link
                        href={`/company/${row.companyCode}`}
                        prefetch={false}
                        title={dim ? `${row.companyName} — below the coverage cut` : row.companyName}
                        className={`min-w-0 truncate font-semibold hover:underline ${
                          dim ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {row.companyName}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <ScoreCell
                      score={row.quarterScore}
                      bandLabel={
                        row.quarterScore != null ? BANDS[bandForScore(row.quarterScore)].label : null
                      }
                      bandClass={
                        row.quarterScore != null ? BANDS[bandForScore(row.quarterScore)].textClass : ""
                      }
                      note={row.quarterAsOf ? `as of ${row.quarterAsOf}` : null}
                      dimmed={dim}
                      chips={
                        row.quarterSourceStatus === "unofficial" ||
                        row.quarterScoredWithin24h ? (
                          <>
                            {row.quarterSourceStatus === "unofficial" && (
                              <UnofficialChip
                                scoredAt={formatScoredAt(row.quarterScoredAt)}
                                dimmed={dim}
                              />
                            )}
                            {row.quarterScoredWithin24h && (
                              <FreshScoreChip
                                scoredAt={formatScoredAt(row.quarterScoredAt)}
                                dimmed={dim}
                              />
                            )}
                          </>
                        ) : null
                      }
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
                  <TableCell className="border-l border-border/70 bg-muted/20 px-3 py-3">
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
