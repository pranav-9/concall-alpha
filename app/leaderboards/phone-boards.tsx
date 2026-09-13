"use client";

// Phone presentation of the four /leaderboards boards (handoff 2026-09-13,
// "Ranking — mobile"): one house card per board, list rows in the Desk's
// grammar — rank · crest · name + a second line · one trail figure · the score.
// Every number, band and word comes from the same libs the desktop tables use
// (score-board-sort, score-band, growth-band, board-read, moat tier), so a
// company reads identically on both paints. Tab state lives in LeaderboardTabs;
// these only paint the rows they're handed. Loaded through tables-lazy.tsx so
// the desktop paint never downloads them.

import Link from "next/link";

import ConcallScore from "@/components/concall-score";
import {
  Crest,
  MOBILE_CARD,
  MOBILE_LI,
  MOBILE_LINK,
  MobileTag,
  NewBadge,
  RankCell,
  signedArrow,
  signedColor,
} from "@/components/mobile-card";
import type { CompanyRow } from "@/app/company/leaderboard-table";
import { analytics, type LeaderboardBoard } from "@/lib/analytics";
import { BOARD_READS } from "@/lib/board-read";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import type { MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";
import { deriveRows, sortRows, type ScoreBoardRow } from "@/lib/score-board-sort";
import { cn } from "@/lib/utils";
import type { GrowthRowTable } from "./growth-table";
import type { MoatRowTable } from "./moat-table";

const HEAD_LEFT = "house-data text-[10px] uppercase tracking-[0.1em] text-[var(--ink)]";
const HEAD_RIGHT = "house-data text-[9px] text-[var(--ink-soft)]";
const NAME = "house-display truncate text-sm tracking-[-0.01em]";
const SUB = "house-data mt-0.5 block truncate text-[10px]";
const ROW = cn(MOBILE_LINK, "flex items-center gap-[11px] px-3.5 py-3");
const FOOT =
  "house-data border-t border-[var(--rule)] px-3.5 py-3 text-[9px] leading-[1.5] text-[var(--ink-soft)] [text-wrap:pretty]";
const DASH = <span className="house-data grid h-8 w-8 place-items-center text-xs text-[var(--ink-soft)]">—</span>;

function BoardHead({ left, right }: { left: string; right?: string }) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-[var(--rule)] px-3.5 py-2.5">
      <span className={HEAD_LEFT}>{left}</span>
      {right ? <span className={HEAD_RIGHT}>{right}</span> : null}
    </div>
  );
}

function EmptyBoard({ children }: { children: string }) {
  return (
    <div className={cn(MOBILE_CARD, "mt-3 px-3.5 py-8 text-center text-sm text-[var(--ink-soft)]")}>
      {children}
    </div>
  );
}

// Same coercion as the desktop quarter table (`asNumber`): PostgREST can hand
// a numeric column back as a string, and a "—" where desktop shows 7.4 is a
// silent paint mismatch.
function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Phone rows fire the same event as the desktop Overall board; the desktop
// quarter/growth/moat tables don't emit it (they never did), so a PostHog
// breakdown by `board` on those three is phone traffic only until they do.
function rowClick(board: LeaderboardBoard, companyCode: string, rank: number | null, belowCut = false) {
  analytics.leaderboardRowClick({
    companyCode,
    board,
    belowCut,
    rank: rank ?? undefined,
    surface: "leaderboards",
  });
}

// ---------------------------------------------------------------------------
// Overall — ranked by Read.
// ---------------------------------------------------------------------------

/** Rank move since the prior snapshot — mirrors the desktop DeltaCell's three states. */
function RankDelta({ delta }: { delta: number | null }) {
  const base = "house-data w-[34px] shrink-0 whitespace-nowrap text-right text-[11px] tabular-nums";
  if (delta == null) {
    return (
      <span className={cn(base, "text-[var(--ink-soft)] opacity-50")} aria-label="no prior rank">
        ·
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className={cn(base, "text-[var(--ink-soft)]")} aria-label="no change">
        –
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(base, signedColor(delta))}
      aria-label={`${up ? "up" : "down"} ${Math.abs(delta)} places since the previous snapshot`}
    >
      <span aria-hidden>{signedArrow(delta)}</span>
      {Math.abs(delta)}
    </span>
  );
}

