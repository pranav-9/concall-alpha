import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import ConcallScore from "@/components/concall-score";
import { ScoreDelta } from "@/components/score-delta";
import { BOARD_READS } from "@/lib/board-read";
import type { CompanyPageOverviewCacheRow } from "@/lib/company-overview-cache";
import { marketCapBandLabel } from "@/lib/coverage-policy";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import { IMPACT_META } from "@/lib/exchange-desk/types";
import {
  getOverviewBoardPosition,
  getOverviewSignalExtras,
  type OverviewSignalExtras,
} from "@/lib/overview-signal-board";
import { TRAJECTORIES, TRAJECTORY_NOISE } from "@/lib/score-trajectory";
import { cn } from "@/lib/utils";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";
import { TIER_LABELS, type WalkTheTalkTier } from "@/lib/walk-the-talk/types";

import { topShareLabel } from "../[code]/display-tokens";
import { chipClass, type ChipTone } from "./chip-tone";
import { MissingSectionRequestButton } from "./missing-section-request-button";
import { SectionLink } from "./section-link";

// The company overview as a recency-first "signal board" (design handoff
// 2026-08-21, screens 3a desktop / 4a mobile). What moves every quarter or
// every week — the three reads, the synthesis line, the filing tape — gets the
// space and the big type; what rarely changes — sector, moat, rank — shrinks to
// labels or sits in the "standing reads" row at the bottom. Every read points at
// its full section; nothing here is a dead end.
//
// Everything is derived from data the portal already computes: the cache row
// (scores, ranks, deltas, series) plus lib/overview-signal-board (the one-line
// "why"s, trajectory, valuation lenses, walk-the-talk, themes, filings). Score
// colours always come from the band modules (score-band / growth-band / valuation-band) —
// never hardcoded.

const displayClass =
  "[font-family:var(--font-display)] font-bold tracking-[-0.03em]";
const monoClass = "[font-family:var(--font-data)] tabular-nums";
const kickerClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const cardClass = "rounded-[14px] border border-border/60 bg-card";
const bodyClass = "text-[13.5px] leading-relaxed text-foreground/80";

const TIER_TONE: Record<WalkTheTalkTier, ChipTone> = {
  reliable: "emerald",
  mixed: "sky",
  erratic: "amber",
  weak: "rose",
  not_enough_data: "slate",
};

function OpenNudge({ sectionId, label }: { sectionId: string; label: string }) {
  return (
    <SectionLink
      sectionId={sectionId}
      className="mt-auto flex min-h-[40px] w-full items-center gap-1 border-t border-border/60 pt-3 text-[12px] font-semibold text-teal-700 transition-colors hover:text-teal-600 dark:text-teal-300 dark:hover:text-teal-200"
    >
      {label}
      <ArrowRight className="h-3 w-3" aria-hidden />
    </SectionLink>
  );
}

/** Tiny server-rendered sparkline of the score path (oldest → newest). */
function PathSparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  if (values.length < 2) return null;
  const w = 90;
  const h = 26;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = 2 + (i / (values.length - 1)) * (w - 4);
    const y = h - 3 - ((v - min) / span) * (h - 6);
    return [x, y] as const;
  });
  const last = pts[pts.length - 1];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      className={className}
      aria-hidden
    >
      <polyline
        points={pts
          .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
          .join(" ")}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill="currentColor" />
    </svg>
  );
}

function NotScoredRead({
  title,
  overview,
  sectionId,
}: {
  title: string;
  overview: CompanyPageOverviewCacheRow;
  sectionId: string;
}) {
  return (
    <div className={cn(cardClass, "flex items-center gap-4 p-4 sm:p-5")}>
      <div
        className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground"
        aria-hidden
      >
        <span className={cn(displayClass, "text-xl")}>—</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Not scored yet.
        </p>
      </div>
      <MissingSectionRequestButton
        companyCode={overview.company_code}
        companyName={overview.company_name}
        sectionId={sectionId}
        sectionTitle={title}
        label="Request"
        className="h-7 rounded-full border-border/60 bg-background/95 px-3 text-[10px] font-medium text-foreground shadow-sm hover:bg-background"
      />
    </div>
  );
}

