"use client";

import * as React from "react";

import type {
  NormalizedIndustryCapitalCycle,
  NormalizedIndustryMarketShareSnapshot,
  NormalizedIndustrySupplySideEvidencePack,
} from "@/lib/company-industry-analysis/types";
import { cn } from "@/lib/utils";
import { elevatedBlockClass } from "./surface-tokens";
import { toDisplayLabel } from "../[code]/display-tokens";

export type SubSectorTabEntry = {
  subSector: string;
  description: string | null;
  relevanceRationale: string | null;
  capitalCycle: NormalizedIndustryCapitalCycle | null;
  marketShareSnapshot: NormalizedIndustryMarketShareSnapshot | null;
  supplySideEvidencePack: NormalizedIndustrySupplySideEvidencePack | null;
};

type SubSectorTabsProps = {
  entries: SubSectorTabEntry[];
};

const subSectorAccentClass =
  "bg-gradient-to-r from-transparent via-sky-500/70 to-transparent dark:via-sky-400/55";

const parseMarketShareValue = (value: string | null) => {
  if (!value) return null;
  const normalizedValue = value.trim().replace(/,/g, "");
  const numericMatch = normalizedValue.match(/-?\d+(?:\.\d+)?/);
  if (!numericMatch) return null;
  const parsed = Number(numericMatch[0]);
  if (!Number.isFinite(parsed)) return null;
  if (normalizedValue.includes("%")) return Math.max(0, parsed);
  if (parsed >= 0 && parsed <= 1) return parsed * 100;
  return Math.max(0, parsed);
};

const formatMarketShareValue = (value: string | null) => {
  if (!value) return null;
  const trimmedValue = value.trim();
  const normalizedValue = trimmedValue.replace(/,/g, "");
  const parsed = parseMarketShareValue(trimmedValue);
  if (parsed == null) return trimmedValue;
  if (normalizedValue.includes("%")) return trimmedValue;
  const formattedValue = Number.isInteger(parsed)
    ? `${Math.round(parsed)}`
    : `${parsed.toFixed(1).replace(/\.0$/, "")}`;
  return `${formattedValue}%`;
};

