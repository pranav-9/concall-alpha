"use client";

import type { ReactNode } from "react";

import { marketCapBandLabel } from "@/lib/coverage-policy";
import { cn } from "@/lib/utils";
import { BOARD_READS } from "@/lib/board-read";
import { BANDS, bandForScore } from "@/lib/score-band";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";
import type { CompanyPageOverviewCacheRow } from "@/lib/company-overview-cache";
import { colorPalette as segmentColorPalette } from "./business-segment-mix-constants";
import { useCompanyPageNavigation } from "./company-page-workspace";
import { MissingSectionRequestButton } from "./missing-section-request-button";
import { nestedDetailClass } from "./surface-tokens";
import { topShareLabel } from "../[code]/display-tokens";

// "The Read" overview. Renders entirely from the OverviewReadModel the cache
// layer assembles (lib/company-overview-cache.ts) — no board-read math, no band
// lookups beyond mapping a band → colour here. The verdict number + label are
// the SAME composite that ranks the leaderboard, so the two surfaces agree.

type Kind = "quarterly" | "growth" | "valuation";

function hexForScore(score: number, kind: Kind): string {
  if (kind === "growth") return GROWTH_BANDS[bandForGrowthScore(score)].chartHex;
  if (kind === "valuation") return VALUATION_BANDS[bandForValuationScore(score)].chartHex;
  return BANDS[bandForScore(score)].chartHex;
}

function bandLabelForScore(score: number, kind: Kind): string {
  if (kind === "growth") return GROWTH_BANDS[bandForGrowthScore(score)].label;
  if (kind === "valuation") return VALUATION_BANDS[bandForValuationScore(score)].label;
  return BANDS[bandForScore(score)].label;
}

/** SVG ring dial: numeral centred, arc length = score/10, band-coloured. */
function RingGauge({
  score,
  kind,
  label,
  stale = false,
}: {
  score: number | null;
  kind: Kind;
  label: string;
  stale?: boolean;
}) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const pct = hasScore ? Math.max(0, Math.min(1, score / 10)) : 0;
  const hex = hasScore ? hexForScore(score, kind) : undefined;
  const aria = hasScore
    ? `${label} ${score.toFixed(1)} of 10 — ${bandLabelForScore(score, kind)}`
    : `${label} not scored`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }} role="img" aria-label={aria}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted/50"
            strokeDasharray={hasScore ? undefined : "3 4"}
          />
          {hasScore && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              stroke={hex}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
            />
          )}
        </svg>
        <span className="absolute inset-0 grid place-items-center font-mono text-base font-bold tabular-nums text-foreground">
          {hasScore ? score.toFixed(1) : "—"}
        </span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      {stale && !hasScore && (
        <span className="text-[9px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
          Stale
        </span>
      )}
    </div>
  );
}

type CardProps = {
  title: string;
  href: string;
  navigate: (href: string) => void;
  children: ReactNode;
  className?: string;
};