// --- Where it sits (streamed: fleet-wide board build) -----------------------

async function WhereItSits({ companyCode }: { companyCode: string }) {
  const pos = await getOverviewBoardPosition(companyCode);
  if (!pos) return null;
  const left = Math.max(2, Math.min(98, pos.percentile * 100));
  const bar = (
    <div
      className="relative h-[7px] rounded-full bg-gradient-to-r from-muted via-teal-500/40 to-teal-500"
      role="img"
      aria-label={`Reads above ${Math.round(pos.percentile * 100)}% of covered companies`}
    >
      <span
        className="absolute top-1/2 h-[15px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_2px_hsl(var(--card))] ring-1 ring-foreground/10"
        style={{ left: `${left}%` }}
      />
    </div>
  );
  const rank = (
    <Link
      href="/leaderboards"
      title="Rank on the Overall leaderboard (recency-weighted quarter leg) — opens the board"
      className="flex items-baseline justify-end gap-2 transition-colors hover:opacity-80"
    >
      <span
        className={cn(displayClass, "text-[22px] leading-none text-foreground")}
      >
        #{pos.rank}
        <span className="text-[13px] font-semibold text-muted-foreground">
          /{pos.total}
        </span>
      </span>
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
          pos.belowLine
            ? "bg-muted text-muted-foreground"
            : "bg-teal-500/15 text-teal-700 dark:text-teal-300",
        )}
      >
        {pos.belowLine
          ? "BELOW LINE"
          : topShareLabel(pos.rank, pos.total).toUpperCase()}
      </span>
    </Link>
  );
  // Two cells, placed by OverallRead's grid. Mobile (design 4a): the rank sits
  // beside the numeral with the kicker under it, and the bar runs full-width
  // underneath both. lg: one right-aligned column — kicker → bar → rank.
  return (
    <>
      <div className="justify-self-end text-right lg:mt-3 lg:w-full">
        <div className="hidden lg:block">
          <p className={cn(kickerClass, "mb-1.5")}>Where it sits</p>
          {bar}
          <div className="mt-2">{rank}</div>
        </div>
        <div className="lg:hidden">
          {rank}
          <p className={cn(kickerClass, "mt-1.5")}>Where it sits</p>
        </div>
      </div>
      <div className="col-span-2 mt-3 lg:hidden">{bar}</div>
    </>
  );
}

// --- Header (sync, from the cache row) --------------------------------------

function Header({
  overview,
  watchlistSlot,
  moatPhrase,
}: {
  overview: CompanyPageOverviewCacheRow;
  watchlistSlot: ReactNode;
  moatPhrase: string | null;
}) {
  const chips: ReactNode[] = [];
  if (overview.sector) {
    chips.push(
      <span key="sector" className={chipClass("slate")}>
        {overview.sector}
      </span>,
    );
  }
  if (overview.sub_sector && overview.sub_sector !== overview.sector) {
    chips.push(
      <span
        key="sub"
        className="inline-flex items-center rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium leading-none text-muted-foreground"
      >
        {overview.sub_sector}
      </span>,
    );
  }
  const capLabel = marketCapBandLabel(overview.market_cap_band);
  if (capLabel) {
    chips.push(
      <span
        key="cap"
        className="hidden lg:inline-flex items-center rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium leading-none text-muted-foreground"
      >
        {capLabel}
      </span>,
    );
  }
  if (moatPhrase) {
    chips.push(
      <span
        key="moat"
        className="inline-flex items-center rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium leading-none text-muted-foreground"
      >
        {moatPhrase}
      </span>,
    );
  }
  if (overview.is_new) {
    chips.push(
      <span key="new" className={chipClass("emerald")}>
        New
      </span>,
    );
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-7">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              monoClass,
              "inline-flex items-center rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold tracking-[0.06em] text-foreground",
            )}
          >
            {overview.company_code}
          </span>
          <div className="lg:hidden">{watchlistSlot}</div>
        </div>
        <h1
          className={cn(
            displayClass,
            "mt-3 text-balance text-[23px] leading-[1.08] text-foreground sm:text-[29px]",
          )}
        >
          {overview.company_name}
        </h1>
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">{chips}</div>
        )}
      </div>

      <div className="hidden shrink-0 lg:block">{watchlistSlot}</div>
    </div>
  );
}

