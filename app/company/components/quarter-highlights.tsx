"use client";

import { ArrowRight, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { QuarterHighlight } from "@/lib/key-variables-snapshot/highlights";
import {
  buildTrendGeometry,
  compactPeriodLabel,
  formatMetricNumber,
  formatValueWithUnit,
} from "@/lib/key-variables-snapshot/presentation";

import { SectionLink } from "./section-link";
import { nestedDetailClass } from "./surface-tokens";
import { thesisEffectLineClass, thesisEffectTextClass } from "./thesis-effect";

const displayFont = "font-[family-name:var(--font-display)] font-bold";
const dataFont = "font-[family-name:var(--font-data)] tabular-nums";

const firstPlotted = (h: QuarterHighlight): { period: string; value: number } | null => {
  for (let i = 0; i < h.trendValues.length; i++) {
    const v = h.trendValues[i];
    if (v != null) return { period: h.trendPeriods[i], value: v };
  }
  return null;
};

/**
 * A tracked target draws as a rail: the first plotted value at the left, the
 * guide at the right, the latest value as the filled dot between them. The
 * dot's position is the share of the distance covered (clamped so a value
 * past the guide still sits on the rail).
 */
function GuideRail({ h }: { h: QuarterHighlight }) {
  const first = firstPlotted(h);
  if (!first || !h.guide || h.latestValue == null) return null;
  const span = h.guide.value - first.value;
  const progress = span === 0 ? 1 : (h.latestValue - first.value) / span;
  const x = Math.min(100, Math.max(2, progress * 100));
  const label = (v: number) => formatValueWithUnit(v, h.unitPrefix, h.unitSuffix);
  return (
    <div
      role="img"
      aria-label={`${h.variable}: ${compactPeriodLabel(first.period)} ${label(first.value)}, now ${label(h.latestValue)}, ${h.guide.label}`}
      className={cn("mt-5", thesisEffectLineClass[h.effect])}
    >
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <div className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-current" style={{ width: `${x}%` }} />
        <span className="absolute left-0 top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/70" />
        <span className="absolute right-0 top-1/2 size-3 -translate-y-1/2 translate-x-1/2 rounded-full border-[1.5px] border-current bg-background" />
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
          style={{ left: `${x}%` }}
        />
      </div>
      <div className={cn(dataFont, "mt-2 flex items-start justify-between gap-3 text-[10px] leading-snug text-muted-foreground")}>
        <span>
          {compactPeriodLabel(first.period)} · {label(first.value)}
        </span>
        <span className="text-right">{h.guide.label}</span>
      </div>
    </div>
  );
}

/** No target: the trailing trend as an area line, first and latest labelled. */
function TrendArea({ h }: { h: QuarterHighlight }) {
  const geometry = buildTrendGeometry(h.trendPeriods, h.trendValues, null);
  if (!geometry) return null;
  const { points } = geometry;
  const first = points[0];
  const last = points[points.length - 1];
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const area = `${line} L${last.x} 100 L${first.x} 100 Z`;
  const label = (v: number) => formatValueWithUnit(v, h.unitPrefix, h.unitSuffix);
  return (
    <div
      role="img"
      aria-label={`${h.variable}: ${points.map((p) => `${p.period} ${label(p.value)}`).join(", ")}`}
      className={cn("mt-5", thesisEffectLineClass[h.effect])}
    >
      <div className="relative h-14">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <path d={area} fill="currentColor" fillOpacity={0.12} />
          <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {points.map((p) => (
          <span
            key={p.period}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
              p === last ? "size-3 bg-current" : "size-[6px] border-[1.5px] border-current bg-background",
            )}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          />
        ))}
      </div>
      <div className={cn(dataFont, "mt-2 flex items-start justify-between gap-3 text-[10px] leading-snug text-muted-foreground")}>
        <span>
          {compactPeriodLabel(first.period)} · {label(first.value)}
        </span>
        <span className="text-right">{compactPeriodLabel(last.period)}</span>
      </div>
    </div>
  );
}

function HighlightCard({ h, index }: { h: QuarterHighlight; index: number }) {
  const tightSuffix = h.unitSuffix === "%" || h.unitSuffix.toLowerCase() === "x";
  return (
    <div className={cn(nestedDetailClass, "flex min-w-0 flex-col p-4")}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            dataFont,
            "grid size-6 shrink-0 place-items-center rounded-full border border-teal-500/40 text-[10px] font-semibold text-teal-600 dark:text-teal-300",
          )}
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">{h.variable}</p>
      </div>
      <p className={cn(displayFont, "mt-3 text-[30px] leading-none tracking-[-0.03em] text-foreground sm:text-[34px]")}>
        {h.unitPrefix ? <span>{h.unitPrefix}</span> : null}
        {h.latestValue != null ? formatMetricNumber(h.latestValue) : "—"}
        {h.unitSuffix ? (
          <span className={cn("text-[16px] tracking-[-0.01em]", tightSuffix ? "ml-0.5" : "ml-1.5")}>
            {h.unitSuffix.toLowerCase() === "x" ? "×" : h.unitSuffix}
          </span>
        ) : null}
      </p>
      {h.guide ? <GuideRail h={h} /> : <TrendArea h={h} />}
      <div className="mt-3 flex-1">
        {h.headline ? (
          <p className="text-[12px] leading-snug text-foreground/80">{h.headline}</p>
        ) : null}
        {h.changeLabel ? (
          <p className={cn(dataFont, "mt-1 text-[11px] font-semibold", thesisEffectTextClass[h.effect])}>
            {h.changeLabel} since {compactPeriodLabel(h.trendPeriods[0] ?? h.latestPeriod)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The company's deep-tracked key variables, three to a row, as the quarter's
 * "Top highlights": the number, where it is against its trend or target, and
 * the Key Variables tab's own verdict line. Drawn only on the latest quarter —
 * the snapshot is company-level, so an older quarter cannot claim it.
 */
export function QuarterHighlights({ highlights }: { highlights: QuarterHighlight[] }) {
  if (highlights.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-[15px] font-semibold leading-tight text-foreground">Top highlights</h3>
        </div>
        <SectionLink
          sectionId="key-variables"
          className="inline-flex items-center gap-1 rounded text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open Key Variables
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </SectionLink>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((h, i) => (
          <HighlightCard key={`${h.variable}-${i}`} h={h} index={i} />
        ))}
      </div>
    </div>
  );
}
