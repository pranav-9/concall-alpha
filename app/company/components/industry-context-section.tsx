import React from "react";
import { AlertTriangle, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
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
  NormalizedIndustryMarketShareSnapshot,
  NormalizedIndustryRegulatoryChange,
  NormalizedIndustrySupplySideEvidencePack,
  NormalizedIndustryTheme,
  NormalizedIndustryValueChainMap,
} from "@/lib/company-industry-analysis/types";
import { getCompanyIndustryAnalysis } from "@/lib/company-industry-analysis/get";
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
import { chipBaseClass, chipClass, type ChipTone } from "./chip-tone";
import { formatShortDate } from "../[code]/page-helpers";
import { SectionCard, SectionUpdatedAt } from "./section-card";
import { MissingSectionState } from "./missing-section-state";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";

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
  const key = value.trim().toLowerCase().replace(/\s+/g, "_");
  return STRUCTURE_LABEL[key] ?? toDisplayLabel(value) ?? formatCompactLabel(value);
};

// ---- Company ↔ player name matching (for "where the company sits") ----------
// Deterministic and conservative: attribute a share to the company only when a
// player's name shares its ticker or a distinctive word. Keeps the parenthetical
// owner ("CarWale (CarTrade Tech)"), which is the token we actually match on.
const NAME_STOPWORDS = new Set([
  "ltd",
  "limited",
  "inc",
  "plc",
  "tech",
  "technologies",
  "products",
  "industries",
  "india",
  "the",
  "group",
  "company",
  "co",
  "holdings",
  "corporation",
  "corp",
  "enterprises",
  "global",
]);

const normId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const coreTokens = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !NAME_STOPWORDS.has(token));

const matchesCompany = (
  name: string,
  companyName: string | null,
  companyCode: string,
): boolean => {
  const player = normId(name);
  if (player.length < 3) return false;
  const keys = new Set<string>();
  const code = normId(companyCode);
  if (code.length >= 3) keys.add(code);
  for (const token of coreTokens(companyName ?? "")) keys.add(token);
  for (const key of keys) {
    if (player.includes(key)) return true;
  }
  return false;
};

const isInformativeShare = (value: string | null): value is string =>
  Boolean(value) && !/^(not disclosed|n\/a|n\/d|undisclosed|unknown|—|-)$/i.test(value!.trim());

