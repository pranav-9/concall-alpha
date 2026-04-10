import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ConcallScore from "@/components/concall-score";
import { categoryFor } from "@/components/concall-score";
import { slugifySector } from "@/app/sector/utils";
import { cn } from "@/lib/utils";
import { QuarterData } from "../types";

type OverviewSectionPreview = {
  title: string;
  href: string;
  summary: string;
  score?: number | null;
  badge?: string | null;
  tone?: "emerald" | "sky" | "amber" | "violet" | "rose" | "slate";
};

interface OverviewCardProps {
  data?: QuarterData;
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
  action?: ReactNode;
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
  data,
  companyInfo,
  rankInfo,
  sectorRankInfo,
  moatInfo,
  sectionPreviews = [],
  action,
}: OverviewCardProps) {
  const sentiment = data ? categoryFor(data.score) : null;
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

  return (
    <div
      id="overview"
      className="scroll-mt-40 bg-card border border-border rounded-lg p-6"
      style={{
        scrollMarginTop:
          "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start justify-between w-full gap-3">
            <div className="flex flex-col gap-1.5">
              {companyInfo?.name && (
                <p className="font-bold text-2xl leading-tight text-foreground">
                  {companyInfo.name}
                  {companyInfo?.isNew && (
                    <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                      New
                    </span>
                  )}
                </p>
              )}
            </div>
            {sentiment && (
              <Badge className={`${sentiment.bg} text-xs px-2 py-1 h-fit`}>
                {sentiment.label}
              </Badge>
            )}
          </div>
          {data && (
            <div className="text-right text-xs text-muted-foreground leading-tight space-y-0.5">
              <p>FY {data.fy}</p>
              <p>Q{data.qtr}</p>
              <p className="text-[11px] mt-1">{data.quarter_label}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
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
          </div>

          {sectionPreviews.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sectionPreviews.map((preview) => (
                <Link
                  key={preview.title}
                  href={preview.href}
                  prefetch={false}
                  className={cn(
                    "group rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-[0_16px_32px_-28px_rgba(15,23,42,0.4)]",
                    previewToneClass(preview.tone),
                  )}
                >
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
                  <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/75 transition-colors group-hover:text-foreground">
                    <span>Explore more</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
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
            </div>
            {action && <div className="flex items-center sm:justify-end">{action}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
