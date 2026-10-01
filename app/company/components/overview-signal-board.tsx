import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import ConcallScore from "@/components/concall-score";
import { BOARD_READS } from "@/lib/board-read";
import type { CompanyPageOverviewCacheRow } from "@/lib/company-overview-cache";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import type { AmbitionLabel } from "@/lib/guidance-snapshot/types";
import type { MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";
import {
  getOverviewBoardPosition,
  getOverviewSignalExtras,
  type OverviewSignalExtras,
} from "@/lib/overview-signal-board";
import { BANDS, bandForScore } from "@/lib/score-band";
import { cn } from "@/lib/utils";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";
import { VERDICT_LABELS, type CredibilityVerdictKey } from "@/lib/walk-the-talk/types";

import { topShareLabel } from "../[code]/display-tokens";
import { MissingSectionRequestButton } from "./missing-section-request-button";
import { SectionLink } from "./section-link";

// The company overview (redesign 2026-10-01). Four rows, each one glance:
//   1. Header — name, the SoaS score with its read word, and where it sits on
//      the Overall board.
//   2. The business (sector chips + the snapshot's one-liner) beside The story.
//   3. The three scores — Concall, Growth, Valuation — each with its path or
//      range.
//   4. The standing reads — Moat, Forensics, Guidance · walk the talk.
// Every card opens its full section; nothing here is a dead end.
//
// Everything is derived from data the portal already computes: the cache row
// (scores, ranks, sector, story) plus lib/overview-signal-board (paths, growth
// range, business one-liner, moat, forensics, walk-the-talk). Score colours
// always come from the band modules (score-band / growth-band / valuation-band)
// — never hardcoded.

const displayClass =
  "[font-family:var(--font-display)] font-bold tracking-[-0.03em]";
const monoClass = "[font-family:var(--font-data)] tabular-nums";
const kickerClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const cardClass = "rounded-[14px] border border-border/60 bg-card";
const linkCardClass = cn(
  cardClass,
  "group flex w-full flex-col p-4 transition-colors hover:border-border hover:bg-muted/20 sm:p-5",
);
const circleClass = "h-[52px] w-[52px] text-[16px] sm:h-[56px] sm:w-[56px]";

type Tone = "good" | "info" | "warn" | "bad" | "muted";

const TONE_TEXT: Record<Tone, string> = {
  good: "text-teal-700 dark:text-teal-300",
  info: "text-sky-700 dark:text-sky-300",
  warn: "text-amber-700 dark:text-amber-300",
  bad: "text-rose-700 dark:text-rose-300",
  muted: "text-muted-foreground",
};

const TONE_FILL: Record<Tone, string> = {
  good: "bg-teal-500",
  info: "bg-sky-500",
  warn: "bg-amber-500",
  bad: "bg-rose-500",
  muted: "bg-muted-foreground",
};

const TIER_TONE: Record<CredibilityVerdictKey, Tone> = {
  reliable: "good",
  high_trust: "good",
  mixed: "info",
  credible: "info",
  erratic: "warn",
  weak: "bad",
  low_trust: "bad",
  not_enough_data: "muted",
  not_assessable: "muted",
};

// Moat words: the rating as one word, the tier as how high the barriers are.
// No trajectory — no moat history is stored (lib/moat-analysis/plain-language).
const MOAT_WORD: Record<MoatRatingKey, string> = {
  wide_moat: "Wide",
  narrow_moat: "Narrow",
  moat_at_risk: "At risk",
  no_moat: "No moat",
  unknown: "Unclear",
};
const MOAT_TIER_PHRASE: Record<MoatTier, string> = {
  strong: "Strong barriers",
  mid: "Moderate barriers",
  weak: "Weak barriers",
};

const AMBITION_WORD: Record<AmbitionLabel, string> = {
  ambitious: "Ambitious",
  measured: "Measured",
  conservative: "Conservative",
};

// "2026-08-18" -> "Aug '26" (same compaction as the Valuation tab's history).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function compactDate(period: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(period);
  const month = m ? MONTHS[Number(m[2]) - 1] : null;
  return m && month ? `${month} '${m[1].slice(2)}` : period;
}

// --- Shared bits -------------------------------------------------------------

function CardArrow() {
  return (
    <ArrowRight
      className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
      aria-hidden
    />
  );
}

/**
 * Server-rendered area chart of a 0–10 path (oldest → newest). Stretches to its
 * container; the stroke stays 2px through `non-scaling-stroke`.
 */