// The share figure is the headline; keep only the leading number/range for the
// big display (producers sometimes append a vintage or qualifier inline, e.g.
// "10-11% (Jul 2026); estimates 6-13%"). The full string stays on `title`.
const shareHead = (value: string): string => {
  const trimmed = value.trim();
  const num = trimmed.match(/^[~<>≈]?\s*\d[\d.,]*\s*%?(?:\s*[-–—]\s*\d[\d.,]*\s*%?)?/);
  if (num && num[0].trim().length >= 2) return num[0].trim();
  const idx = trimmed.search(/[(;]/);
  return idx > 0 ? trimmed.slice(0, idx).trim() : trimmed;
};

type ShareTile = {
  subSector: string;
  shareValue: string;
  basis: string | null;
  estimated: boolean;
};

const findCompanyShare = (
  snapshot: NormalizedIndustryMarketShareSnapshot | null,
  subSector: string,
  companyName: string | null,
  companyCode: string,
): ShareTile | null => {
  if (!snapshot) return null;
  const me = snapshot.players.find(
    (player) => matchesCompany(player.playerName, companyName, companyCode) && isInformativeShare(player.shareValue),
  );
  if (!me || !me.shareValue) return null;
  return {
    subSector,
    shareValue: me.shareValue,
    basis: snapshot.shareBasis,
    estimated: me.shareIsEstimated,
  };
};

// ---- Market-share bar maths (ported from the retired SubSectorTabs) ----------
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

// ---- Sub-sector entries: merge company_fit context with the depth cards ------
// Replaces buildEntries/SubSectorTabs. Same merge (qualifying order wins, cards
// enrich their match, card-only appended) but also carries tailwinds/headwinds,
// which the tabbed entry type dropped.
type SubSectorEntry = {
  subSector: string;
  description: string | null;
  relevanceRationale: string | null;
  capitalCycle: NormalizedIndustryCapitalCycle | null;
  marketShareSnapshot: NormalizedIndustryMarketShareSnapshot | null;
  supplySideEvidencePack: NormalizedIndustrySupplySideEvidencePack | null;
  tailwinds: NormalizedIndustryTheme[];
  headwinds: NormalizedIndustryTheme[];
};

const buildSubSectorEntries = (analysis: NormalizedCompanyIndustryAnalysis): SubSectorEntry[] => {
  const normalizeKey = (value: string) => value.trim().toLowerCase();
  const order: string[] = [];
  const byKey = new Map<string, SubSectorEntry>();

  for (const item of analysis.companyFit?.qualifyingSubSectors ?? []) {
    const key = normalizeKey(item.subSector);
    if (!key || byKey.has(key)) continue;
    order.push(key);
    byKey.set(key, {
      subSector: item.subSector,
      description: item.description ?? null,
      relevanceRationale: item.relevanceRationale ?? null,
      capitalCycle: null,
      marketShareSnapshot: null,
      supplySideEvidencePack: null,
      tailwinds: [],
      headwinds: [],
    });
  }

  for (const card of analysis.subSectorCards) {
    const key = normalizeKey(card.subSector);
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        description: existing.description ?? card.subSectorDescription ?? null,
        relevanceRationale: existing.relevanceRationale ?? card.relevanceRationale ?? null,
        capitalCycle: card.capitalCycle,
        marketShareSnapshot: card.marketShareSnapshot,
        supplySideEvidencePack: card.supplySideEvidencePack,
        tailwinds: card.tailwinds,
        headwinds: card.headwinds,
      });
    } else {
      order.push(key);
      byKey.set(key, {
        subSector: card.subSector,
        description: card.subSectorDescription ?? null,
        relevanceRationale: card.relevanceRationale ?? null,
        capitalCycle: card.capitalCycle,
        marketShareSnapshot: card.marketShareSnapshot,
        supplySideEvidencePack: card.supplySideEvidencePack,
        tailwinds: card.tailwinds,
        headwinds: card.headwinds,
      });
    }
  }

  return order
    .map((key) => byKey.get(key))
    .filter((entry): entry is SubSectorEntry => Boolean(entry));
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

