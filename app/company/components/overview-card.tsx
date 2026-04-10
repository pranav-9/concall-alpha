"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ConcallScore from "@/components/concall-score";
import { WatchlistButton } from "@/components/watchlist-button";
import { slugifySector } from "@/app/sector/utils";
import { cn } from "@/lib/utils";
import { useCompanyPageNavigation } from "./company-page-workspace";

type OverviewSectionPreview = {
  title: string;
  href: string;
  summary: string;
  score?: number | null;
  badge?: string | null;
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
  rankInfo?: {
    quarter?: { rank: number; total: number; percentile: number } | null;
    growth?: { rank: number; total: number; percentile: number } | null;
  };
  sectorRankInfo?: { rank: number | null; total: number } | null;
  moatInfo?: {
    moatRating?: string | null;
    moatRatingLabel?: string | null;
    trajectory?: string | null;
    trajectoryDirection?: string | null;
  } | null;
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

const percentilePillClass = (percentile: number) => {
  if (percentile >= 90) {
    return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200";
  }
  if (percentile >= 75) {
    return "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200";
  }
  if (percentile >= 50) {
    return "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200";
  }
  if (percentile >= 25) {
    return "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-700/40 dark:bg-orange-900/30 dark:text-orange-200";
  }
  return "border-red-200 bg-red-100 text-red-800 dark:border-red-700/40 dark:bg-red-900/30 dark:text-red-200";
};

const rankPillText = (
  shortLabel: string,
  fallbackLabel: string,
  rankData?: { rank: number; total: number; percentile: number } | null,
) => {
  if (!rankData) return `${fallbackLabel}: Not ranked`;
  return `${shortLabel} ${rankData.rank} / ${rankData.total} · Top ${Math.round(rankData.percentile)}%`;
};

export function OverviewCard({
  companyInfo,
  rankInfo,
  sectorRankInfo,
  moatInfo,
  sectionPreviews = [],
  watchlist = null,
}: OverviewCardProps) {
  const normalizedSector = companyInfo?.sector?.trim() || undefined;
  const normalizedSubSector = companyInfo?.subSector?.trim() || undefined;
  const sectorHref = normalizedSector
    ? `/sector/${slugifySector(normalizedSector)}`
    : null;
  const subSectorHref =
    normalizedSector && normalizedSubSector
      ? `/sector/${slugifySector(normalizedSector)}?subSector=${encodeURIComponent(
          normalizedSubSector,
        )}`
      : null;
  const moatPillClass = (() => {
    switch (moatInfo?.moatRating) {
      case "wide_moat":
        return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200";
      case "narrow_moat":
        return "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200";
      case "no_moat":
        return "border-red-200 bg-red-100 text-red-800 dark:border-red-700/40 dark:bg-red-900/30 dark:text-red-200";
      case "moat_at_risk":
        return "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  })();
  const moatPillText = moatInfo?.moatRatingLabel
    ? moatInfo.trajectory
      ? `Moat: ${moatInfo.moatRatingLabel} · ${moatInfo.trajectory}`
      : `Moat: ${moatInfo.moatRatingLabel}`
    : null;
  const contextPillClass =
    "inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-foreground";
  const interactiveContextPillClass = `${contextPillClass} transition-colors hover:bg-accent`;
  const metricPillBaseClass =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";
  const previewToneClass = (tone: OverviewSectionPreview["tone"] = "slate") => {
    switch (tone) {
      case "emerald":
        return "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-700/35 dark:bg-emerald-900/20";
      case "sky":
        return "border-sky-200/70 bg-sky-50/70 dark:border-sky-700/35 dark:bg-sky-900/20";
      case "amber":
        return "border-amber-200/70 bg-amber-50/70 dark:border-amber-700/35 dark:bg-amber-900/20";
      case "violet":
        return "border-violet-200/70 bg-violet-50/70 dark:border-violet-700/35 dark:bg-violet-900/20";
      case "rose":
        return "border-rose-200/70 bg-rose-50/70 dark:border-rose-700/35 dark:bg-rose-900/20";
      default:
        return "border-border/60 bg-background/70";
    }
  };
  const previewAccentClass = (tone: OverviewSectionPreview["tone"] = "slate") => {
    switch (tone) {
      case "emerald":
        return "bg-emerald-500";
      case "sky":
        return "bg-sky-500";
      case "amber":
        return "bg-amber-500";
      case "violet":
        return "bg-violet-500";
      case "rose":
        return "bg-rose-500";
      default:
        return "bg-muted-foreground";
    }
  };
  const navigation = useCompanyPageNavigation();

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

  return (
    <div
      id="overview"
      className="scroll-mt-40 overflow-hidden rounded-[1.6rem] border border-border/70 bg-card p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.45)]"
      style={{
        scrollMarginTop:
          "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
      }}
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_48%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.10),_transparent_38%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_48%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.14),_transparent_38%)]" />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {normalizedSector && (
              <Link
                href={sectorHref ?? "#"}
                prefetch={false}
                className={interactiveContextPillClass}
              >
                {normalizedSector}
                {sectorRankInfo
                  ? ` #${sectorRankInfo.rank != null ? `${sectorRankInfo.rank}/${sectorRankInfo.total}` : `N/A/${sectorRankInfo.total}`}`
                  : ""}
              </Link>
            )}
            {normalizedSector && normalizedSubSector && (
              <Link
                href={subSectorHref ?? "#"}
                prefetch={false}
                className={interactiveContextPillClass}
              >
                {normalizedSubSector}
              </Link>
            )}
            {moatPillText && (
              <span className={`${contextPillClass} ${moatPillClass}`}>
                {moatPillText}
              </span>
            )}
            <span
              className={`${metricPillBaseClass} ${rankInfo?.quarter ? percentilePillClass(rankInfo.quarter.percentile) : "bg-muted text-muted-foreground border-border"}`}
            >
              {rankPillText("Qtr Rank", "Qtr Score Rank", rankInfo?.quarter)}
            </span>
            <span
              className={`${metricPillBaseClass} ${rankInfo?.growth ? percentilePillClass(rankInfo.growth.percentile) : "bg-muted text-muted-foreground border-border"}`}
            >
              {rankPillText("Growth Rank", "Growth Score Rank", rankInfo?.growth)}
            </span>
            {watchlist && (
              <div className="ml-auto shrink-0">
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
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Explore next
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fast links into the sections that complete the story.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sectionPreviews.map((preview) => (
                  <button
                    key={preview.title}
                    type="button"
                    onClick={() => navigateToSection(preview.href)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-[0_16px_32px_-28px_rgba(15,23,42,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      previewToneClass(preview.tone),
                    )}
                  >
                    <div
                      className={cn(
                        "absolute inset-x-0 top-0 h-1.5",
                        previewAccentClass(preview.tone),
                      )}
                    />
                    <div className="flex h-full flex-col justify-between gap-4 pt-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-foreground">{preview.title}</p>
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            {preview.summary}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {typeof preview.score === "number" ? (
                            <ConcallScore score={preview.score} size="sm" />
                          ) : preview.badge ? (
                            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground">
                              {preview.badge}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/75 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground">
                        <span>Explore more</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
