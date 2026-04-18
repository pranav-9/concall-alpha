"use client";

import { ArrowRight } from "lucide-react";
import ConcallScore from "@/components/concall-score";
import { WatchlistButton } from "@/components/watchlist-button";
import { cn } from "@/lib/utils";
import { useCompanyPageNavigation } from "./company-page-workspace";
import { MissingSectionRequestButton } from "./missing-section-request-button";

type OverviewSectionPreview = {
  title: string;
  href: string;
  summary: string;
  indicator?:
    | { kind: "score"; score: number | null }
    | { kind: "pill"; label: string };
  tone?: "emerald" | "sky" | "amber" | "violet" | "rose" | "slate";
};

interface OverviewCardProps {
  companyInfo?: {
    code?: string;
    name?: string;
    sector?: string;
    subSector?: string;
    exchange?: string;
    country?: string;
    isNew?: boolean;
  };
  sectionPreviews?: OverviewSectionPreview[];
  watchlist?: {
    companyCode: string;
    loginRedirectPath: string;
    initialIsAuthenticated: boolean;
    initialHasWatchlist: boolean;
    initialIsInWatchlist: boolean;
    initialWatchlistName?: string | null;
  } | null;
}

export function OverviewCard({
  companyInfo,
  sectionPreviews = [],
  watchlist = null,
}: OverviewCardProps) {
  const previewToneClass = () =>
    "border-border/70 bg-gradient-to-b from-background/85 via-background/75 to-muted/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_32px_-26px_rgba(15,23,42,0.42)] dark:from-background/90 dark:via-background/82 dark:to-background/68 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_32px_-26px_rgba(0,0,0,0.45)]";
  const previewAccentClass = () => "bg-border/45";
  const navigation = useCompanyPageNavigation();
  const renderIndicator = (indicator?: OverviewSectionPreview["indicator"]) => {
    if (!indicator) return null;

    if (indicator.kind === "score") {
      return typeof indicator.score === "number" ? (
        <ConcallScore score={indicator.score} size="sm" />
      ) : null;
    }

    return (
      <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground">
        {indicator.label}
      </span>
    );
  };

  const navigateToSection = (href: string) => {
    if (typeof window === "undefined") return;

    const targetId = href.startsWith("#") ? href.slice(1) : href;
    if (navigation) {
      navigation.navigateToSection(targetId);
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) return;

    const rootStyles = window.getComputedStyle(document.documentElement);
    const navbarHeight = Number.parseFloat(
      rootStyles.getPropertyValue("--global-navbar-height") || "84",
    );
    const tabsHeight = Number.parseFloat(
      rootStyles.getPropertyValue("--company-tabs-height") || "56",
    );
    const offset = navbarHeight + tabsHeight + 16;
    const targetTop = window.scrollY + target.getBoundingClientRect().top - offset;

    window.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
    window.history.replaceState(null, "", `#${targetId}`);
  };

  const getSectionId = (href: string) => (href.startsWith("#") ? href.slice(1) : href);

  return (
    <div
      id="overview"
      className="scroll-mt-40 overflow-hidden rounded-[1.6rem] border border-border/70 bg-card p-6 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.38)]"
      style={{
        scrollMarginTop:
          "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
      }}
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.07),_transparent_46%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.05),_transparent_34%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_46%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.07),_transparent_34%)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3 pl-1 sm:pl-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Overview
                </span>
                {companyInfo?.isNew && (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                    New
                  </span>
                )}
              </div>
              {companyInfo?.name && (
                <p className="text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  {companyInfo.name}
                </p>
              )}
            </div>
            {watchlist && (
              <div className="shrink-0 self-start lg:ml-auto lg:pt-1">
                <WatchlistButton
                  companyCode={watchlist.companyCode}
                  loginRedirectPath={watchlist.loginRedirectPath}
                  initialIsAuthenticated={watchlist.initialIsAuthenticated}
                  initialHasWatchlist={watchlist.initialHasWatchlist}
                  initialIsInWatchlist={watchlist.initialIsInWatchlist}
                  initialWatchlistName={watchlist.initialWatchlistName ?? null}
                />
              </div>
            )}
          </div>

          {sectionPreviews.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sectionPreviews.map((preview) => (
                  (() => {
                    const isLocked = preview.indicator?.kind === "pill" && preview.indicator.label === "Soon";
                    const sectionId = getSectionId(preview.href);
                    const requestLabel = "Request this section";
                    const previewShellClass = "flex h-full flex-col gap-4 pt-1";

                    if (isLocked) {
                      return (
                        <div
                          key={preview.title}
                          className={cn(
                            "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200",
                            previewToneClass(),
                          )}
                        >
                          <div
                            className={cn("absolute inset-x-0 top-0 h-1.5", previewAccentClass())}
                          />
                          <div className={previewShellClass}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="text-sm font-semibold text-foreground">{preview.title}</p>
                            </div>
                            <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground">
                                Not ready
                            </span>
                          </div>

                            <div className="relative flex flex-1 items-center justify-center rounded-xl border border-border/40 bg-background/60 p-3">
                              <p className="w-full text-[11px] leading-snug text-muted-foreground/85 blur-[0.8px] opacity-70 select-none">
                                {preview.summary}
                              </p>
                              {companyInfo?.code && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <MissingSectionRequestButton
                                    companyCode={companyInfo.code}
                                    companyName={companyInfo.name ?? null}
                                    sectionId={sectionId}
                                    sectionTitle={preview.title}
                                    label={requestLabel}
                                    className="h-8 rounded-full border-border/60 bg-background/95 px-3 text-[10px] font-medium text-foreground shadow-sm hover:bg-background"
                                  />
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={preview.title}
                        type="button"
                        onClick={() => navigateToSection(preview.href)}
                        className={cn(
                          "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-border/85 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_24px_-20px_rgba(15,23,42,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_24px_-20px_rgba(0,0,0,0.36)]",
                          previewToneClass(),
                        )}
                      >
                        <div
                          className={cn("absolute inset-x-0 top-0 h-1.5", previewAccentClass())}
                        />
                        <div className={previewShellClass}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="text-sm font-semibold text-foreground">{preview.title}</p>
                              <p className="text-[11px] leading-snug text-muted-foreground">
                                {preview.summary}
                              </p>
                            </div>
                            <div className="shrink-0">{renderIndicator(preview.indicator)}</div>
                          </div>
                          <div className="mt-auto inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/60 transition-colors group-hover:text-foreground/80">
                            <span>Explore more</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </button>
                    );
                  })()
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
