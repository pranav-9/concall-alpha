import React from "react";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { slugifySector } from "@/app/sector/utils";
import { ScoreBoardTable } from "@/components/score-board-table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  NormalizedCompanyIndustryAnalysis,
  NormalizedIndustryCapitalCycle,
  NormalizedIndustryPlayerTypeDimension,
  NormalizedIndustryRegulatoryChange,
  NormalizedIndustryTheme,
  NormalizedIndustryValueChainMap,
} from "@/lib/company-industry-analysis/types";
import { getCompanyIndustryAnalysis } from "@/lib/company-industry-analysis/get";
import {
  EBITDA_TIER_CUTS,
  MARGIN_TIER_LABELS,
  buildSubSectorEntries,
  companyLayerIndexes,
  findCompanyShare,
  formatMarketShareValue,
  latestCompanyMargin,
  marginBandPosition,
  marginReadShort,
  matchesCompany,
  moneyHeadline,
  parseMarketShareValue,
  pickPlayerLens,
  policySortKey,
  policyTally,
  policyTone,
  readLayerMargin,
  shareHead,
  shortName,
  whereItSitsLine,
  type CompanyMargin,
  type LayerMarginRead,
  type PolicyTone,
  type SubSectorEntry,
} from "@/lib/company-industry-analysis/view";
import { getCompanyQualityRow } from "@/lib/company-quality/get";
import { getIndustryPeersBoard, type IndustryPeersBoard } from "@/lib/industry-peers-board";
import { parseCompanyQualityPayload } from "@/lib/company-quality/types";
import {
  CAPITAL_CYCLE_RAIL_LABELS,
  formatCompactLabel,
  getCapitalCycleDisplay,
  getImpactDirectionDisplay,
  getMarginQualityTone,
  getTimeHorizonDisplay,
  marginQualityPillClass,
  toDisplayLabel,
} from "../[code]/display-tokens";
import { chipClass, type ChipTone } from "./chip-tone";
import { formatShortDate } from "../[code]/page-helpers";
import { SectionCard, SectionUpdatedAt } from "./section-card";
import { MissingSectionState } from "./missing-section-state";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";

// Industry Context (redesign 2026-10-01). Five blocks, each one glance:
//   1. Industry at a glance (the analysis's own industry sentence) beside
//      Where <CODE> sits — margin band, lead-market cycle, forces tally.
//   2. Where the money is made — every value-chain layer on a Thin / Adequate /
//      Rich margin ladder, the company's layer and own margin marked.
//   3. The markets <CODE> sells into — one row per sub-sector (share, cycle,
//      forces); each row opens its market map.
//   4. Policy shifts on a timeline beside Types of players on the lens the
//      company is named in.
//   5. Covered peers — the company beside every covered company in its
//      sub-sector, on the watchlist's board (lib/industry-peers-board.ts).
// Everything is read off the stored row (plus the company's EBITDA margin from
// company_quality); the only portal-written words are the templated one-liners
// in lib/company-industry-analysis/view.ts.

const displayClass = "[font-family:var(--font-display)] font-bold tracking-[-0.02em]";
const monoClass = "[font-family:var(--font-data)] tabular-nums";
const kickerClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const cardClass = "rounded-[14px] border border-border/60 bg-card";
const accentTextClass = "text-sky-700 dark:text-sky-300";

const eyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const miniChipClass =
  "inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] text-foreground";

const CYCLE_BAR_CLASS: Record<ChipTone, string> = {
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  slate: "bg-muted-foreground",
};

const POLICY_DOT: Record<PolicyTone, string> = {
  helps: "bg-emerald-500",
  mixed: "bg-amber-500",
  hurts: "bg-rose-500",
  unclear: "bg-muted-foreground/60",
};

const POLICY_TEXT: Record<PolicyTone, string> = {
  helps: "text-emerald-700 dark:text-emerald-400",
  mixed: "text-amber-700 dark:text-amber-400",
  hurts: "text-rose-700 dark:text-rose-400",
  unclear: "text-muted-foreground",
};

const POLICY_LEGEND: Record<PolicyTone, string> = {
  helps: "Helps",
  mixed: "Mixed",
  hurts: "Hurts",
  unclear: "Unclear",
};

const STRUCTURE_LABEL: Record<string, string> = {
  linear: "Linear chain",
  two_sided: "Two-sided market",
  multi_sided: "Multi-sided platform",
  hub_and_spoke: "Hub & spoke",
  networked: "Networked",
  vertically_integrated: "Vertically integrated",
  fragmented: "Fragmented",
  consolidated: "Consolidated",
};

const structureLabel = (value: string | null): string | null => {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return STRUCTURE_LABEL[key] ?? toDisplayLabel(value) ?? formatCompactLabel(value);
};

// "Mid · tightening" — the rail word plus the supply direction, for tight cells.
const cycleShort = (capitalCycle: NormalizedIndustryCapitalCycle | null) => {
  const cycle = getCapitalCycleDisplay(capitalCycle?.stage ?? null, capitalCycle?.direction ?? null);
  if (!cycle) return null;
  const stageWord =
    cycle.positionIndex != null ? CAPITAL_CYCLE_RAIL_LABELS[cycle.positionIndex] : cycle.stageLabel;
  const direction = cycle.directionLabel?.replace(/^Supply\s+/i, "").toLowerCase() ?? null;
  // "Mixed signals · signals conflict" says it twice — the stage word is enough.
  return { cycle, stageWord, direction: cycle.uncertain && direction === "signals conflict" ? null : direction };
};

// ---- Right-hand drawer ------------------------------------------------------
function renderDrawer(
  trigger: React.ReactElement,
  { title, description, children }: { title: string; description?: string; children: React.ReactNode },
) {
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="w-full max-w-2xl">
        <DrawerHeader className="border-b border-border text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <div className="overflow-y-auto p-4">{children}</div>
        <DrawerFooter className="border-t border-border">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function drawerRowTrigger(label: string) {
  return (
    <button
      type="button"
      className="mt-4 flex w-full items-center justify-between gap-3 rounded-[10px] border border-border/60 bg-background/40 px-4 py-3 text-left text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <span>{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function drawerLinkTrigger(label: string) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-0.5 rounded text-left text-[12px] font-semibold transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        accentTextClass,
      )}
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

// ---- Capital-cycle read (drawer) --------------------------------------------
function renderCapitalCycle(capitalCycle: NormalizedIndustryCapitalCycle | null) {
  const cycle = getCapitalCycleDisplay(capitalCycle?.stage ?? null, capitalCycle?.direction ?? null);
  if (!cycle) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cn(eyebrowClass, "text-[9px]")}>Capital cycle</span>
      <span
        className={cn(
          chipClass(cycle.stageTone),
          "px-2 py-0.5 text-[10px]",
          cycle.uncertain && "border-dashed bg-transparent text-muted-foreground",
        )}
      >
        {cycle.stageLabel}
      </span>
      {cycle.positionIndex != null ? (
        <div className="flex items-center gap-1" aria-hidden>
          {CAPITAL_CYCLE_RAIL_LABELS.map((label, index) => (
            <span
              key={label}
              className={cn(
                "h-1.5 w-4 rounded-full",
                index === cycle.positionIndex ? CYCLE_BAR_CLASS[cycle.stageTone] : "bg-muted-foreground/25",
              )}
            />
          ))}
        </div>
      ) : null}
      {cycle.directionLabel ? (
        <span className="text-[10px] text-muted-foreground">{cycle.directionLabel}</span>
      ) : null}
    </div>
  );
}