// ---- Capital-cycle read -----------------------------------------------------
function renderCapitalCycle(capitalCycle: NormalizedIndustryCapitalCycle | null) {
  const cycle = getCapitalCycleDisplay(capitalCycle?.stage ?? null, capitalCycle?.direction ?? null);
  const supplyRead = capitalCycle?.supplySideRead ?? null;
  if (!cycle && !supplyRead) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn(eyebrowClass, "text-[9px]")}>Capital cycle</span>
        {cycle ? (
          <span
            className={cn(
              chipClass(cycle.stageTone),
              "px-2 py-0.5 text-[10px]",
              cycle.uncertain && "border-dashed bg-transparent text-muted-foreground",
            )}
          >
            {cycle.stageLabel}
          </span>
        ) : null}
        {cycle && cycle.positionIndex != null ? (
          <div className="flex items-center gap-1" aria-hidden>
            {CAPITAL_CYCLE_RAIL_LABELS.map((label, index) => (
              <span
                key={label}
                className={cn(
                  "h-1.5 w-4 rounded-full",
                  index === cycle.positionIndex
                    ? CYCLE_BAR_CLASS[cycle.stageTone]
                    : "bg-muted-foreground/25",
                )}
              />
            ))}
          </div>
        ) : null}
        {cycle?.directionLabel ? (
          <span className="text-[10px] text-muted-foreground">{cycle.directionLabel}</span>
        ) : null}
      </div>
      {supplyRead ? (
        <p className="text-[10.5px] leading-snug text-muted-foreground line-clamp-2">{supplyRead}</p>
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
        <ul className="space-y-1.5">
          {items.map((item, index) => {
            const horizon = getTimeHorizonDisplay(item.timeHorizon);
            return (
              <li key={`${label}-${item.theme}-${index}`} className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[11px] leading-snug text-foreground/90">{item.theme}</span>
                  {horizon ? (
                    <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px]", horizon.className)}>
                      {horizon.label}
                    </span>
                  ) : null}
                </div>
                {item.companyMechanism ? (
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground line-clamp-2">
                    {item.companyMechanism}
                  </p>
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

function renderSubSectorCard(entry: SubSectorEntry, companyName: string | null, companyCode: string) {
  const share = findCompanyShare(entry.marketShareSnapshot, entry.subSector, companyName, companyCode);
  const context = entry.relevanceRationale ?? entry.description;
  const hasThemes = entry.tailwinds.length > 0 || entry.headwinds.length > 0;
  const hasDetail =
    (entry.marketShareSnapshot?.players.length ?? 0) > 0 || Boolean(entry.supplySideEvidencePack?.interpretation);

  return (
    <div className={cn(elevatedBlockClass, "flex flex-col gap-3 p-4")}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 text-[13px] font-bold leading-snug text-foreground">{entry.subSector}</h4>
        {share ? (
          <span
            className={cn(chipClass("sky"), "max-w-[10rem] shrink-0 truncate px-2 py-0.5 text-[10px]")}
            title={`${companyCode} ${share.shareValue}`}
          >
            {companyCode} {shareHead(share.shareValue)}
          </span>
        ) : null}
      </div>
      {context ? (
        <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">{context}</p>
      ) : null}

      {renderCapitalCycle(entry.capitalCycle)}

      {hasThemes ? (
        <>
          <div className="border-t border-border/50" />
          <div className="grid grid-cols-2 gap-3">
            {renderThemeGroup("Tailwinds", entry.tailwinds, "tailwind")}
            {renderThemeGroup("Headwinds", entry.headwinds, "headwind")}
          </div>
        </>
      ) : null}

      {hasDetail
        ? renderDrawer(
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-left text-[11px] font-semibold text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <span>Market map &amp; supply-side</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>,
            {
              title: entry.subSector,
              description: "Market-share picture and supply-side read for this sub-sector.",
              children: renderSubSectorDetail(entry),
            },
          )
        : null}
    </div>
  );
}

// ---- Value-chain: summary rail (always on) ---------------------------------
function renderValueChainRail(
  valueChainMap: NormalizedIndustryValueChainMap,
  companyName: string | null,
  companyCode: string,
) {
  const { layers, pinchPoints } = valueChainMap;
  const rationale = valueChainMap.chainTypeRationale ?? valueChainMap.synthesis ?? null;

  return (
    <div className={cn(elevatedBlockClass, "space-y-3 p-4")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={eyebrowClass}>How the industry makes money</p>
        <span className="shrink-0 text-[10px] text-muted-foreground">margin = EBITDA unless noted</span>
      </div>
      {rationale ? (
        <p className="text-[11.5px] leading-relaxed text-muted-foreground line-clamp-2">{rationale}</p>
      ) : null}

      {layers.length > 0 ? (
        <div className="grid gap-2 lg:flex lg:items-stretch lg:gap-1.5">
          {layers.map((layer, index) => {
            const marginLabel = layer.marginReturnProfile?.rangeOrLabel ?? null;
            const belongs =
              Boolean(layer.connectionToCompany) ||
              layer.topParticipants.some((participant) => matchesCompany(participant.name, companyName, companyCode));
            return (
              <React.Fragment key={`${layer.layerName}-${index}`}>
                <div className={cn(nestedDetailClass, "flex flex-col p-3 lg:flex-1 lg:min-w-0")}>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex shrink-0 items-center rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <p className="text-[12px] font-semibold leading-snug text-foreground">{layer.layerName}</p>
                  </div>
                  {marginLabel ? (
                    <div className="mt-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
                          marginQualityPillClass[getMarginQualityTone(marginLabel)],
                        )}
                      >
                        {marginLabel}
                      </span>
                    </div>
                  ) : null}
                  {layer.topParticipants.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {layer.topParticipants.slice(0, 2).map((participant, pIdx) => (
                        <span key={`${participant.name}-${pIdx}`} className={miniChipClass}>
                          {participant.name.replace(/\s*\(.*$/, "")}
                        </span>
                      ))}
                      {layer.topParticipants.length > 2 ? (
                        <span className={cn(miniChipClass, "bg-muted/55 text-muted-foreground")}>
                          +{layer.topParticipants.length - 2}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {belongs ? (
                    <div className="mt-auto flex items-center gap-1.5 pt-2.5 text-[9.5px] font-semibold text-sky-600 dark:text-sky-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                      {companyCode} operates here
                    </div>
                  ) : null}
                </div>
                {index < layers.length - 1 ? (
                  <div className="hidden items-center justify-center px-0.5 text-muted-foreground/60 lg:flex">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      ) : null}

      {pinchPoints.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 dark:border-amber-400/25 dark:bg-amber-400/5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[11px] leading-snug text-foreground/85">
            <span className="font-semibold text-amber-700 dark:text-amber-300">Pinch points</span>
            {" — "}
            {pinchPoints.map((pinch) => pinch.name).join(" · ")}
          </p>
        </div>
      ) : null}

      {renderDrawer(
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-foreground transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <span>Open full value chain — revenue models, participants &amp; roles</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>,
        {
          title: "Value chain",
          description:
            [structureLabel(valueChainMap.structureType), `${layers.length} ${layers.length === 1 ? "layer" : "layers"}`]
              .filter(Boolean)
              .join(" · ") || undefined,
          children: renderValueChainDetail(valueChainMap, companyName, companyCode),
        },
      )}
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
function renderTypesOfPlayers(analysis: NormalizedCompanyIndustryAnalysis) {
  if (!analysis.typesOfPlayers) return null;
  const playerCategoryAccentClass =
    "bg-gradient-to-r from-transparent via-sky-500/70 to-transparent dark:via-sky-400/55";

  return (
    <div className="space-y-2.5">
      {analysis.typesOfPlayers.dimensions.map((dimension) => (
        <div key={dimension.dimensionName} className={cn(elevatedBlockClass, "space-y-3 p-3.5")}>
          <p className="text-[12px] font-semibold leading-snug text-foreground">
            {`By ${dimension.dimensionName.toLowerCase()}`}
          </p>
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
                          {category.playerExamples.slice(0, 4).map((example) => (
                            <span key={`${category.categoryName}-${example}`} className={miniChipClass}>
                              {example}
                            </span>
                          ))}
                          {category.playerExamples.length > 4 ? (
                            <span className={cn(miniChipClass, "bg-muted/55 text-muted-foreground")}>
                              +{category.playerExamples.length - 4} more
                            </span>
                          ) : null}
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
    <div className={cn(elevatedBlockClass, "space-y-3 p-4")}>
      <p className={eyebrowClass}>Tailwinds &amp; headwinds</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {renderThemeGroup("Tailwinds", analysis.tailwinds, "tailwind")}
        {renderThemeGroup("Headwinds", analysis.headwinds, "headwind")}
      </div>
    </div>
  );
}

// ---- Hero -------------------------------------------------------------------
function renderHero(analysis: NormalizedCompanyIndustryAnalysis, companyName: string | null, companyCode: string) {
  const structure = structureLabel(analysis.valueChainMap?.structureType ?? null);
  const lead =
    analysis.industryPositioning?.customerNeed ??
    analysis.valueChainMap?.chainTypeRationale ??
    analysis.valueChainMap?.synthesis ??
    null;
  const headline = analysis.subSector ?? structure ?? "Industry structure";

  const shareTiles = analysis.subSectorCards
    .map((card) => findCompanyShare(card.marketShareSnapshot, card.subSector, companyName, companyCode))
    .filter((tile): tile is ShareTile => Boolean(tile))
    .slice(0, 2);

  const fallbackSubSectors =
    shareTiles.length === 0
      ? (analysis.companyFit?.qualifyingSubSectors ?? []).map((item) => item.subSector).slice(0, 4)
      : [];
  const hasRight = shareTiles.length > 0 || fallbackSubSectors.length > 0;

  return (
    <div className={cn("grid gap-3", hasRight && "md:grid-cols-[1.55fr_1fr]")}>
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.06] p-4 sm:p-5">
        <p className={cn(eyebrowClass, "text-sky-700 dark:text-sky-300")}>Industry at a glance</p>
        <h3 className="mt-2 text-lg font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-xl">
          {headline}
        </h3>
        {lead ? <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">{lead}</p> : null}
        <div className="mt-3.5 flex flex-wrap gap-2">
          {structure ? <span className={cn(chipClass("slate"), "text-[10px]")}>{structure}</span> : null}
          {analysis.subSector && analysis.subSector !== headline ? (
            <span className={cn(chipClass("sky"), "text-[10px]")}>{analysis.subSector}</span>
          ) : null}
          {analysis.subSectorCards.length > 1 ? (
            <span className={cn(chipClass("slate"), "text-[10px]")}>
              {analysis.subSectorCards.length} sub-sectors
            </span>
          ) : null}
        </div>
      </div>

      {hasRight ? (
        <div className={cn(elevatedBlockClass, "flex flex-col gap-3 p-4")}>
          <p className={eyebrowClass}>Where {companyCode} sits</p>
          {shareTiles.length > 0 ? (
            shareTiles.map((tile, index) => (
              <div key={`${tile.subSector}-${index}`}>
                {index > 0 ? <div className="mb-3 h-px bg-border/70" /> : null}
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-mono text-2xl font-semibold tabular-nums text-sky-700 dark:text-sky-300"
                    title={tile.shareValue}
                  >
                    {shareHead(tile.shareValue)}
                  </span>
                  {tile.estimated ? (
                    <span className={cn(chipBaseClass, "px-2 py-0.5 text-[9px] text-muted-foreground")}>est.</span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                  {tile.subSector}
                  {tile.basis ? <span className="text-muted-foreground/70"> · {tile.basis}</span> : null}
                </p>
              </div>
            ))
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">Operates across</p>
              <div className="flex flex-wrap gap-1.5">
                {fallbackSubSectors.map((subSector) => (
                  <span key={subSector} className={miniChipClass}>
                    {subSector}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ---- Drill-down trigger card ------------------------------------------------
function drillTrigger(title: string, teaser: string) {
  return (
    <button
      type="button"
      className={cn(
        elevatedBlockClass,
        "flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{teaser}</span>
      </span>
      <span className={cn(chipBaseClass, "shrink-0 border-border/60 bg-background/80 px-2.5 py-1 text-[10px] text-foreground")}>
        Open
      </span>
    </button>
  );
}

type IndustryContextSectionProps = {
  companyCode: string;
  companyName: string | null;
};

export async function IndustryContextSection({ companyCode, companyName }: IndustryContextSectionProps) {
  const analysis = await getCompanyIndustryAnalysis(companyCode);
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
      </SectionCard>
    );
  }

  const subSectorEntries = buildSubSectorEntries(analysis);
  const impactPreview = getImpactDirectionDisplay(analysis.regulatoryChanges[0]?.impactDirection ?? null);
  const playerDimensions = analysis.typesOfPlayers?.dimensions ?? [];

  return (
    <SectionCard
      id="industry-context"
      title="Industry Context"
      feedbackEnabled
      feedbackCompanyCode={companyCode}
      feedbackCompanyName={companyName}
      headerAction={<SectionUpdatedAt date={generatedAtShort} />}
    >
      <div className="space-y-5">
        {renderHero(analysis, companyName, companyCode)}

        {analysis.valueChainMap ? renderValueChainRail(analysis.valueChainMap, companyName, companyCode) : null}

        {subSectorEntries.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className={eyebrowClass}>Sub-sectors</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {subSectorEntries.length} {subSectorEntries.length === 1 ? "sub-sector" : "sub-sectors"} this company plays in
              </span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {subSectorEntries.map((entry) => (
                <React.Fragment key={entry.subSector}>
                  {renderSubSectorCard(entry, companyName, companyCode)}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          renderLegacyThemes(analysis)
        )}

        {playerDimensions.length > 0 || analysis.regulatoryChanges.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {playerDimensions.length > 0
              ? renderDrawer(
                  drillTrigger(
                    "Types of players",
                    `${playerDimensions.length} ${playerDimensions.length === 1 ? "lens" : "lenses"} · ${playerDimensions
                      .map((dimension) => dimension.dimensionName.toLowerCase())
                      .slice(0, 2)
                      .join(" · ")}`,
                  ),
                  {
                    title: "Types of players",
                    description: "How the market maps into player types.",
                    children: renderTypesOfPlayers(analysis),
                  },
                )
              : null}
            {analysis.regulatoryChanges.length > 0
              ? renderDrawer(
                  drillTrigger(
                    "Regulatory changes",
                    `${analysis.regulatoryChanges.length} tracked${
                      impactPreview ? ` · latest ${impactPreview.label.toLowerCase()}` : ""
                    }`,
                  ),
                  {
                    title: "Regulatory changes",
                    description: "Policy shifts touching this industry and why they matter.",
                    children: renderRegulatoryChanges(analysis.regulatoryChanges),
                  },
                )
              : null}
          </div>
        ) : null}

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