/** Overall read numeral + the streamed board position. Lives inside The Read
 * card so the number sits next to the sentence that explains it. The one-word
 * configuration label (band-tinted) sits under the numeral so the scoreboard
 * carries its own read without a separate pill up in the story row. */
function OverallRead({
  overview,
  streamPosition,
  readLabel,
  readClass,
}: {
  overview: CompanyPageOverviewCacheRow;
  streamPosition: boolean;
  readLabel: string;
  readClass: string;
}) {
  const hasScore = overview.read.score != null;
  return (
    <div className="grid grid-cols-[auto_1fr] items-end gap-x-6 lg:flex lg:w-[200px] lg:flex-col lg:items-end lg:gap-0">
      <div className="lg:text-right">
        <p className={cn(kickerClass, "whitespace-nowrap")}>Overall read</p>
        <p
          className={cn(
            displayClass,
            "mt-1 flex items-baseline gap-1 leading-none text-foreground lg:justify-end",
          )}
        >
          <span className="text-[40px] sm:text-[44px]">
            {hasScore ? overview.read.score!.toFixed(1) : "—"}
          </span>
          {hasScore && (
            <span
              className={cn(
                monoClass,
                "text-[13px] font-medium text-muted-foreground",
              )}
            >
              /10
            </span>
          )}
        </p>
        <p
          className={cn(
            "mt-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
            readClass,
          )}
        >
          {readLabel}
        </p>
      </div>
      {streamPosition ? (
        <Suspense
          fallback={
            <div
              className="h-[62px] justify-self-end lg:mt-3 lg:w-full"
              aria-hidden
            />
          }
        >
          <WhereItSits companyCode={overview.company_code} />
        </Suspense>
      ) : (
        <div
          className="h-[62px] justify-self-end lg:mt-3 lg:w-full"
          aria-hidden
        />
      )}
    </div>
  );
}

// --- The read (synthesis) ----------------------------------------------------