function OverallRow({
  row,
  rank,
  delta,
  showDelta,
  isNew,
}: {
  row: ReturnType<typeof deriveRows>[number];
  rank: number | null;
  delta: number | null;
  showDelta: boolean;
  isNew: boolean;
}) {
  const read = BOARD_READS[row.readKey];
  return (
    <li className={MOBILE_LI}>
      <Link
        href={`/company/${row.companyCode}`}
        prefetch={false}
        onClick={() => rowClick("overall", row.companyCode, rank, row.dim)}
        title={row.dim ? `${row.companyName} — below the coverage cut` : row.companyName}
        className={cn(ROW, row.dim && "opacity-60")}
      >
        <RankCell rank={rank} />
        <Crest name={row.companyName} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={cn(NAME, row.dim ? "text-[var(--ink-soft)]" : "text-[var(--ink)]")}>
              {row.companyName}
            </span>
            {isNew ? <NewBadge title="New to coverage" /> : null}
          </span>
          <span className={cn(SUB, row.dim ? "text-[var(--ink-soft)]" : read.textClass)}>
            {read.label}
          </span>
        </span>
        {showDelta ? <RankDelta delta={delta} /> : null}
        <span className="house-data w-8 shrink-0 whitespace-nowrap text-right text-base font-bold tabular-nums text-[var(--ink)]">
          {row.readScore == null ? "—" : row.readScore.toFixed(1)}
        </span>
      </Link>
    </li>
  );
}

