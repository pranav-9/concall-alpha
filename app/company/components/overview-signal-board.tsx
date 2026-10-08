import { Suspense, type ReactNode } from "react";
import Link from "next/link";

import ConcallScore from "@/components/concall-score";
import { slugifySector } from "@/app/sector/utils";
import { BOARD_READS } from "@/lib/board-read";
import type { CompanyPageOverviewCacheRow } from "@/lib/company-overview-cache";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import {
  PROS_CONS_SOURCES,
  leanProsCons,
  type ProsCons,
  type ProsConsItem,
  type ProsConsLeanTone,
  type ProsConsSide,
} from "@/lib/overview-pros-cons";
import {
  getOverviewBoardPosition,
  getOverviewSignalExtras,
  type OverviewSignalExtras,
} from "@/lib/overview-signal-board";
import { BANDS, bandForScore } from "@/lib/score-band";
import { cn } from "@/lib/utils";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";

import { topShareLabel } from "../[code]/display-tokens";
import { MissingSectionRequestButton } from "./missing-section-request-button";
import { SectionLink } from "./section-link";

// The company overview (redesign 2026-10-01, simplified 2026-10-08 to the
// user's mockup). Four rows, each one glance:
//   1. Header — name, the SoaS score with its read word, and where it sits on
//      the Overall board.
//   2. The story — sector / sub-sector and the sector rank, then one paragraph:
//      the snapshot's business one-liner (muted) running into the story line
//      (bold).
//   3. The three scores — Concall, Growth, Valuation — as one compact strip,
//      each cell a score circle, its band word and one small mark: the score
//      path, the base case, the price path.
//   4. The good and the bad (2026-10-06, butterfly board 2026-10-08) — the
//      clearly strong and clearly weak readings across every section, ranked,
//      five a side at most, each drawn as a bar sized by its rank weight on
//      either side of a spine, under a lean meter (the good side's share of
//      the weight on the board).
// The 2026-10-01 standing-reads row (Moat · Forensics · Guidance) is gone: its
// clear signals already reach the good-and-bad board, and each section is one
// tab away. Every score cell opens its full section.
//
// Everything is derived from data the portal already computes: the cache row
// (scores, ranks, sector, story), the business one-liner read beside it, plus
// lib/overview-signal-board (paths, growth base case, the good and the bad).
// Score colours always come from the band modules (score-band / growth-band /
// valuation-band) — never hardcoded.

const displayClass =
  "[font-family:var(--font-display)] font-bold tracking-[-0.03em]";
const monoClass = "[font-family:var(--font-data)] tabular-nums";
const kickerClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const cardClass = "rounded-[14px] border border-border/60 bg-card";

type Tone = "good" | "bad";

const TONE_TEXT: Record<Tone, string> = {
  good: "text-teal-700 dark:text-teal-300",
  bad: "text-rose-700 dark:text-rose-300",
};

const TONE_FILL: Record<Tone, string> = {
  good: "bg-teal-500",
  bad: "bg-rose-500",
};

// "2026-08-18" -> "Aug '26" (same compaction as the Valuation tab's history).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function compactDate(period: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(period);
  const month = m ? MONTHS[Number(m[2]) - 1] : null;
  return m && month ? `${month} '${m[1].slice(2)}` : period;
}

// 1 -> "1st", 12 -> "12th", 23 -> "23rd".
function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

// --- Header ------------------------------------------------------------------

