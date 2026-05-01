import React from "react";
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
import type {
  NormalizedCompanyIndustryAnalysis,
  NormalizedIndustryRegulatoryChange,
  NormalizedIndustrySubSectorCard,
} from "@/lib/company-industry-analysis/types";
import { getCompanyIndustryAnalysis } from "@/lib/company-industry-analysis/get";
import {
  formatCompactLabel,
  getImpactDirectionDisplay,
  getMarginQualityTone,
  getTimeHorizonDisplay,
  marginQualityPillClass,
} from "../[code]/display-tokens";
import { formatShortDate, type ThemeItemWithSource } from "../[code]/page-helpers";
import { SectionCard } from "./section-card";
import { MissingSectionState } from "./missing-section-state";
import { elevatedBlockClass, nestedDetailClass } from "./surface-tokens";

type RenderDrawerCardArgs = {
  title: string;
  count: number;
  countLabel?: string;
  subtitle?: string;
  description: React.ReactNode;
  previewItems?: string[];
  accentClass: string;
  drawerTitle?: string;
  drawerDescription?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  hideDrawerHeader?: boolean;
  inline?: boolean;
  hideCount?: boolean;
  hideAccentDot?: boolean;
  showAccentStrip?: boolean;
};

function renderDrawerCard({
  title,
  count,
  countLabel = "items",
  subtitle,
  description,
  previewItems,
  accentClass,
  drawerTitle,
  drawerDescription,
  children,
  disabled = false,
  hideDrawerHeader = false,
  inline = false,
  hideCount = false,
  hideAccentDot = false,
  showAccentStrip = false,
}: RenderDrawerCardArgs) {
  const cardBody = (
    <div
      className={`group relative flex h-full min-h-[9.5rem] w-full flex-col justify-between rounded-2xl border border-border/30 bg-background/70 p-3.5 text-left shadow-md shadow-black/10 transition-colors ${
        disabled ? "cursor-default opacity-60" : inline ? "cursor-default" : "hover:bg-accent/45"
      } ${showAccentStrip ? "overflow-hidden pt-4" : ""}`}
    >
      {showAccentStrip ? (
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 ${accentClass}`} />
      ) : null}
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p
              className={`font-semibold uppercase tracking-[0.16em] ${
                inline ? "text-[10px] text-foreground" : "text-[10px] text-muted-foreground"
              }`}
            >
              {title}
            </p>
            {!hideCount ? (
              <p className="text-sm font-semibold leading-snug text-foreground">
                {count} {countLabel}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {!hideAccentDot ? <span className={`h-2.5 w-2.5 rounded-full ${accentClass}`} /> : null}
            {!inline ? (
              <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground">
                {disabled ? "Unavailable" : "Open details"}
              </span>
            ) : null}
          </div>
        </div>
        {subtitle ? (
          <p className="text-[11px] font-medium leading-snug text-foreground/90">
            {subtitle}
          </p>
        ) : null}
        <div
          className={`text-[11px] leading-snug ${
            inline ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {description}
        </div>
        {previewItems && previewItems.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {previewItems.slice(0, 3).map((item, index) => (
              <span
                key={`${title}-preview-${index}`}
                className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] text-foreground"
              >
                {item}
              </span>
            ))}
            {previewItems.length > 3 ? (
              <span className="rounded-full border border-border/60 bg-muted/55 px-2 py-0.5 text-[10px] text-muted-foreground">
                +{previewItems.length - 3} more
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (disabled || inline) {
    return cardBody;
  }

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <button type="button" className="h-full w-full">
          {cardBody}
        </button>
      </DrawerTrigger>
      <DrawerContent className="w-full max-w-2xl">
        {!hideDrawerHeader ? (
          <DrawerHeader className="border-b border-border">
            <DrawerTitle>{drawerTitle}</DrawerTitle>
            <DrawerDescription>{drawerDescription}</DrawerDescription>
          </DrawerHeader>
        ) : null}
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

function renderIndustryThemes(
  title: string,
  items: ThemeItemWithSource[],
  accentClass: string,
  showTitle = true,
  showAll = false,
) {
  if (items.length === 0) return null;
  const visibleItems = showAll ? items : items.slice(0, 2);
  const extraItems = showAll ? [] : items.slice(2);

  return (
    <div className="min-w-0 rounded-xl border border-border/25 bg-background/55 p-3">
      {showTitle ? (
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          {title}
        </p>
      ) : null}
      <div className="mt-2 space-y-2.5">
        <div className="space-y-2">
          {visibleItems.map((item, idx) => {
            const timeHorizonDisplay = getTimeHorizonDisplay(item.timeHorizon);

            return (
              <div
                key={`${title}-${item.theme}-visible-${idx}`}
                className={`space-y-1.5 rounded-xl border border-border/20 bg-background/70 px-3 py-2.5 border-l-2 ${accentClass}`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[12px] font-medium text-foreground leading-snug">
                    {item.theme}
                  </p>
                  {timeHorizonDisplay && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] ${timeHorizonDisplay.className}`}
                    >
                      {timeHorizonDisplay.label}
                    </span>
                  )}
                  {item.sourceSubSector && (
                    <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                      Source: {item.sourceSubSector}
                    </span>
                  )}
                </div>
                {item.companyMechanism && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {item.companyMechanism}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {extraItems.length > 0 && (
          <details className="border-t border-border/35 pt-2">
            <summary className="cursor-pointer list-none text-[10px] text-muted-foreground hover:text-foreground">
              Show more ({extraItems.length})
            </summary>
            <div className="mt-2 space-y-2">
              {extraItems.map((item, idx) => {
                const timeHorizonDisplay = getTimeHorizonDisplay(item.timeHorizon);

                return (
                  <div
                    key={`${title}-${item.theme}-extra-${idx}`}
                    className={`space-y-1.5 rounded-xl border border-border/20 bg-background/65 px-3 py-2.5 border-l-2 ${accentClass}`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[12px] font-medium text-foreground leading-snug">
                        {item.theme}
                      </p>
                      {timeHorizonDisplay && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${timeHorizonDisplay.className}`}
                        >
                          {timeHorizonDisplay.label}
                        </span>
                      )}
                      {item.sourceSubSector && (
                        <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                          Source: {item.sourceSubSector}
                        </span>
                      )}
                    </div>
                    {item.companyMechanism && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {item.companyMechanism}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function renderRegulatoryChanges(items: NormalizedIndustryRegulatoryChange[]) {
  if (items.length === 0) return null;

  return (
    <div className={`${elevatedBlockClass} p-4 space-y-3`}>
      <div className="space-y-3">
        {items.map((item, idx) => {
          const impactDirectionDisplay = getImpactDirectionDisplay(item.impactDirection);

          return (
            <div
              key={`${item.change}-${idx}`}
              className={`${nestedDetailClass} px-3.5 py-3 space-y-2`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground leading-snug">
                    {item.change}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.period && (
                    <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] text-foreground">
                      {item.period}
                    </span>
                  )}
                  {item.subSectorScope && (
                    <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] text-foreground">
                      {item.subSectorScope === "industry_wide"
                        ? "Industry-wide"
                        : item.subSectorScope}
                    </span>
                  )}
                  {impactDirectionDisplay && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${impactDirectionDisplay.className}`}
                    >
                      {impactDirectionDisplay.label}
                    </span>
                  )}
                </div>
              </div>
              {item.whatChanged && (
                <div className="space-y-0.5">
                  <p className="text-[11px] text-foreground/90 leading-relaxed">
                    {item.whatChanged}
                  </p>
                </div>
              )}
              {(item.industrySubSectorImpact ?? item.companyImpactMechanism) && (
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                    Why it matters
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {item.industrySubSectorImpact ?? item.companyImpactMechanism}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function collectSubSectorThemes(
  cards: NormalizedIndustrySubSectorCard[],
  themeKey: "tailwinds" | "headwinds",
): ThemeItemWithSource[] {
  return cards.flatMap((card) =>
    (card[themeKey] ?? []).map((item) => ({
      ...item,
      sourceSubSector: card.subSector,
    })),
  );
}

function renderTailwindsHeadwindsSection(
  analysis: NormalizedCompanyIndustryAnalysis,
) {
  const hasSubSectorCards = analysis.subSectorCards.length > 0;
  const tailwinds = hasSubSectorCards
    ? collectSubSectorThemes(analysis.subSectorCards, "tailwinds")
    : (analysis.tailwinds as ThemeItemWithSource[]);
  const headwinds = hasSubSectorCards
    ? collectSubSectorThemes(analysis.subSectorCards, "headwinds")
    : (analysis.headwinds as ThemeItemWithSource[]);

  if (tailwinds.length === 0 && headwinds.length === 0) return null;

  return (
    <div className={`${elevatedBlockClass} p-4 space-y-3`}>
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Tailwinds & Headwinds
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Themes pulled up from the sub-sector cards and grouped here for easier scanning.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {tailwinds.length > 0 &&
          renderIndustryThemes("Tailwinds", tailwinds, "border-l-emerald-500/70", true, true)}
        {headwinds.length > 0 &&
          renderIndustryThemes("Headwinds", headwinds, "border-l-red-500/70", true, true)}
      </div>
    </div>
  );
}

function renderTypesOfPlayers(
  analysis: NormalizedCompanyIndustryAnalysis,
) {
  if (!analysis.typesOfPlayers) return null;

  const playerCategoryAccentClass =
    "bg-gradient-to-r from-transparent via-violet-500/70 to-transparent dark:via-violet-400/55";

  return (
    <div className="space-y-2">
      {analysis.typesOfPlayers.dimensions.map((dimension) => {
        return (
          <div
            key={dimension.dimensionName}
            className={`${elevatedBlockClass} p-3.5 space-y-3`}
          >
            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold leading-snug text-foreground">
                {`By ${dimension.dimensionName.toLowerCase()}`}
              </p>
            </div>

            {dimension.categories.length > 0 && (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {dimension.categories.map((category) => {
                  return (
                    <div
                      key={`${dimension.dimensionName}-${category.categoryName}`}
                      className={`${nestedDetailClass} relative overflow-hidden px-3 py-3 pt-4`}
                    >
                      <div
                        className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 ${playerCategoryAccentClass}`}
                      />
                      <div className="relative space-y-2">
                        <p className="text-[11px] font-semibold leading-snug text-foreground">
                          {category.categoryName}
                        </p>
                        {category.categoryDescription && (
                          <p className="text-[10px] leading-relaxed text-muted-foreground">
                            {category.categoryDescription}
                          </p>
                        )}
                        {category.playerExamples.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              Player examples
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {category.playerExamples.slice(0, 3).map((example) => (
                                <span
                                  key={`${dimension.dimensionName}-${category.categoryName}-${example}`}
                                  className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] text-foreground"
                                >
                                  {example}
                                </span>
                              ))}
                              {category.playerExamples.length > 3 && (
                                <span className="rounded-full border border-border/60 bg-muted/55 px-2 py-0.5 text-[10px] text-muted-foreground">
                                  +{category.playerExamples.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {category.categoryDescription == null &&
                          category.playerExamples.length === 0 && (
                            <p className="text-[10px] leading-relaxed text-muted-foreground">
                              Player type tracked in this market map
                            </p>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function buildIndustryHeaderPills(
  analysis: NormalizedCompanyIndustryAnalysis | null,
): string[] {
  const positioning = analysis?.industryPositioning;
  return [
    (positioning?.customerNeed || positioning?.industryEconomicsForCompany)
      ? "Industry overview"
      : null,
    analysis?.valueChainMap ? "Value chain" : null,
    analysis?.typesOfPlayers ? "Players" : null,
    analysis?.regulatoryChanges.length ? "Regulations" : null,
    analysis?.tailwinds.length ? "Tailwinds" : null,
    analysis?.headwinds.length ? "Headwinds" : null,
  ].filter((value): value is string => Boolean(value));
}

type IndustryContextSectionProps = {
  companyCode: string;
  companyName: string | null;
};

export async function IndustryContextSection({
  companyCode,
  companyName,
}: IndustryContextSectionProps) {
  const analysis = await getCompanyIndustryAnalysis(companyCode);
  const generatedAtShort = formatShortDate(analysis?.generatedAtRaw);
  const headerPills = buildIndustryHeaderPills(analysis);

  return (
    <SectionCard
      id="industry-context"
      title="Industry Context"
      headerPills={headerPills}
        headerAction={
          generatedAtShort ? (
            <span className="text-[11px] text-muted-foreground">
              {generatedAtShort}
            </span>
          ) : undefined
        }
      >
        {analysis ? (
          <div className="space-y-3">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border/50 bg-muted/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {companyCode}
                </span>
                {analysis.subSector && (
                  <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
                    {analysis.subSector}
                  </span>
                )}
              </div>

              {analysis.industryPositioning?.customerNeed && (
                <div className={`${elevatedBlockClass} p-4 space-y-1.5`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Industry overview
                  </p>
                  <p className="text-[14px] sm:text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                    {analysis.industryPositioning.customerNeed}
                  </p>
                </div>
              )}

              {(analysis.valueChainMap || analysis.typesOfPlayers) && (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    {renderDrawerCard({
                      title: "Value Chain Map",
                      count: analysis.valueChainMap?.layers.length ?? 0,
                      countLabel:
                        analysis.valueChainMap?.layers.length === 1 ? "layer" : "layers",
                      description: analysis.valueChainMap ? (
                        <div className="space-y-3">
                          {(analysis.valueChainMap.structureType ||
                            analysis.valueChainMap.chainTypeRationale ||
                            analysis.valueChainMap.synthesis) && (
                            <p className="text-[12px] leading-relaxed text-foreground/80">
                              {analysis.valueChainMap.structureType && (
                                <span className="mr-1.5 font-semibold uppercase tracking-[0.14em] text-foreground">
                                  {formatCompactLabel(analysis.valueChainMap.structureType)}
                                </span>
                              )}
                              {analysis.valueChainMap.structureType &&
                                (analysis.valueChainMap.chainTypeRationale ??
                                  analysis.valueChainMap.synthesis) && (
                                  <span className="mr-1.5 text-muted-foreground">—</span>
                                )}
                              {analysis.valueChainMap.chainTypeRationale ??
                                analysis.valueChainMap.synthesis}
                            </p>
                          )}

                          {analysis.valueChainMap.layers.length > 0 && (
                            <div className="grid gap-3 lg:flex lg:items-stretch lg:gap-1.5">
                              {analysis.valueChainMap.layers.map((layer, index) => (
                                <React.Fragment key={`${layer.layerName}-${index}`}>
                                  <div className={`${nestedDetailClass} px-3.5 py-3 lg:flex-1 lg:min-w-0`}>
                                    <div className="flex items-start gap-2">
                                      <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-muted/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground">
                                        {index + 1}
                                      </span>
                                      <p className="text-[12px] font-semibold leading-snug text-foreground">
                                        {layer.layerName}
                                      </p>
                                    </div>

                                    {(layer.revenueModel ?? layer.layerDescription) && (
                                      <div className="mt-2.5 border-t border-border/40 pt-2.5">
                                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                          Overview
                                        </p>
                                        <p className="text-[10px] leading-relaxed text-foreground/90">
                                          {layer.revenueModel ?? layer.layerDescription}
                                        </p>
                                      </div>
                                    )}

                                    {layer.marginReturnProfile &&
                                      (layer.marginReturnProfile.rangeOrLabel ||
                                        layer.marginReturnProfile.sourcingRationale ||
                                        layer.marginReturnProfile.dispersionNote) && (
                                        <div className="mt-2.5 space-y-1 border-t border-border/40 pt-2.5">
                                          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                            Margin
                                          </p>
                                          <div className="flex flex-wrap items-center gap-1">
                                            {layer.marginReturnProfile.rangeOrLabel && (
                                              <span
                                                className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                                                  marginQualityPillClass[
                                                    getMarginQualityTone(
                                                      layer.marginReturnProfile.rangeOrLabel,
                                                    )
                                                  ]
                                                }`}
                                              >
                                                {layer.marginReturnProfile.rangeOrLabel}
                                              </span>
                                            )}
                                            {layer.marginReturnProfile.basis && (
                                              <span className="rounded-full border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                                                {layer.marginReturnProfile.basis}
                                              </span>
                                            )}
                                          </div>
                                          {layer.marginReturnProfile.sourcingRationale && (
                                            <p className="text-[10px] leading-relaxed text-muted-foreground">
                                              {layer.marginReturnProfile.sourcingRationale}
                                            </p>
                                          )}
                                          {layer.marginReturnProfile.dispersionNote && (
                                            <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                                              {layer.marginReturnProfile.dispersionNote}
                                            </p>
                                          )}
                                        </div>
                                      )}

                                    {layer.topParticipants.length > 0 && (
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
                                              <span className="font-medium">
                                                {participant.name}
                                              </span>
                                              {participant.listedStatus && (
                                                <span className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                                                  {formatCompactLabel(participant.listedStatus)}
                                                </span>
                                              )}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {layer.connectionToCompany && (
                                      <div className="mt-2.5 space-y-1 border-t border-border/40 pt-2.5">
                                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                          {(companyName ?? companyCode).trim()}&apos;s role
                                        </p>
                                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                                          {layer.connectionToCompany}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  {index < (analysis.valueChainMap?.layers.length ?? 0) - 1 ? (
                                    <div className="hidden lg:flex items-start justify-center px-0.5 pt-3 text-foreground/55">
                                      <span className="text-sm leading-none">→</span>
                                    </div>
                                  ) : null}
                                </React.Fragment>
                              ))}
                            </div>
                          )}

                          {analysis.valueChainMap.pinchPoints.length > 0 && (
                            <div className="space-y-1.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 dark:border-amber-400/25 dark:bg-amber-400/5">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                                Pinch points
                              </p>
                              <ul className="space-y-1.5">
                                {analysis.valueChainMap.pinchPoints.map((pinch, idx) => (
                                  <li key={`${pinch.name}-${idx}`} className="space-y-0.5">
                                    <p className="text-[11px] font-semibold leading-snug text-foreground">
                                      {pinch.name}
                                    </p>
                                    {pinch.mechanism && (
                                      <p className="text-[10px] leading-relaxed text-muted-foreground">
                                        {pinch.mechanism}
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        "No value chain map tracked yet for this company."
                      ),
                      accentClass: "bg-sky-500/80",
                      disabled: !analysis.valueChainMap,
                      inline: true,
                      hideCount: true,
                      hideAccentDot: true,
                      showAccentStrip: true,
                    })}

                    {renderDrawerCard({
                      title: "Types of Players",
                      count: analysis.typesOfPlayers?.dimensions.length ?? 0,
                      countLabel:
                        analysis.typesOfPlayers?.dimensions.length === 1
                          ? "dimension"
                          : "dimensions",
                      description: analysis.typesOfPlayers
                        ? renderTypesOfPlayers(analysis)
                        : "No player map tracked yet for this company.",
                      accentClass: "bg-violet-500/80",
                      disabled: !analysis.typesOfPlayers,
                      inline: true,
                      hideCount: true,
                      hideAccentDot: true,
                      showAccentStrip: true,
                    })}
                  </div>
                </>
              )}
            </div>

            {(analysis.regulatoryChanges.length > 0 ||
              analysis.tailwinds.length > 0 ||
              analysis.headwinds.length > 0) && (
              <div className="space-y-3">
                {renderDrawerCard({
                  title: "Industry Regulations",
                  count: analysis.regulatoryChanges.length,
                  description: renderRegulatoryChanges(analysis.regulatoryChanges),
                  accentClass: "bg-amber-500/80",
                  disabled: analysis.regulatoryChanges.length === 0,
                  inline: true,
                  hideCount: true,
                  hideAccentDot: true,
                  showAccentStrip: true,
                })}
                {renderTailwindsHeadwindsSection(analysis)}
              </div>
            )}
          </div>
        ) : (
          <MissingSectionState
            companyCode={companyCode}
            companyName={companyName}
            sectionId="industry-context"
          sectionTitle="Industry Context"
          description="We have not generated company-specific industry context for this company yet."
        />
      )}
    </SectionCard>
  );
}