export function SubSectorTabs({ entries }: SubSectorTabsProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  if (entries.length === 0) return null;

  const safeIndex = Math.min(activeIndex, entries.length - 1);
  const activeEntry = entries[safeIndex];

  return (
    <div className="space-y-3">
      {entries.length > 1 && (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background/96 via-background/60 to-transparent dark:from-slate-950/96 dark:via-slate-950/50" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background/96 via-background/60 to-transparent dark:from-slate-950/96 dark:via-slate-950/50" />
          <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav
              className="flex min-w-full items-center gap-2 whitespace-nowrap px-2"
              aria-label="Sub-sectors"
            >
              {entries.map((entry, index) => {
                const isActive = index === safeIndex;
                const hasDepth =
                  (entry.marketShareSnapshot?.players.length ?? 0) > 0 ||
                  Boolean(entry.supplySideEvidencePack);
                return (
                  <button
                    key={`${entry.subSector}-${index}`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-pressed={isActive}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-medium tracking-[0.01em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      isActive
                        ? "border-border/60 bg-foreground text-background shadow-[0_12px_28px_-18px_rgba(15,23,42,0.55)] dark:bg-white dark:text-slate-950"
                        : "border-border/40 bg-background/70 text-muted-foreground hover:border-border/60 hover:bg-background/85 hover:text-foreground",
                    )}
                  >
                    <span>{entry.subSector}</span>
                    {hasDepth && (
                      <span
                        aria-hidden="true"
                        title="Has market-share or supply-side data"
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          isActive ? "bg-background/70 dark:bg-slate-950/70" : "bg-sky-500/80",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <SubSectorBody entry={activeEntry} showTitle={entries.length === 1} />
    </div>
  );
}

function SubSectorBody({
  entry,
  showTitle,
}: {
  entry: SubSectorTabEntry;
  showTitle: boolean;
}) {
  const capitalCycleStage = toDisplayLabel(entry.capitalCycle?.stage ?? null);
  const capitalCycleDirection = toDisplayLabel(entry.capitalCycle?.direction ?? null);
  const capitalCycleRead = entry.capitalCycle?.supplySideRead ?? null;
  const evidenceInterpretation = entry.supplySideEvidencePack?.interpretation ?? null;

  const marketShareSnapshot = entry.marketShareSnapshot;
  const players = marketShareSnapshot?.players ?? [];
  const rankedPlayers = players
    .map((player, playerIndex) => ({
      ...player,
      playerIndex,
      parsedShare: parseMarketShareValue(player.shareValue),
    }))
    .sort((left, right) => {
      if (left.parsedShare != null && right.parsedShare != null) {
        return right.parsedShare - left.parsedShare;
      }
      if (left.parsedShare != null) return -1;
      if (right.parsedShare != null) return 1;
      return left.playerIndex - right.playerIndex;
    });
  const topPlayers = rankedPlayers.slice(0, 3);
  const maxShare = rankedPlayers.reduce(
    (max, player) => Math.max(max, player.parsedShare ?? 0),
    0,
  );

  const labelClass =
    "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
  const cardClass =
    "rounded-xl border border-border/25 bg-background/45 p-4 space-y-2";
  const gridClass = "grid grid-cols-1 gap-4 lg:grid-cols-2";
  const verdictChipClass =
    "rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground";

  const hasContext = Boolean(entry.description || entry.relevanceRationale);
  const hasMarketShare = Boolean(marketShareSnapshot);
  const hasTopGrid = hasContext || hasMarketShare;
  const hasCapitalCycle = Boolean(capitalCycleStage || capitalCycleDirection);
  const hasBottomGrid = Boolean(capitalCycleRead || evidenceInterpretation);

  const renderIntroductionCard = () => (
    <div className={cardClass}>
      <p className={labelClass}>Introduction</p>
      {entry.description && (
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {entry.description}
        </p>
      )}
      {entry.relevanceRationale && (
        <p className="text-[12px] leading-relaxed text-foreground">
          <span className="font-semibold text-foreground">Why relevant: </span>
          {entry.relevanceRationale}
        </p>
      )}
    </div>
  );

  const renderMarketShareCard = () => {
    if (!marketShareSnapshot) return null;
    return (
      <div className={cardClass}>
        <p className={labelClass}>Market share snapshot</p>
        {(marketShareSnapshot.shareBasis || marketShareSnapshot.dataVintage) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {marketShareSnapshot.shareBasis && (
              <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] text-foreground">
                {marketShareSnapshot.shareBasis}
              </span>
            )}
            {marketShareSnapshot.dataVintage && (
              <span className="rounded-full border border-border/60 bg-muted/55 px-2 py-0.5 text-[10px] text-muted-foreground">
                {marketShareSnapshot.dataVintage}
              </span>
            )}
          </div>
        )}
        {topPlayers.length > 0 && (
          <div className="space-y-2">
            {topPlayers.map((player) => {
              const shareLabel = formatMarketShareValue(player.shareValue);
              const shareRatio =
                player.parsedShare != null && maxShare > 0
                  ? Math.max(0, (player.parsedShare / maxShare) * 100)
                  : null;
              return (
                <div
                  key={`${entry.subSector}-${player.playerName}-${player.playerIndex}`}
                  className="space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <p className="truncate text-[12px] font-semibold leading-snug text-foreground">
                        {player.playerName}
                      </p>
                      {player.playerStatus && (
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {toDisplayLabel(player.playerStatus)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-baseline gap-1.5">
                      {player.shareIsEstimated && (
                        <span
                          title="Market share estimated by our analysis"
                          className="text-[10px] text-muted-foreground"
                        >
                          Estimated
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-semibold tabular-nums ${
                          player.shareIsEstimated
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {shareLabel ?? "—"}
                      </span>
                    </div>
                  </div>
                  {shareRatio != null && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className={`h-full rounded-full ${
                          player.shareIsEstimated
                            ? "bg-sky-500/40"
                            : "bg-sky-500/75"
                        }`}
                        style={{ width: `${shareRatio}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${elevatedBlockClass} relative overflow-hidden p-5 pt-6 space-y-5`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 ${subSectorAccentClass}`} />

      {showTitle && (
        <p className="text-[15px] font-semibold leading-snug text-foreground">
          {entry.subSector}
        </p>
      )}

      {hasTopGrid && (
        <div
          className={cn(
            hasContext && hasMarketShare ? gridClass : "space-y-4",
          )}
        >
          {hasContext && renderIntroductionCard()}
          {hasMarketShare && renderMarketShareCard()}
        </div>
      )}

      {hasCapitalCycle && (
        <div className="space-y-2 px-1">
          <p className={labelClass}>Capital cycle</p>
          <div className="flex flex-wrap items-center gap-2">
            {capitalCycleStage && (
              <span className={verdictChipClass}>{capitalCycleStage}</span>
            )}
            {capitalCycleDirection && (
              <span className={verdictChipClass}>{capitalCycleDirection}</span>
            )}
          </div>
        </div>
      )}

      {hasBottomGrid && (
        <div
          className={cn(
            capitalCycleRead && evidenceInterpretation ? gridClass : "space-y-4",
          )}
        >
          {capitalCycleRead && (
            <div className={cardClass}>
              <p className={labelClass}>Supply-side read</p>
              <p className="text-[12px] leading-relaxed text-foreground/90">
                {capitalCycleRead}
              </p>
            </div>
          )}
          {evidenceInterpretation && (
            <div className={cardClass}>
              <p className={labelClass}>Evidence pack read</p>
              <p className="text-[12px] leading-relaxed text-foreground/90">
                {evidenceInterpretation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