function AreaTrend({
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
  const w = 300;
  const h = 56;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(0.6, (hi - lo) * 0.3);
  const domainLo = Math.max(0, lo - pad);
  const domainHi = Math.min(10, hi + pad);
  const span = domainHi - domainLo || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = 3 + (1 - (v - domainLo) / span) * (h - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const gradientId = `overview-trend-${id}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="block h-14 w-full"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${pts.join(" ")} ${w},${h}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** "Q4 FY25 · 6.2" on the left, the latest point on the right in its band colour. */
function PathEnds({
  first,
  last,
  lastClass,
}: {
  first: string;
  last: string;
  lastClass: string;
}) {
  return (
    <div
      className={cn(
        monoClass,
        "mt-2 flex items-center justify-between gap-3 text-[10.5px] uppercase tracking-[0.04em]",
      )}
    >
      <span className="text-muted-foreground">{first}</span>
      <span className={lastClass}>{last}</span>
    </div>
  );
}

function ScoreCardHead({
  circle,
  title,
  bandLabel,
  bandClass,
}: {
  circle: ReactNode;
  title: string;
  bandLabel: string;
  bandClass: string;
}) {
  return (
    <div className="flex items-start gap-3.5">
      {circle}
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-[15px] font-semibold leading-tight text-foreground">
          {title}
        </p>
        <p className={cn("mt-1 text-[12px] font-medium", bandClass)}>
          {bandLabel}
        </p>
      </div>
      <CardArrow />
    </div>
  );
}

function NotScoredCard({
  title,
  overview,
  sectionId,
}: {
  title: string;
  overview: CompanyPageOverviewCacheRow;
  sectionId: string;
}) {
  return (
    <div className={cn(cardClass, "flex flex-col p-4 sm:p-5")}>
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "grid shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground",
            circleClass,
          )}
          aria-hidden
        >
          <span className={cn(displayClass, "text-lg")}>—</span>
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-[15px] font-semibold leading-tight text-foreground">
            {title}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Not scored yet.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <MissingSectionRequestButton
          companyCode={overview.company_code}
          companyName={overview.company_name}
          sectionId={sectionId}
          sectionTitle={title}
          label="Request"
          className="h-7 rounded-full border-border/60 bg-background/95 px-3 text-[10px] font-medium text-foreground shadow-sm hover:bg-background"
        />
      </div>
    </div>
  );
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

// --- The business · The story ------------------------------------------------

function TheBusiness({
  overview,
  businessLine,
}: {
  overview: CompanyPageOverviewCacheRow;
  // undefined = still streaming (fallback); null = no one-liner published.
  businessLine: string | null | undefined;
}) {
  const showSub = overview.sub_sector && overview.sub_sector !== overview.sector;
  const hasSnapshot = overview.section_availability.businessSnapshot;
  return (
    <div className={cn(cardClass, "p-4 sm:p-5 lg:p-6")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn(kickerClass, "mr-1")}>The business</span>
        {overview.sector && (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[11px] font-medium leading-none text-foreground">
            {overview.sector}
          </span>
        )}
        {showSub && (
          <span className="inline-flex items-center rounded-md border border-border/70 px-2 py-1 text-[11px] font-medium leading-none text-foreground/85">
            {overview.sub_sector}
          </span>
        )}
      </div>
      {businessLine === undefined ? (
        <div className="mt-3.5 space-y-2" aria-hidden>
          <div className="h-3.5 w-full animate-pulse rounded bg-muted/60" />
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted/60" />
        </div>
      ) : (
        <p className="mt-3.5 text-[13.5px] leading-relaxed text-foreground/80">
          {businessLine ? `${businessLine} ` : null}
          {hasSnapshot && (
            <SectionLink
              sectionId="business-overview"
              className="inline whitespace-nowrap text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
            >
              Business snapshot →
            </SectionLink>
          )}
        </p>
      )}
    </div>
  );
}

function TheStory({ overview }: { overview: CompanyPageOverviewCacheRow }) {
  const { read } = overview;
  // Prefers the synthesized story line (company_story) over the bucket gloss.
  const line = read.storyLine ?? BOARD_READS[read.key].gloss;
  return (
    <div className={cn(cardClass, "p-4 sm:p-5 lg:p-6")}>
      <p className={kickerClass}>The story</p>
      <p
        className={cn(
          displayClass,
          "mt-3 text-balance text-[19px] leading-[1.28] text-foreground sm:text-[21px]",
        )}
      >
        {line}
      </p>
    </div>
  );
}

// --- The three scores --------------------------------------------------------

function ConcallScoreCard({
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
    return (
      <NotScoredCard title="Concall Score" overview={overview} sectionId="sentiment-score" />
    );
  }
  const band = BANDS[bandForScore(latestScore)];
  const path = quarter.scorePath.filter(
    (p): p is { period: string; value: number } => p.value != null,
  );
  const first = path[0];
  const last = path[path.length - 1];
  return (
    <SectionLink sectionId="sentiment-score" className={linkCardClass}>
      <ScoreCardHead
        circle={<ConcallScore score={latestScore} size="lg" className={circleClass} />}
        title="Concall Score"
        bandLabel={band.label}
        bandClass={band.textClass}
      />
      <div className="mt-auto pt-4">
        {path.length >= 2 ? (
          <>
            <AreaTrend
              id="concall"
              values={path.map((p) => p.value)}
              color={band.chartHex}
              label={`Concall score across ${path.length} quarters, ${first.period} ${first.value.toFixed(1)} to ${last.period} ${last.value.toFixed(1)}`}
            />
            <PathEnds
              first={`${first.period} · ${first.value.toFixed(1)}`}
              last={`${last.period} · ${last.value.toFixed(1)}`}
              lastClass={band.textClass}
            />
          </>
        ) : (
          <p className={cn(monoClass, "text-[11px] text-muted-foreground")}>
            First scored print
            {quarter.latestLabel ?? overview.quarter_label
              ? ` · ${quarter.latestLabel ?? overview.quarter_label}`
              : ""}
          </p>
        )}
      </div>
    </SectionLink>
  );
}

function GrowthScoreCard({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  // Live row first; cache only as a fallback.
  const growthScore = extras.growthScore ?? overview.growth_score;
  if (growthScore == null) {
    return (
      <NotScoredCard title="Growth Score" overview={overview} sectionId="future-growth" />
    );
  }
  // Growth has its own band vocabulary (lib/growth-band) — never the quarterly
  // Bullish/Bearish scale.
  const band = GROWTH_BANDS[bandForGrowthScore(growthScore)];
  const range = extras.growthRange;
  return (
    <SectionLink sectionId="future-growth" className={linkCardClass}>
      <ScoreCardHead
        circle={
          <ConcallScore score={growthScore} kind="growth" size="lg" className={circleClass} />
        }
        title="Growth Score"
        bandLabel={band.label}
        bandClass={band.textClass}
      />
      <div className="mt-auto pt-4">
        {range ? (
          <>
            <p className={kickerClass}>
              Revenue growth{range.horizonYears ? ` · ${range.horizonYears}Y view` : ""}
            </p>
            <div className="mt-2.5 grid grid-cols-[2fr_3fr_2fr] gap-0.5">
              <span className="h-1.5 rounded-l-full bg-muted" aria-hidden />
              <span className="h-1.5 bg-teal-500/50" aria-hidden />
              <span className="h-1.5 rounded-r-full bg-teal-500" aria-hidden />
              {(
                [
                  ["Bear", range.bear, "text-left", "text-foreground"],
                  ["Base", range.base, "text-center", "text-foreground"],
                  ["Bull", range.bull, "text-right", "text-teal-700 dark:text-teal-300"],
                ] as const
              ).map(([label, value, align, valueClass]) => (
                <div key={label} className={cn("mt-1.5 min-w-0", align)}>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p
                    className={cn(
                      monoClass,
                      "mt-1 truncate text-[12.5px] font-semibold",
                      value ? valueClass : "text-muted-foreground",
                    )}
                  >
                    {value ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            No base case published yet.
          </p>
        )}
      </div>
    </SectionLink>
  );
}

function ValuationScoreCard({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  const v = extras.valuation;
  if (!overview.section_availability.valuationCheck || !v) {
    return (
      <NotScoredCard title="Valuation Score" overview={overview} sectionId="valuation-check" />
    );
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
    <SectionLink sectionId="valuation-check" className={linkCardClass}>
      <ScoreCardHead
        circle={
          shown ? (
            <ConcallScore score={v.score as number} kind="valuation" size="lg" className={circleClass} />
          ) : (
            <div
              className={cn(
                "grid shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground",
                circleClass,
              )}
              aria-hidden
            >
              <span className={cn(displayClass, "text-lg")}>—</span>
            </div>
          )
        }
        title="Valuation Score"
        bandLabel={shown ? (v.verdictLabel as string) : "No price read"}
        bandClass={band ? band.textClass : "text-muted-foreground"}
      />
      <div className="mt-auto pt-4">
        {shown && band && path.length >= 2 ? (
          <>
            <AreaTrend
              id="valuation"
              values={path.map((p) => p.value)}
              color={band.chartHex}
              label={`Valuation score across ${path.length} pricings, ${compactDate(first.period)} ${first.value.toFixed(1)} to ${compactDate(last.period)} ${last.value.toFixed(1)}. Higher is cheaper.`}
            />
            <PathEnds
              first={`${compactDate(first.period)} · ${first.value.toFixed(1)}`}
              last={`${compactDate(last.period)} · ${last.value.toFixed(1)}`}
              lastClass={band.textClass}
            />
          </>
        ) : (
          <p className="line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
            {shown
              ? "Higher is cheaper. The price path appears after the next re-pricing."
              : v.withheldReason
                ? `Verdict withheld — ${v.withheldReason}.`
                : "No verdict yet."}
          </p>
        )}
      </div>
    </SectionLink>
  );
}

// --- The standing reads ------------------------------------------------------

function StandingCard({
  sectionId,
  kicker,
  children,
}: {
  sectionId: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <SectionLink sectionId={sectionId} className={linkCardClass}>
      <div className="flex items-center justify-between gap-3">
        <p className={kickerClass}>{kicker}</p>
        <CardArrow />
      </div>
      <div className="mt-3.5">{children}</div>
    </SectionLink>
  );
}

function Verdict({
  word,
  qualifier,
  wordClass = "text-foreground",
  qualifierClass = "text-muted-foreground",
}: {
  word: string;
  qualifier?: string | null;
  wordClass?: string;
  qualifierClass?: string;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5">
      <span className={cn(displayClass, "text-[20px] leading-tight", wordClass)}>
        {word}
      </span>
      {qualifier && (
        <span className={cn("text-[12.5px] font-medium", qualifierClass)}>
          · {qualifier}
        </span>
      )}
    </p>
  );
}

const standingBodyClass = "mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-foreground/75";
const standingEmptyClass = "text-[12.5px] text-muted-foreground";

function MoatCard({ extras }: { extras: OverviewSignalExtras }) {
  const moat = extras.moat;
  const showTier =
    moat && moat.tier && moat.rating !== "no_moat" && moat.rating !== "unknown";
  return (
    <StandingCard sectionId="quality" kicker="Moat">
      {moat ? (
        <>
          <Verdict
            word={MOAT_WORD[moat.rating]}
            qualifier={showTier ? MOAT_TIER_PHRASE[moat.tier as MoatTier] : null}
          />
          {moat.headline && <p className={standingBodyClass}>{moat.headline}</p>}
        </>
      ) : (
        <p className={standingEmptyClass}>No moat read published yet.</p>
      )}
    </StandingCard>
  );
}

function ForensicsCard({ extras }: { extras: OverviewSignalExtras }) {
  const f = extras.forensics;
  const counts: { label: string; n: number; tone: Tone }[] = f
    ? [
        { label: "clean", n: f.tally.clean, tone: "good" },
        { label: "watch", n: f.tally.watch, tone: "warn" },
        { label: "flag", n: f.tally.flag, tone: "bad" },
      ]
    : [];
  return (
    <StandingCard sectionId="quality" kicker="Forensics">
      {f ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {counts.map((c) => (
              <span key={c.label} className="inline-flex items-baseline gap-1.5">
                <span
                  className={cn(
                    displayClass,
                    "text-[20px] leading-tight",
                    c.n > 0 ? TONE_TEXT[c.tone] : "text-muted-foreground",
                  )}
                >
                  {c.n}
                </span>
                <span className="text-[12px] text-muted-foreground">{c.label}</span>
              </span>
            ))}
          </p>
          <p className={standingBodyClass}>{f.headline}</p>
        </>
      ) : (
        <p className={standingEmptyClass}>No forensic read published yet.</p>
      )}
    </StandingCard>
  );
}

function GuidanceCard({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  const wtt = extras.walkTheTalk;
  const tier = wtt?.overall.tier ?? null;
  const tone: Tone = tier ? TIER_TONE[tier] : "muted";
  const segments = wtt
    ? (() => {
        const total = wtt.overall.totalCount;
        const on = wtt.overall.onTimeCount;
        if (total <= 0) return null;
        const n = total <= 12 ? total : 10;
        const filled = total <= 12 ? on : Math.round((on / total) * 10);
        return { n, filled };
      })()
    : null;
  const ambition = extras.guidanceAmbition;
  return (
    <StandingCard sectionId="guidance-history" kicker="Guidance · Walk the talk">
      {wtt && tier ? (
        <>
          <Verdict
            word={VERDICT_LABELS[tier]}
            wordClass={tone === "muted" ? "text-foreground" : TONE_TEXT[tone]}
            qualifier={ambition ? `${AMBITION_WORD[ambition]} guide` : null}
          />
          {segments && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex flex-1 gap-[3px]" aria-hidden>
                {Array.from({ length: segments.n }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-sm",
                      i < segments.filled ? TONE_FILL[tone] : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <span className={cn(monoClass, "shrink-0 text-[11px] text-muted-foreground")}>
                {wtt.overall.onTimeCount}/{wtt.overall.totalCount} on time
              </span>
            </div>
          )}
          {/* A downward revision shouldn't just silently leave the ratio once
              its horizon pushes the commitment into the live book
              (/plan-eng-review Step 0 scope decision, 2026-09-06). */}
          {wtt.liveCount > 0 && (
            <p className="mt-2 text-[11.5px] text-muted-foreground">
              {wtt.liveCount} more live
              {wtt.liveRevisedDownCount > 0 && (
                <span className="text-amber-700 dark:text-amber-400">
                  {" "}
                  · {wtt.liveRevisedDownCount} revised down
                </span>
              )}
            </p>
          )}
        </>
      ) : (
        <p className={standingEmptyClass}>
          {overview.guidance_count
            ? `${overview.guidance_count} guidance items tracked · grade pending`
            : "Not enough tracked guidance to grade yet."}
        </p>
      )}
    </StandingCard>
  );
}

// --- Board -------------------------------------------------------------------

const shellClass =
  "scroll-mt-40 overflow-hidden rounded-[1.55rem] border border-border/70 bg-card/95 p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] backdrop-blur-sm sm:p-6 lg:p-8";
const shellStyle = {
  scrollMarginTop:
    "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
};
const rowGridClass = "grid gap-3 lg:grid-cols-3 lg:gap-4";

export async function OverviewSignalBoard({
  overview,
  watchlistSlot = null,
}: {
  overview: CompanyPageOverviewCacheRow;
  watchlistSlot?: ReactNode;
}) {
  const extras = await getOverviewSignalExtras(
    overview.company_code,
    overview.company_name,
  );

  return (
    <div id="overview" className={shellClass} style={shellStyle}>
      <Header overview={overview} watchlistSlot={watchlistSlot} streamPosition />

      <div className="mt-6 grid gap-3 border-t border-border/60 pt-6 lg:grid-cols-2 lg:gap-4">
        <TheBusiness overview={overview} businessLine={extras.businessLine} />
        <TheStory overview={overview} />
      </div>

      <div className={cn(rowGridClass, "mt-3 lg:mt-4")}>
        <ConcallScoreCard overview={overview} extras={extras} />
        <GrowthScoreCard overview={overview} extras={extras} />
        <ValuationScoreCard overview={overview} extras={extras} />
      </div>

      <div className={cn(rowGridClass, "mt-3 lg:mt-4")}>
        <MoatCard extras={extras} />
        <ForensicsCard extras={extras} />
        <GuidanceCard overview={overview} extras={extras} />
      </div>
    </div>
  );
}

/**
 * Streaming fallback. Everything the cache row can render, it renders for real:
 * the header (name, SoaS score, read word), the business chips and the story
 * line. The story sentence is the page's LCP element on mobile — leaving it
 * behind the Suspense boundary put LCP at ~5s while the extras fetch ran. Only
 * the extras-dependent blocks are skeletons, sized to the real cards so the
 * swap doesn't move the page below the board.
 */
export function OverviewSignalBoardFallback({
  overview,
  watchlistSlot = null,
}: {
  overview: CompanyPageOverviewCacheRow;
  watchlistSlot?: ReactNode;
}) {
  return (
    <div id="overview" className={shellClass}>
      <Header overview={overview} watchlistSlot={watchlistSlot} streamPosition={false} />

      <div className="mt-6 grid gap-3 border-t border-border/60 pt-6 lg:grid-cols-2 lg:gap-4">
        <TheBusiness overview={overview} businessLine={undefined} />
        <TheStory overview={overview} />
      </div>

      <div className={cn(rowGridClass, "mt-3 lg:mt-4")}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[176px] animate-pulse rounded-[14px] bg-muted/50 lg:h-[194px]" />
        ))}
      </div>

      <div className={cn(rowGridClass, "mt-3 lg:mt-4")}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[136px] animate-pulse rounded-[14px] bg-muted/40 lg:h-[150px]" />
        ))}
      </div>
    </div>
  );
}