// ---- Tailwinds / headwinds --------------------------------------------------
function renderThemeGroup(
  label: string,
  items: NormalizedIndustryTheme[],
  tone: "tailwind" | "headwind",
) {
  const toneClass =
    tone === "tailwind"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  const Icon = tone === "tailwind" ? TrendingUp : TrendingDown;
  return (
    <div className="min-w-0">
      <div className={cn("mb-1.5 flex items-center gap-1 text-[10px] font-semibold", toneClass)}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      {items.length === 0 ? (
        <p className="text-[10.5px] text-muted-foreground/70">None tracked.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const horizon = getTimeHorizonDisplay(item.timeHorizon);
            return (
              <li key={`${label}-${item.theme}-${index}`} className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[11.5px] leading-snug text-foreground/90">{item.theme}</span>
                  {horizon ? (
                    <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px]", horizon.className)}>
                      {horizon.label}
                    </span>
                  ) : null}
                </div>
                {item.companyMechanism ? (
                  <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{item.companyMechanism}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---- Market map + supply-side detail (sub-sector drawer body) ---------------
function renderSubSectorDetail(entry: SubSectorEntry) {
  const snapshot = entry.marketShareSnapshot;
  const players = snapshot?.players ?? [];
  const ranked = players
    .map((player, playerIndex) => ({ ...player, playerIndex, parsedShare: parseMarketShareValue(player.shareValue) }))
    .sort((left, right) => {
      if (left.parsedShare != null && right.parsedShare != null) return right.parsedShare - left.parsedShare;
      if (left.parsedShare != null) return -1;
      if (right.parsedShare != null) return 1;
      return left.playerIndex - right.playerIndex;
    });
  const maxShare = ranked.reduce((max, player) => Math.max(max, player.parsedShare ?? 0), 0);
  const evidence = entry.supplySideEvidencePack;

  return (
    <div className="space-y-4">
      {snapshot ? (
        <div className={cn(nestedDetailClass, "space-y-2.5 p-3.5")}>
          <p className={eyebrowClass}>Market share snapshot</p>
          {snapshot.shareBasis || snapshot.dataVintage ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {snapshot.shareBasis ? <span className={miniChipClass}>{snapshot.shareBasis}</span> : null}
              {snapshot.dataVintage ? (
                <span className={cn(miniChipClass, "bg-muted/55 text-muted-foreground")}>{snapshot.dataVintage}</span>
              ) : null}
            </div>
          ) : null}
          {ranked.length > 0 ? (
            <div className="space-y-2">
              {ranked.map((player) => {
                const shareLabel = formatMarketShareValue(player.shareValue);
                const ratio =
                  player.parsedShare != null && maxShare > 0
                    ? Math.max(0, (player.parsedShare / maxShare) * 100)
                    : null;
                return (
                  <div key={`${player.playerName}-${player.playerIndex}`} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <p className="truncate text-[12px] font-semibold leading-snug text-foreground">
                          {player.playerName}
                        </p>
                        {player.playerStatus ? (
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            {toDisplayLabel(player.playerStatus)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-baseline gap-1.5">
                        {player.shareIsEstimated ? (
                          <span className="text-[10px] text-muted-foreground" title="Estimated by our analysis">
                            est.
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "text-[11px] font-semibold tabular-nums",
                            player.shareIsEstimated ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {shareLabel ?? "—"}
                        </span>
                      </div>
                    </div>
                    {ratio != null ? (
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className={cn("h-full rounded-full", player.shareIsEstimated ? "bg-sky-500/40" : "bg-sky-500/75")}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {entry.capitalCycle?.supplySideRead ? (
        <div className={cn(nestedDetailClass, "space-y-1 p-3.5")}>
          <p className={eyebrowClass}>Supply-side read</p>
          <p className="text-[12px] leading-relaxed text-foreground/90">{entry.capitalCycle.supplySideRead}</p>
        </div>
      ) : null}

      {evidence?.interpretation ? (
        <div className={cn(nestedDetailClass, "space-y-1 p-3.5")}>
          <p className={eyebrowClass}>Evidence pack read</p>
          <p className="text-[12px] leading-relaxed text-foreground/90">{evidence.interpretation}</p>
          {evidence.rows.length > 0 ? (
            <ul className="mt-1.5 space-y-1.5">
              {evidence.rows.map((row, idx) => (
                <li key={`${row.category ?? "row"}-${idx}`} className="text-[11px] leading-snug text-muted-foreground">
                  {row.category ? <span className="font-semibold text-foreground/90">{row.category}: </span> : null}
                  {row.summary}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Everything one market row holds: context, cycle, forces, then the market map.
function renderMarketDrawer(entry: SubSectorEntry) {
  const hasThemes = entry.tailwinds.length > 0 || entry.headwinds.length > 0;
  return (
    <div className="space-y-4">
      {entry.description || entry.relevanceRationale ? (
        <div className="space-y-1.5">
          {entry.description ? (
            <p className="text-[12.5px] leading-relaxed text-foreground/90">{entry.description}</p>
          ) : null}
          {entry.relevanceRationale ? (
            <p className="text-[12px] leading-relaxed text-muted-foreground">{entry.relevanceRationale}</p>
          ) : null}
        </div>
      ) : null}
      {renderCapitalCycle(entry.capitalCycle)}
      {hasThemes ? (
        <div className={cn(nestedDetailClass, "grid gap-4 p-3.5 sm:grid-cols-2")}>
          {renderThemeGroup("Tailwinds", entry.tailwinds, "tailwind")}
          {renderThemeGroup("Headwinds", entry.headwinds, "headwind")}
        </div>
      ) : null}
      {renderSubSectorDetail(entry)}
    </div>
  );
}

// ---- Value-chain: full detail (inside the drawer) --------------------------
function renderValueChainDetail(
  valueChainMap: NormalizedIndustryValueChainMap,
  companyName: string | null,
  companyCode: string,
) {
  return (
    <div className="space-y-3">
      {valueChainMap.structureType || valueChainMap.chainTypeRationale || valueChainMap.synthesis ? (
        <p className="text-[12.5px] leading-relaxed text-foreground/85">
          {valueChainMap.structureType ? (
            <span className="mr-1.5 font-semibold uppercase tracking-[0.12em] text-foreground">
              {structureLabel(valueChainMap.structureType)}
            </span>
          ) : null}
          {valueChainMap.structureType && (valueChainMap.chainTypeRationale ?? valueChainMap.synthesis) ? (
            <span className="mr-1.5 text-muted-foreground">—</span>
          ) : null}
          {valueChainMap.chainTypeRationale ?? valueChainMap.synthesis}
        </p>
      ) : null}

      {valueChainMap.layers.length > 0 ? (
        <div className="space-y-2.5">
          {valueChainMap.layers.map((layer, index) => (
            <div key={`${layer.layerName}-detail-${index}`} className={cn(nestedDetailClass, "px-3.5 py-3")}>
              <div className="flex items-start gap-2">
                <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-muted/70 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-foreground">
                  {index + 1}
                </span>
                <p className="text-[12px] font-semibold leading-snug text-foreground">{layer.layerName}</p>
              </div>

              {(layer.revenueModel ?? layer.layerDescription) ? (
                <div className="mt-2.5 border-t border-border/40 pt-2.5">
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Revenue model
                  </p>
                  <p className="text-[11px] leading-relaxed text-foreground/90">
                    {layer.revenueModel ?? layer.layerDescription}
                  </p>
                </div>
              ) : null}

              {layer.marginReturnProfile &&
              (layer.marginReturnProfile.rangeOrLabel ||
                layer.marginReturnProfile.sourcingRationale ||
                layer.marginReturnProfile.dispersionNote) ? (
                <div className="mt-2.5 space-y-1 border-t border-border/40 pt-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Margin</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {layer.marginReturnProfile.rangeOrLabel ? (
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                          marginQualityPillClass[getMarginQualityTone(layer.marginReturnProfile.rangeOrLabel)],
                        )}
                      >
                        {layer.marginReturnProfile.rangeOrLabel}
                      </span>
                    ) : null}
                    {layer.marginReturnProfile.basis ? (
                      <span className="rounded-full border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                        {layer.marginReturnProfile.basis}
                      </span>
                    ) : null}
                  </div>
                  {layer.marginReturnProfile.sourcingRationale ? (
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      {layer.marginReturnProfile.sourcingRationale}
                    </p>
                  ) : null}
                  {layer.marginReturnProfile.dispersionNote ? (
                    <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                      {layer.marginReturnProfile.dispersionNote}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {layer.topParticipants.length > 0 ? (
                <div className="mt-2.5 space-y-1 border-t border-border/40 pt-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Top participants
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {layer.topParticipants.map((participant, pIdx) => (
                      <span
                        key={`${participant.name}-${pIdx}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/70 px-1.5 py-0.5 text-[10px] text-foreground"
                      >
                        <span className="font-medium">{participant.name}</span>
                        {participant.listedStatus ? (
                          <span className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                            {formatCompactLabel(participant.listedStatus)}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {layer.connectionToCompany ? (
                <div className="mt-2.5 space-y-1 border-t border-border/40 pt-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {(companyName ?? companyCode).trim()}&apos;s role
                  </p>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{layer.connectionToCompany}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {valueChainMap.pinchPoints.length > 0 ? (
        <div className="space-y-1.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 dark:border-amber-400/25 dark:bg-amber-400/5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
            Pinch points
          </p>
          <ul className="space-y-1.5">
            {valueChainMap.pinchPoints.map((pinch, idx) => (
              <li key={`${pinch.name}-${idx}`} className="space-y-0.5">
                <p className="text-[11px] font-semibold leading-snug text-foreground">{pinch.name}</p>
                {pinch.mechanism ? (
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{pinch.mechanism}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ---- Types of players (drawer body) ----------------------------------------
function renderTypesOfPlayers(dimensions: NormalizedIndustryPlayerTypeDimension[]) {
  const playerCategoryAccentClass =
    "bg-gradient-to-r from-transparent via-sky-500/70 to-transparent dark:via-sky-400/55";

  return (
    <div className="space-y-2.5">
      {dimensions.map((dimension) => (
        <div key={dimension.dimensionName} className={cn(elevatedBlockClass, "space-y-3 p-3.5")}>
          <p className="text-[12px] font-semibold leading-snug text-foreground">
            {`By ${dimension.dimensionName.toLowerCase()}`}
          </p>
          {dimension.dimensionExplanation ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">{dimension.dimensionExplanation}</p>
          ) : null}
          {dimension.categories.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {dimension.categories.map((category) => (
                <div
                  key={`${dimension.dimensionName}-${category.categoryName}`}
                  className={cn(nestedDetailClass, "relative overflow-hidden px-3 py-3 pt-4")}
                >
                  <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1.5", playerCategoryAccentClass)} />
                  <div className="relative space-y-2">
                    <p className="text-[11px] font-semibold leading-snug text-foreground">{category.categoryName}</p>
                    {category.categoryDescription ? (
                      <p className="text-[10px] leading-relaxed text-muted-foreground">{category.categoryDescription}</p>
                    ) : null}
                    {category.playerExamples.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Player examples
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {category.playerExamples.map((example) => (
                            <span key={`${category.categoryName}-${example}`} className={miniChipClass}>
                              {example}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ---- Regulatory changes (drawer body) --------------------------------------
function renderRegulatoryChanges(items: NormalizedIndustryRegulatoryChange[]) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const impact = getImpactDirectionDisplay(item.impactDirection);
        return (
          <div key={`${item.change}-${idx}`} className={cn(nestedDetailClass, "space-y-2 px-3.5 py-3")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 text-[12px] font-semibold leading-snug text-foreground">{item.change}</p>
              <div className="flex shrink-0 items-center gap-2">
                {item.period ? (
                  <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] text-foreground">
                    {item.period}
                  </span>
                ) : null}
                {impact ? (
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", impact.className)}>
                    {impact.label}
                  </span>
                ) : null}
              </div>
            </div>
            {item.whatChanged ? (
              <p className="text-[11px] leading-relaxed text-foreground/90">{item.whatChanged}</p>
            ) : null}
            {(item.industrySubSectorImpact ?? item.companyImpactMechanism) ? (
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Why it matters
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {item.industrySubSectorImpact ?? item.companyImpactMechanism}
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ---- Legacy top-level tailwinds/headwinds (no sub-sector entries) -----------
function renderLegacyThemes(analysis: NormalizedCompanyIndustryAnalysis) {
  if (analysis.tailwinds.length === 0 && analysis.headwinds.length === 0) return null;
  return (
    <div className={cn(cardClass, "space-y-3 p-5 sm:p-6")}>
      <p className={kickerClass}>Tailwinds &amp; headwinds</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderThemeGroup("Tailwinds", analysis.tailwinds, "tailwind")}
        {renderThemeGroup("Headwinds", analysis.headwinds, "headwind")}
      </div>
    </div>
  );
}

// ---- 1a. Industry at a glance ------------------------------------------------
function renderGlance(analysis: NormalizedCompanyIndustryAnalysis, subSectorCount: number) {
  const structure = structureLabel(analysis.valueChainMap?.structureType ?? null);
  const layerCount = analysis.valueChainMap?.layers.length ?? 0;
  const statement =
    analysis.industryPositioning?.customerNeed ??
    analysis.valueChainMap?.chainTypeRationale ??
    analysis.valueChainMap?.synthesis ??
    null;
  const long = (statement?.split(/\s+/).length ?? 0) > 40;
  const name = analysis.subSector ?? analysis.sector;
  const structureChip = [structure, layerCount > 0 ? `${layerCount} ${layerCount === 1 ? "layer" : "layers"}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col rounded-[14px] border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.10] via-sky-500/[0.04] to-transparent p-5 sm:p-6">
      <p className={cn(kickerClass, accentTextClass)}>Industry at a glance</p>
      <p
        className={cn(
          displayClass,
          "mt-3 text-foreground",
          long
            ? "text-[16px] leading-[1.35] sm:text-[18px]"
            : "text-[18px] leading-[1.28] sm:text-[21px] lg:text-[23px]",
        )}
      >
        {statement ?? name ?? "Industry structure"}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {name ? (
          <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11.5px] font-medium text-foreground">
            {name}
          </span>
        ) : null}
        {structureChip ? (
          <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-[11.5px] text-muted-foreground">
            {structureChip}
          </span>
        ) : null}
        {subSectorCount > 0 ? (
          <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-[11.5px] text-muted-foreground">
            {subSectorCount} {subSectorCount === 1 ? "sub-sector" : "sub-sectors"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ---- 1b. Where <CODE> sits ---------------------------------------------------
type WhereItSits = {
  layerRead: LayerMarginRead | null;
  companyMargin: CompanyMargin | null;
  leadEntry: SubSectorEntry | null;
  tailwinds: number;
  headwinds: number;
};

function sitsRow(label: string, visual: React.ReactNode, value: React.ReactNode) {
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[64px_minmax(0,1fr)_auto]">
      <p className="text-[13px] font-semibold text-foreground">{label}</p>
      <div className="min-w-0">{visual}</div>
      <div className="min-w-[64px] text-right">{value}</div>
    </div>
  );
}

function railLabels(labels: readonly string[], activeIndex: number | null) {
  return (
    <div className="mt-1.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
      {labels.map((label, index) => (
        <span
          key={label}
          className={cn(
            monoClass,
            "truncate text-[9.5px]",
            index === activeIndex ? accentTextClass : "text-muted-foreground/80",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function renderWhereItSits(data: WhereItSits, companyCode: string) {
  const { layerRead, companyMargin, leadEntry, tailwinds, headwinds } = data;
  const lead = cycleShort(leadEntry?.capitalCycle ?? null);
  const forces = tailwinds + headwinds;
  const line = whereItSitsLine({
    layerRead,
    companyMargin: companyMargin?.pct ?? null,
    cycleStage: leadEntry?.capitalCycle?.stage ?? null,
    tailwinds,
    headwinds,
  });

  const marginPosition = companyMargin ? marginBandPosition(companyMargin.pct) : null;
  const marginActive = marginPosition != null ? Math.min(2, Math.floor(marginPosition)) : layerRead?.tier ?? null;

  const rows: React.ReactNode[] = [];

  if (layerRead || companyMargin) {
    rows.push(
      <React.Fragment key="margin">
        {sitsRow(
          "Margin",
          <div>
            <div className="relative h-2">
              <div className="absolute inset-0 grid grid-cols-3 gap-0.5" aria-hidden>
                <span className="rounded-l-full bg-muted" />
                <span className="bg-muted" />
                <span className="rounded-r-full bg-muted" />
              </div>
              {layerRead ? (
                <span
                  className="absolute inset-y-0 rounded-full bg-sky-500/35"
                  style={{ left: `${(layerRead.lo / 3) * 100}%`, width: `${((layerRead.hi - layerRead.lo) / 3) * 100}%` }}
                  aria-hidden
                />
              ) : null}
              {marginPosition != null ? (
                <span
                  className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500 shadow-[0_0_0_2px_hsl(var(--card))]"
                  style={{ left: `${Math.min(99, (marginPosition / 3) * 100)}%` }}
                  aria-hidden
                />
              ) : null}
            </div>
            {railLabels(MARGIN_TIER_LABELS, marginActive)}
          </div>,
          <>
            <p className={cn(monoClass, "text-[16px] font-semibold leading-none", accentTextClass)}>
              {companyMargin ? `${Math.round(companyMargin.pct)}%` : marginReadShort(layerRead!)}
            </p>
            <p className={cn(monoClass, "mt-1 text-[10px] text-muted-foreground")}>
              {!companyMargin ? "its layer" : layerRead ? `layer ${marginReadShort(layerRead)}` : `EBITDA · ${companyMargin.label}`}
            </p>
          </>,
        )}
      </React.Fragment>,
    );
  }

  if (lead) {
    rows.push(
      <React.Fragment key="cycle">
        {sitsRow(
          "Cycle",
          <div title={leadEntry?.subSector}>
            <div className="grid grid-cols-4 gap-1" aria-hidden>
              {CAPITAL_CYCLE_RAIL_LABELS.map((label, index) => (
                <span
                  key={label}
                  className={cn(
                    "h-1.5 rounded-full",
                    index === lead.cycle.positionIndex ? "bg-sky-500" : "bg-muted",
                  )}
                />
              ))}
            </div>
            {railLabels(CAPITAL_CYCLE_RAIL_LABELS, lead.cycle.positionIndex)}
          </div>,
          <>
            <p className="text-[14px] font-semibold leading-none text-foreground">{lead.stageWord}</p>
            {lead.direction ? (
              <p className={cn(monoClass, "mt-1 text-[10px] text-muted-foreground")}>{lead.direction}</p>
            ) : null}
          </>,
        )}
      </React.Fragment>,
    );
  }

  if (forces > 0) {
    rows.push(
      <React.Fragment key="forces">
        {sitsRow(
          "Forces",
          <div className="flex h-2 gap-0.5" aria-hidden>
            {tailwinds > 0 ? (
              <span className="rounded-l-full bg-emerald-500" style={{ flexGrow: tailwinds }} />
            ) : null}
            {headwinds > 0 ? (
              <span className="rounded-r-full bg-rose-500" style={{ flexGrow: headwinds }} />
            ) : null}
          </div>,
          <p className={cn(monoClass, "text-[13px] font-semibold leading-none")}>
            <span className="text-emerald-700 dark:text-emerald-400">{tailwinds}▲</span>{" "}
            <span className="text-rose-700 dark:text-rose-400">{headwinds}▼</span>
          </p>,
        )}
      </React.Fragment>,
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className={cn(cardClass, "flex flex-col p-5 sm:p-6")}>
      <p className={kickerClass}>Where {companyCode} sits</p>
      <div className="mt-5 space-y-5">{rows}</div>
      {line ? (
        <div className="mt-auto pt-5">
          <p className="border-t border-border/50 pt-4 text-[13px] leading-relaxed text-foreground/85">{line}</p>
        </div>
      ) : null}
    </div>
  );
}

// ---- 2. Where the money is made ----------------------------------------------
type LadderLayer = {
  name: string;
  label: string | null;
  read: LayerMarginRead | null;
  isCompany: boolean;
};

// Band-scale (0..3) → percent along the plot (from the bottom, or from the left on the phone rows).
const bandPct = (position: number) => `${(position / 3) * 100}%`;

// A smooth dashed path through the rated boxes' centres (viewBox 0..100 both
// axes, stretched to the plot): horizontal tangents at each point.
function ladderPath(layers: LadderLayer[]): string | null {
  const points = layers.flatMap((layer, index) =>
    layer.read
      ? [{ x: ((index + 0.5) / layers.length) * 100, y: 100 - (((layer.read.lo + layer.read.hi) / 2) / 3) * 100 }]
      : [],
  );
  if (points.length < 2) return null;
  return points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const prev = points[index - 1];
      const midX = (prev.x + point.x) / 2;
      return `C ${midX} ${prev.y} ${midX} ${point.y} ${point.x} ${point.y}`;
    })
    .join(" ");
}

function renderMarginLadder(layers: LadderLayer[], companyCode: string, companyMargin: CompanyMargin | null) {
  const columns = { gridTemplateColumns: `repeat(${layers.length}, minmax(0, 1fr))` };
  const path = ladderPath(layers);
  const markerPosition = companyMargin ? marginBandPosition(companyMargin.pct) : null;
  // The company's one (consolidated) margin marks its first layer only.
  const markerLayer = layers.findIndex((layer) => layer.isCompany);
  const companyTag = (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold", accentTextClass)}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
      {companyCode} operates here
    </span>
  );

  return (
    <>
      {/* sm+: columns on a Thin / Adequate / Rich ladder */}
      <div className="mt-5 hidden gap-3 sm:flex">
        <div className="relative h-[200px] w-[58px] shrink-0" aria-hidden>
          {MARGIN_TIER_LABELS.map((label, index) => (
            <span
              key={label}
              className={cn(monoClass, "absolute right-0 translate-y-1/2 text-[10px] text-muted-foreground")}
              style={{ bottom: bandPct(index + 0.5) }}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-[200px] border-b border-border/70">
            <div className="absolute inset-0 grid grid-rows-3" aria-hidden>
              <span className="border-t border-dashed border-border/50" />
              <span className="border-t border-dashed border-border/50" />
              <span className="border-t border-dashed border-border/50" />
            </div>
            <div className="absolute inset-0 grid gap-2" style={columns}>
              {layers.map((layer, index) => (
                <div
                  key={`${layer.name}-plot-${index}`}
                  className={cn("relative rounded-lg", layer.isCompany && "bg-sky-500/[0.07] ring-1 ring-inset ring-sky-500/20")}
                >
                  {layer.read ? (
                    <span
                      className={cn(
                        "absolute inset-x-[14%] rounded-md",
                        layer.isCompany
                          ? "border border-sky-400/60 bg-sky-500/60 dark:bg-sky-600/55"
                          : "bg-muted-foreground/20 dark:bg-muted-foreground/30",
                      )}
                      style={{ bottom: bandPct(layer.read.lo), height: `${((layer.read.hi - layer.read.lo) / 3) * 100}%` }}
                      title={layer.label ?? undefined}
                    />
                  ) : (
                    <span
                      className={cn(monoClass, "absolute inset-x-0 bottom-1.5 text-center text-[9.5px] text-muted-foreground/70")}
                    >
                      not banded
                    </span>
                  )}
                </div>
              ))}
            </div>
            {path ? (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full text-muted-foreground/70"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.25}
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            ) : null}
            <div className="pointer-events-none absolute inset-0 grid gap-2" style={columns} aria-hidden>
              {layers.map((layer, index) => (
                <div key={`${layer.name}-marker-${index}`} className="relative">
                  {index === markerLayer && markerPosition != null ? (
                    <>
                      <span
                        className={cn(monoClass, "absolute inset-x-0 text-center text-[10.5px] font-semibold", accentTextClass)}
                        style={
                          markerPosition < 2.55
                            ? { bottom: `calc(${bandPct(markerPosition)} + 14px)` }
                            : { top: `calc(${bandPct(3 - markerPosition)} + 14px)` }
                        }
                      >
                        {companyCode} {Math.round(companyMargin!.pct)}%
                      </span>
                      <span
                        className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-sky-300 bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.2)]"
                        style={{ bottom: bandPct(markerPosition) }}
                      />
                    </>
                  ) : layer.isCompany ? (
                    <span
                      className={cn(monoClass, "absolute inset-x-0 top-2 text-center text-[10.5px] font-semibold", accentTextClass)}
                    >
                      {companyCode}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid gap-2" style={columns}>
            {layers.map((layer, index) => (
              <div key={`${layer.name}-label-${index}`} className="min-w-0 px-1">
                <p className="line-clamp-3 text-[12.5px] font-semibold leading-snug text-foreground" title={layer.name}>
                  {shortName(layer.name)}
                </p>
                <p
                  className={cn(monoClass, "mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground")}
                  title={layer.label ?? undefined}
                >
                  {layer.read ? marginReadShort(layer.read) : layer.label ?? "No margin read"}
                </p>
                {layer.isCompany ? <div className="mt-1.5">{companyTag}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* phone: one row per layer on the same three bands */}
      <div className="mt-4 sm:hidden">
        <div className="grid grid-cols-3 px-2.5 pb-1.5" aria-hidden>
          {MARGIN_TIER_LABELS.map((label) => (
            <span key={label} className={cn(monoClass, "text-center text-[9.5px] text-muted-foreground")}>
              {label}
            </span>
          ))}
        </div>
        <div className="space-y-1.5">
          {layers.map((layer, index) => (
            <div
              key={`${layer.name}-row-${index}`}
              className={cn("rounded-lg px-2.5 py-2", layer.isCompany && "bg-sky-500/[0.07] ring-1 ring-inset ring-sky-500/20")}
            >
              <div className="relative h-2.5">
                <div className="absolute inset-0 grid grid-cols-3 gap-0.5" aria-hidden>
                  <span className="rounded-l-sm bg-muted/70" />
                  <span className="bg-muted/70" />
                  <span className="rounded-r-sm bg-muted/70" />
                </div>
                {layer.read ? (
                  <span
                    className={cn(
                      "absolute inset-y-0 rounded-sm",
                      layer.isCompany ? "bg-sky-500/70" : "bg-muted-foreground/40",
                    )}
                    style={{ left: bandPct(layer.read.lo), width: `${((layer.read.hi - layer.read.lo) / 3) * 100}%` }}
                    aria-hidden
                  />
                ) : null}
                {index === markerLayer && markerPosition != null ? (
                  <span
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-300 bg-sky-500"
                    style={{ left: bandPct(Math.min(2.97, markerPosition)) }}
                    aria-hidden
                  />
                ) : null}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-[12.5px] font-semibold leading-snug text-foreground">{shortName(layer.name)}</p>
                <p className={cn(monoClass, "shrink-0 text-[11px] text-muted-foreground")}>
                  {layer.read ? marginReadShort(layer.read) : "not banded"}
                </p>
              </div>
              {layer.isCompany ? (
                <p className={cn(monoClass, "mt-0.5 text-[10.5px] font-semibold", accentTextClass)}>
                  {companyCode} operates here
                  {index === markerLayer && companyMargin ? ` · ${Math.round(companyMargin.pct)}% EBITDA` : ""}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function renderMoneyCard(
  valueChainMap: NormalizedIndustryValueChainMap,
  companyName: string | null,
  companyCode: string,
  companyMargin: CompanyMargin | null,
) {
  const companyLayers = companyLayerIndexes(valueChainMap.layers, companyName, companyCode);
  const layers: LadderLayer[] = valueChainMap.layers.map((layer, index) => {
    const label = layer.marginReturnProfile?.rangeOrLabel ?? null;
    return { name: layer.layerName, label, read: readLayerMargin(label), isCompany: companyLayers.includes(index) };
  });
  const headline = moneyHeadline(layers, companyCode, companyLayers);
  const anyBanded = layers.some((layer) => layer.read);
  const anyNumeric = layers.some((layer) => layer.read?.pct) || (companyMargin != null && companyLayers.length > 0);
  const rationale = valueChainMap.chainTypeRationale ?? valueChainMap.synthesis ?? null;

  return (
    <div className={cn(cardClass, "p-5 sm:p-6")}>
      <p className={kickerClass}>
        Where the money is made
        {layers.length > 0 ? ` · ${layers.length} ${layers.length === 1 ? "layer" : "layers"}` : ""}
      </p>
      {headline ? (
        <h3 className={cn(displayClass, "mt-2 max-w-3xl text-[17px] leading-snug text-foreground sm:text-[20px]")}>
          {headline}
        </h3>
      ) : rationale ? (
        <p className="mt-2 line-clamp-3 max-w-3xl text-[13px] leading-relaxed text-foreground/85" title={rationale}>
          {rationale}
        </p>
      ) : null}

      {layers.length > 0 && anyBanded ? renderMarginLadder(layers, companyCode, companyMargin) : null}

      {anyBanded ? (
        <p className={cn(monoClass, "mt-3 text-[10px] leading-relaxed text-muted-foreground/80")}>
          Margin band per layer, from the analysis
          {anyNumeric
            ? ` · EBITDA figures banded at <${EBITDA_TIER_CUTS[0]}% / ${EBITDA_TIER_CUTS[0]}–${EBITDA_TIER_CUTS[1]}% / ${EBITDA_TIER_CUTS[1]}%+`
            : ""}
        </p>
      ) : null}

      {valueChainMap.pinchPoints.length > 0 ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
          <p className="text-[12px] leading-snug text-foreground/85">
            <span className="font-semibold uppercase tracking-[0.12em] text-[10px] text-amber-700 dark:text-amber-300">
              {valueChainMap.pinchPoints.length === 1 ? "Pinch point" : "Pinch points"}
            </span>
            <span className="text-muted-foreground"> — </span>
            {valueChainMap.pinchPoints.map((pinch) => pinch.name).join(" · ")}
          </p>
        </div>
      ) : null}

      {renderDrawer(drawerRowTrigger("How each layer earns — revenue models & who plays"), {
        title: "Value chain",
        description:
          [structureLabel(valueChainMap.structureType), `${layers.length} ${layers.length === 1 ? "layer" : "layers"}`]
            .filter(Boolean)
            .join(" · ") || undefined,
        children: renderValueChainDetail(valueChainMap, companyName, companyCode),
      })}
    </div>
  );
}

// ---- 3. The markets <CODE> sells into ---------------------------------------
const MARKET_GRID =
  "md:grid-cols-[minmax(0,1.6fr)_112px_minmax(0,1fr)_120px_16px] md:items-center md:gap-x-6";

function forceSquares(tailwinds: number, headwinds: number) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: tailwinds }, (_, index) => (
          <span key={`tw-${index}`} className="h-2.5 w-2.5 rounded-[3px] bg-emerald-500" />
        ))}
        {Array.from({ length: headwinds }, (_, index) => (
          <span key={`hw-${index}`} className="h-2.5 w-2.5 rounded-[3px] bg-rose-500" />
        ))}
      </span>
      <span className={cn(monoClass, "text-[10.5px] text-muted-foreground")}>
        {tailwinds}▲ {headwinds}▼
      </span>
    </span>
  );
}

function renderMarketRow(entry: SubSectorEntry, companyName: string | null, companyCode: string) {
  const share = findCompanyShare(entry.marketShareSnapshot, entry.subSector, companyName, companyCode);
  const lead = cycleShort(entry.capitalCycle);
  const subtitle = entry.relevanceRationale ?? entry.description;
  const cellLabel = cn(kickerClass, "mb-1.5 block text-[9px] md:hidden");

  const trigger = (
    <button
      type="button"
      className="group block w-full px-4 py-4 text-left transition-colors hover:bg-accent/30 focus-visible:bg-accent/30 focus-visible:outline-none sm:px-5"
    >
      <span className={cn("grid grid-cols-3 gap-x-3 gap-y-3.5", MARKET_GRID)}>
        <span className="col-span-3 flex min-w-0 items-start justify-between gap-3 md:col-span-1">
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold leading-snug text-foreground">{entry.subSector}</span>
            {subtitle ? (
              <span className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground" title={subtitle}>
                {subtitle}
              </span>
            ) : null}
          </span>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground md:hidden" />
        </span>

        <span className="min-w-0">
          <span className={cellLabel}>{companyCode} share</span>
          {share ? (
            <span className="flex items-baseline gap-1.5" title={share.shareValue}>
              <span className={cn(monoClass, "text-[17px] font-semibold leading-none", accentTextClass)}>
                {shareHead(share.shareValue)}
              </span>
              {share.estimated ? <span className="text-[10.5px] text-muted-foreground">est.</span> : null}
            </span>
          ) : (
            <span className={cn(monoClass, "text-[15px] leading-none text-muted-foreground/70")} title="Not disclosed">
              —
            </span>
          )}
        </span>

        <span className="min-w-0">
          <span className={cellLabel}>Cycle</span>
          {lead ? (
            <>
              <span className="grid max-w-[180px] grid-cols-4 gap-1" aria-hidden>
                {CAPITAL_CYCLE_RAIL_LABELS.map((label, index) => (
                  <span
                    key={label}
                    className={cn(
                      "h-1 rounded-full",
                      index === lead.cycle.positionIndex
                        ? CYCLE_BAR_CLASS[lead.cycle.stageTone]
                        : lead.cycle.uncertain
                          ? "border border-dashed border-muted-foreground/40"
                          : "bg-muted",
                    )}
                  />
                ))}
              </span>
              <span className={cn(monoClass, "mt-1.5 block text-[10.5px] leading-snug text-muted-foreground")}>
                {lead.stageWord}
                {lead.direction ? ` · ${lead.direction}` : ""}
              </span>
            </>
          ) : (
            <span className={cn(monoClass, "text-[10.5px] text-muted-foreground/70")}>—</span>
          )}
        </span>

        <span className="min-w-0">
          <span className={cellLabel}>Forces</span>
          {entry.tailwinds.length + entry.headwinds.length > 0 ? (
            forceSquares(entry.tailwinds.length, entry.headwinds.length)
          ) : (
            <span className={cn(monoClass, "text-[10.5px] text-muted-foreground/70")}>—</span>
          )}
        </span>

        <ChevronRight className="hidden h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground md:block" />
      </span>
    </button>
  );

  return renderDrawer(trigger, {
    title: entry.subSector,
    description: "Cycle, forces and the market map for this sub-sector.",
    children: renderMarketDrawer(entry),
  });
}

function renderMarkets(entries: SubSectorEntry[], companyName: string | null, companyCode: string) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <p className={kickerClass}>The markets {companyCode} sells into</p>
        <span className={cn(monoClass, "hidden text-[10.5px] text-muted-foreground sm:inline")}>
          tap a row for the market map
        </span>
      </div>
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className={cn("hidden border-b border-border/50 px-5 py-3 md:grid", MARKET_GRID)}>
          <span className={kickerClass}>Sub-sector</span>
          <span className={kickerClass}>{companyCode} share</span>
          <span className={kickerClass}>Capital cycle</span>
          <span className={kickerClass}>Forces</span>
          <span />
        </div>
        <ul className="divide-y divide-border/50">
          {entries.map((entry) => (
            <li key={entry.subSector}>{renderMarketRow(entry, companyName, companyCode)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---- 4a. Policy shifts --------------------------------------------------------
function renderPolicyCard(items: NormalizedIndustryRegulatoryChange[]) {
  const sorted = items
    .map((item, index) => ({ item, index, key: policySortKey(item.period), tone: policyTone(item.impactDirection) }))
    .sort((left, right) => left.key - right.key || left.index - right.index);
  const tally = policyTally(sorted.map((entry) => entry.tone));
  const legend = (["helps", "mixed", "hurts", "unclear"] as const).filter((tone) =>
    sorted.some((entry) => entry.tone === tone),
  );
  const columns = { gridTemplateColumns: `repeat(${sorted.length}, minmax(0, 1fr))` };

  return (
    <div className={cn(cardClass, "flex flex-col p-5 sm:p-6")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className={kickerClass}>Policy shifts · {sorted.length} tracked</p>
        <p className={cn(monoClass, "text-[10.5px]")}>
          {tally.map((entry, index) => (
            <React.Fragment key={entry.tone}>
              {index > 0 ? <span className="text-muted-foreground"> · </span> : null}
              <span className={POLICY_TEXT[entry.tone]}>{entry.text}</span>
            </React.Fragment>
          ))}
        </p>
      </div>

      {/* sm+: a left-to-right timeline */}
      <ol className="relative mt-5 hidden gap-4 sm:grid" style={columns}>
        <span className="absolute inset-x-0 top-[6px] h-px bg-border/70" aria-hidden />
        {sorted.map(({ item, tone }, index) => (
          <li key={`${item.change}-${index}`} className="relative min-w-0">
            <span className={cn("relative block h-3.5 w-3.5 rounded-full ring-4 ring-card", POLICY_DOT[tone])} />
            <p className={cn(monoClass, "mt-3 text-[10.5px] text-muted-foreground")}>{item.period ?? "—"}</p>
            <p className="mt-1 line-clamp-4 text-[12.5px] font-semibold leading-snug text-foreground" title={item.change}>
              {item.change}
            </p>
          </li>
        ))}
      </ol>

      {/* phone: top-to-bottom */}
      <ol className="mt-4 space-y-3.5 sm:hidden">
        {sorted.map(({ item, tone }, index) => (
          <li key={`${item.change}-m-${index}`} className="flex gap-3">
            <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", POLICY_DOT[tone])} aria-hidden />
            <span className="min-w-0">
              <span className={cn(monoClass, "block text-[10.5px] text-muted-foreground")}>{item.period ?? "—"}</span>
              <span className="mt-0.5 block text-[13px] font-semibold leading-snug text-foreground">{item.change}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-5">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
          {legend.map((tone) => (
            <span key={tone} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", POLICY_DOT[tone])} aria-hidden />
              {POLICY_LEGEND[tone]}
            </span>
          ))}
        </div>
        {renderDrawer(drawerLinkTrigger("Why each matters"), {
          title: "Policy shifts",
          description: "Policy shifts touching this industry and why they matter.",
          children: renderRegulatoryChanges(sorted.map((entry) => entry.item)),
        })}
      </div>
    </div>
  );
}

// ---- 4b. Types of players -------------------------------------------------------
const PLAYER_GRID: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2",
};

function renderPlayersCard(
  dimensions: NormalizedIndustryPlayerTypeDimension[],
  companyName: string | null,
  companyCode: string,
) {
  const lens = pickPlayerLens(dimensions, companyName, companyCode);
  if (!lens) return null;
  const dimension = dimensions[lens.index];
  const others = dimensions.filter((_, index) => index !== lens.index);
  const examplesFor = (examples: string[], matched: boolean) => {
    const clean = examples.map(shortName);
    if (!matched) return { own: false, rest: clean.slice(0, 3) };
    const rest = examples
      .filter((example) => !matchesCompany(example, companyName, companyCode))
      .map(shortName)
      .slice(0, 2);
    return { own: true, rest };
  };

  return (
    <div className={cn(cardClass, "flex flex-col p-5 sm:p-6")}>
      <p className={kickerClass}>Types of players · by {dimension.dimensionName.toLowerCase()}</p>
      {dimension.categories.length > 0 ? (
        <div
          className={cn(
            "mt-4 grid gap-3",
            PLAYER_GRID[dimension.categories.length] ?? "sm:grid-cols-2 xl:grid-cols-3",
          )}
        >
          {dimension.categories.map((category, index) => {
            const matched = lens.matched.includes(index);
            const examples = examplesFor(category.playerExamples, matched);
            return (
              <div key={`${category.categoryName}-${index}`} className="flex min-w-0 flex-col">
                <div
                  className={cn(
                    "rounded-[10px] border p-3.5",
                    matched ? "border-sky-500/50 bg-sky-500/[0.08]" : "border-border/60 bg-background/40",
                  )}
                >
                  <p className="text-[13px] font-semibold leading-snug text-foreground">{category.categoryName}</p>
                  {examples.own || examples.rest.length > 0 ? (
                    <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
                      {examples.own ? (
                        <span className={cn("font-semibold", accentTextClass)}>{companyCode}</span>
                      ) : null}
                      {examples.own && examples.rest.length > 0 ? ", " : null}
                      {examples.rest.join(", ")}
                    </p>
                  ) : null}
                </div>
                {category.categoryDescription ? (
                  <p
                    className="mt-2 line-clamp-3 px-0.5 text-[11px] leading-snug text-muted-foreground"
                    title={category.categoryDescription}
                  >
                    {category.categoryDescription}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : dimension.dimensionExplanation ? (
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{dimension.dimensionExplanation}</p>
      ) : null}

      <div className="mt-auto pt-5">
        {renderDrawer(
          drawerLinkTrigger(
            others.length > 0
              ? `Other lenses — ${others
                  .slice(0, 2)
                  .map((other) => `by ${other.dimensionName.toLowerCase()}`)
                  .join(", ")}`
              : "Player detail",
          ),
          {
            title: "Types of players",
            description: "How the market maps into player types.",
            children: renderTypesOfPlayers([dimension, ...others]),
          },
        )}
      </div>
    </div>
  );
}

// ---- 5. Covered peers -----------------------------------------------------------
function renderPeers(peers: IndustryPeersBoard, companyCode: string) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-0.5">
        <p className={kickerClass}>
          Covered peers · {peers.subSector} · {peers.rows.length} companies
        </p>
        {peers.sector ? (
          <Link
            href={`/sector/${slugifySector(peers.sector)}`}
            prefetch={false}
            className={cn(monoClass, "text-[10.5px] text-muted-foreground hover:text-foreground hover:underline")}
          >
            all of {peers.sector} →
          </Link>
        ) : null}
      </div>
      {/* house-tokens: the board reads the house ink / rule vars, and this card
          paints its own ground. */}
      <div className={cn(cardClass, "house-tokens overflow-hidden")}>
        <ScoreBoardTable
          rows={peers.rows}
          overallRankByCode={peers.overallRankByCode}
          layout="signals"
          peersOf={companyCode.toUpperCase()}
        />
      </div>
    </div>
  );
}

type IndustryContextSectionProps = {
  companyCode: string;
  companyName: string | null;
};

export async function IndustryContextSection({ companyCode, companyName }: IndustryContextSectionProps) {
  const [analysis, qualityRow, peers] = await Promise.all([
    getCompanyIndustryAnalysis(companyCode),
    getCompanyQualityRow(companyCode),
    getIndustryPeersBoard(companyCode),
  ]);
  const generatedAtShort = formatShortDate(analysis?.generatedAtRaw);

  if (!analysis) {
    return (
      <SectionCard id="industry-context" title="Industry Context" headerAction={<SectionUpdatedAt date={generatedAtShort} />}>
        <MissingSectionState
          companyCode={companyCode}
          companyName={companyName}
          sectionId="industry-context"
          sectionTitle="Industry Context"
          description="We have not generated company-specific industry context for this company yet."
        />
        {peers ? <div className="mt-5">{renderPeers(peers, companyCode)}</div> : null}
      </SectionCard>
    );
  }

  const subSectorEntries = buildSubSectorEntries(analysis);
  const playerDimensions = analysis.typesOfPlayers?.dimensions ?? [];
  const companyMargin = latestCompanyMargin(parseCompanyQualityPayload(qualityRow?.payload));

  // Where <CODE> sits: the company's layer (first match), the lead market's
  // cycle (first entry carrying one — qualifying order leads with the biggest
  // revenue line), and the forces summed across markets.
  const valueChainLayers = analysis.valueChainMap?.layers ?? [];
  const ownLayer = companyLayerIndexes(valueChainLayers, companyName, companyCode)[0];
  const layerRead =
    ownLayer != null ? readLayerMargin(valueChainLayers[ownLayer].marginReturnProfile?.rangeOrLabel ?? null) : null;
  const forceSource: { tailwinds: unknown[]; headwinds: unknown[] }[] =
    subSectorEntries.length > 0 ? subSectorEntries : [analysis];
  const whereItSits = renderWhereItSits(
    {
      layerRead,
      companyMargin,
      leadEntry: subSectorEntries.find((entry) => cycleShort(entry.capitalCycle)) ?? null,
      tailwinds: forceSource.reduce((sum, entry) => sum + entry.tailwinds.length, 0),
      headwinds: forceSource.reduce((sum, entry) => sum + entry.headwinds.length, 0),
    },
    companyCode,
  );

  const policyCard = analysis.regulatoryChanges.length > 0 ? renderPolicyCard(analysis.regulatoryChanges) : null;
  const playersCard = renderPlayersCard(playerDimensions, companyName, companyCode);

  return (
    <SectionCard
      id="industry-context"
      title="Industry Context"
      feedbackEnabled
      feedbackCompanyCode={companyCode}
      feedbackCompanyName={companyName}
      headerAction={<SectionUpdatedAt date={generatedAtShort} />}
    >
      <div className="space-y-4 sm:space-y-5">
        <div className={cn("grid gap-4", whereItSits && "lg:grid-cols-[1.45fr_1fr]")}>
          {renderGlance(analysis, subSectorEntries.length)}
          {whereItSits}
        </div>

        {analysis.valueChainMap
          ? renderMoneyCard(analysis.valueChainMap, companyName, companyCode, companyMargin)
          : null}

        {subSectorEntries.length > 0
          ? renderMarkets(subSectorEntries, companyName, companyCode)
          : renderLegacyThemes(analysis)}

        {policyCard || playersCard ? (
          <div className={cn("grid gap-4", policyCard && playersCard && "lg:grid-cols-2")}>
            {policyCard}
            {playersCard}
          </div>
        ) : null}

        {peers ? renderPeers(peers, companyCode) : null}

        {analysis.sourceUrls.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className={cn(eyebrowClass, "text-[9px]")}>Sources</span>
            <span className="text-[10.5px] text-muted-foreground">{analysis.sourceUrls.length} referenced</span>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