/** Whole card = the single interactive target (no nested links/buttons). */
function EvidenceCard({ title, href, navigate, children, className }: CardProps) {
  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className={cn(
        "group flex w-full flex-col gap-2 p-4 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        nestedDetailClass,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
        <span className="text-muted-foreground/70 transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>
      {children}
    </button>
  );
}

/** Static (non-interactive) shell for a not-scored section, so the Request
 * button inside is the only interactive target. */
function NotScoredCard({
  title,
  companyCode,
  companyName,
  sectionId,
}: {
  title: string;
  companyCode: string | null;
  companyName: string | null;
  sectionId: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 p-4", nestedDetailClass)}>
      <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
      <p className="text-[11px] leading-snug text-muted-foreground">Not scored yet.</p>
      {companyCode && (
        <MissingSectionRequestButton
          companyCode={companyCode}
          companyName={companyName}
          sectionId={sectionId}
          sectionTitle={title}
          label="Request this section"
          className="mt-1 h-7 self-start rounded-full border-border/60 bg-background/95 px-3 text-[10px] font-medium text-foreground shadow-sm hover:bg-background"
        />
      )}
    </div>
  );
}

/** Small bar sparkline; latest bar accented. */
function Sparkline({ series }: { series: number[] }) {
  const max = 10;
  return (
    <div className="flex h-10 items-end gap-1" aria-hidden>
      {series.map((v, i) => {
        const isLatest = i === series.length - 1;
        const h = Math.max(6, (Math.max(0, Math.min(max, v)) / max) * 100);
        return (
          <div
            key={i}
            className={cn(
              "w-2 rounded-sm",
              isLatest ? "bg-teal-500 dark:bg-teal-400" : "bg-muted-foreground/30",
            )}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}

function deltaTone(delta: number) {
  if (delta > 0) return "border-teal-300/60 bg-teal-100 text-teal-800 dark:border-teal-700/40 dark:bg-teal-900/30 dark:text-teal-200";
  if (delta < 0) return "border-rose-300/60 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200";
  return "border-border/60 bg-muted/60 text-muted-foreground";
}

export interface TheReadOverviewProps {
  overview: CompanyPageOverviewCacheRow;
  watchlistSlot?: ReactNode;
  /** Server-rendered live Overall-board rank (overall-rank-slot.tsx), streamed
   * in behind Suspense — a slot so this client component stays board-math-free. */
  overallRankSlot?: ReactNode;
}

export function TheReadOverview({
  overview,
  watchlistSlot = null,
  overallRankSlot = null,
}: TheReadOverviewProps) {
  const navigation = useCompanyPageNavigation();
  const navigate = (href: string) => {
    const id = href.startsWith("#") ? href.slice(1) : href;
    if (navigation) {
      navigation.navigateToSection(id);
      return;
    }
    const target = typeof document !== "undefined" ? document.getElementById(id) : null;
    target?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  const { read, section_availability: availability } = overview;
  const readLabelClass = BOARD_READS[read.key].textClass;

  return (
    <div
      id="overview"
      className="scroll-mt-40 overflow-hidden rounded-[1.55rem] border border-border/70 bg-card/95 p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] backdrop-blur-sm sm:p-6 lg:p-7"
      style={{
        scrollMarginTop:
          "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3 pl-1 sm:pl-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-foreground">
              {overview.company_code}
            </span>
            {marketCapBandLabel(overview.market_cap_band) && (
              <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {marketCapBandLabel(overview.market_cap_band)}
                {overview.sector ? ` · ${overview.sector}` : ""}
              </span>
            )}
            {overview.is_new && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                New
              </span>
            )}
          </div>
          <p className="text-balance text-[1.9rem] font-bold leading-tight tracking-[-0.03em] text-foreground sm:text-[2.35rem] lg:text-[2.7rem]">
            {overview.company_name}
          </p>
        </div>
        {watchlistSlot}
      </div>

      {/* THE READ band */}
      <div className="mt-5 rounded-2xl border border-border/50 bg-muted/25 p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {/* No quarter suffix: the Read is a standing view (its ConcallScore leg is the
              trailing 4-quarter mean), not a single-quarter verdict. The latest
              print and its label live on the ConcallScore card below. */}
          The Read
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="font-mono text-5xl font-bold tabular-nums leading-none text-foreground">
              {read.score != null ? read.score.toFixed(1) : "—"}
            </span>
            <div className="space-y-1 pt-1">
              <span className={cn("text-lg font-semibold leading-tight", readLabelClass)}>
                {read.label}
              </span>
              {overview.overview_takeaways?.moatHeadline && (
                <p className="max-w-md text-[12px] leading-snug text-muted-foreground line-clamp-2">
                  {overview.overview_takeaways.moatHeadline}
                </p>
              )}
              {overallRankSlot}
            </div>
          </div>
          <div className="flex items-center gap-5 sm:gap-6">
            {/* Standing quarter leg (trailing 4-quarter mean), the same leg The
                Read is computed from — NOT the single latest print, which is the
                ConcallScore card below. */}
            <RingGauge score={overview.quarter_4q_avg} kind="quarterly" label="Concall" />
            <RingGauge score={overview.growth_score} kind="growth" label="Growth" />
            <RingGauge
              score={overview.valuation_score}
              kind="valuation"
              label="Value"
              stale={overview.valuation_stale}
            />
          </div>
        </div>
      </div>

      {/* Supporting evidence */}
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        Supporting evidence
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Business */}
        {availability.businessSnapshot && overview.business_segment_mix ? (
          <EvidenceCard title="Business" href="#business-overview" navigate={navigate}>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/40">
              {overview.business_segment_mix.map((seg, i) => (
                <div
                  key={seg.name}
                  className="h-full"
                  style={{
                    width: `${seg.sharePct}%`,
                    backgroundColor: segmentColorPalette[i % segmentColorPalette.length],
                  }}
                  title={`${seg.name}: ${seg.sharePct.toFixed(1)}%`}
                />
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {overview.business_segment_mix.length} segments
            </span>
          </EvidenceCard>
        ) : (
          <NotScoredCard
            title="Business"
            companyCode={overview.company_code}
            companyName={overview.company_name}
            sectionId="business-overview"
          />
        )}

        {/* Moat */}
        {overview.moat_label ? (
          <EvidenceCard title="Moat" href="#moat-analysis" navigate={navigate}>
            <span className="inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium border-border/60 bg-background/75 text-foreground">
              {overview.moat_label}
              {overview.moat_tier_label ? ` · ${overview.moat_tier_label}` : ""}
            </span>
          </EvidenceCard>
        ) : (
          <NotScoredCard
            title="Moat"
            companyCode={overview.company_code}
            companyName={overview.company_name}
            sectionId="moat-analysis"
          />
        )}

        {/* Key Variables */}
        {availability.keyVariables ? (
          <EvidenceCard title="Key Variables" href="#key-variables" navigate={navigate}>
            <span className="text-[11px] text-muted-foreground line-clamp-2">
              {overview.overview_takeaways?.keyVariableLead ??
                `${overview.key_variable_count ?? 0} tracked variables`}
            </span>
          </EvidenceCard>
        ) : (
          <NotScoredCard
            title="Key Variables"
            companyCode={overview.company_code}
            companyName={overview.company_name}
            sectionId="key-variables"
          />
        )}

        {/* Guidance — v1: item count (hit-rate deferred, T-DATA-1) */}
        {availability.guidanceHistory ? (
          <EvidenceCard title="Guidance" href="#guidance-history" navigate={navigate}>
            <span className="text-[11px] text-muted-foreground">
              {overview.guidance_count ?? 0} tracked items
            </span>
          </EvidenceCard>
        ) : (
          <NotScoredCard
            title="Guidance"
            companyCode={overview.company_code}
            companyName={overview.company_name}
            sectionId="guidance-history"
          />
        )}
      </div>

      {/* Wide cards */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {/* Quarterly */}
        {overview.latest_score != null ? (
          <EvidenceCard title="ConcallScore" href="#sentiment-score" navigate={navigate}>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {overview.latest_score.toFixed(1)}
              </span>
              {overview.qoq_delta != null && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                    deltaTone(overview.qoq_delta),
                  )}
                >
                  {overview.qoq_delta > 0 ? "↑" : overview.qoq_delta < 0 ? "↓" : "→"}{" "}
                  {overview.qoq_delta > 0 ? "+" : ""}
                  {overview.qoq_delta.toFixed(1)}
                </span>
              )}
            </div>
            {overview.quarter_series && overview.quarter_series.length > 1 && (
              <Sparkline series={overview.quarter_series} />
            )}
            {overview.quarter_rank != null && overview.quarter_total != null && (
              <span className="text-[11px] text-muted-foreground">
                Q Rank {overview.quarter_rank}/{overview.quarter_total}
                {` · ${topShareLabel(overview.quarter_rank, overview.quarter_total)}`}{" "}
                · full breakdown
              </span>
            )}
          </EvidenceCard>
        ) : (
          <NotScoredCard
            title="ConcallScore"
            companyCode={overview.company_code}
            companyName={overview.company_name}
            sectionId="sentiment-score"
          />
        )}

        {/* Growth */}
        {availability.futureGrowth && overview.growth_score != null ? (
          <EvidenceCard title="Future Growth" href="#future-growth" navigate={navigate}>
            <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {overview.growth_score.toFixed(1)}
            </span>
            {overview.growth_scenarios &&
              (overview.growth_scenarios.bear ||
                overview.growth_scenarios.base ||
                overview.growth_scenarios.bull) && (
                <div className="space-y-1">
                  <div className="flex h-2 w-full overflow-hidden rounded-full">
                    <div className="h-full flex-1 bg-rose-300/50 dark:bg-rose-500/30" />
                    <div className="h-full flex-[2] bg-teal-400/70 dark:bg-teal-500/50" />
                    <div className="h-full flex-1 bg-teal-300/50 dark:bg-teal-400/30" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>bear {overview.growth_scenarios.bear ?? "—"}</span>
                    <span className="font-medium text-foreground/80">
                      base {overview.growth_scenarios.base ?? "—"}
                    </span>
                    <span>bull {overview.growth_scenarios.bull ?? "—"}</span>
                  </div>
                </div>
              )}
            {overview.growth_rank != null && overview.growth_total != null && (
              <span className="text-[11px] text-muted-foreground">
                Growth Rank {overview.growth_rank}/{overview.growth_total} · see scenarios
              </span>
            )}
          </EvidenceCard>
        ) : (
          <NotScoredCard
            title="Future Growth"
            companyCode={overview.company_code}
            companyName={overview.company_name}
            sectionId="future-growth"
          />
        )}
      </div>
    </div>
  );
}