export function PhoneOverallBoard({
  rows,
  priorRankByCode,
  coverageCutRank,
  newCodes,
}: {
  rows: ScoreBoardRow[];
  /** UPPERCASE code → rank in the prior snapshot window; empty until history accrues. */
  priorRankByCode: Record<string, number>;
  coverageCutRank: number;
  /** UPPERCASE codes of companies new to coverage (the `new` badge). */
  newCodes: string[];
}) {
  // The same derivation and default order as the desktop board
  // (components/score-board-table.tsx), so # and greying agree across paints.
  const sorted = sortRows(deriveRows(rows, coverageCutRank), {
    key: "coverageRank",
    direction: "asc",
  });
  const showDelta = Object.keys(priorRankByCode).length > 0;
  const isNew = new Set(newCodes);
  // The greyed tail (ranked past the coverage line on the live Read) is still
  // linked, but folded behind a toggle here: it is the SSR row count that the
  // phone's first paint pays for, and the ranked hundred is what the tab is for.
  const firstDimIndex = sorted.findIndex((row) => row.dim);
  const ranked = firstDimIndex === -1 ? sorted : sorted.slice(0, firstDimIndex);
  const tail = firstDimIndex === -1 ? [] : sorted.slice(firstDimIndex);

  const paint = (row: (typeof sorted)[number]) => {
    const rank = Number.isFinite(row.effectiveRank) ? row.effectiveRank : null;
    const prior = priorRankByCode[row.companyCode.toUpperCase()];
    const delta = prior != null && rank != null ? prior - rank : null;
    return (
      <OverallRow
        key={row.companyCode}
        row={row}
        rank={rank}
        delta={delta}
        showDelta={showDelta}
        isNew={isNew.has(row.companyCode.toUpperCase())}
      />
    );
  };

  return (
    <section aria-label="Overall board, ranked by Read" className={cn(MOBILE_CARD, "mt-3")}>
      <BoardHead left="Overall board · ranked by Read" right={showDelta ? "Δ vs last" : undefined} />
      <ul role="list" aria-label="Companies by overall rank, with the Read">
        {ranked.map(paint)}
      </ul>
      {tail.length > 0 ? (
        <details className="group border-t border-[var(--rule)]">
          <summary className="house-data flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 bg-[var(--paper)] px-3.5 py-3 text-[9px] uppercase tracking-[0.1em] text-[var(--ink-soft)] transition-colors active:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)] [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">
              — {tail.length} below the top {coverageCutRank} by Read ↓ —
            </span>
            <span className="hidden group-open:inline">— below the top {coverageCutRank} by Read ↑ —</span>
          </summary>
          <ul role="list" aria-label={`Companies ranked below the top ${coverageCutRank}`} className="border-t border-[var(--rule)]">
            {tail.map(paint)}
          </ul>
        </details>
      ) : null}
      <p className={FOOT}>
        Read = the quarter leg and growth, combined with what you pay. The word names the
        configuration — not a buy or sell call.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ConcallScore — the quarter board.
// ---------------------------------------------------------------------------

export function PhoneQuarterBoard({
  rows,
  latestLabel,
  previousLabel,
  nameByCode,
  sectorByCode,
}: {
  /** Already sorted by the latest ConcallScore, descending (getConcallData). */
  rows: CompanyRow[];
  latestLabel: string | null;
  /** The board's second-newest quarter column — the "previous" in Δ QoQ. */
  previousLabel: string | null;
  nameByCode: Record<string, string>;
  sectorByCode: Record<string, string>;
}) {
  if (rows.length === 0) return <EmptyBoard>No quarter scores yet.</EmptyBoard>;
  // Competition ranks on the latest print (ties share a rank), exactly as the
  // desktop quarter table numbers its rows — so a tie reads the same on both.
  const ranked = assignCompetitionRanks(rows, (row) =>
    latestLabel ? asNumber(row[latestLabel]) : null,
  );
  return (
    <section aria-label="Quarter board, ranked by ConcallScore" className={cn(MOBILE_CARD, "mt-3")}>
      <BoardHead left="Quarter board" right="Δ QoQ · Score" />
      <ul role="list" aria-label="Companies by the latest ConcallScore">
        {ranked.map((row) => {
          const code = String(row.company);
          const key = code.toUpperCase();
          const name = nameByCode[key] ?? code;
          const score = latestLabel ? asNumber(row[latestLabel]) : null;
          // A real quarter-on-quarter move: this quarter's print minus the
          // previous quarter's, both read off the board's own columns. "—" when
          // either is missing — never a fake 0.0 for a one-quarter company.
          const previous = previousLabel ? asNumber(row[previousLabel]) : null;
          const delta = score != null && previous != null ? score - previous : null;
          const rank = row.leaderboardRank;
          return (
            <li key={code} className={MOBILE_LI}>
              <Link
                href={`/company/${code}`}
                prefetch={false}
                onClick={() => rowClick("quarter", code, rank)}
                className={ROW}
              >
                <RankCell rank={rank} />
                <Crest name={name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={cn(NAME, "text-[var(--ink)]")}>{name}</span>
                    {row.isNew ? <NewBadge title="New to coverage" /> : null}
                  </span>
                  <span className={cn(SUB, "text-[var(--ink-soft)]")}>{sectorByCode[key] ?? code}</span>
                </span>
                <span
                  className={cn(
                    "house-data min-w-[40px] shrink-0 whitespace-nowrap text-right text-xs tabular-nums",
                    delta == null ? "text-[var(--ink-soft)]" : signedColor(delta),
                  )}
                  aria-label={
                    delta == null
                      ? "no previous quarter to compare"
                      : `${delta > 0 ? "up" : delta < 0 ? "down" : "unchanged"} ${Math.abs(delta).toFixed(1)} versus the previous quarter`
                  }
                >
                  {delta == null ? "—" : `${signedArrow(delta)} ${Math.abs(delta).toFixed(1)}`}
                </span>
                <span className="flex shrink-0">
                  {score != null ? <ConcallScore score={score} size="sm" /> : DASH}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Growth — forward outlook.
// ---------------------------------------------------------------------------

export function PhoneGrowthBoard({ rows }: { rows: GrowthRowTable[] }) {
  if (rows.length === 0) return <EmptyBoard>No growth outlook data available yet.</EmptyBoard>;
  return (
    <section aria-label="Growth board, ranked by growth score" className={cn(MOBILE_CARD, "mt-3")}>
      <BoardHead left="Growth board" right="Base · up / down" />
      <ul role="list" aria-label="Companies by growth outlook score">
        {rows.map((row) => {
          const score = typeof row.growthScore === "number" ? row.growthScore : null;
          const band = score != null ? GROWTH_BANDS[bandForGrowthScore(score)] : null;
          const name = row.companyName || row.companyCode;
          return (
            <li key={row.companyCode} className={MOBILE_LI}>
              <Link
                href={`/company/${row.companyCode}`}
                prefetch={false}
                onClick={() => rowClick("growth", row.companyCode, row.leaderboardRank)}
                className={ROW}
              >
                <RankCell rank={row.leaderboardRank} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={cn(NAME, "text-[var(--ink)]")}>{name}</span>
                    {row.isNew ? <NewBadge title="New to coverage" /> : null}
                  </span>
                  <span className="mt-[3px] flex items-center gap-1.5">
                    {band ? (
                      <>
                        <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", band.barClass)} />
                        <span className={cn("house-data text-[10px]", band.textClass)}>{band.label}</span>
                      </>
                    ) : (
                      <span className="house-data text-[10px] text-[var(--ink-soft)]">Not yet scored</span>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end text-right leading-[1.25]">
                  <span className="house-data text-[13px] font-bold tabular-nums text-[var(--ink)]">
                    {row.baseDisplay ?? "—"}
                  </span>
                  {row.upsideDisplay || row.downsideDisplay ? (
                    <span className="house-data text-[9px] tabular-nums text-[var(--ink-soft)]">
                      {row.upsideDisplay ? (
                        <span className="text-[var(--signal)]">
                          <span className="sr-only">upside </span>↑{row.upsideDisplay}
                        </span>
                      ) : null}
                      {row.upsideDisplay && row.downsideDisplay ? " · " : null}
                      {row.downsideDisplay ? (
                        <span className="text-[var(--alarm)]">
                          <span className="sr-only">downside </span>↓{row.downsideDisplay}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0">
                  {score != null ? <ConcallScore score={score} kind="growth" size="sm" /> : DASH}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Moat — grouped by rating tier.
// ---------------------------------------------------------------------------

const TIER_SECTIONS: { key: MoatRatingKey; label: string; pill: string }[] = [
  {
    key: "wide_moat",
    label: "Wide Moat",
    pill: "border-transparent bg-[color-mix(in_srgb,var(--signal)_16%,transparent)] text-[var(--signal)]",
  },
  { key: "narrow_moat", label: "Narrow Moat", pill: "border-[color-mix(in_srgb,var(--signal)_45%,transparent)] text-[var(--signal)]" },
  { key: "moat_at_risk", label: "Moat at Risk", pill: "border-[color-mix(in_srgb,var(--warn)_45%,transparent)] text-[var(--warn)]" },
  { key: "no_moat", label: "No Moat", pill: "border-[var(--rule)] text-[var(--ink-soft)]" },
  { key: "unknown", label: "Unassessed", pill: "border-dashed border-[var(--rule)] text-[var(--ink-soft)]" },
];

const STRENGTH: Record<MoatTier, { glyph: string; label: string; className: string }> = {
  strong: { glyph: "▲", label: "Strong", className: "text-[var(--signal)]" },
  mid: { glyph: "–", label: "Mid", className: "text-[var(--ink-soft)]" },
  weak: { glyph: "▼", label: "Weak", className: "text-[var(--warn)]" },
};

export function PhoneMoatBoard({ rows }: { rows: MoatRowTable[] }) {
  if (rows.length === 0) return <EmptyBoard>No moat assessments available yet.</EmptyBoard>;
  const groups = TIER_SECTIONS.map((tier) => ({
    tier,
    rows: rows.filter((r) => r.moatRating === tier.key),
  })).filter((g) => g.rows.length > 0);

  return (
    <section aria-label="Companies grouped by moat rating" className={cn(MOBILE_CARD, "mt-3")}>
      <BoardHead left="Moat board" right="Sources · cycle" />
      {groups.map(({ tier, rows: tierRows }) => (
        <section key={tier.key} aria-labelledby={`phone-moat-${tier.key}`}>
          <div className="flex items-center gap-[9px] border-b border-[var(--rule)] bg-[var(--paper)] px-3.5 py-2.5">
            <h3
              id={`phone-moat-${tier.key}`}
              className={cn(
                "house-data rounded-full border px-[9px] py-[2px] text-[10px] font-normal uppercase tracking-[0.08em]",
                tier.pill,
              )}
            >
              {tier.label}
            </h3>
            <span className="house-data text-[10px] text-[var(--ink-soft)]">
              {tierRows.length} {tierRows.length === 1 ? "company" : "companies"}
            </span>
          </div>
          {/* Each group ends on the next group's header rule, so keep the last
              row's hairline here (the card foot has none). */}
          <ul role="list" className="[&>li:last-child]:border-b">
            {tierRows.map((row) => {
              const strength = row.moatTier ? STRENGTH[row.moatTier] : null;
              const name = row.companyName || row.companyCode;
              return (
                <li key={row.companyCode} className={MOBILE_LI}>
                  <Link
                    href={`/company/${row.companyCode}`}
                    prefetch={false}
                    onClick={() => rowClick("moat", row.companyCode, row.leaderboardRank)}
                    className={ROW}
                  >
                    <RankCell rank={row.leaderboardRank} className="text-[11px]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={cn(NAME, "text-[var(--ink)]")}>{name}</span>
                        {row.isNew ? <NewBadge title="New to coverage" /> : null}
                      </span>
                      {/* Always the row's own strength, never collapsed into the group
                          header — an em dash here already means "not assessed". */}
                      <span
                        className={cn(
                          "house-data mt-[3px] block text-[10px]",
                          strength ? strength.className : "text-[var(--ink-soft)]",
                        )}
                      >
                        {strength ? (
                          <>
                            <span aria-hidden>{strength.glyph} </span>
                            {strength.label}
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="house-data text-[11px] tabular-nums text-[var(--ink)]">
                        {row.totalSourceCount === 0 ? (
                          <span className="text-[var(--ink-soft)]">—</span>
                        ) : (
                          <>
                            {row.appliesSourceCount}/{row.totalSourceCount}
                            <span className="text-[var(--ink-soft)]"> src</span>
                          </>
                        )}
                      </span>
                      {row.cycleTested === true ? (
                        <MobileTag tone="signal">cycle-tested</MobileTag>
                      ) : row.cycleTested === false ? (
                        <MobileTag>untested</MobileTag>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}
