"use client";

import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import ConcallScore from "@/components/concall-score";
import { cn } from "@/lib/utils";
import { useCompanyPageNavigation } from "./company-page-workspace";
import { MissingSectionRequestButton } from "./missing-section-request-button";

type WatchlistButtonProps = {
  companyCode: string;
  loginRedirectPath: string;
  initialIsAuthenticated: boolean;
  initialHasWatchlist: boolean;
  initialIsInWatchlist: boolean;
  initialWatchlistName?: string | null;
};

const WatchlistButton = dynamic<WatchlistButtonProps>(
  () => import("@/components/watchlist-button").then((mod) => mod.WatchlistButton),
);

type OverviewSectionPreview = {
  title: string;
  href: string;
  summary: string;
  bodyPills?: Array<{
    label: string;
    tone?: "emerald" | "sky" | "amber" | "rose" | "slate";
  }>;
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
    "border-border/90 bg-gradient-to-b from-background/98 via-background/94 to-muted/26 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_18px_30px_-24px_rgba(15,23,42,0.42)] ring-1 ring-border/30 backdrop-blur-sm dark:from-background/94 dark:via-background/90 dark:to-background/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_30px_-24px_rgba(0,0,0,0.50)] dark:ring-border/40";
  const previewAccentClass = (tone?: OverviewSectionPreview["tone"]) => {
    switch (tone ?? "slate") {
      case "emerald":
        return "bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent shadow-[0_0_0_1px_rgba(16,185,129,0.16)] dark:via-emerald-400/55 dark:shadow-[0_0_0_1px_rgba(16,185,129,0.18)]";
      case "sky":
        return "bg-gradient-to-r from-transparent via-sky-500/70 to-transparent shadow-[0_0_0_1px_rgba(14,165,233,0.16)] dark:via-sky-400/55 dark:shadow-[0_0_0_1px_rgba(14,165,233,0.18)]";
      case "amber":
        return "bg-gradient-to-r from-transparent via-amber-500/70 to-transparent shadow-[0_0_0_1px_rgba(245,158,11,0.16)] dark:via-amber-400/55 dark:shadow-[0_0_0_1px_rgba(245,158,11,0.18)]";
      case "violet":
        return "bg-gradient-to-r from-transparent via-violet-500/70 to-transparent shadow-[0_0_0_1px_rgba(139,92,246,0.16)] dark:via-violet-400/55 dark:shadow-[0_0_0_1px_rgba(139,92,246,0.18)]";
      case "rose":
        return "bg-gradient-to-r from-transparent via-rose-500/70 to-transparent shadow-[0_0_0_1px_rgba(244,63,94,0.16)] dark:via-rose-400/55 dark:shadow-[0_0_0_1px_rgba(244,63,94,0.18)]";
      case "slate":
      default:
        return "bg-gradient-to-r from-transparent via-slate-500/70 to-transparent shadow-[0_0_0_1px_rgba(100,116,139,0.16)] dark:via-slate-400/55 dark:shadow-[0_0_0_1px_rgba(100,116,139,0.18)]";
    }
  };
  const bodyPillClass = (tone: NonNullable<OverviewSectionPreview["bodyPills"]>[number]["tone"]) => {
    switch (tone ?? "slate") {
      case "emerald":
        return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200";
      case "sky":
        return "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200";
      case "amber":
        return "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200";
      case "rose":
        return "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200";
      case "slate":
      default:
        return "border-border/60 bg-background/75 text-muted-foreground";
    }
  };
  const navigation = useCompanyPageNavigation();
  const companyMetaPills = [
    companyInfo?.code
      ? {
          label: companyInfo.code,
          tone: "slate" as const,
        }
      : null,
    companyInfo?.sector
      ? {
          label: companyInfo.sector,
          tone: "sky" as const,
        }
      : null,
    companyInfo?.subSector
      ? {
          label: companyInfo.subSector,
          tone: "emerald" as const,
        }
      : null,
  ].filter((pill): pill is { label: string; tone: "emerald" | "sky" | "slate" } => Boolean(pill));

  const companyMetaClass = (tone: "emerald" | "sky" | "amber" | "rose" | "slate") => {
    switch (tone) {
      case "emerald":
        return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200";
      case "sky":
        return "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200";
      case "amber":
        return "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200";
      case "rose":
        return "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200";
      case "slate":
      default:
        return "border-border/60 bg-background/75 text-muted-foreground";
    }
  };
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
      className="scroll-mt-40 overflow-hidden rounded-[1.8rem] border border-border/70 bg-card/95 p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)] backdrop-blur-sm sm:p-6 lg:p-7"
      style={{
        scrollMarginTop:
          "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
      }}
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_44%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.06),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.04),_transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_44%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.08),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.06),_transparent_28%)]" />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-4 pl-1 sm:pl-2">
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
                <p className="text-balance text-[1.9rem] font-bold leading-tight tracking-[-0.03em] text-foreground sm:text-[2.35rem] lg:text-[2.7rem]">
                  {companyInfo.name}
                </p>
              )}
              {companyMetaPills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {companyMetaPills.map((pill) => (
                    <span
                      key={pill.label}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium",
                        companyMetaClass(pill.tone),
                      )}
                    >
                      {pill.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {watchlist && (
              <div className="shrink-0 self-start rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm backdrop-blur-sm lg:ml-auto lg:pt-1">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Track this name
                </p>
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
            <div className="space-y-3 pt-1">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sectionPreviews.map((preview) => (
                  (() => {
                    const isLocked = preview.indicator?.kind === "pill" && preview.indicator.label === "Soon";
                    const sectionId = getSectionId(preview.href);
                    const requestLabel = "Request this section";
                    const previewShellClass = "flex h-full min-h-[10.5rem] flex-col gap-4 pt-1";

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
                            className={cn("absolute inset-x-0 top-0 h-2", previewAccentClass(preview.tone))}
                          />
                          <div className={previewShellClass}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="text-sm font-semibold leading-tight text-foreground">
                                {preview.title}
                              </p>
                            </div>
                            <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground">
                                Not ready
                            </span>
                          </div>

                            <div className="relative flex flex-1 items-center justify-center rounded-xl border border-border/40 bg-background/60 p-3">
                              <p className="w-full select-none text-[11px] leading-snug text-muted-foreground/85 blur-[0.8px] opacity-70">
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
                          className={cn("absolute inset-x-0 top-0 h-2", previewAccentClass(preview.tone))}
                        />
                        <div className={previewShellClass}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-2">
                              <p className="text-sm font-semibold leading-tight text-foreground">
                                {preview.title}
                              </p>
                              {preview.bodyPills && preview.bodyPills.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {preview.bodyPills.map((pill) => (
                                    <span
                                      key={`${preview.title}-${pill.label}`}
                                      className={cn(
                                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
                                        bodyPillClass(pill.tone),
                                      )}
                                    >
                                      {pill.label}
                                    </span>
                                  ))}
                                </div>
                              )}
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