/** Fleet-wide board position — streamed, since it builds the whole board. */
async function WhereItSits({ companyCode }: { companyCode: string }) {
  const pos = await getOverviewBoardPosition(companyCode);
  if (!pos) return <WhereItSitsPlaceholder />;
  const left = Math.max(2, Math.min(98, pos.percentile * 100));
  return (
    <Link
      href="/leaderboards"
      title="Rank on the Overall leaderboard — opens the board"
      className="block min-w-0 flex-1 transition-opacity hover:opacity-80 lg:w-[176px] lg:flex-none"
    >
      <p className={kickerClass}>Where it sits</p>
      <div
        className="relative mt-3 h-[6px] rounded-full bg-gradient-to-r from-muted via-teal-500/40 to-teal-500"
        role="img"
        aria-label={`Reads above ${Math.round(pos.percentile * 100)}% of covered companies`}
      >
        <span
          className="absolute top-1/2 h-[14px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_2px_hsl(var(--card))]"
          style={{ left: `${left}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={cn(displayClass, "text-[20px] leading-none text-foreground")}>
          #{pos.rank}
          <span className="text-[12px] font-semibold text-muted-foreground">
            /{pos.total}
          </span>
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10.5px] font-bold tracking-[0.04em]",
            pos.belowLine
              ? "bg-muted text-muted-foreground"
              : "bg-teal-500/15 text-teal-700 dark:text-teal-300",
          )}
        >
          {pos.belowLine
            ? "BELOW LINE"
            : topShareLabel(pos.rank, pos.total).toUpperCase()}
        </span>
      </div>
    </Link>
  );
}

function WhereItSitsPlaceholder() {
  return <div className="h-[64px] min-w-0 flex-1 lg:w-[176px] lg:flex-none" aria-hidden />;
}

function Header({
  overview,
  watchlistSlot,
  streamPosition,
}: {
  overview: CompanyPageOverviewCacheRow;
  watchlistSlot: ReactNode;
  // false in the streaming fallback: no async children allowed there.
  streamPosition: boolean;
}) {
  const { read } = overview;
  const def = BOARD_READS[read.key];
  const hasScore = read.score != null;
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <div className="flex min-w-0 items-center gap-3">
        <h1
          className={cn(
            displayClass,
            "min-w-0 text-balance text-[24px] leading-[1.1] text-foreground sm:text-[30px]",
          )}
        >
          {overview.company_name}
        </h1>
        {overview.is_new && (
          <span className="shrink-0 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-teal-700 dark:text-teal-300">
            New
          </span>
        )}
        <div className="shrink-0">{watchlistSlot}</div>
      </div>

      <div className="flex items-stretch gap-5 sm:gap-7">
        <div className="shrink-0 lg:text-right">
          <p className={kickerClass}>SoaS score</p>
          <p
            className={cn(
              displayClass,
              "mt-1.5 flex items-baseline gap-1 leading-none text-foreground lg:justify-end",
            )}
          >
            <span className="text-[36px] sm:text-[40px]">
              {hasScore ? read.score!.toFixed(1) : "—"}
            </span>
            {hasScore && (
              <span className={cn(monoClass, "text-[13px] font-medium text-muted-foreground")}>
                /10
              </span>
            )}
          </p>
          <p
            className={cn(
              "mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]",
              def.textClass,
            )}
          >
            {def.label}
          </p>
        </div>
        <div className="w-px shrink-0 bg-border/70" aria-hidden />
        {streamPosition ? (
          <Suspense fallback={<WhereItSitsPlaceholder />}>
            <WhereItSits companyCode={overview.company_code} />
          </Suspense>
        ) : (
          <WhereItSitsPlaceholder />
        )}
      </div>
    </div>
  );
}

// --- The story ---------------------------------------------------------------

/**
 * Sector path + sector rank, then one paragraph: what the business is (muted)
 * running into the story line (bold). Rendered from the cache row and the
 * business line the page reads beside it, so it paints whole in the streaming
 * fallback — this paragraph is the page's LCP element on phones.
 */
function TheStory({
  overview,
  businessLine,
}: {
  overview: CompanyPageOverviewCacheRow;
  businessLine: string | null;
}) {
  const { read } = overview;
  // Prefers the synthesized story line (company_story) over the bucket gloss.
  const story = read.storyLine ?? BOARD_READS[read.key].gloss;
  const sector = overview.sector;
  const showSub = overview.sub_sector && overview.sub_sector !== sector;
  // Ranks are computed within the covered universe only; an excluded company
  // has none, and its page shows the path alone.
  const sectorRank =
    sector && overview.sector_rank != null && overview.sector_total
      ? { rank: overview.sector_rank, total: overview.sector_total }
      : null;
  return (
    <div className={cn(cardClass, "p-4 sm:p-5 lg:p-6")}>
      {(sector || showSub) && (
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[12px] font-medium leading-none">
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {sector && <span className="text-foreground">{sector}</span>}
            {sector && showSub && (
              <span className="text-muted-foreground/60" aria-hidden>
                /
              </span>
            )}
            {showSub && <span className="text-muted-foreground">{overview.sub_sector}</span>}
          </span>
          {sector && sectorRank && (
            <Link
              href={`/sector/${slugifySector(sector)}`}
              title={`Rank among covered ${sector} companies — opens the sector`}
              className="rounded-full bg-teal-500/15 px-2.5 py-1 text-[10.5px] font-semibold text-teal-700 transition-colors hover:bg-teal-500/25 dark:text-teal-300"
            >
              {ordinal(sectorRank.rank)} of {sectorRank.total} in sector
            </Link>
          )}
        </div>
      )}
      <p
        className={cn(
          "text-pretty text-[15px] leading-[1.6] sm:text-[17px]",
          (sector || showSub) && "mt-3.5 sm:mt-4",
        )}
      >
        {businessLine && <span className="text-muted-foreground">{businessLine} </span>}
        <span className="font-semibold text-foreground">{story}</span>
      </p>
    </div>
  );
}

// --- The three scores --------------------------------------------------------

// One strip, three cells. Below lg the cells stack, divided by rules.
const stripClass = cn(
  cardClass,
  "grid divide-y divide-border/60 overflow-hidden lg:grid-cols-3 lg:divide-x lg:divide-y-0",
);
const cellClass = "flex w-full min-w-0 items-center gap-3.5 px-4 py-3.5 sm:px-5 sm:py-4";
const circleClass = "h-10 w-10 text-[14px]";

/**
 * A small area spark of a 0–10 path (oldest → newest) ending in a dot. Fixed
 * pixel box, so the dot stays round.
 */
function Spark({
  id,
  values,
  color,
  label,
}: {
  id: string;
  values: number[];
  color: string;
  label: string;
}) {
  const w = 64;
  const h = 28;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(0.6, (hi - lo) * 0.3);
  const domainLo = Math.max(0, lo - pad);
  const domainHi = Math.min(10, hi + pad);
  const span = domainHi - domainLo || 1;
  const xy = values.map((v, i) => ({
    x: 2 + (i / (values.length - 1)) * (w - 5),
    y: 4 + (1 - (v - domainLo) / span) * (h - 8),
  }));
  const pts = xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const end = xy[xy.length - 1];
  const gradientId = `overview-spark-${id}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className="block h-7 w-16"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon
        points={`${xy[0].x.toFixed(1)},${h} ${pts} ${end.x.toFixed(1)},${h}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={end.x} cy={end.y} r={2.5} fill={color} />
    </svg>
  );
}

function EmptyCircle() {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground",
        circleClass,
      )}
      aria-hidden
    >
      <span className={cn(displayClass, "text-base")}>—</span>
    </span>
  );
}

function CellText({
  title,
  bandLabel,
  bandClass,
  bandTitle,
}: {
  title: string;
  bandLabel: string;
  bandClass: string;
  // Hover text for the band word, when there is more to say than fits.
  bandTitle?: string;
}) {
  return (
    <span className="block min-w-0 flex-1">
      <span className="block truncate text-[14.5px] font-semibold leading-tight text-foreground">
        {title}
      </span>
      <span
        className={cn("mt-1 block truncate text-[12px] font-medium", bandClass)}
        title={bandTitle ?? bandLabel}
      >
        {bandLabel}
      </span>
    </span>
  );
}

/** A scored cell — the whole cell opens its section. */
function ScoreCell({
  sectionId,
  circle,
  title,
  bandLabel,
  bandClass,
  bandTitle,
  aside,
}: {
  sectionId: string;
  circle: ReactNode;
  title: string;
  bandLabel: string;
  bandClass: string;
  bandTitle?: string;
  aside?: ReactNode;
}) {
  return (
    <SectionLink
      sectionId={sectionId}
      className={cn(cellClass, "transition-colors hover:bg-muted/25")}
    >
      {circle}
      <CellText title={title} bandLabel={bandLabel} bandClass={bandClass} bandTitle={bandTitle} />
      {aside ? <span className="block shrink-0">{aside}</span> : null}
    </SectionLink>
  );
}

/** Not scored yet — no section to open, so a request button instead. */
function NotScoredCell({
  title,
  overview,
  sectionId,
}: {
  title: string;
  overview: CompanyPageOverviewCacheRow;
  sectionId: string;
}) {
  return (
    <div className={cellClass}>
      <EmptyCircle />
      <CellText title={title} bandLabel="Not scored yet" bandClass="text-muted-foreground" />
      <MissingSectionRequestButton
        companyCode={overview.company_code}
        companyName={overview.company_name}
        sectionId={sectionId}
        sectionTitle={title}
        label="Request"
        className="h-7 shrink-0 rounded-full border-border/60 bg-background/95 px-3 text-[10px] font-medium text-foreground shadow-sm hover:bg-background"
      />
    </div>
  );
}

function ConcallCell({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  const { quarter } = extras;
  // Score, label and path all come from the same LIVE rows so a fresh print can
  // never be captioned with the cache's older quarter label.
  const latestScore = quarter.latestScore ?? overview.latest_score;
  if (latestScore == null) {
    return <NotScoredCell title="Concall Score" overview={overview} sectionId="sentiment-score" />;
  }
  const band = BANDS[bandForScore(latestScore)];
  const path = quarter.scorePath.filter(
    (p): p is { period: string; value: number } => p.value != null,
  );
  const first = path[0];
  const last = path[path.length - 1];
  const latestLabel = quarter.latestLabel ?? overview.quarter_label;
  return (
    <ScoreCell
      sectionId="sentiment-score"
      circle={<ConcallScore score={latestScore} size="md" className={circleClass} />}
      title="Concall Score"
      bandLabel={band.label}
      bandClass={band.textClass}
      aside={
        path.length >= 2 ? (
          <Spark
            id="concall"
            values={path.map((p) => p.value)}
            color={band.chartHex}
            label={`Concall score across ${path.length} quarters, ${first.period} ${first.value.toFixed(1)} to ${last.period} ${last.value.toFixed(1)}`}
          />
        ) : latestLabel ? (
          <span className={cn(monoClass, "text-[11px] uppercase text-muted-foreground")}>
            {latestLabel}
          </span>
        ) : null
      }
    />
  );
}

function GrowthCell({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  // Live row first; cache only as a fallback.
  const growthScore = extras.growthScore ?? overview.growth_score;
  if (growthScore == null) {
    return <NotScoredCell title="Growth Score" overview={overview} sectionId="future-growth" />;
  }
  // Growth has its own band vocabulary (lib/growth-band) — never the quarterly
  // Bullish/Bearish scale.
  const band = GROWTH_BANDS[bandForGrowthScore(growthScore)];
  const range = extras.growthRange;
  // The base case is revenue growth, not EPS — said in the title and to readers.
  const what = `Base-case revenue growth${range?.horizonYears ? `, ${range.horizonYears}-year view` : ""}`;
  return (
    <ScoreCell
      sectionId="future-growth"
      circle={<ConcallScore score={growthScore} kind="growth" size="md" className={circleClass} />}
      title="Growth Score"
      bandLabel={band.label}
      bandClass={band.textClass}
      aside={
        range ? (
          <span className="block text-right" title={what}>
            <span className="sr-only">{what}: </span>
            <span
              className={cn(monoClass, "block text-[14px] font-semibold leading-none text-foreground")}
            >
              {range.base}
            </span>
            <span
              className="mt-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              aria-hidden
            >
              Base case
            </span>
          </span>
        ) : null
      }
    />
  );
}

function ValuationCell({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  const v = extras.valuation;
  if (!overview.section_availability.valuationCheck || !v) {
    return <NotScoredCell title="Valuation Score" overview={overview} sectionId="valuation-check" />;
  }
  // The extras already applied the staleness gate on the LIVE valuation row;
  // the cache row's valuation_stale can lag a /valuation-refresh, so it must
  // not veto (or resurrect) a verdict here.
  const shown = v.verdictLabel != null && v.score != null;
  const band = shown ? VALUATION_BANDS[bandForValuationScore(v.score as number)] : null;
  const path = v.path;
  const first = path[0];
  const last = path[path.length - 1];
  return (
    <ScoreCell
      sectionId="valuation-check"
      circle={
        shown ? (
          <ConcallScore score={v.score as number} kind="valuation" size="md" className={circleClass} />
        ) : (
          <EmptyCircle />
        )
      }
      title="Valuation Score"
      // Same words as the header's read when no verdict is shown; the
      // producer's reason is pipeline-speak, so it stays on hover.
      bandLabel={shown ? (v.verdictLabel as string) : "No price read"}
      bandTitle={!shown && v.withheldReason ? `Verdict withheld — ${v.withheldReason}` : undefined}
      bandClass={band ? band.textClass : "text-muted-foreground"}
      aside={
        shown && band && path.length >= 2 ? (
          <Spark
            id="valuation"
            values={path.map((p) => p.value)}
            color={band.chartHex}
            label={`Valuation score across ${path.length} pricings, ${compactDate(first.period)} ${first.value.toFixed(1)} to ${compactDate(last.period)} ${last.value.toFixed(1)}. Higher is cheaper.`}
          />
        ) : null
      }
    />
  );
}

function ScoreStrip({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  return (
    <div className={stripClass}>
      <ConcallCell overview={overview} extras={extras} />
      <GrowthCell overview={overview} extras={extras} />
      <ValuationCell overview={overview} extras={extras} />
    </div>
  );
}

// --- The good · The bad ------------------------------------------------------

// A butterfly board. Each side lists what lib/overview-pros-cons ranked,
// strongest first, never padded; every row is a bar whose length is the item's
// rank weight (0–100, the same number that orders the list), growing out from
// a centre spine — good to the left, bad to the right — so the eye reads the
// balance before the words. Above it, the lean meter: the good side's share of
// all the weight on the board, with a tick at the midpoint. A side with
// nothing clear says so; with nothing on either side the row is left out.
// Under lg the two sides stack (good, then bad), bars anchored left.

const PROS_CONS_SIDE: Record<ProsConsSide, { kicker: string; tone: Tone; empty: string }> = {
  good: {
    kicker: "The good",
    tone: "good",
    empty: "No clear strengths in the sections published so far.",
  },
  bad: {
    kicker: "The bad",
    tone: "bad",
    empty: "No clear red flags in the sections published so far.",
  },
};

const LEAN_TONE_TEXT: Record<ProsConsLeanTone, string> = {
  good: TONE_TEXT.good,
  even: "text-foreground",
  bad: TONE_TEXT.bad,
};

// The bar's tint and the spine-side edge, per side.
const BAR_CLASS: Record<ProsConsSide, { fill: string; edge: string; hover: string }> = {
  good: { fill: "bg-teal-500/[0.11] dark:bg-teal-400/[0.13]", edge: "bg-teal-500", hover: "group-hover:bg-teal-500/[0.18] dark:group-hover:bg-teal-400/[0.2]" },
  bad: { fill: "bg-rose-500/[0.11] dark:bg-rose-400/[0.13]", edge: "bg-rose-500", hover: "group-hover:bg-rose-500/[0.18] dark:group-hover:bg-rose-400/[0.2]" },
};

const prosConsKickerClass =
  "shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground";
const prosConsClaimClass = "min-w-0 text-[13.5px] font-semibold leading-snug text-foreground";

/**
 * One ranked reading as a bar. `anchor` is the spine side the bar grows from:
 * on the desktop board the good side grows leftward from the centre (anchor
 * right) and the bad side rightward (anchor left); stacked, both anchor left.
 * The bar is a layer behind the words, so a light item still reads in full.
 */
function ProsConsBar({
  item,
  side,
  anchor,
}: {
  item: ProsConsItem;
  side: ProsConsSide;
  anchor: "left" | "right";
}) {
  const source = PROS_CONS_SOURCES[item.source];
  const bar = BAR_CLASS[side];
  const width = `${Math.max(0, Math.min(100, item.weight))}%`;
  const right = anchor === "right";
  return (
    <SectionLink
      sectionId={source.sectionId}
      className={cn("group relative block w-full py-[3px]", right && "text-right")}
    >
      {item.evidence && <span className="sr-only">{item.evidence}. </span>}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-[3px] rounded-[3px] transition-colors",
          right ? "right-0" : "left-0",
          bar.fill,
          bar.hover,
        )}
        style={{ width }}
      >
        <span
          className={cn("absolute inset-y-0 w-[3px]", right ? "right-0" : "left-0", bar.edge)}
        />
      </span>
      <span
        className={cn(
          "relative flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 px-3.5 py-2.5",
          right ? "flex-row-reverse" : "flex-row",
        )}
      >
        <span className={prosConsClaimClass}>{item.claim}</span>
        <span className={prosConsKickerClass}>{source.label}</span>
      </span>
    </SectionLink>
  );
}

function ProsConsEmpty({ side }: { side: ProsConsSide }) {
  return (
    <p className="px-3.5 py-3 text-[12.5px] leading-snug text-muted-foreground">
      {PROS_CONS_SIDE[side].empty}
    </p>
  );
}

function ProsConsSideKicker({ side, flip = false }: { side: ProsConsSide; flip?: boolean }) {
  const meta = PROS_CONS_SIDE[side];
  return (
    <span className={cn(kickerClass, "inline-flex items-center gap-2", flip && "flex-row-reverse")}>
      {meta.kicker}
      <span className={cn("h-1.5 w-1.5 rounded-full", TONE_FILL[meta.tone])} aria-hidden />
    </span>
  );
}

function LeanMeter({ prosCons }: { prosCons: ProsCons }) {
  const lean = leanProsCons(prosCons);
  if (!lean) return null;
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <span
        className={cn(displayClass, "shrink-0 text-[17px] leading-none sm:text-[20px]", LEAN_TONE_TEXT[lean.tone])}
      >
        {lean.word}
      </span>
      <div
        className="relative h-1.5 min-w-0 flex-1 rounded-full bg-rose-500"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={lean.score}
        aria-label="Share of the board's weight on the good side"
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-teal-500"
          style={{ width: `${lean.score}%` }}
          aria-hidden
        />
        <span className="absolute -inset-y-1 left-1/2 w-0.5 -translate-x-1/2 bg-foreground" aria-hidden />
      </div>
      <span className={cn(monoClass, "shrink-0 text-[11.5px] text-muted-foreground")}>
        {lean.score} / 100
      </span>
    </div>
  );
}

function ProsConsBoard({ prosCons }: { prosCons: ProsCons }) {
  const { good, bad } = prosCons;
  const rows = Math.max(good.length, bad.length, 1);
  return (
    <div className={cn(cardClass, "p-4 sm:p-5 lg:p-6")}>
      <LeanMeter prosCons={prosCons} />

      {/* Desktop: the butterfly. */}
      <div className="mt-4 hidden border-t border-border/60 pt-4 lg:block">
        <div className="flex items-center justify-center">
          <span className="pr-3">
            <ProsConsSideKicker side="good" />
          </span>
          <span className="h-3 w-px bg-border" aria-hidden />
          <span className="pl-3">
            <ProsConsSideKicker side="bad" flip />
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2">
          {Array.from({ length: rows }).map((_, i) => {
            const g = good[i];
            const b = bad[i];
            return (
              <div key={i} className="contents">
                <div className="min-w-0 pr-[2px]">
                  {g ? <ProsConsBar item={g} side="good" anchor="right" /> : i === 0 ? <ProsConsEmpty side="good" /> : null}
                </div>
                <div className="min-w-0 pl-[2px]">
                  {b ? <ProsConsBar item={b} side="bad" anchor="left" /> : i === 0 ? <ProsConsEmpty side="bad" /> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phone and tablet: the two sides stacked. */}
      <div className="mt-4 border-t border-border/60 pt-4 lg:hidden">
        {(["good", "bad"] as const).map((side) => {
          const items = prosCons[side];
          return (
            <div key={side} className={side === "bad" ? "mt-4" : undefined}>
              <ProsConsSideKicker side={side} flip />
              <div className="mt-1.5">
                {items.length > 0 ? (
                  items.map((item) => <ProsConsBar key={item.id} item={item} side={side} anchor="left" />)
                ) : (
                  <ProsConsEmpty side={side} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Board -------------------------------------------------------------------

const shellClass =
  "scroll-mt-40 overflow-hidden rounded-[1.55rem] border border-border/70 bg-card/95 p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] backdrop-blur-sm sm:p-6 lg:p-8";
const shellStyle = {
  scrollMarginTop:
    "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
};
const storyRowClass = "mt-6 border-t border-border/60 pt-6";
const rowClass = "mt-3 lg:mt-4";

export async function OverviewSignalBoard({
  overview,
  businessLine,
  watchlistSlot = null,
}: {
  overview: CompanyPageOverviewCacheRow;
  businessLine: string | null;
  watchlistSlot?: ReactNode;
}) {
  const extras = await getOverviewSignalExtras(
    overview.company_code,
    overview.company_name,
  );

  return (
    <div id="overview" className={shellClass} style={shellStyle}>
      <Header overview={overview} watchlistSlot={watchlistSlot} streamPosition />

      <div className={storyRowClass}>
        <TheStory overview={overview} businessLine={businessLine} />
      </div>

      <div className={rowClass}>
        <ScoreStrip overview={overview} extras={extras} />
      </div>

      {extras.prosCons.good.length + extras.prosCons.bad.length > 0 && (
        <div className={rowClass}>
          <ProsConsBoard prosCons={extras.prosCons} />
        </div>
      )}
    </div>
  );
}

/**
 * Streaming fallback. Everything the cache row and the business line can
 * render, it renders for real: the header (name, SoaS score, read word) and the
 * whole story card. The story paragraph is the page's LCP element on mobile —
 * leaving it behind the Suspense boundary put LCP at ~5s while the extras fetch
 * ran. Only the extras-dependent blocks are skeletons, sized to the real ones
 * so the swap doesn't move the page below the board.
 */
export function OverviewSignalBoardFallback({
  overview,
  businessLine,
  watchlistSlot = null,
}: {
  overview: CompanyPageOverviewCacheRow;
  businessLine: string | null;
  watchlistSlot?: ReactNode;
}) {
  return (
    <div id="overview" className={shellClass}>
      <Header overview={overview} watchlistSlot={watchlistSlot} streamPosition={false} />

      <div className={storyRowClass}>
        <TheStory overview={overview} businessLine={businessLine} />
      </div>

      {/* The score strip — three stacked cells, one row from lg. */}
      <div className={cn(rowClass, "h-[208px] animate-pulse rounded-[14px] bg-muted/50 sm:h-[218px] lg:h-[74px]")} />

      {/* The good · the bad board — the meter plus a typical three rows a side. */}
      <div className={cn(rowClass, "h-[360px] animate-pulse rounded-[14px] bg-muted/30 lg:h-[250px]")} />
    </div>
  );
}