function Synthesis({
  overview,
  themes,
  streamPosition = true,
}: {
  overview: CompanyPageOverviewCacheRow;
  themes: OverviewSignalExtras["themes"];
  // false in the streaming fallback: no async children allowed there.
  streamPosition?: boolean;
}) {
  const { read } = overview;
  const def = BOARD_READS[read.key];
  // The synthesized story-engine one-liner (company_story, attached to read in
  // company-overview-cache.ts) wins over the generic bucket when present;
  // otherwise the read falls back to the bucket label + gloss. Colour + twist
  // stay driven by the composite bucket either way.
  const pillLabel = read.storyEngine ?? read.label;
  const glossLine = read.storyLine ?? def.gloss;
  // "Twist": the latest print vs the standing 4Q leg. Gated at the re-score
  // noise floor (±0.5) — a move drift can explain never earns a direction.
  const twist =
    overview.latest_score != null && overview.quarter_4q_avg != null
      ? overview.latest_score - overview.quarter_4q_avg
      : null;
  const twistUp = twist != null && twist >= TRAJECTORY_NOISE;
  const twistDown = twist != null && twist <= -TRAJECTORY_NOISE;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 lg:px-6">
      <div className="flex flex-col-reverse gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={kickerClass}>The story</span>
            {(twistUp || twistDown) && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  twistUp
                    ? "bg-teal-500/10 text-teal-700 dark:text-teal-300"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
                )}
              >
                {twistUp
                  ? "▲ Positive twist · latest above 4Q avg"
                  : "▼ Negative twist · latest below 4Q avg"}
              </span>
            )}
          </div>
          <p
            className={cn(
              displayClass,
              "mt-3 max-w-[900px] text-balance text-[20px] leading-[1.24] text-foreground sm:text-[24px] sm:leading-[1.22]",
            )}
          >
            {glossLine}
          </p>
        </div>
        <div className="border-b border-border/60 pb-4 lg:border-b-0 lg:border-l lg:pb-0 lg:pl-8">
          <OverallRead
            overview={overview}
            streamPosition={streamPosition}
            readLabel={pillLabel}
            readClass={def.textClass}
          />
        </div>
      </div>
      {themes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3.5">
          <span className={cn(kickerClass, "mr-0.5")}>Riding themes</span>
          {themes.map((t) => (
            <Link
              key={t.slug}
              href="/themes"
              title={t.rationale ?? undefined}
              className="group inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium leading-none text-teal-700 transition-colors hover:border-teal-500/50 hover:bg-teal-500/15 dark:text-teal-300"
            >
              <span aria-hidden className="text-[9px] leading-none">
                ▲
              </span>
              {t.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// --- The three reads ---------------------------------------------------------

function QuarterRead({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  const { quarter } = extras;
  // Score, prior, labels and why-line all come from the same LIVE rows so a
  // fresh print can never be captioned with the cache's older quarter label.
  const latestScore = quarter.latestScore ?? overview.latest_score;
  if (latestScore == null) {
    return (
      <NotScoredRead
        title="Quarter read"
        overview={overview}
        sectionId="sentiment-score"
      />
    );
  }
  const traj = quarter.trajectory;
  const trajDef =
    traj && traj.key !== "no_read" ? TRAJECTORIES[traj.key] : null;
  const priorScore = quarter.priorScore;
  const pathValues = quarter.scorePath
    .map((p) => p.value)
    .filter((v): v is number => v != null);

  return (
    <SectionLink
      sectionId="sentiment-score"
      className={cn(
        cardClass,
        "block w-full p-4 transition-colors hover:border-border sm:p-5",
      )}
    >
      <div className="flex items-start gap-4">
        <ConcallScore
          score={latestScore}
          size="lg"
          className="h-[60px] w-[60px] text-lg sm:h-[66px] sm:w-[66px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[15px] font-semibold text-foreground">
              Quarter read
            </span>
            <ScoreDelta
              score={latestScore}
              priorScore={priorScore}
              priorLabel={quarter.priorLabel}
              className="text-[11px]"
            />
            <span
              className={cn(monoClass, "text-[11px] text-muted-foreground")}
            >
              {[
                quarter.latestLabel ?? overview.quarter_label,
                overview.quarter_rank != null && overview.quarter_total != null
                  ? `Q rank ${overview.quarter_rank}/${overview.quarter_total}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          {quarter.whyLine && (
            <p className={cn(bodyClass, "mt-2 line-clamp-3")}>
              {quarter.whyLine}
            </p>
          )}
        </div>
        {trajDef && pathValues.length >= 2 && (
          <div
            className={cn(
              "hidden shrink-0 flex-col items-end border-l border-border/60 pl-4 text-right sm:flex",
              trajDef.textClass,
            )}
            title={traj?.description ?? trajDef.definition}
          >
            <PathSparkline values={pathValues} />
            <span className={cn(monoClass, "mt-1 text-[10px]")}>
              {trajDef.cellLabel}
              {traj && Number.isFinite(traj.change)
                ? ` · ${traj.change >= 0 ? "+" : ""}${traj.change.toFixed(1)} / ${pathValues.length}q`
                : ""}
            </span>
          </div>
        )}
      </div>
      {trajDef && pathValues.length >= 2 && (
        <div
          className={cn(
            "mt-3 flex items-center gap-2.5 sm:hidden",
            trajDef.textClass,
          )}
        >
          <PathSparkline values={pathValues} className="h-6 w-20" />
          <span className={cn(monoClass, "text-[10px]")}>
            {trajDef.cellLabel}
            {traj && Number.isFinite(traj.change)
              ? ` · ${traj.change >= 0 ? "+" : ""}${traj.change.toFixed(1)} / ${pathValues.length}q`
              : ""}
          </span>
        </div>
      )}
    </SectionLink>
  );
}

function GrowthRead({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  // Live row first (same row as the why-line); cache only as a fallback.
  const growthScore = extras.growthScore ?? overview.growth_score;
  if (growthScore == null) {
    return (
      <NotScoredRead
        title="Growth read"
        overview={overview}
        sectionId="future-growth"
      />
    );
  }
  const s = overview.growth_scenarios;
  const hasScenarios = Boolean(s && (s.bear || s.base || s.bull));
  const growthBand = GROWTH_BANDS[bandForGrowthScore(growthScore)];

  return (
    <SectionLink
      sectionId="future-growth"
      className={cn(
        cardClass,
        "block w-full p-4 transition-colors hover:border-border sm:p-5",
      )}
    >
      <div className="flex items-start gap-4">
        <ConcallScore
          score={growthScore}
          kind="growth"
          size="lg"
          className="h-[60px] w-[60px] text-lg sm:h-[66px] sm:w-[66px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[15px] font-semibold text-foreground">
              Growth read
            </span>
            {/* Growth has its own band vocabulary (lib/growth-band) — never the
                quarterly Bullish/Bearish scale. */}
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", growthBand.barClass)}
              />
              <span
                className={cn("text-[12px] font-medium", growthBand.textClass)}
              >
                {growthBand.label}
              </span>
            </span>
            <span
              className={cn(monoClass, "text-[11px] text-muted-foreground")}
            >
              {[
                s?.base ? `base ${s.base}` : null,
                overview.growth_rank != null && overview.growth_total != null
                  ? `Rank ${overview.growth_rank}/${overview.growth_total}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          {extras.growthWhyLine && (
            <p className={cn(bodyClass, "mt-2 line-clamp-3")}>
              {extras.growthWhyLine}
            </p>
          )}
          {hasScenarios && (
            <div className="mt-3">
              <div
                className="flex h-1.5 gap-0.5 overflow-hidden rounded-full"
                aria-hidden
              >
                <span className="flex-[2] bg-muted" />
                <span className="flex-[3] bg-teal-500/50" />
                <span className="flex-[2] bg-teal-500" />
              </div>
              <div
                className={cn(
                  monoClass,
                  "mt-1.5 flex justify-between text-[10px] text-muted-foreground",
                )}
              >
                <span>bear {s?.bear ?? "—"}</span>
                <span>base {s?.base ?? "—"}</span>
                <span>bull {s?.bull ?? "—"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionLink>
  );
}

const VALUATION_SHORT: Record<
  ReturnType<typeof bandForValuationScore>,
  string
> = {
  deep_value: "DEEP",
  undervalued: "CHEAP",
  fair: "FAIR",
  expensive: "PRICEY",
  richly_priced: "RICH",
};

function ValuationRead({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  const v = extras.valuation;
  if (!overview.section_availability.valuationCheck || !v) {
    return (
      <NotScoredRead
        title="Valuation read"
        overview={overview}
        sectionId="valuation-check"
      />
    );
  }
  // The extras already applied the 4-day staleness gate on the LIVE valuation
  // row; the cache row's valuation_stale can lag a /valuation-refresh, so it
  // must not veto (or resurrect) a verdict here.
  const shown = v.verdictLabel != null && v.score != null;
  const band = shown
    ? VALUATION_BANDS[bandForValuationScore(v.score as number)]
    : null;
  // priced_as_of is an IST date; before 05:30 UTC the UTC-midnight diff is -1.
  const ageDays = v.ageDays == null ? null : Math.max(0, v.ageDays);
  const pricedLabel =
    ageDays == null
      ? null
      : ageDays === 0
        ? "priced today"
        : `priced ${ageDays} day${ageDays === 1 ? "" : "s"} ago`;

  return (
    <SectionLink
      sectionId="valuation-check"
      className={cn(
        cardClass,
        "block w-full p-4 transition-colors hover:border-border sm:p-5",
      )}
    >
      <div className="flex items-start gap-4">
        {band ? (
          <div
            className={cn(
              "flex h-[60px] w-[60px] shrink-0 flex-col items-center justify-center rounded-full border-2 sm:h-[66px] sm:w-[66px]",
              band.borderClass,
              band.textClass,
            )}
            style={{ backgroundColor: `${band.chartHex}1a` }}
            role="img"
            aria-label={`Valuation ${v.verdictLabel}`}
          >
            <span className={cn(displayClass, "text-[17px] leading-none")}>
              {v.score != null ? v.score.toFixed(1) : "—"}
            </span>
            <span
              className={cn(monoClass, "mt-0.5 text-[10px] tracking-[0.08em]")}
            >
              {VALUATION_SHORT[band.key]}
            </span>
          </div>
        ) : (
          <div
            className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground sm:h-[66px] sm:w-[66px]"
            aria-hidden
          >
            <span className={cn(displayClass, "text-xl")}>—</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[15px] font-semibold text-foreground">
              Valuation read
            </span>
            {shown && band ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
                  band.textClass,
                )}
                style={{ backgroundColor: `${band.chartHex}26` }}
              >
                {v.verdictLabel}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[12px] font-semibold text-muted-foreground">
                No price read
              </span>
            )}
            {pricedLabel && (
              <span
                className={cn(monoClass, "text-[11px] text-muted-foreground")}
              >
                {pricedLabel}
              </span>
            )}
          </div>
          <p className={cn(bodyClass, "mt-2 line-clamp-3")}>
            {shown
              ? v.headline
              : v.withheldReason
                ? `Verdict withheld — ${v.withheldReason}.`
                : null}
          </p>
          {v.lenses.length > 0 && (
            <div
              className={cn(
                monoClass,
                "mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[10.5px] text-muted-foreground",
              )}
            >
              {v.lenses.map((l) => (
                <span key={l.label}>
                  {l.label} vs own history ·{" "}
                  <span
                    className={
                      l.pill === "Cheap"
                        ? "text-teal-700 dark:text-teal-300"
                        : l.pill === "Expensive" || l.pill === "Stretched"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-foreground/80"
                    }
                  >
                    {l.pill.toLowerCase()}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionLink>
  );
}

// --- Latest · newest first ---------------------------------------------------

function ActivityRiver({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  const items = extras.activity;
  if (items.length === 0) {
    return (
      <div>
        <p className={cn(kickerClass, "mb-3")}>Latest · newest first</p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          No material exchange filings in the last 60 days.
          {overview.quarter_label
            ? ` Latest scored quarter: ${overview.quarter_label}.`
            : ""}
        </p>
        <Link
          href="/desk"
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-teal-700 hover:text-teal-600 dark:text-teal-300"
        >
          Open the Exchange Desk <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    );
  }
  return (
    <div>
      <p className={cn(kickerClass, "mb-3.5")}>Latest · newest first</p>
      <ol className="relative pl-6">
        <span
          className="absolute bottom-2.5 left-[5px] top-1.5 w-0.5 bg-border"
          aria-hidden
        />
        {items.map((item, i) => {
          const strong =
            item.impact === "transformative" || item.impact === "severe";
          const dotClass =
            item.impact === "transformative"
              ? "bg-teal-500"
              : item.impact === "positive"
                ? "bg-teal-500/70"
                : item.impact === "severe"
                  ? "bg-rose-500"
                  : item.impact === "negative"
                    ? "bg-rose-500/70"
                    : "bg-muted-foreground";
          const headClass =
            item.impact === "transformative"
              ? "text-teal-700 dark:text-teal-300"
              : item.impact === "severe"
                ? "text-rose-700 dark:text-rose-300"
                : "text-foreground";
          const body = (
            <>
              <span
                className={cn(
                  "absolute -left-6 top-0.5 h-3 w-3 rounded-full ring-[3px] ring-card",
                  dotClass,
                )}
              />
              <p className={cn(monoClass, "text-[11px] text-muted-foreground")}>
                {item.whenLabel} · {item.kind}
                {strong && item.impact
                  ? ` · ${IMPACT_META[item.impact].label.toLowerCase()}`
                  : ""}
              </p>
              <p
                className={cn(
                  "mt-1.5 text-[14px] font-semibold leading-[1.35]",
                  headClass,
                )}
              >
                {item.impact === "transformative" ? (
                  <Star
                    className="mr-1 inline h-3 w-3 fill-current"
                    aria-hidden
                  />
                ) : null}
                {item.headline}
              </p>
            </>
          );
          return (
            <li
              key={item.id}
              className={cn("relative", i < items.length - 1 ? "pb-5" : "")}
            >
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-source-type="bse-filing"
                  className="block transition-opacity hover:opacity-80"
                >
                  {body}
                </a>
              ) : (
                <div>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
      <Link
        href="/desk"
        className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-teal-700 hover:text-teal-600 dark:text-teal-300"
      >
        All filings on the Desk <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}

// --- Standing reads ----------------------------------------------------------

function StandingReads({
  overview,
  extras,
}: {
  overview: CompanyPageOverviewCacheRow;
  extras: OverviewSignalExtras;
}) {
  const wtt = extras.walkTheTalk;
  const wttTier = wtt?.overall.tier ?? null;
  const wttTone = wttTier ? TIER_TONE[wttTier] : "slate";
  const wttHighlight = wttTier === "reliable";
  const kvLead = overview.overview_takeaways?.keyVariableLead;
  const kvTrend = overview.overview_takeaways?.keyVariableTrend;
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

  return (
    <div>
      <p className={cn(kickerClass, "mb-3")}>
        The standing reads · change less often
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {/* Moat */}
        <div className={cn(cardClass, "flex flex-col p-4 sm:p-5")}>
          <p className={kickerClass}>Moat</p>
          {extras.moat ? (
            <>
              <p
                className={cn(
                  displayClass,
                  "mt-2 text-[20px] leading-tight text-foreground sm:text-[22px]",
                )}
              >
                {extras.moat.phrase}
              </p>
              {extras.moat.headline && (
                <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-foreground/80">
                  {extras.moat.headline}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              No moat read published yet.
            </p>
          )}
          <div className="pt-3" />
          <OpenNudge sectionId="moat-analysis" label="Open moat analysis" />
        </div>

        {/* Key variables */}
        <div className={cn(cardClass, "flex flex-col p-4 sm:p-5")}>
          <p className={kickerClass}>Key variables</p>
          {overview.section_availability.keyVariables ? (
            <>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <p
                  className={cn(
                    displayClass,
                    "text-[20px] leading-tight text-foreground sm:text-[22px]",
                  )}
                >
                  {overview.key_variable_count != null &&
                  overview.key_variable_count > 0
                    ? `${overview.key_variable_count} tracked`
                    : "Tracked"}
                </p>
                {kvLead && (
                  <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                    lead: {kvLead}
                  </span>
                )}
              </div>
              {kvTrend && (
                <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-foreground/80">
                  {kvTrend}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              No key-variables snapshot yet.
            </p>
          )}
          <div className="pt-3" />
          <OpenNudge sectionId="key-variables" label="Open key variables" />
        </div>

        {/* Walk the talk → guidance history */}
        <div
          className={cn(
            "flex flex-col rounded-[14px] border p-4 sm:p-5",
            wttHighlight
              ? "border-teal-500/40 bg-teal-500/[0.07]"
              : "border-border/60 bg-card",
          )}
        >
          <p
            className={cn(
              kickerClass,
              wttHighlight && "text-teal-700 dark:text-teal-300",
            )}
          >
            Walk the talk
          </p>
          {wtt && wttTier ? (
            <>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <p
                  className={cn(
                    displayClass,
                    "text-[20px] leading-tight text-foreground sm:text-[22px]",
                  )}
                >
                  {TIER_LABELS[wttTier]}
                </p>
                {wtt.asOfQuarter && (
                  <span
                    className={cn(
                      monoClass,
                      "text-[11px] text-muted-foreground",
                    )}
                  >
                    as of {wtt.asOfQuarter}
                  </span>
                )}
              </div>
              {segments && (
                <div className="mt-3 flex gap-[3px]" aria-hidden>
                  {Array.from({ length: segments.n }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-sm",
                        i < segments.filled
                          ? wttTone === "emerald"
                            ? "bg-teal-500"
                            : wttTone === "sky"
                              ? "bg-sky-500"
                              : wttTone === "amber"
                                ? "bg-amber-500"
                                : wttTone === "rose"
                                  ? "bg-rose-500"
                                  : "bg-muted-foreground"
                          : "bg-muted",
                      )}
                    />
                  ))}
                </div>
              )}
              <p
                className={cn(
                  monoClass,
                  "mt-2 text-[11px] text-muted-foreground",
                )}
              >
                {wtt.overall.onTimeCount} of {wtt.overall.totalCount} guidance
                items delivered on time
              </p>
            </>
          ) : (
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              {overview.guidance_count
                ? `${overview.guidance_count} guidance items tracked · grade pending`
                : "Not enough tracked guidance to grade yet."}
            </p>
          )}
          <div className="pt-3" />
          <OpenNudge sectionId="guidance-history" label="Open guidance" />
        </div>
      </div>
    </div>
  );
}

// --- Board ------------------------------------------------------------------

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
    <div
      id="overview"
      className="scroll-mt-40 overflow-hidden rounded-[1.55rem] border border-border/70 bg-card/95 p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] backdrop-blur-sm sm:p-6 lg:p-8"
      style={{
        scrollMarginTop:
          "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
      }}
    >
      <Header
        overview={overview}
        watchlistSlot={watchlistSlot}
        moatPhrase={extras.moat?.phrase ?? null}
      />

      <div className="mt-5">
        <Synthesis overview={overview} themes={extras.themes} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start lg:gap-7">
        <div className="flex flex-col gap-3">
          <p className={kickerClass}>The three reads · this quarter</p>
          <QuarterRead overview={overview} extras={extras} />
          <GrowthRead overview={overview} extras={extras} />
          <ValuationRead overview={overview} extras={extras} />
        </div>
        <ActivityRiver overview={overview} extras={extras} />
      </div>

      <div className="mt-6">
        <StandingReads overview={overview} extras={extras} />
      </div>
    </div>
  );
}

/**
 * Streaming fallback. Everything the cache row can render, it renders for real:
 * the header and the synthesis (read label, gloss sentence, overall score).
 * The gloss sentence is the page's LCP element on mobile — leaving it behind
 * the Suspense boundary put LCP at ~5s (7s element render delay) while the
 * extras fetch ran. Only the extras-dependent blocks are skeletons, and those
 * are sized to the measured real blocks (412px / 1350px viewports, 2026-08-21)
 * so the swap doesn't move the 2,000px of page below the board: that swap was
 * a 0.35 CLS on mobile. Heights drift a little per company; that's fine — a
 * few px of shift scores near zero, a missing 575px block does not.
 */
export function OverviewSignalBoardFallback({
  overview,
  watchlistSlot = null,
}: {
  overview: CompanyPageOverviewCacheRow;
  watchlistSlot?: ReactNode;
}) {
  return (
    <div
      id="overview"
      className="scroll-mt-40 overflow-hidden rounded-[1.55rem] border border-border/70 bg-card/95 p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] backdrop-blur-sm sm:p-6 lg:p-8"
    >
      <Header
        overview={overview}
        watchlistSlot={watchlistSlot}
        moatPhrase={null}
      />

      <div className="mt-5">
        <Synthesis overview={overview} themes={[]} streamPosition={false} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start lg:gap-7">
        <div className="flex flex-col gap-3">
          <p className={kickerClass}>The three reads · this quarter</p>
          <div className="h-[188px] animate-pulse rounded-[14px] bg-muted/50 lg:h-[118px]" />
          <div className="h-[190px] animate-pulse rounded-[14px] bg-muted/50 lg:h-[132px]" />
          <div className="h-[196px] animate-pulse rounded-[14px] bg-muted/50 lg:h-[120px]" />
        </div>
        <div className="h-[267px] animate-pulse rounded-[14px] bg-muted/40 lg:h-[286px]" />
      </div>

      <div className="mt-6 h-[575px] animate-pulse rounded-[14px] bg-muted/40 lg:h-[269px]" />
    </div>
  );
}
