import React from "react";
import type { Metadata } from "next";
import { isCompanyNew } from "@/lib/company-freshness";
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
import { createClient } from "@/lib/supabase/server";
import { SECTION_MAP } from "../constants";
import {
  QuarterData,
} from "../types";
import { CompanyPageWorkspace } from "../components/company-page-workspace";
import { OverviewCard } from "../components/overview-card";
import { SectionCard } from "../components/section-card";
import { parseSummary, transformToChartData, calculateTrend } from "../utils";
import ConcallScore from "@/components/concall-score";
import { CompanyCommentsSection } from "@/components/company/company-comments-section";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
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
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";
import type { NormalizedGrowthCatalyst, NormalizedGrowthScenario } from "@/lib/growth-outlook/types";
import { normalizeBusinessSnapshot } from "@/lib/business-snapshot/normalize";
import { normalizeCompanyIndustryAnalysis } from "@/lib/company-industry-analysis/normalize";
import { normalizeKeyVariablesSnapshot } from "@/lib/key-variables-snapshot/normalize";
import { GuidanceHistorySection } from "../components/guidance-history-section";
import { KeyVariablesSection } from "../components/key-variables-section";
import { MissingSectionRequestButton } from "../components/missing-section-request-button";
import { QuarterlyScoreSection } from "../components/quarterly-score-section";
import { HistoricalEconomicsDataPack } from "../components/historical-economics-data-pack";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { KeyVariablesSnapshotRow } from "@/lib/key-variables-snapshot/types";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import type {
  NormalizedIndustryRegulatoryChange,
  CompanyIndustryAnalysisRow,
  NormalizedIndustryTheme,
} from "@/lib/company-industry-analysis/types";
import type {
  NormalizedRevenueBreakdownItem,
  NormalizedRevenueSplitHistoryRow,
  NormalizedSegmentGrowthCagr3yRow,
} from "@/lib/business-snapshot/types";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import type {
  GuidanceSnapshotRow,
  NormalizedPriorTwoYearAccuracyRow,
} from "@/lib/guidance-snapshot/types";

type RankInfo = {
  quarter?: { rank: number; total: number; percentile: number } | null;
  growth?: { rank: number; total: number; percentile: number } | null;
};

type SectorRankInfo = { rank: number | null; total: number } | null;

const computeAvgScore = (latestQuarterScore: number | null, growthScore: number | null) => {
  if (latestQuarterScore == null || growthScore == null) return null;
  return (latestQuarterScore + growthScore) / 2;
};

const compareNullableNumbers = (a: number | null, b: number | null, order: "asc" | "desc") => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return order === "asc" ? a - b : b - a;
};

const pctFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const formatPctLabel = (value: number) => `${pctFormatter.format(value)}%`;

const formatCompactLabel = (value: string) => value.replace(/_/g, " ").trim();

const formatRangeLabel = (start: string | null, end: string | null) => {
  if (start && end) return `${start} -> ${end}`;
  return start ?? end ?? null;
};

const extractSortNumber = (value: string | null | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const matches = value.match(/\d{2,4}/g);
  if (!matches?.length) return Number.NEGATIVE_INFINITY;
  const raw = matches[matches.length - 1];
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const getMarginProfileDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "higher":
      return {
        label: "Higher margin",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "medium":
      return {
        label: "Medium margin",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "lower":
      return {
        label: "Lower margin",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    case "unknown":
      return {
        label: "Margin unknown",
        className: "border-border/60 bg-muted/60 text-foreground",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getSegmentRoleDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "core_engine":
    case "core engine":
      return {
        label: "Core engine",
        className:
          "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
      };
    case "emerging":
      return {
        label: "Emerging",
        className:
          "border-violet-200/80 bg-violet-100 text-violet-800 dark:border-violet-700/40 dark:bg-violet-900/30 dark:text-violet-200",
      };
    case "supporting":
      return {
        label: "Supporting",
        className: "border-border/60 bg-muted/60 text-foreground",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getGrowthDirectionDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "accelerating":
    case "gaining_share":
    case "gaining share":
      return {
        label: "Accelerating",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "stable":
    case "steady":
      return {
        label: "Stable",
        className:
          "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
      };
    case "declining":
    case "losing_share":
    case "losing share":
      return {
        label: "Declining",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getImpactDirectionDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "positive":
    case "favorable":
      return {
        label: "Positive",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "negative":
    case "adverse":
      return {
        label: "Negative",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    case "mixed":
      return {
        label: "Mixed",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "neutral":
      return {
        label: "Neutral",
        className: "border-border/60 bg-muted/60 text-foreground",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getTimeHorizonDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "near_term":
    case "near term":
      return {
        label: "Near term",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "long_term":
    case "long term":
      return {
        label: "Long term",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "short_term":
    case "short term":
      return {
        label: "Short term",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "medium_term":
    case "medium term":
      return {
        label: "Medium term",
        className:
          "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
      };
    default:
      return normalized
        ? {
            label: formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const timelineStageConfig: Record<string, { label: string; className: string }> = {
  announced: {
    label: "announced",
    className:
      "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/25 dark:text-amber-200 dark:border-amber-700/40",
  },
  in_progress: {
    label: "in progress",
    className:
      "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/25 dark:text-blue-200 dark:border-blue-700/40",
  },
  scaled: {
    label: "scaled",
    className:
      "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-200 dark:border-emerald-700/40",
  },
  commissioned: {
    label: "commissioned",
    className:
      "bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/25 dark:text-sky-200 dark:border-sky-700/40",
  },
  unknown: {
    label: "unknown",
    className: "bg-muted text-foreground border border-border",
  },
};

const getTimelineStageDisplay = (stage?: string | null) => {
  const raw = (stage ?? "").trim().toLowerCase();
  const key = raw.replace(/\s+/g, "_");
  const mapped = timelineStageConfig[key];
  if (mapped) {
    return mapped;
  }
  if (raw) {
    return {
      label: raw.replace(/_/g, " "),
      className: timelineStageConfig.unknown.className,
    };
  }
  return timelineStageConfig.unknown;
};

const toDisplayLabel = (value: string | null) => {
  const compact = value ? formatCompactLabel(value) : "";
  if (!compact) return null;
  return compact.replace(/\b\w/g, (char) => char.toUpperCase());
};

const getCatalystStatusDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "ramping":
      return {
        label: "Ramping",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "in_delivery":
    case "in delivery":
      return {
        label: "In delivery",
        className:
          "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
      };
    case "announced":
      return {
        label: "Announced",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    default:
      return normalized
        ? {
            label: toDisplayLabel(normalized) ?? formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getCatalystConfidenceDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "high":
      return {
        label: "High confidence",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "medium":
    case "med":
      return {
        label: "Medium confidence",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "low":
      return {
        label: "Low confidence",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    default:
      return normalized
        ? {
            label: `${toDisplayLabel(normalized) ?? formatCompactLabel(normalized)} confidence`,
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getCatalystImpactPillDisplay = (catalyst: NormalizedGrowthCatalyst) => {
  if (catalyst.expectedImpact?.toLowerCase() === "revenue" && catalyst.pillRevenueImpact) {
    const normalized = catalyst.pillRevenueImpact.trim().toLowerCase();
    return {
      label: `Revenue: ${toDisplayLabel(normalized) ?? formatCompactLabel(normalized)}`,
      className:
        normalized === "high"
          ? "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200"
          : "border-border/60 bg-muted/60 text-foreground",
    };
  }

  if (catalyst.expectedImpact?.toLowerCase() === "margin" && catalyst.pillMarginImpact) {
    const normalized = catalyst.pillMarginImpact.trim().toLowerCase();
    return {
      label: `Margin: ${toDisplayLabel(normalized) ?? formatCompactLabel(normalized)}`,
      className:
        normalized === "expanding"
          ? "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200"
          : "border-border/60 bg-muted/60 text-foreground",
    };
  }

  if (!catalyst.expectedImpact) return null;
  return {
    label: `Impact: ${toDisplayLabel(catalyst.expectedImpact) ?? catalyst.expectedImpact}`,
    className: "border-border/60 bg-muted/60 text-foreground",
  };
};

const formatCatalystQuantifiedLabel = (catalyst: NormalizedGrowthCatalyst) => {
  const quantified = catalyst.quantified;
  if (!quantified || quantified.value == null) return null;

  const rawUnit = quantified.unit?.trim() ?? "";
  if (typeof quantified.value === "number") {
    if (rawUnit === "%") return `${pctFormatter.format(quantified.value)}%`;
    if (!rawUnit) return pctFormatter.format(quantified.value);
    return `${pctFormatter.format(quantified.value)} ${rawUnit}`;
  }

  if (!rawUnit || quantified.value.includes(rawUnit)) {
    return quantified.value;
  }

  return `${quantified.value} ${rawUnit}`;
};

const splitCatalystQuantifiedLabel = (label: string | null) => {
  if (!label) {
    return { headline: null, subline: null };
  }

  const parentheticalIndex = label.indexOf(" (");
  const withoutParenthetical =
    parentheticalIndex >= 0 ? label.slice(0, parentheticalIndex).trim() : label.trim();
  const parenthetical =
    parentheticalIndex >= 0 ? label.slice(parentheticalIndex).trim() : null;

  const amountMatch = withoutParenthetical.match(
    /^([\d,.]+(?:\s*₹)?(?:\s*(?:Cr|crore|lakh|mn|m|bn|billion|cyl|cylinders|MTPA|KTPA|TPA|TPD|MW|GW|kg|tonnes?|units?|%))?)(.*)$/i,
  );

  if (!amountMatch) {
    return { headline: withoutParenthetical, subline: parenthetical };
  }

  const headline = amountMatch[1]?.trim() || withoutParenthetical;
  const remainder = amountMatch[2]?.trim() || "";
  const subline = [remainder || null, parenthetical].filter((value): value is string => Boolean(value)).join(" ");

  return {
    headline,
    subline: subline || null,
  };
};

const getGuidanceSnapshotStyleDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  switch (normalized) {
    case "directional":
      return {
        label: "Directional",
        className:
          "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
      };
    case "quantitative":
      return {
        label: "Quantitative",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "mixed":
      return {
        label: "Mixed",
        className:
          "border-violet-200/80 bg-violet-100 text-violet-800 dark:border-violet-700/40 dark:bg-violet-900/30 dark:text-violet-200",
      };
    default:
      return normalized
        ? {
            label: toDisplayLabel(normalized) ?? formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getGuidanceSignalTrendDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  switch (normalized) {
    case "upgraded":
      return {
        label: "Upgraded",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "reiterated":
    case "active":
      return {
        label: "Reiterated",
        className:
          "border-slate-200/80 bg-slate-100 text-slate-800 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-200",
      };
    case "downgraded":
      return {
        label: "Downgraded",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    default:
      return normalized
        ? {
            label: toDisplayLabel(normalized) ?? formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getGuidanceAccuracyVerdictDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  switch (normalized) {
    case "beat":
      return {
        label: "Beat",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "met":
      return {
        label: "Met",
        className:
          "border-slate-200/80 bg-slate-100 text-slate-800 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-200",
      };
    case "missed":
      return {
        label: "Missed",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    default:
      return normalized
        ? {
            label: toDisplayLabel(normalized) ?? formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getGuidanceCredibilityVerdictDisplay = (value: string | null) => {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  switch (normalized) {
    case "high_trust":
      return {
        label: "High trust",
        className:
          "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
      };
    case "credible":
      return {
        label: "Credible",
        className:
          "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
      };
    case "mixed":
      return {
        label: "Mixed",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
      };
    case "low_trust":
      return {
        label: "Low trust",
        className:
          "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
      };
    case "not_assessable":
      return {
        label: "Not assessable",
        className:
          "border-slate-200/80 bg-slate-100 text-slate-800 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-200",
      };
    default:
      return normalized
        ? {
            label: toDisplayLabel(normalized) ?? formatCompactLabel(normalized),
            className: "border-border/60 bg-muted/60 text-foreground",
          }
        : null;
  }
};

const getGrowthScoreComponentLabel = (key: string) => {
  switch (key) {
    case "sentiment_score":
      return "Sentiment";
    case "catalyst_strength":
      return "Catalysts";
    case "guidance_strength":
      return "Guidance";
    case "scenario_strength":
      return "Scenarios";
    case "execution_confidence":
      return "Execution";
    case "quantified_forward_facts":
      return "Forward facts";
    case "industry_score":
      return "Industry";
    default:
      return toDisplayLabel(key) ?? formatCompactLabel(key);
  }
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `${code} – Story of a Stock`,
    description: `Company detail for ${code} on Story of a Stock.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = await createClient();

  const { data: companyRow } = await supabase
    .from("company")
    .select("name, sector, sub_sector, exchange, country, code, website, created_at")
    .eq("code", code)
    .limit(1)
    .maybeSingle();
  const companyName = companyRow?.name as string | undefined;
  const companyIsNew = isCompanyNew(companyRow?.created_at ?? null);
  const companySector = companyRow?.sector?.trim() || undefined;
  const companySubSector = companyRow?.sub_sector?.trim() || undefined;
  const { data: authClaimsData } = await supabase.auth.getClaims();
  const authenticatedUserId =
    typeof authClaimsData?.claims?.sub === "string" ? authClaimsData.claims.sub : null;

  let firstWatchlist: { id: number; name: string } | null = null;
  let isInFirstWatchlist = false;

  if (authenticatedUserId) {
    const { data: watchlistRows } = await supabase
      .from("watchlists")
      .select("id, name")
      .eq("user_id", authenticatedUserId)
      .order("created_at", { ascending: true })
      .limit(1);

    firstWatchlist = (watchlistRows?.[0] as { id: number; name: string } | undefined) ?? null;

    if (firstWatchlist) {
      const { data: watchlistItemRows } = await supabase
        .from("watchlist_items")
        .select("id")
        .eq("watchlist_id", firstWatchlist.id)
        .eq("company_code", code)
        .limit(1);

      isInFirstWatchlist = (watchlistItemRows?.length ?? 0) > 0;
    }
  }

  // Fetch concall analysis data
  const { data, error } = await supabase
    .from("concall_analysis")
    .select()
    .eq("company_code", code)
    .order("fy", { ascending: false })
    .order("qtr", { ascending: false });

  // Fetch latest top strategies data
  const { data: businessSnapshotData } = await supabase
    .from("business_snapshot")
    .select(
      "company, generated_at, segment_profiles, business_snapshot, historical_economics, about_company, revenue_breakdown, revenue_engine, details, snapshot_phase, snapshot_source, source_urls",
    )
    .eq("company", code)
    .order("generated_at", { ascending: false })
    .limit(1);

  const { data: growthData } = await supabase
    .from("growth_outlook")
    .select("*")
    .or(
      [code ? `company.eq.${code}` : null, companyName ? `company.eq.${companyName}` : null]
        .filter(Boolean)
        .join(",") || `company.eq.${code}`,
    )
    .order("run_timestamp", { ascending: false })
    .limit(1);

  const { data: companyIndustryAnalysisData } = await supabase
    .from("company_industry_analysis")
    .select(
      "company, generated_at, sector, sub_sector, industry_positioning, regulatory_changes, tailwinds, headwinds, sources, details",
    )
    .eq("company", code)
    .limit(1);

  const { data: guidanceTrackingRows, error: guidanceTrackingError } = await supabase
    .from("guidance_tracking")
    .select(
      "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details",
    )
    .eq("company_code", code)
    .order("generated_at", { ascending: false })
    .order("id", { ascending: false });

  const { data: guidanceSnapshotData, error: guidanceSnapshotError } = await supabase
    .from("guidance_snapshot")
    .select(
      "company_code, generated_at, analysis_window_quarters, guidance_style_classification, big_picture_growth_guidance, current_year_revenue_guidance, prior_two_year_accuracy, credibility_verdict, guidance_items, source_files, details, updated_at",
    )
    .eq("company_code", code)
    .order("generated_at", { ascending: false })
    .limit(1);

  const { data: moatAnalysisData } = await supabase
    .from("moat_analysis")
    .select(
      "id, company_code, company_name, industry, rating, trajectory, trajectory_direction, porter_summary, porter_verdict, moats, quantitative, durability, risks, created_at, updated_at",
    )
    .eq("company_code", code)
    .limit(1);

  const { data: keyVariablesSnapshotData } = await supabase
    .from("key_variables_snapshot")
    .select(
      "company_code, generated_at, analysis_window_quarters, discovery_summary, full_variable_list, deep_treatment, section_synthesis, source_files, details, updated_at",
    )
    .eq("company_code", code)
    .order("generated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex w-full px-4 sm:px-8 lg:px-16 py-8 justify-center items-center">
        <p className="text-muted-foreground text-lg">
          No data available for company {code}
        </p>
      </div>
    );
  }

  const latestQuarterData: QuarterData = data[0];
  latestQuarterData.summary = parseSummary(latestQuarterData.summary);
  const chartData = transformToChartData(data);
  const trend = calculateTrend(data.slice(0, 12));
  const detailQuarters = data.slice(0, 12);
  const normalizedGrowthOutlook = normalizeGrowthOutlook({
    details: growthData?.[0]?.details,
    growthScore: growthData?.[0]?.growth_score,
    runTimestamp: growthData?.[0]?.run_timestamp,
    companyName: growthData?.[0]?.company_name,
    fiscalYear: growthData?.[0]?.fiscal_year,
    horizonQuarters: growthData?.[0]?.horizon_quarters,
    horizonYears: growthData?.[0]?.horizon_years,
    visibilityScore: growthData?.[0]?.visibility_score,
    baseGrowthPct: growthData?.[0]?.base_growth_pct,
    upsideGrowthPct: growthData?.[0]?.upside_growth_pct,
    downsideGrowthPct: growthData?.[0]?.downside_growth_pct,
    growthScoreFormula: growthData?.[0]?.growth_score_formula,
    growthScoreSteps: growthData?.[0]?.growth_score_steps,
    factBase: growthData?.[0]?.fact_base,
    summaryBullets: growthData?.[0]?.summary_bullets,
    visibilityRationale: growthData?.[0]?.visibility_rationale,
    catalysts: growthData?.[0]?.catalysts,
    scenarios: growthData?.[0]?.scenarios,
    variantPerception: growthData?.[0]?.variant_perception,
  });
  const normalizedBusinessSnapshot = normalizeBusinessSnapshot({
    companyCode: code,
    companyWebsite: companyRow?.website ?? null,
    snapshotRow: businessSnapshotData?.[0] ?? null,
  });
  const normalizedCompanyIndustryAnalysis = normalizeCompanyIndustryAnalysis(
    (companyIndustryAnalysisData?.[0] as CompanyIndustryAnalysisRow | undefined) ?? null,
  );
  const normalizedKeyVariablesSnapshot = normalizeKeyVariablesSnapshot(
    (keyVariablesSnapshotData?.[0] as KeyVariablesSnapshotRow | undefined) ?? null,
  );
  if (guidanceSnapshotError) {
    console.error(`Unable to load guidance snapshot for ${code}:`, guidanceSnapshotError.message);
  }
  if (guidanceTrackingError) {
    console.error(`Unable to load guidance tracking for ${code}:`, guidanceTrackingError.message);
  }
  const normalizedGuidanceSnapshot = guidanceSnapshotError
    ? null
    : normalizeGuidanceSnapshot(
        (guidanceSnapshotData?.[0] as GuidanceSnapshotRow | undefined) ?? null,
      );
  const legacyGuidanceItems = guidanceTrackingError
    ? []
    : normalizeGuidanceTrackingRows(
        (guidanceTrackingRows as GuidanceTrackingRow[] | null | undefined) ?? null,
      );
  const guidanceItems = normalizedGuidanceSnapshot?.guidanceItems ?? legacyGuidanceItems;
  const normalizedMoatAnalysis = normalizeMoatAnalysis(
    (moatAnalysisData?.[0] as MoatAnalysisRow | undefined) ?? null,
  );
  const moatThesis =
    normalizedMoatAnalysis?.porterVerdict ??
    normalizedMoatAnalysis?.durability ??
    normalizedMoatAnalysis?.moatPillars.find(
      (pillar) => pillar.present && pillar.evidence,
    )?.evidence ??
    null;
  const moatGeneratedAtShort = normalizedMoatAnalysis?.updatedAtRaw
    ? (() => {
        const date = new Date(normalizedMoatAnalysis.updatedAtRaw);
        if (Number.isNaN(date.getTime())) return null;
        return new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
        }).format(date);
      })()
    : null;
  const moatPresentPillars =
    normalizedMoatAnalysis?.moatPillars.filter((pillar) => pillar.present) ?? [];
  const moatAbsentPillars =
    normalizedMoatAnalysis?.moatPillars.filter((pillar) => !pillar.present) ?? [];
  const moatTotalPillars = normalizedMoatAnalysis?.moatPillars.length ?? 0;
  const growthUpdatedAtRaw = normalizedGrowthOutlook?.updatedAtRaw ?? null;
  const growthUpdatedDate = growthUpdatedAtRaw ? new Date(growthUpdatedAtRaw) : null;
  const growthUpdatedAt =
    growthUpdatedDate && !Number.isNaN(growthUpdatedDate.getTime())
      ? new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(growthUpdatedDate)
      : null;
  const growthScore = normalizedGrowthOutlook?.growthScore ?? null;
  const businessSnapshotGeneratedAtShort = normalizedBusinessSnapshot?.generatedAtRaw
    ? (() => {
        const date = new Date(normalizedBusinessSnapshot.generatedAtRaw);
        if (Number.isNaN(date.getTime())) return null;
        return new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
        }).format(date);
      })()
    : null;
  const companyIndustryGeneratedAtShort = normalizedCompanyIndustryAnalysis?.generatedAtRaw
    ? (() => {
        const date = new Date(normalizedCompanyIndustryAnalysis.generatedAtRaw);
        if (Number.isNaN(date.getTime())) return null;
        return new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
        }).format(date);
      })()
    : null;
  const keyVariablesGeneratedAtShort = normalizedKeyVariablesSnapshot?.generatedAtRaw
    ? (() => {
        const date = new Date(normalizedKeyVariablesSnapshot.generatedAtRaw);
        if (Number.isNaN(date.getTime())) return null;
        return new Intl.DateTimeFormat("en-IN", {
          day: "2-digit",
          month: "short",
        }).format(date);
      })()
    : null;
  const aboutCompany = normalizedBusinessSnapshot?.aboutCompany ?? null;
  const revenueBreakdown = normalizedBusinessSnapshot?.revenueBreakdown ?? null;
  const historicalEconomics = normalizedBusinessSnapshot?.historicalEconomics ?? null;
  const hasHistoricalEconomicsSource =
    normalizedBusinessSnapshot?.hasHistoricalEconomicsSource ?? false;
  const aboutHeading =
    aboutCompany?.aboutShort ?? normalizedBusinessSnapshot?.businessSummaryShort ?? null;
  const aboutSupportingText =
    aboutCompany?.aboutLong ?? normalizedBusinessSnapshot?.businessSummaryLong ?? null;
  const hasHistoricalEconomics = Boolean(
    historicalEconomics?.companyRevenueCagr3y ||
      historicalEconomics?.summary ||
      historicalEconomics?.revenueHistoryBySegment ||
      historicalEconomics?.revenueMixHistoryBySegment ||
      historicalEconomics?.revenueHistoryByUnit ||
      historicalEconomics?.revenueMixHistoryByUnit ||
      hasHistoricalEconomicsSource ||
      (historicalEconomics?.revenueSplitHistory.length ?? 0) > 0 ||
      (historicalEconomics?.segmentGrowthCagr3y.length ?? 0) > 0,
  );
  const hasStructuredBusinessSnapshot =
    Boolean(
      aboutHeading ||
        aboutSupportingText ||
        hasHistoricalEconomics ||
        (revenueBreakdown?.bySegment.length ?? 0) > 0 ||
        (revenueBreakdown?.byProductOrService.length ?? 0) > 0,
    );
  const hasLegacyBusinessSnapshot =
    Boolean(
      normalizedBusinessSnapshot?.businessSummaryShort ||
      normalizedBusinessSnapshot?.businessSummaryLong ||
      normalizedBusinessSnapshot?.mixShiftSummary ||
      (normalizedBusinessSnapshot?.topRevenueDrivers.length ?? 0) > 0 ||
      (normalizedBusinessSnapshot?.keyDependencies.length ?? 0) > 0 ||
      (normalizedBusinessSnapshot?.keyRisksToModel.length ?? 0) > 0,
    );
  const hasBusinessSnapshotContent =
    hasStructuredBusinessSnapshot || hasLegacyBusinessSnapshot;
  const companyLabel = companyRow?.name ?? code;
  const oneLine = (value: string | null | undefined, fallback: string, maxLength = 92) => {
    const text = (value ?? "").replace(/\s+/g, " ").trim();
    const source = text || fallback;
    return source.length > maxLength ? `${source.slice(0, maxLength - 1).trimEnd()}…` : source;
  };
  const firstVariableName = normalizedKeyVariablesSnapshot?.deepTreatment[0]?.variable ?? null;
  const firstGrowthCatalyst = normalizedGrowthOutlook?.catalysts[0]?.catalyst ?? null;
  const firstGuidanceItem = guidanceItems[0];
  const industryPositioning = normalizedCompanyIndustryAnalysis?.industryPositioning;
  const businessSummaryLine =
    aboutHeading ?? normalizedBusinessSnapshot?.businessSummaryShort ?? null;
  const overviewSectionPreviews = [
    {
      title: "Industry Context",
      href: "#industry-context",
      summary: oneLine(
        industryPositioning?.whereThisCompanyFits ??
          industryPositioning?.industryEconomicsForCompany ??
          industryPositioning?.customerNeed,
        `${companyLabel}’s operating backdrop and where it fits in the value chain.`,
      ),
      badge:
        normalizedCompanyIndustryAnalysis?.subSector ??
        (normalizedCompanyIndustryAnalysis ? "Live" : "Soon"),
      tone: "sky" as const,
    },
    {
      title: "Business Snapshot",
      href: "#business-overview",
      summary: oneLine(
        businessSummaryLine ??
          aboutSupportingText ??
          normalizedBusinessSnapshot?.mixShiftSummary,
        `How ${companyLabel} makes money and where the mix is shifting.`,
      ),
      badge: hasBusinessSnapshotContent ? "Live" : "Soon",
      tone: "emerald" as const,
    },
    {
      title: "Key Variables",
      href: "#key-variables",
      summary: oneLine(
        firstVariableName
          ? `Top tracked variable: ${firstVariableName}`
          : null,
        `${companyLabel}’s non-financial drivers that explain quality and direction.`,
      ),
      badge: normalizedKeyVariablesSnapshot
        ? `${normalizedKeyVariablesSnapshot.deepTreatment.length} vars`
        : "Soon",
      tone: "violet" as const,
    },
    {
      title: "Quarterly Score",
      href: "#sentiment-score",
      summary: oneLine(
        latestQuarterData?.summary?.[0]
          ? `${latestQuarterData.summary[0].topic}: ${
              latestQuarterData.summary[0].detail || latestQuarterData.summary[0].text
            }`
          : null,
        `The latest quarter signal for ${companyLabel}.`,
      ),
      score: latestQuarterData?.score ?? null,
      badge: latestQuarterData ? null : "Soon",
      tone: "emerald" as const,
    },
    {
      title: "Growth Prospects",
      href: "#future-growth",
      summary: oneLine(
        normalizedGrowthOutlook?.baseGrowthPct
          ? `Base case growth: ${normalizedGrowthOutlook.baseGrowthPct}`
          : firstGrowthCatalyst ??
          normalizedGrowthOutlook?.summaryBullets[0] ??
          normalizedGrowthOutlook?.visibilityRationale,
        `${companyLabel}’s next catalysts and scenario path.`,
      ),
      score: growthScore,
      badge: growthScore == null ? "Soon" : null,
      tone: "sky" as const,
    },
    {
      title: "Guidance Tracker",
      href: "#guidance-history",
      summary: oneLine(
        normalizedGuidanceSnapshot?.currentYearRevenueGuidance?.officialCurrentGuidanceText
          ? normalizedGuidanceSnapshot.currentYearRevenueGuidance.officialCurrentGuidancePercent != null
            ? `${normalizedGuidanceSnapshot.currentYearRevenueGuidance.officialCurrentGuidanceText} (${normalizedGuidanceSnapshot.currentYearRevenueGuidance.officialCurrentGuidancePercent}%)`
            : normalizedGuidanceSnapshot.currentYearRevenueGuidance.officialCurrentGuidanceText
          : firstGuidanceItem?.guidanceText ??
          firstGuidanceItem?.statusReason ??
          firstGuidanceItem?.latestView,
        `How ${companyLabel}’s management guidance is moving over time.`,
      ),
      badge:
        guidanceItems.length > 0
          ? `${guidanceItems.length} items`
          : normalizedGuidanceSnapshot
            ? "Live"
            : "Soon",
      tone: "amber" as const,
    },
  ];
  const elevatedBlockClass =
    "rounded-xl border border-border/35 bg-background/75 shadow-md shadow-black/20";
  const elevatedMutedBlockClass =
    "rounded-xl border border-border/35 bg-muted/35 shadow-md shadow-black/20";
  const nestedDetailClass =
    "rounded-md border border-border/25 bg-background/45";
  const snapshotSubsectionClass =
    "rounded-xl border border-border/20 bg-background/25";
  const hasFutureGrowthDeepDive = Boolean(
      normalizedGrowthOutlook?.scenarios?.base ||
      normalizedGrowthOutlook?.scenarios?.upside ||
      normalizedGrowthOutlook?.scenarios?.downside,
  );
  const sortRevenueEntries = (
    entries: NormalizedRevenueBreakdownItem[],
  ) =>
    [...entries].sort((a, b) => {
      if (a.revenueSharePercent == null && b.revenueSharePercent == null) return 0;
      if (a.revenueSharePercent == null) return 1;
      if (b.revenueSharePercent == null) return -1;
      return b.revenueSharePercent - a.revenueSharePercent;
    });

  const hasBusinessSegments = (revenueBreakdown?.bySegment.length ?? 0) > 0;

  const renderBusinessSnapshotDrawer = ({
    title,
    preview,
    children,
  }: {
    title: string;
    preview: string;
    children: React.ReactNode;
  }) => (
    <details className={`group/business-snapshot-drawer ${elevatedMutedBlockClass}`}>
      <summary className="list-none cursor-pointer px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
              {title}
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground">{preview}</p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 text-[10px] font-medium text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
            <span className="group-open/business-snapshot-drawer:hidden">Show more</span>
            <span className="hidden group-open/business-snapshot-drawer:inline">
              Hide details
            </span>
          </span>
        </div>
      </summary>
      <div className="border-t border-border/40 px-4 py-3">{children}</div>
    </details>
  );

  const renderRevenueBreakdownCard = ({
    title,
    entries,
    className,
    useGrid = false,
  }: {
    title: string;
    entries: NormalizedRevenueBreakdownItem[];
    className?: string;
    useGrid?: boolean;
  }) => {
    if (entries.length === 0) return null;
    const sortedEntries = sortRevenueEntries(entries);
    const visibleLimit = useGrid ? 4 : 2;
    const visibleEntries = sortedEntries.slice(0, visibleLimit);
    const extraEntries = sortedEntries.slice(visibleLimit);
    const topEntry = sortedEntries[0] ?? null;

    const renderRevenueEntry = (
      entry: NormalizedRevenueBreakdownItem,
      idx: number,
      variant: "visible" | "extra",
    ) => {
      const marginProfileDisplay = getMarginProfileDisplay(entry.marginProfile);
      const roleDisplay = getSegmentRoleDisplay(entry.rolePill);
      const growthDirectionDisplay = getGrowthDirectionDisplay(entry.growthDirectionPill);
      const isVisible = variant === "visible";

      if (useGrid) {
        return (
          <div
            key={`${entry.name}-${variant}-${idx}`}
            className={`h-full p-3 ${
              idx === 0 && isVisible
                ? "rounded-xl border border-sky-200/70 bg-sky-50/60 shadow-sm shadow-sky-950/5 dark:border-sky-700/30 dark:bg-sky-950/15"
                : snapshotSubsectionClass
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-medium text-foreground leading-snug">
                    {entry.name}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {roleDisplay && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${roleDisplay.className}`}
                    >
                      {roleDisplay.label}
                    </span>
                  )}
                  {growthDirectionDisplay && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${growthDirectionDisplay.className}`}
                    >
                      {growthDirectionDisplay.label}
                    </span>
                  )}
                  {marginProfileDisplay && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${marginProfileDisplay.className}`}
                    >
                      {marginProfileDisplay.label}
                    </span>
                  )}
                </div>
                {entry.description && (
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {entry.description}
                  </p>
                )}
                {entry.marginProfileNote && (
                  <p className="text-[11px] text-muted-foreground/90 leading-relaxed">
                    {entry.marginProfileNote}
                  </p>
                )}
              </div>
              {entry.revenueSharePercent != null && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${
                    idx === 0 && isVisible
                      ? "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200"
                      : "border-border/60 bg-muted/60 text-foreground"
                  }`}
                >
                  {formatPctLabel(entry.revenueSharePercent)}
                </span>
              )}
            </div>
          </div>
        );
      }

      return (
        <div
          key={`${entry.name}-${variant}-${idx}`}
          className={
            isVisible
              ? idx === 0
                ? "py-2"
                : "border-t border-border/40 py-2"
              : "border-l border-border/60 pl-2"
          }
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p
                  className={`${
                    isVisible ? (idx === 0 ? "text-[15px]" : "text-sm") : "text-[11px]"
                  } font-medium text-foreground leading-snug`}
                >
                  {entry.name}
                </p>
                {roleDisplay && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${roleDisplay.className}`}
                  >
                    {roleDisplay.label}
                  </span>
                )}
                {growthDirectionDisplay && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${growthDirectionDisplay.className}`}
                  >
                    {growthDirectionDisplay.label}
                  </span>
                )}
                {marginProfileDisplay && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${marginProfileDisplay.className}`}
                  >
                    {marginProfileDisplay.label}
                  </span>
                )}
              </div>
              {entry.description && (
                <p
                  className={`${
                    isVisible ? (idx === 0 ? "text-[13px]" : "text-xs") : "text-[11px]"
                  } text-muted-foreground leading-relaxed`}
                >
                  {entry.description}
                </p>
              )}
              {entry.marginProfileNote && (
                <p
                  className={`${
                    isVisible ? "text-[11px]" : "text-[10px]"
                  } text-muted-foreground/90 leading-relaxed`}
                >
                  {entry.marginProfileNote}
                </p>
              )}
            </div>
            {entry.revenueSharePercent != null && (
              <span
                className={`${
                  isVisible
                    ? "rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground"
                    : "text-[10px] text-muted-foreground"
                } shrink-0`}
              >
                {formatPctLabel(entry.revenueSharePercent)}
              </span>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className={`${snapshotSubsectionClass} min-w-0 p-3 ${className ?? ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              {title}
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Revenue mix by business line
            </p>
          </div>
          {topEntry && (
            <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200/80 bg-emerald-100 px-2.5 py-1 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
              Top: {topEntry.name}
            </span>
          )}
        </div>
        <div className={useGrid ? "mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2" : "mt-1.5 space-y-0"}>
          {visibleEntries.map((entry, idx) => renderRevenueEntry(entry, idx, "visible"))}
        </div>
        {extraEntries.length > 0 && (
          <details className="mt-3">
            <summary className="list-none cursor-pointer">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-muted/60">
                <span>Show more</span>
                <span className="text-muted-foreground">({extraEntries.length})</span>
              </div>
            </summary>
            <div className={useGrid ? "mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2" : "mt-2 space-y-2"}>
              {extraEntries.map((entry, idx) => renderRevenueEntry(entry, idx, "extra"))}
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderBusinessSegmentsInline = () => {
    if (!hasBusinessSegments) return null;
    return (
      <div className={`${elevatedMutedBlockClass} p-4 space-y-3`}>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
            Business Segments
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Segment mix, positioning, and margin profile shown inline.
          </p>
        </div>
        {renderRevenueBreakdownCard({
          title: "By Segment",
          entries: revenueBreakdown?.bySegment ?? [],
          className: "",
          useGrid: true,
        })}
      </div>
    );
  };

  const renderHistoricalEconomicsCard = (
    history: NonNullable<typeof historicalEconomics>,
  ) => {
    const hasRichHistoricalEconomics =
      Boolean(history.summary) ||
      (history.revenueHistoryBySegment?.rows.length ?? 0) > 0 ||
      (history.revenueMixHistoryBySegment?.rows.length ?? 0) > 0 ||
      (history.revenueHistoryByUnit?.rows.length ?? 0) > 0 ||
      (history.revenueMixHistoryByUnit?.rows.length ?? 0) > 0;
    const companyRevenueCagr = history.companyRevenueCagr3y;
    const hasCompanyRevenueCagr = Boolean(
      companyRevenueCagr &&
        (companyRevenueCagr.cagrPercent != null ||
          companyRevenueCagr.startYear ||
          companyRevenueCagr.endYear ||
          companyRevenueCagr.scope ||
          companyRevenueCagr.basis),
    );
    const revenueSplitRows = [...history.revenueSplitHistory].sort(
      (a, b) => extractSortNumber(b.year) - extractSortNumber(a.year),
    );
    const visibleRevenueSplitRows = revenueSplitRows.slice(0, 2);
    const extraRevenueSplitRows = revenueSplitRows.slice(2);
    const segmentGrowthRows = [...history.segmentGrowthCagr3y].sort((a, b) =>
      compareNullableNumbers(a.cagrPercent, b.cagrPercent, "desc"),
    );
    const hasSegmentGrowth = segmentGrowthRows.length > 0;
    const hasRevenueSplitHistory = revenueSplitRows.length > 0;
    const historicalMetaColumn = hasCompanyRevenueCagr || hasSegmentGrowth;
    const richSummaryCagr = history.summary?.companyRevenueCagr ?? history.companyRevenueCagr3y;
    const richSegmentRowCount =
      history.revenueHistoryBySegment?.rows.length ??
      history.revenueMixHistoryBySegment?.rows.length ??
      0;
    const richUnitRowCount =
      history.revenueHistoryByUnit?.rows.length ?? history.revenueMixHistoryByUnit?.rows.length ?? 0;
    const richEntityLabel = richSegmentRowCount > 0 ? "segment" : "unit";
    const richPeriods =
      (history.summary?.periods.length ?? 0) > 0
        ? history.summary?.periods ?? []
        : (history.revenueHistoryBySegment?.years.length ?? 0) > 0
          ? history.revenueHistoryBySegment?.years ?? []
        : (history.revenueHistoryByUnit?.periods.length ?? 0) > 0
          ? history.revenueHistoryByUnit?.periods ?? []
          : (history.revenueMixHistoryBySegment?.years.length ?? 0) > 0
            ? history.revenueMixHistoryBySegment?.years ?? []
            : history.revenueMixHistoryByUnit?.periods ?? [];
    const richPeriodCount = richPeriods.length;
    const preview =
      hasRichHistoricalEconomics
        ? [
            richSummaryCagr?.cagrPercent != null
              ? `${formatPctLabel(richSummaryCagr.cagrPercent)} company CAGR`
              : richSummaryCagr
                ? "Company CAGR tracked"
                : null,
            richPeriodCount > 0
              ? `${richPeriodCount} period${richPeriodCount === 1 ? "" : "s"}`
              : null,
            richSegmentRowCount > 0
              ? `${richSegmentRowCount} ${richEntityLabel}${richSegmentRowCount === 1 ? "" : "s"}`
              : richUnitRowCount > 0
                ? `${richUnitRowCount} ${richEntityLabel}${richUnitRowCount === 1 ? "" : "s"}`
                : null,
            history.summary?.overallConfidence
              ? `${formatCompactLabel(history.summary.overallConfidence)} confidence`
              : null,
          ]
            .filter((value): value is string => Boolean(value))
            .join(" · ") || "Open business momentum data pack."
        : [
            companyRevenueCagr?.cagrPercent != null
              ? `${formatPctLabel(companyRevenueCagr.cagrPercent)} company CAGR`
              : hasCompanyRevenueCagr
                ? "Company CAGR tracked"
                : null,
            hasRevenueSplitHistory
              ? `${revenueSplitRows.length} split year${revenueSplitRows.length === 1 ? "" : "s"}`
              : null,
            hasSegmentGrowth
              ? `${segmentGrowthRows.length} segment CAGR row${segmentGrowthRows.length === 1 ? "" : "s"}`
              : null,
          ]
            .filter((value): value is string => Boolean(value))
            .join(" · ") || "Open business momentum history.";

    if (hasRichHistoricalEconomics) {
      return (
        <div className={`${elevatedMutedBlockClass} p-4 space-y-3`}>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
              Business Momentum
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground">{preview}</p>
          </div>
          <HistoricalEconomicsDataPack history={history} />
        </div>
      );
    }

    if (!historicalMetaColumn && !hasRevenueSplitHistory) return null;

    const renderRevenueSplitRow = (
      row: NormalizedRevenueSplitHistoryRow,
      key: string,
    ) => (
      <div key={key} className={`${snapshotSubsectionClass} p-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold text-foreground">
              {row.year ?? "Period"}
            </p>
            {row.basis && (
              <span className="text-[10px] text-muted-foreground">
                {formatCompactLabel(row.basis)}
              </span>
            )}
          </div>
        </div>
        {row.buckets.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {row.buckets.map((bucket) => (
              <span
                key={`${key}-${bucket.name}`}
                className="rounded-full border border-border/55 bg-background/70 px-2 py-0.5 text-[10px] text-foreground"
              >
                {bucket.name}
                {bucket.revenueSharePercent != null
                  ? ` ${formatPctLabel(bucket.revenueSharePercent)}`
                  : ""}
              </span>
            ))}
          </div>
        )}
        {row.comparabilityNote && (
          <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
            {row.comparabilityNote}
          </p>
        )}
      </div>
    );

    return (
      <div className={`${elevatedMutedBlockClass} p-4 space-y-3`}>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
            Business Momentum
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">{preview}</p>
        </div>
        <div
          className={`grid grid-cols-1 gap-3 ${
            historicalMetaColumn && hasRevenueSplitHistory
              ? "xl:grid-cols-[minmax(17rem,0.9fr)_minmax(0,1.1fr)]"
              : ""
          }`}
        >
          {historicalMetaColumn && (
            <div className="space-y-3">
              {hasCompanyRevenueCagr && companyRevenueCagr && (
                <div className={`${snapshotSubsectionClass} p-3`}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Company Revenue CAGR (3Y)
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    {companyRevenueCagr.cagrPercent != null && (
                      <p className="text-[22px] font-semibold leading-none text-foreground">
                        {formatPctLabel(companyRevenueCagr.cagrPercent)}
                      </p>
                    )}
                    {formatRangeLabel(
                      companyRevenueCagr.startYear,
                      companyRevenueCagr.endYear,
                    ) && (
                      <span className="text-[11px] text-muted-foreground">
                        {formatRangeLabel(
                          companyRevenueCagr.startYear,
                          companyRevenueCagr.endYear,
                        )}
                      </span>
                    )}
                  </div>
                  {(companyRevenueCagr.scope || companyRevenueCagr.basis) && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {[companyRevenueCagr.scope, companyRevenueCagr.basis]
                        .filter((value): value is string => Boolean(value))
                        .map((value) => formatCompactLabel(value))
                        .join(" · ")}
                    </p>
                  )}
                </div>
              )}

              {hasSegmentGrowth && (
                <div className={`${snapshotSubsectionClass} p-3`}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Segment Growth CAGR (3Y)
                  </p>
                  <div className="mt-2 space-y-2">
                    {segmentGrowthRows.map((row: NormalizedSegmentGrowthCagr3yRow, idx) => (
                      <div
                        key={`${row.segment}-${idx}`}
                        className={idx === 0 ? "space-y-1" : "space-y-1 border-t border-border/35 pt-2"}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-medium text-foreground leading-snug">
                            {row.segment}
                          </p>
                          {row.cagrPercent != null && (
                            <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-foreground shrink-0">
                              {formatPctLabel(row.cagrPercent)}
                            </span>
                          )}
                        </div>
                        {(formatRangeLabel(row.startYear, row.endYear) ||
                          row.comparability ||
                          row.basis) && (
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {[
                              formatRangeLabel(row.startYear, row.endYear),
                              row.comparability
                                ? `${formatCompactLabel(row.comparability)} comparability`
                                : null,
                              row.basis ? formatCompactLabel(row.basis) : null,
                            ]
                              .filter((value): value is string => Boolean(value))
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {hasRevenueSplitHistory && (
            <div className={`${snapshotSubsectionClass} p-3`}>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                Revenue Split History
              </p>
              <div className="mt-2 space-y-2">
                {visibleRevenueSplitRows.map((row, idx) =>
                  renderRevenueSplitRow(row, `${row.year ?? "period"}-${idx}`),
                )}
              </div>
              {extraRevenueSplitRows.length > 0 && (
                <details className="mt-2 border-t border-border/35 pt-2">
                  <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                    Show more ({extraRevenueSplitRows.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {extraRevenueSplitRows.map((row, idx) =>
                      renderRevenueSplitRow(
                        row,
                        `${row.year ?? "period"}-extra-${idx}`,
                      ),
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHistoricalEconomicsUnavailableCard = () => (
    <div className={`${elevatedMutedBlockClass} p-4 space-y-3`}>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
          Business Momentum
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Data exists, but the current payload is not display-ready yet.
        </p>
      </div>
      <div className={`${snapshotSubsectionClass} p-3 space-y-1.5`}>
        <p className="text-[12px] font-medium text-foreground">
          Business momentum data is available for this company, but the stored
          structure does not match the current display format yet.
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Once this company&apos;s payload is refreshed to the richer
          segment-history
          schema, this section will show the full data pack with tables, charts,
          and insights.
        </p>
      </div>
    </div>
  );
  const renderBusinessMoatAnalysisInline = () => (
    <div className={`${elevatedMutedBlockClass} p-4 space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
            Moat Analysis
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Competitive position, defensibility, and moat risks integrated into the business view.
          </p>
        </div>
        {moatGeneratedAtShort ? (
          <span className="text-[11px] text-muted-foreground">{moatGeneratedAtShort}</span>
        ) : null}
      </div>
      {normalizedMoatAnalysis ? (
        <div className="space-y-4">
          <div className={`${elevatedBlockClass} p-4 space-y-3`}>
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const ratingConfig: Record<string, { className: string }> = {
                  wide_moat: {
                    className:
                      "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-600/50 dark:bg-emerald-900/35 dark:text-emerald-200",
                  },
                  narrow_moat: {
                    className:
                      "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-600/50 dark:bg-sky-900/35 dark:text-sky-200",
                  },
                  no_moat: {
                    className:
                      "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-600/50 dark:bg-rose-900/35 dark:text-rose-200",
                  },
                  moat_at_risk: {
                    className:
                      "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600/50 dark:bg-amber-900/35 dark:text-amber-200",
                  },
                };
                const cfg = ratingConfig[normalizedMoatAnalysis.moatRating];
                const cls = cfg?.className ?? "border-border/60 bg-muted/60 text-foreground";
                return (
                  <span
                    className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] ${cls}`}
                  >
                    {normalizedMoatAnalysis.moatRatingLabel}
                  </span>
                );
              })()}
              {normalizedMoatAnalysis.trajectory && (
                <span className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium text-foreground">
                  {normalizedMoatAnalysis.trajectoryDirection
                    ? `${normalizedMoatAnalysis.trajectory} ${normalizedMoatAnalysis.trajectoryDirection}`
                    : normalizedMoatAnalysis.trajectory}
                </span>
              )}
              {normalizedMoatAnalysis.industry && (
                <span className="rounded-full border border-border/50 bg-muted/35 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {normalizedMoatAnalysis.industry}
                </span>
              )}
            </div>
            {moatThesis && (
              <p className="max-w-4xl text-[13px] font-medium leading-relaxed text-foreground">
                {moatThesis}
              </p>
            )}
          </div>
          {(moatTotalPillars > 0 ||
            normalizedMoatAnalysis.porterVerdict ||
            normalizedMoatAnalysis.porterSummary ||
            normalizedMoatAnalysis.durability ||
            normalizedMoatAnalysis.risks.length > 0) && (
            <div className="space-y-2">
              {moatTotalPillars > 0 && (
                <details className={`group ${elevatedBlockClass}`}>
                  <summary className="list-none cursor-pointer px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                            Competitive Advantages
                          </p>
                          <span className="rounded-full border border-emerald-200/80 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                            {moatPresentPillars.length} / {moatTotalPillars} present
                          </span>
                        </div>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {moatPresentPillars.length > 0
                            ? `${moatPresentPillars.length} identified strengths${
                                moatAbsentPillars.length > 0
                                  ? `, ${moatAbsentPillars.length} weaker dimensions`
                                  : ""
                              }.`
                            : "No durable advantages identified yet."}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        <span className="group-open:hidden">Open</span>
                        <span className="hidden group-open:inline">Hide</span>
                      </span>
                    </div>
                  </summary>
                  <div className="space-y-3 border-t border-border/40 px-4 py-3">
                    {moatPresentPillars.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {moatPresentPillars.map((pillar, idx) => (
                          <div
                            key={`${pillar.type}-present-${idx}`}
                            className={`${elevatedBlockClass} border-l-2 border-l-emerald-500/70 p-3 space-y-2`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-emerald-200/80 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                                Present
                              </span>
                              <p className="text-[12px] font-semibold text-foreground">
                                {pillar.type}
                              </p>
                              {pillar.greenwaldLabel && (
                                <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {pillar.greenwaldLabel}
                                </span>
                              )}
                            </div>
                            {pillar.evidence ? (
                              <p className="text-[12px] leading-relaxed text-foreground">
                                {pillar.evidence}
                              </p>
                            ) : (
                              <p className="text-[11px] leading-relaxed text-muted-foreground">
                                Evidence not captured.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {moatAbsentPillars.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Missing / weak moat dimensions
                        </p>
                        <div className="space-y-2">
                          {moatAbsentPillars.map((pillar, idx) => (
                            <div
                              key={`${pillar.type}-absent-${idx}`}
                              className={`${elevatedBlockClass} border-l-2 border-l-border/70 p-3 space-y-1.5`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[12px] font-medium text-foreground">
                                  {pillar.type}
                                </p>
                                {pillar.greenwaldLabel && (
                                  <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                    {pillar.greenwaldLabel}
                                  </span>
                                )}
                              </div>
                              {pillar.evidence ? (
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                  {pillar.evidence}
                                </p>
                              ) : (
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                  No supporting moat evidence captured.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {(normalizedMoatAnalysis.porterVerdict ||
                normalizedMoatAnalysis.porterSummary ||
                normalizedMoatAnalysis.durability) && (
                <details className={`group ${elevatedBlockClass}`}>
                  <summary className="list-none cursor-pointer px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                          Defensibility
                        </p>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {normalizedMoatAnalysis.porterVerdict ??
                            normalizedMoatAnalysis.durability ??
                            "Industry structure and moat durability."}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        <span className="group-open:hidden">Open</span>
                        <span className="hidden group-open:inline">Hide</span>
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-border/40 px-4 py-3">
                    <div className={`${elevatedBlockClass} p-3 space-y-2`}>
                      {normalizedMoatAnalysis.porterVerdict && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                            Porter verdict
                          </p>
                          <p className="text-[12px] leading-relaxed text-foreground">
                            {normalizedMoatAnalysis.porterVerdict}
                          </p>
                        </div>
                      )}
                      {normalizedMoatAnalysis.porterSummary && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Industry structure
                          </p>
                          <p className="text-[12px] leading-relaxed text-muted-foreground">
                            {normalizedMoatAnalysis.porterSummary}
                          </p>
                        </div>
                      )}
                      {normalizedMoatAnalysis.durability && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Durability
                          </p>
                          <p className="text-[12px] leading-relaxed text-muted-foreground">
                            {normalizedMoatAnalysis.durability}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )}

              {normalizedMoatAnalysis.risks.length > 0 && (
                <details className={`group ${elevatedBlockClass}`}>
                  <summary className="list-none cursor-pointer px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/90">
                          Key Risks to the Moat
                        </p>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {normalizedMoatAnalysis.risks.length} risk
                          {normalizedMoatAnalysis.risks.length === 1 ? "" : "s"} flagged.
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        <span className="group-open:hidden">Open</span>
                        <span className="hidden group-open:inline">Hide</span>
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-border/40 px-4 py-3">
                    <div className="space-y-2">
                      {normalizedMoatAnalysis.risks.map((risk, idx) => (
                        <div
                          key={`${risk}-${idx}`}
                          className={`${elevatedBlockClass} border-l-2 border-l-rose-400/70 p-3`}
                        >
                          <p className="text-[12px] leading-relaxed text-foreground">{risk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      ) : (
        renderMissingSectionState(
          "moat-analysis",
          "Moat Analysis",
          "We have not generated a competitive moat analysis for this company yet.",
        )
      )}
    </div>
  );
  const renderGuidanceSnapshotContextDrawer = () => {
    if (!normalizedGuidanceSnapshot) return null;

    const styleCard = normalizedGuidanceSnapshot.guidanceStyleClassification;
    const bigPicture = normalizedGuidanceSnapshot.bigPictureGrowthGuidance;

    if (!styleCard && !bigPicture) return null;

    return (
      <Drawer direction="right">
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-border/60 bg-background/70 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-none hover:bg-accent"
          >
            <span>Guidance Style</span>
            {(() => {
              const styleDisplay = getGuidanceSnapshotStyleDisplay(styleCard?.style ?? null);
              return styleDisplay ? (
                <span
                  className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] ${styleDisplay.className}`}
                >
                  {styleDisplay.label}
                </span>
              ) : null;
            })()}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="w-full max-w-xl">
          <DrawerHeader className="border-b border-border">
            <DrawerTitle>Guidance Style & Big Picture</DrawerTitle>
            <DrawerDescription>
              How management tends to frame guidance and the long-term growth statement they are anchoring to.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 py-4">
            {styleCard && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Style
                  </p>
                  {(() => {
                    const styleDisplay = getGuidanceSnapshotStyleDisplay(styleCard.style);
                    return styleDisplay ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${styleDisplay.className}`}
                      >
                        {styleDisplay.label}
                      </span>
                    ) : null;
                  })()}
                </div>
                {styleCard.rationale && (
                  <p className="text-[12px] leading-relaxed text-foreground">
                    {styleCard.rationale}
                  </p>
                )}
                {styleCard.evidenceQuarters.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                      Evidence Quarters
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {styleCard.evidenceQuarters.map((quarter) => (
                        <span
                          key={quarter}
                          className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {quarter}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {bigPicture && (
              <div className="space-y-2 rounded-lg border border-border/30 bg-background/70 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Big Picture Growth Guidance
                  </p>
                  {(() => {
                    const statusDisplay = getGuidanceSignalTrendDisplay(bigPicture.statusSinceFirst);
                    return statusDisplay ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${statusDisplay.className}`}
                      >
                        {statusDisplay.label}
                      </span>
                    ) : null;
                  })()}
                </div>
                {bigPicture.headlineStatement && (
                  <p className="text-[12px] font-semibold leading-relaxed text-foreground">
                    {bigPicture.headlineStatement}
                  </p>
                )}
                {bigPicture.currentStatement && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {bigPicture.currentStatement}
                  </p>
                )}
                {bigPicture.source && (
                  <p className="text-[10px] text-muted-foreground">Source: {bigPicture.source}</p>
                )}
              </div>
            )}
          </div>
          <DrawerFooter className="border-t border-border">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  };
  const renderGuidanceSnapshotSummary = () => {
    if (!normalizedGuidanceSnapshot) return null;

    const styleCard = normalizedGuidanceSnapshot.guidanceStyleClassification;
    const bigPicture = normalizedGuidanceSnapshot.bigPictureGrowthGuidance;
    const currentYear = normalizedGuidanceSnapshot.currentYearRevenueGuidance;
    const priorAccuracy = normalizedGuidanceSnapshot.priorTwoYearAccuracy;
    const credibilityVerdict = normalizedGuidanceSnapshot.credibilityVerdict;

    const hasSummaryCards =
      Boolean(styleCard || bigPicture || currentYear || credibilityVerdict) ||
      priorAccuracy.length > 0;

    if (!hasSummaryCards) return null;

    const renderAccuracyRow = (row: NormalizedPriorTwoYearAccuracyRow, index: number) => {
      const verdictDisplay = getGuidanceAccuracyVerdictDisplay(row.verdict);

      return (
        <div
          key={`${row.fiscalYear ?? "year"}-${index}`}
          className={`${nestedDetailClass} px-3 py-2.5 space-y-1.5`}
        >
          <div className="flex flex-wrap items-start justify-between gap-1.5">
            <div>
              <p className="text-[11px] font-semibold text-foreground">
                {row.fiscalYear ?? "Prior year"}
              </p>
              {row.finalSignalAfterRevisions && (
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  Final signal: {row.finalSignalAfterRevisions}
                </p>
              )}
            </div>
            {verdictDisplay && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] ${verdictDisplay.className}`}
              >
                {verdictDisplay.label}
              </span>
            )}
          </div>
          {row.actualOutcome && (
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                Actual Outcome
              </p>
              <p className="text-[10px] leading-relaxed text-foreground">{row.actualOutcome}</p>
            </div>
          )}
          {row.signalSummary && (
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                Guidance Given
              </p>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {row.signalSummary}
              </p>
            </div>
          )}
          {row.reason && (
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                Why
              </p>
              <p className="text-[10px] leading-relaxed text-muted-foreground/90">
                {row.reason}
              </p>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-2.5">
        {currentYear && (
          <div className="grid grid-cols-1 gap-3">
            {currentYear && (
              <div className={`${elevatedBlockClass} p-3.5 space-y-2.5`}>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                      Current Year Revenue Guidance
                    </p>
                    {currentYear.fiscalYear && (
                      <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {currentYear.fiscalYear}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {currentYear.officialCurrentGuidancePercent != null && (
                      <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                        {formatPctLabel(currentYear.officialCurrentGuidancePercent)}
                      </span>
                    )}
                    {(() => {
                      const trendDisplay = getGuidanceSignalTrendDisplay(currentYear.signalTrend);
                      return trendDisplay ? (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] ${trendDisplay.className}`}
                        >
                          {trendDisplay.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-start">
                  <div className="space-y-2">
                    {(currentYear.officialCurrentGuidanceText ||
                      currentYear.consolidatedStatement) && (
                      <p className="text-[12px] font-semibold leading-snug text-foreground">
                        {currentYear.officialCurrentGuidanceText ?? currentYear.consolidatedStatement}
                      </p>
                    )}
                    {currentYear.consolidatedStatement &&
                      currentYear.consolidatedStatement !== currentYear.officialCurrentGuidanceText && (
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          {currentYear.consolidatedStatement}
                        </p>
                      )}
                    {currentYear.inYearRevisionNote && (
                      <div className="space-y-0.5">
                        <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                          Revision Note
                        </p>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          {currentYear.inYearRevisionNote}
                        </p>
                      </div>
                    )}
                  </div>

                  {currentYear.sourceQuarterTimeline.length > 0 && (
                    <div className="self-start rounded-lg border border-border/25 bg-background/30 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/45 bg-muted/15 px-2.5 py-1 text-[9px] font-medium text-muted-foreground">
                          <span>Guidance evolution</span>
                          <span className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] text-muted-foreground">
                            {currentYear.sourceQuarterTimeline.length} qtrs
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-1.5">
                        {currentYear.sourceQuarterTimeline.map((entry, index) => (
                          <div
                            key={`${entry.quarter ?? "quarter"}-${index}`}
                            className="space-y-1 rounded-lg border border-border/25 bg-background/65 px-2.5 py-1.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {entry.quarter && (
                                  <p className="text-[10px] font-semibold text-foreground">
                                    {entry.quarter}
                                  </p>
                                )}
                                {entry.guidanceType && (
                                  <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[9px] text-muted-foreground">
                                    {formatCompactLabel(entry.guidanceType)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {entry.guidancePercent != null && (
                                  <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                                    {formatPctLabel(entry.guidancePercent)}
                                  </span>
                                )}
                                {entry.sourceReference && (
                                  <span className="text-[9px] text-muted-foreground">
                                    {entry.sourceReference}
                                  </span>
                                )}
                              </div>
                            </div>
                            {entry.whatWasSaid && (
                              <p className="text-[10px] leading-relaxed text-muted-foreground">
                                {entry.whatWasSaid}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {priorAccuracy.length > 0 && (
          <div className={`${elevatedBlockClass} p-3.5 space-y-2.5`}>
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                Prior Two-Year Accuracy
              </p>
              <span className="text-[9px] text-muted-foreground">
                {priorAccuracy.length} year{priorAccuracy.length === 1 ? "" : "s"} tracked
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
              {priorAccuracy.map(renderAccuracyRow)}
            </div>
          </div>
        )}

        {credibilityVerdict && (
          <div className={`${elevatedBlockClass} p-3.5 space-y-2.5`}>
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                Credibility Verdict
              </p>
              {(() => {
                const verdictDisplay = getGuidanceCredibilityVerdictDisplay(
                  credibilityVerdict.verdict,
                );
                return verdictDisplay ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] ${verdictDisplay.className}`}
                  >
                    {verdictDisplay.label}
                  </span>
                ) : null;
              })()}
            </div>
            {credibilityVerdict.supportingLine && (
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {credibilityVerdict.supportingLine}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };
  const renderIndustryThemes = (
    title: string,
    items: NormalizedIndustryTheme[],
    accentClass: string,
    showTitle = true,
    showAll = false,
  ) => {
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
  };
  const renderRegulatoryChanges = (
    items: NormalizedIndustryRegulatoryChange[],
  ) => {
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
                {item.companyImpactMechanism && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                      Why it matters
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {item.companyImpactMechanism}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  const renderIndustryContextDrawerCard = ({
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
  }: {
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
  }) => {
    const cardBody = (
      <div
        className={`group flex h-full min-h-[9.5rem] w-full flex-col justify-between rounded-2xl border border-border/30 bg-background/70 p-3.5 text-left shadow-md shadow-black/10 transition-colors ${
          disabled ? "cursor-default opacity-60" : inline ? "cursor-default" : "hover:bg-accent/45"
        }`}
      >
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
  };
  const renderValueChainMapContent = () => {
    if (!normalizedCompanyIndustryAnalysis?.valueChainMap) return null;

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
            Value Chain Map
          </p>
          {normalizedCompanyIndustryAnalysis.valueChainMap.structureType && (
            <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
              {formatCompactLabel(normalizedCompanyIndustryAnalysis.valueChainMap.structureType)}
            </span>
          )}
        </div>

        {normalizedCompanyIndustryAnalysis.valueChainMap.synthesis && (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {normalizedCompanyIndustryAnalysis.valueChainMap.synthesis}
          </p>
        )}

        {normalizedCompanyIndustryAnalysis.valueChainMap.layers.length > 0 && (
          <div className="space-y-2.5">
            {normalizedCompanyIndustryAnalysis.valueChainMap.layers.map((layer, index) => (
              <div
                key={`${layer.layerName}-${index}`}
                className="rounded-xl border border-border/20 bg-background/45 px-4 py-3 border-l-2 border-l-sky-400/70"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border/60 bg-muted/55 px-2 py-0.5 text-[10px] text-muted-foreground">
                    Layer {index + 1}
                  </span>
                  <p className="text-[12px] font-semibold leading-snug text-foreground">
                    {layer.layerName}
                  </p>
                </div>
                {layer.layerDescription && (
                  <p className="mt-2 text-[11px] leading-relaxed text-foreground/90">
                    {layer.layerDescription}
                  </p>
                )}
                  {layer.connectionToCompany && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                        {(companyRow?.name ?? code).trim()}&apos;s role
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {layer.connectionToCompany}
                      </p>
                    </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  const renderMissingSectionState = (
    sectionId: string,
    sectionTitle: string,
    description: string,
  ) => (
    <div className="rounded-xl border border-dashed border-border/50 bg-muted/35 p-5 shadow-md shadow-black/15">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {sectionTitle} is not ready yet for this company.
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <MissingSectionRequestButton
          companyCode={code}
          companyName={companyRow?.name ?? null}
          sectionId={sectionId}
          sectionTitle={sectionTitle}
          className="w-full sm:w-auto"
        />
      </div>
    </div>
  );
  const sidebarSections = [
    {
      ...SECTION_MAP.overview,
      meta:
        companySector
          ? { kind: "text" as const, text: companySector }
          : { kind: "text" as const, text: "Live" },
    },
    {
      ...SECTION_MAP.industryContext,
      meta:
        normalizedCompanyIndustryAnalysis?.subSector
          ? { kind: "text" as const, text: normalizedCompanyIndustryAnalysis.subSector }
          : normalizedCompanyIndustryAnalysis
            ? { kind: "text" as const, text: "Live" }
            : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.businessSnapshot,
      meta:
        hasBusinessSnapshotContent
          ? { kind: "text" as const, text: "Live" }
          : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.quarterlyScore,
      meta: { kind: "score" as const, score: latestQuarterData?.score ?? null },
    },
    {
      ...SECTION_MAP.keyVariables,
      meta:
        normalizedKeyVariablesSnapshot?.deepTreatment.length
          ? {
              kind: "count" as const,
              count: normalizedKeyVariablesSnapshot.deepTreatment.length,
              suffix: "vars",
            }
          : normalizedKeyVariablesSnapshot
            ? { kind: "text" as const, text: "Live" }
            : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.futureGrowth,
      meta: normalizedGrowthOutlook
        ? { kind: "score" as const, score: growthScore }
        : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.guidanceHistory,
      meta:
        guidanceItems.length > 0
          ? { kind: "count" as const, count: guidanceItems.length, suffix: "items" }
          : normalizedGuidanceSnapshot
            ? { kind: "text" as const, text: "Live" }
          : { kind: "text" as const, text: "Soon" },
    },
    {
      ...SECTION_MAP.community,
      meta: { kind: "text" as const, text: "Discuss" },
    },
  ];

  const toNumeric = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  let rankInfo: RankInfo = { quarter: null, growth: null };
  let sectorRankInfo: SectorRankInfo = null;
  let latestQuarterRowsGlobal: Array<{ company_code?: unknown; score?: unknown }> = [];

  const { data: latestQuarterKey } = await supabase
    .from("concall_analysis")
    .select("fy, qtr")
    .order("fy", { ascending: false })
    .order("qtr", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestQuarterKey?.fy != null && latestQuarterKey?.qtr != null) {
    const { data: latestQuarterRows } = await supabase
      .from("concall_analysis")
      .select("company_code, score")
      .eq("fy", latestQuarterKey.fy)
      .eq("qtr", latestQuarterKey.qtr);

    latestQuarterRowsGlobal = (latestQuarterRows ?? []) as Array<{
      company_code?: unknown;
      score?: unknown;
    }>;

    const quarterRanked = assignCompetitionRanks(
      latestQuarterRowsGlobal
        .map((row) => ({
          companyCode: String((row as { company_code?: string }).company_code ?? "").toUpperCase(),
          score: toNumeric((row as { score?: unknown }).score),
        }))
        .filter((row) => row.companyCode && row.score != null)
        .sort((a, b) => {
          if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
          return a.companyCode.localeCompare(b.companyCode);
        }),
      (row) => row.score,
    );

    const quarterTotal = quarterRanked.length;
    const quarterRank =
      quarterRanked.find((row) => row.companyCode === code.toUpperCase())?.leaderboardRank ?? 0;
    if (quarterTotal > 0 && quarterRank > 0) {
      rankInfo = {
        ...rankInfo,
        quarter: {
          rank: quarterRank,
          total: quarterTotal,
          percentile: ((quarterTotal - quarterRank + 1) / quarterTotal) * 100,
        },
      };
    }
  }

  const { data: growthRankRows } = await supabase
    .from("growth_outlook")
    .select("company, growth_score, base_growth_pct, run_timestamp")
    .order("run_timestamp", { ascending: false });

  const latestGrowthByCompany = new Map<
    string,
    { company: string; growthScore: number; base: number | null }
  >();
  (growthRankRows ?? []).forEach((row) => {
    const companyKey = String((row as { company?: string }).company ?? "").toUpperCase();
    if (!companyKey || latestGrowthByCompany.has(companyKey)) return;
    const growthScoreValue = toNumeric((row as { growth_score?: unknown }).growth_score);
    if (growthScoreValue == null) return;
    latestGrowthByCompany.set(companyKey, {
      company: companyKey,
      growthScore: growthScoreValue,
      base: toNumeric((row as { base_growth_pct?: unknown }).base_growth_pct),
    });
  });

  const growthRanked = assignCompetitionRanks(
    Array.from(latestGrowthByCompany.values()).sort((a, b) => {
      if (b.growthScore !== a.growthScore) return b.growthScore - a.growthScore;
      const aBase = a.base ?? Number.NEGATIVE_INFINITY;
      const bBase = b.base ?? Number.NEGATIVE_INFINITY;
      if (bBase !== aBase) return bBase - aBase;
      return a.company.localeCompare(b.company);
    }),
    (row) => row.growthScore,
  );

  const growthTotal = growthRanked.length;
  const growthKeys = [code.toUpperCase(), (companyName ?? "").toUpperCase()].filter(Boolean);
  const growthRank =
    growthRanked.find((row) => growthKeys.includes(row.company))?.leaderboardRank ?? 0;
  if (growthTotal > 0 && growthRank > 0) {
    rankInfo = {
      ...rankInfo,
      growth: {
        rank: growthRank,
        total: growthTotal,
        percentile: ((growthTotal - growthRank + 1) / growthTotal) * 100,
      },
    };
  }

  if (companySector) {
    const { data: sectorPeerRows } = await supabase
      .from("company")
      .select("code, name")
      .eq("sector", companySector);

    const sectorPeers = (sectorPeerRows ?? []) as Array<{ code?: string | null; name?: string | null }>;
    const sectorTotal = sectorPeers.length;

    if (sectorTotal > 0) {
      const latestQuarterByCode = new Map<string, number | null>();
      latestQuarterRowsGlobal.forEach((row) => {
        const companyCode = String(row.company_code ?? "").toUpperCase();
        if (!companyCode || latestQuarterByCode.has(companyCode)) return;
        latestQuarterByCode.set(companyCode, toNumeric(row.score));
      });

      const sectorPeerAvgRows = sectorPeers.map((peer) => {
        const peerCode = String(peer.code ?? "").toUpperCase();
        const peerName = String(peer.name ?? "").toUpperCase();
        const latestQuarterScore = latestQuarterByCode.get(peerCode) ?? null;
        const growthScore =
          latestGrowthByCompany.get(peerCode)?.growthScore ??
          latestGrowthByCompany.get(peerName)?.growthScore ??
          null;

        return {
          code: peerCode,
          name: String(peer.name ?? peer.code ?? "").trim() || peerCode,
          latestQuarterScore,
          growthScore,
          avgScore: computeAvgScore(latestQuarterScore, growthScore),
        };
      });

      const rankedSectorPeers = assignCompetitionRanks(
        sectorPeerAvgRows
          .filter((row) => row.avgScore != null)
          .sort((a, b) => {
            const avgCompare = compareNullableNumbers(a.avgScore, b.avgScore, "desc");
            if (avgCompare !== 0) return avgCompare;
            const latestCompare = compareNullableNumbers(
              a.latestQuarterScore,
              b.latestQuarterScore,
              "desc",
            );
            if (latestCompare !== 0) return latestCompare;
            const growthCompare = compareNullableNumbers(a.growthScore, b.growthScore, "desc");
            if (growthCompare !== 0) return growthCompare;
            return a.name.localeCompare(b.name);
          }),
        (row) => row.avgScore,
      );

      const sectorMatchKeys = [code.toUpperCase(), (companyName ?? "").toUpperCase()].filter(Boolean);
      const sectorRank =
        rankedSectorPeers.find((row) => sectorMatchKeys.includes(row.code))?.leaderboardRank ?? null;

      sectorRankInfo = {
        rank: sectorRank,
        total: sectorTotal,
      };
    }
  }

  const getScenarioTone = (scenarioKey: "base" | "upside" | "downside") =>
    scenarioKey === "base"
      ? {
          accentClass: "border-l-emerald-500/70",
          growthBadgeClass:
            "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/35 dark:text-emerald-100",
        }
      : scenarioKey === "upside"
        ? {
            accentClass: "border-l-sky-500/70",
            growthBadgeClass:
              "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/35 dark:text-sky-100",
          }
        : {
            accentClass: "border-l-amber-500/70",
            growthBadgeClass:
              "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/35 dark:text-amber-100",
          };

  const renderBaseScenarioCard = () => {
    const scenario = normalizedGrowthOutlook?.scenarios?.base as
      | NormalizedGrowthScenario
      | null
      | undefined;
    if (!scenario) return null;

    const drivers = scenario.drivers.slice(0, 3);
    const risks = scenario.risks.slice(0, 3);
    const fallbackDescription = (scenario.summary ?? "").trim();
    const primaryRisk = (scenario.risks[0] ?? "").trim();
    const riskWatch = (scenario.riskWatch ?? "").trim();
    const riskWatchValue = riskWatch || primaryRisk;
    const growthValue = scenario.growth;
    const marginValue = scenario.ebitdaMargin;
    const tone = getScenarioTone("base");

    return (
      <div className={`${elevatedBlockClass} flex flex-col p-3 space-y-3 border-l-2 ${tone.accentClass}`}>
        <div className="flex items-start justify-between gap-3">
          <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold uppercase tracking-wide">
            Base case
          </span>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {growthValue && (
              <span className={`rounded-full border px-3 py-1 text-[18px] font-bold leading-none ${tone.growthBadgeClass}`}>
                {String(growthValue)}
              </span>
            )}
            {typeof scenario.confidence === "number" && (
              <span className="rounded-full border border-border/60 bg-muted/80 px-2.5 py-0.5 text-[10px] font-medium text-foreground">
                Confidence {(scenario.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {marginValue && (
            <span className="px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/35 dark:text-sky-100 dark:border-sky-700/40">
              EBITDA margin: {String(marginValue)}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
            Quick takeaway
          </p>
          {fallbackDescription ? (
            <p className="text-[11px] text-foreground leading-snug line-clamp-2">
              {fallbackDescription}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground leading-snug">
              No quick takeaway provided.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="space-y-1.5 rounded-lg border border-emerald-200/50 bg-emerald-50/55 p-2.5 dark:border-emerald-700/25 dark:bg-emerald-900/15">
            <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold">
              Drivers
            </p>
            <ul className="space-y-1">
              {drivers.length > 0 ? (
                drivers.map((driver, idx) => (
                  <li
                    key={idx}
                    className="rounded-sm border-l border-emerald-400/60 pl-2 text-[11px] leading-snug text-foreground"
                  >
                    {driver}
                  </li>
                ))
              ) : (
                <li className="text-[11px] leading-snug text-muted-foreground">
                  No driver details provided.
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-1.5 rounded-lg border border-rose-200/50 bg-rose-50/55 p-2.5 dark:border-rose-700/25 dark:bg-rose-900/15">
            <p className="text-[10px] uppercase tracking-wide text-rose-700 dark:text-rose-300 font-semibold">
              Risks
            </p>
            <ul className="space-y-1">
              {risks.length > 0 ? (
                risks.map((risk, idx) => (
                  <li
                    key={idx}
                    className="rounded-sm border-l border-rose-400/60 pl-2 text-[11px] leading-snug text-foreground"
                  >
                    {risk}
                  </li>
                ))
              ) : (
                <li className="text-[11px] leading-snug text-muted-foreground">
                  No risk details provided.
                </li>
              )}
            </ul>
          </div>
        </div>

        {riskWatchValue && (
          <div className="rounded-lg border border-amber-200/50 bg-amber-50/55 px-2.5 py-2 dark:border-amber-700/25 dark:bg-amber-900/15">
            <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold">
              Risk watch
            </p>
            <p className="mt-1 text-[11px] leading-snug text-foreground">
              {riskWatchValue}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderCompactScenarioCard = (scenarioKey: "upside" | "downside") => {
    const scenario = normalizedGrowthOutlook?.scenarios?.[scenarioKey] as NormalizedGrowthScenario | null | undefined;
    if (!scenario) return null;
    const drivers = scenario.drivers;
    const risks = scenario.risks;
    const visibleDrivers = drivers.slice(0, 2);
    const visibleRisks = risks.slice(0, 2);
    const primaryRisk = (risks[0] ?? "").trim();
    const fallbackDescription = (scenario.summary ?? "").trim();
    const riskWatch = (scenario.riskWatch ?? "").trim();
    const riskWatchValue = riskWatch || primaryRisk;
    const growthValue = scenario.growth;
    const marginValue = scenario.ebitdaMargin;
    const tone = getScenarioTone(scenarioKey);
    const hasDetailContent =
      visibleDrivers.length > 0 || visibleRisks.length > 0 || Boolean(riskWatchValue);
    const detailsLabel =
      visibleDrivers.length > 0 || visibleRisks.length > 0
        ? `Show details (${visibleDrivers.length} drivers, ${visibleRisks.length} risks)`
        : "Show details";

    return (
      <div
        key={scenarioKey}
        className={`${elevatedBlockClass} flex h-full flex-col p-3 space-y-3 border-l-2 ${tone.accentClass}`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold uppercase tracking-wide">
            {scenarioKey} case
          </span>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {growthValue && (
              <span className={`rounded-full border px-3 py-1 text-[18px] font-bold leading-none ${tone.growthBadgeClass}`}>
                {String(growthValue)}
              </span>
            )}
            {typeof scenario.confidence === "number" && (
              <span className="rounded-full border border-border/60 bg-muted/80 px-2.5 py-0.5 text-[10px] font-medium text-foreground">
                Confidence {(scenario.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {marginValue && (
            <span className="px-2 py-0.5 rounded-full border bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/35 dark:text-sky-100 dark:border-sky-700/40">
              EBITDA margin: {String(marginValue)}
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
            Quick takeaway
          </p>
          <div className="space-y-1">
            {fallbackDescription ? (
              <p className="text-[11px] text-foreground leading-snug line-clamp-2">
                {fallbackDescription}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-snug">
                No quick takeaway provided.
              </p>
            )}
            {!fallbackDescription && !riskWatchValue ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                No primary risk provided.
              </p>
            ) : null}
          </div>
        </div>

        {hasDetailContent && (
          <details className={`group ${nestedDetailClass} px-2 py-1.5`}>
            <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground list-none">
              <span className="group-open:hidden">{detailsLabel}</span>
              <span className="hidden group-open:inline">Hide details</span>
            </summary>
            <div className="mt-2 space-y-2">
              {visibleDrivers.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold">
                    Drivers
                  </p>
                  <ul className="space-y-1">
                    {visibleDrivers.map((driver, idx) => (
                      <li
                        key={idx}
                        className="text-[11px] text-foreground leading-snug rounded-sm border-l border-emerald-400/60 pl-2"
                      >
                        {driver}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {visibleRisks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-red-700 dark:text-red-300 font-semibold">
                    Risks
                  </p>
                  <ul className="space-y-1">
                    {visibleRisks.map((risk, idx) => (
                      <li
                        key={idx}
                        className="text-[11px] text-foreground leading-snug rounded-sm border-l border-red-400/60 pl-2"
                      >
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {riskWatchValue && (
                <div className="rounded-lg border border-amber-200/50 bg-amber-50/55 px-2.5 py-2 dark:border-amber-700/25 dark:bg-amber-900/15">
                  <p className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold">
                    Risk watch
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-foreground">
                    {riskWatchValue}
                  </p>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-12">
      <div
        id="main-content"
        className="flex min-w-0 flex-col gap-4 overflow-x-hidden"
      >
        <CompanyPageWorkspace sections={sidebarSections} defaultSectionId="overview">
          <div data-section-id="overview">
            <OverviewCard
              companyInfo={{
                code: companyRow?.code ?? code,
                name: companyRow?.name ?? undefined,
                sector: companySector,
                subSector: companySubSector,
                exchange: companyRow?.exchange ?? undefined,
                country: companyRow?.country ?? undefined,
                isNew: companyIsNew,
              }}
              rankInfo={rankInfo}
              sectorRankInfo={sectorRankInfo}
              moatInfo={
                normalizedMoatAnalysis
                  ? {
                      moatRating: normalizedMoatAnalysis.moatRating,
                      moatRatingLabel: normalizedMoatAnalysis.moatRatingLabel,
                      trajectory: normalizedMoatAnalysis.trajectory,
                      trajectoryDirection: normalizedMoatAnalysis.trajectoryDirection,
                    }
                  : null
              }
              sectionPreviews={overviewSectionPreviews}
              watchlist={{
                companyCode: code,
                loginRedirectPath: `/company/${code}`,
                initialIsAuthenticated: Boolean(authenticatedUserId),
                initialHasWatchlist: Boolean(firstWatchlist),
                initialIsInWatchlist: isInFirstWatchlist,
                initialWatchlistName: firstWatchlist?.name ?? null,
              }}
            />
          </div>

          <div data-section-id="industry-context">
        <SectionCard
          id="industry-context"
          title="Industry Context"
          headerAction={
            companyIndustryGeneratedAtShort ? (
              <span className="text-[11px] text-muted-foreground">
                {companyIndustryGeneratedAtShort}
              </span>
            ) : undefined
          }
        >
          {normalizedCompanyIndustryAnalysis ? (
            <div className="space-y-3">
              {normalizedCompanyIndustryAnalysis.industryPositioning && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border/50 bg-muted/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {companyRow?.code ?? code}
                    </span>
                    {normalizedCompanyIndustryAnalysis.subSector && (
                      <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200">
                        {normalizedCompanyIndustryAnalysis.subSector}
                      </span>
                    )}
                  </div>

                  {normalizedCompanyIndustryAnalysis.industryPositioning.customerNeed && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Industry overview
                      </p>
                      <p className="max-w-3xl text-[14px] sm:text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                        {normalizedCompanyIndustryAnalysis.industryPositioning.customerNeed}
                      </p>
                    </div>
                  )}

                  {(normalizedCompanyIndustryAnalysis.valueChainMap ||
                    normalizedCompanyIndustryAnalysis.classificationMap) && (
                    <>
                      <div className="border-t border-border/30" />

                      <div className="grid grid-cols-1 gap-3">
                      {renderIndustryContextDrawerCard({
                        title: "Value Chain Map",
                        count:
                          normalizedCompanyIndustryAnalysis.valueChainMap?.layers.length ?? 0,
                          countLabel:
                            normalizedCompanyIndustryAnalysis.valueChainMap?.layers.length === 1
                              ? "layer"
                              : "layers",
                          description:
                            normalizedCompanyIndustryAnalysis.valueChainMap
                                ? (
                                  <div className="space-y-3">
                                      <div className="grid gap-3 lg:flex lg:items-stretch lg:gap-1.5">
                                      {normalizedCompanyIndustryAnalysis.valueChainMap.layers.map(
                                        (layer, index) => (
                                          <React.Fragment key={`${layer.layerName}-${index}`}>
                                            <div className="rounded-xl border border-border/30 bg-background/68 px-3 py-2.5 lg:flex-1 lg:min-w-0">
                                              <div className="flex items-start gap-2">
                                                <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-muted/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground">
                                                  {index + 1}
                                                </span>
                                                <p className="text-[12px] font-semibold leading-snug text-foreground">
                                                  {layer.layerName}
                                                </p>
                                              </div>
                                              {layer.layerDescription && (
                                                <p className="mt-1.5 text-[10px] leading-relaxed text-foreground/90">
                                                  {layer.layerDescription}
                                                </p>
                                              )}
                                            </div>
                                            {index <
                                            (normalizedCompanyIndustryAnalysis.valueChainMap?.layers.length ??
                                              0) -
                                              1 ? (
                                              <div className="hidden lg:flex items-center justify-center px-0.5 text-foreground/55">
                                                <span className="text-sm leading-none">→</span>
                                              </div>
                                            ) : null}
                                          </React.Fragment>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )
                              : "No value chain map tracked yet for this company.",
                          accentClass: "bg-sky-500/80",
                          children: renderValueChainMapContent(),
                          disabled: !normalizedCompanyIndustryAnalysis.valueChainMap,
                          inline: true,
                          hideCount: true,
                          hideAccentDot: true,
                        })}

                      {renderIndustryContextDrawerCard({
                        title: "Types of Players",
                        count:
                          normalizedCompanyIndustryAnalysis.classificationMap?.dimensions
                            .length ?? 0,
                          countLabel:
                            normalizedCompanyIndustryAnalysis.classificationMap?.dimensions
                              .length === 1
                              ? "dimension"
                              : "dimensions",
                          // Bind once so the render branch stays type-safe inside nested callbacks.
                          description:
                            (() => {
                              const classificationMap = normalizedCompanyIndustryAnalysis.classificationMap;

                              return classificationMap
                                ? (
                                    <div className="space-y-2">
                                      {classificationMap.dimensions.map((dimension, dimensionIndex) => (
                                          <div
                                            key={dimension.dimensionName}
                                            className="rounded-xl border border-border/40 bg-background/75 px-3 py-2 text-foreground"
                                          >
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground">
                                              {dimensionIndex + 1}. Based on {dimension.dimensionName}
                                            </p>
                                          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                                            {dimension.categories.map((category) => (
                                              <div
                                                key={`${dimension.dimensionName}-${category.category}`}
                                                className={`min-h-full rounded-lg border px-2 py-1.5 text-[10px] ${
                                                  category.isCompanyPosition
                                                    ? "border-emerald-200/35 bg-emerald-950/30 text-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-50"
                                                    : "border-border/60 bg-muted/35 text-foreground"
                                                }`}
                                              >
                                                <p className="font-semibold leading-snug text-inherit">
                                                  {category.category}
                                                </p>
                                                {category.description && (
                                                  <p
                                                    className={`mt-1 leading-relaxed text-[9px] ${
                                                      category.isCompanyPosition
                                                        ? "text-emerald-50/80"
                                                        : "text-foreground/80"
                                                    }`}
                                                  >
                                                    {category.description}
                                                  </p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                : "No player map tracked yet for this company.";
                            })(),
                          accentClass: "bg-violet-500/80",
                          disabled: !normalizedCompanyIndustryAnalysis.classificationMap,
                          inline: true,
                          hideCount: true,
                          hideAccentDot: true,
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
              {(normalizedCompanyIndustryAnalysis.tailwinds.length > 0 ||
                normalizedCompanyIndustryAnalysis.headwinds.length > 0 ||
                normalizedCompanyIndustryAnalysis.regulatoryChanges.length > 0) && (
                <div className="space-y-3">
                  {renderIndustryContextDrawerCard({
                    title: "Industry Regulations",
                    count: normalizedCompanyIndustryAnalysis.regulatoryChanges.length,
                    description: renderRegulatoryChanges(
                      normalizedCompanyIndustryAnalysis.regulatoryChanges,
                    ),
                    accentClass: "bg-amber-500/80",
                    disabled:
                      normalizedCompanyIndustryAnalysis.regulatoryChanges.length === 0,
                    inline: true,
                    hideCount: true,
                    hideAccentDot: true,
                  })}
                  {(normalizedCompanyIndustryAnalysis.tailwinds.length > 0 ||
                    normalizedCompanyIndustryAnalysis.headwinds.length > 0) && (
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      {renderIndustryContextDrawerCard({
                        title: "Tailwinds",
                        count: normalizedCompanyIndustryAnalysis.tailwinds.length,
                        description: renderIndustryThemes(
                          "Tailwinds",
                          normalizedCompanyIndustryAnalysis.tailwinds,
                          "border-l-emerald-500/70",
                          false,
                          true,
                        ),
                        accentClass: "bg-emerald-500/80",
                        inline: true,
                        hideCount: true,
                        hideAccentDot: false,
                      })}
                      {renderIndustryContextDrawerCard({
                        title: "Headwinds",
                        count: normalizedCompanyIndustryAnalysis.headwinds.length,
                        description: renderIndustryThemes(
                          "Headwinds",
                          normalizedCompanyIndustryAnalysis.headwinds,
                          "border-l-red-500/70",
                          false,
                          true,
                        ),
                        accentClass: "bg-rose-500/80",
                        inline: true,
                        hideCount: true,
                        hideAccentDot: false,
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            renderMissingSectionState(
              "industry-context",
              "Industry Context",
              "We have not generated company-specific industry context for this company yet.",
            )
          )}
        </SectionCard>
          </div>

          <div data-section-id="business-overview">
        <SectionCard
          id="business-overview"
          title="Business Snapshot"
          headerAction={
            businessSnapshotGeneratedAtShort ? (
              <span className="text-[11px] text-muted-foreground">
                {businessSnapshotGeneratedAtShort}
              </span>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-4">
            {normalizedBusinessSnapshot ? (
              <>
                {hasStructuredBusinessSnapshot ? (
                  <>
                    <div className="space-y-2.5">
                      {(aboutHeading || aboutSupportingText) && (
                        <div className="min-w-0 space-y-2">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            About
                          </p>
                          {aboutHeading && (
                            <p className="max-w-4xl text-[17px] sm:text-[19px] font-semibold text-foreground leading-snug">
                              {aboutHeading}
                            </p>
                          )}
                          {aboutSupportingText && (
                            <p className="max-w-4xl text-[13px] text-muted-foreground leading-relaxed">
                              {aboutSupportingText}
                            </p>
                          )}
                        </div>
                      )}

                      {renderBusinessSegmentsInline()}
                      {historicalEconomics
                        ? renderHistoricalEconomicsCard(historicalEconomics)
                        : hasHistoricalEconomicsSource
                          ? renderHistoricalEconomicsUnavailableCard()
                          : null}
                    </div>
                  </>
                ) : hasLegacyBusinessSnapshot ? (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        {normalizedBusinessSnapshot.businessSummaryShort ||
                        normalizedBusinessSnapshot.businessSummaryLong ? (
                          <div className={`${elevatedBlockClass} p-4 space-y-2`}>
                            {normalizedBusinessSnapshot.businessSummaryShort && (
                              <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                                {normalizedBusinessSnapshot.businessSummaryShort}
                              </p>
                            )}
                            {normalizedBusinessSnapshot.businessSummaryLong && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {normalizedBusinessSnapshot.businessSummaryLong}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No business snapshot summary available yet.
                          </p>
                        )}
                      </div>
                    </div>

                    {(normalizedBusinessSnapshot.topRevenueDrivers.length > 0 ||
                      normalizedBusinessSnapshot.keyDependencies.length > 0 ||
                      normalizedBusinessSnapshot.keyRisksToModel.length > 0) && (
                      <div className="space-y-2.5">
                        {normalizedBusinessSnapshot.topRevenueDrivers.length > 0 && (
                          renderBusinessSnapshotDrawer({
                            title: "Top Revenue Drivers",
                            preview: `${normalizedBusinessSnapshot.topRevenueDrivers.length} driver${
                              normalizedBusinessSnapshot.topRevenueDrivers.length === 1 ? "" : "s"
                            } tracked.`,
                            children: (
                              <div className={`${snapshotSubsectionClass} p-3`}>
                                <ul className="space-y-1">
                                  {normalizedBusinessSnapshot.topRevenueDrivers.map((driver, idx) => (
                                    <li
                                      key={idx}
                                      className="text-xs text-foreground leading-snug border-l border-border/70 pl-2"
                                    >
                                      {driver}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ),
                          })
                        )}

                        {(normalizedBusinessSnapshot.keyDependencies.length > 0 ||
                          normalizedBusinessSnapshot.keyRisksToModel.length > 0) && (
                          renderBusinessSnapshotDrawer({
                            title: "Model Watchpoints",
                            preview: [
                              normalizedBusinessSnapshot.keyDependencies.length > 0
                                ? `${normalizedBusinessSnapshot.keyDependencies.length} dependenc${
                                    normalizedBusinessSnapshot.keyDependencies.length === 1 ? "y" : "ies"
                                  }`
                                : null,
                              normalizedBusinessSnapshot.keyRisksToModel.length > 0
                                ? `${normalizedBusinessSnapshot.keyRisksToModel.length} risk${
                                    normalizedBusinessSnapshot.keyRisksToModel.length === 1 ? "" : "s"
                                  }`
                                : null,
                            ]
                              .filter((value): value is string => Boolean(value))
                              .join(" · "),
                            children: (
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {normalizedBusinessSnapshot.keyDependencies.length > 0 && (
                                  <div className={`${snapshotSubsectionClass} p-3`}>
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                                      Dependencies
                                    </p>
                                    <ul className="mt-1.5 space-y-0.5">
                                      {normalizedBusinessSnapshot.keyDependencies.map((dependency, idx) => (
                                        <li
                                          key={idx}
                                          className="text-xs text-foreground leading-snug border-l border-amber-400/50 pl-1.5"
                                        >
                                          {dependency}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {normalizedBusinessSnapshot.keyRisksToModel.length > 0 && (
                                  <div className={`${snapshotSubsectionClass} p-3`}>
                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                                      Risks
                                    </p>
                                    <ul className="mt-1.5 space-y-0.5">
                                      {normalizedBusinessSnapshot.keyRisksToModel.map((risk, idx) => (
                                        <li
                                          key={idx}
                                          className="text-xs text-foreground leading-snug border-l border-red-400/50 pl-1.5"
                                        >
                                          {risk}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ),
                          })
                        )}
                      </div>
                    )}

                    {normalizedBusinessSnapshot.mixShiftSummary && (
                      <div className="rounded-xl border border-sky-200/35 bg-sky-50/30 p-3 space-y-0.5 dark:border-sky-700/30 dark:bg-sky-950/10">
                        <p className="text-[10px] uppercase tracking-wide text-sky-700 dark:text-sky-300 font-semibold">
                          Mix Shift
                        </p>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {normalizedBusinessSnapshot.mixShiftSummary}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  renderMissingSectionState(
                    "business-overview",
                    "Business Snapshot",
                    "We have not generated a usable business snapshot for this company yet.",
                  )
                )}
              </>
            ) : (
              renderMissingSectionState(
                "business-overview",
                "Business Snapshot",
                "We have not generated a usable business snapshot for this company yet.",
              )
            )}
            {renderBusinessMoatAnalysisInline()}
          </div>
        </SectionCard>
          </div>

          <div data-section-id="sentiment-score">
        <SectionCard id="sentiment-score" title="Quarterly Score">
          <QuarterlyScoreSection
            chartData={chartData}
            detailQuarters={detailQuarters}
            trend={trend}
          />
        </SectionCard>
          </div>

          <div data-section-id="key-variables">
        <SectionCard
          id="key-variables"
          title="Key Variables"
          headerDescription="The non-financial variables that best explain whether growth is healthy, sustainable, and improving in quality."
          headerAction={
            keyVariablesGeneratedAtShort ? (
              <span className="text-[11px] text-muted-foreground">
                {keyVariablesGeneratedAtShort}
              </span>
            ) : undefined
          }
        >
          {normalizedKeyVariablesSnapshot ? (
            <KeyVariablesSection snapshot={normalizedKeyVariablesSnapshot} />
          ) : (
            renderMissingSectionState(
              "key-variables",
              "Key Variables",
              "We have not generated a key variables snapshot for this company yet.",
            )
          )}
        </SectionCard>
          </div>

          <div data-section-id="future-growth">
        <SectionCard
          id="future-growth"
          title="Future Growth Prospects"
          headerAction={
            typeof growthScore === "number" ? <ConcallScore score={growthScore} size="sm" /> : undefined
          }
        >
          {normalizedGrowthOutlook ? (
            <div className="flex flex-col gap-4">
              {(normalizedGrowthOutlook.summaryBullets.length > 0 ||
                normalizedGrowthOutlook.growthScoreComponents.length > 0) && (
                <div className={`${elevatedMutedBlockClass} p-3 space-y-2`}>
                  {normalizedGrowthOutlook.summaryBullets.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                          Summary
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {normalizedGrowthOutlook.growthScoreComponents.length > 0 && (
                            <Drawer direction="right">
                              <DrawerTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 rounded-full border-border/60 bg-background/70 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-none hover:bg-accent"
                                >
                                  View score breakdown
                                </Button>
                              </DrawerTrigger>
                              <DrawerContent className="w-full max-w-xl">
                                <DrawerHeader className="border-b border-border">
                                  <DrawerTitle>Growth score breakdown</DrawerTitle>
                                  <DrawerDescription>
                                    Component-level view of what is currently driving the forward growth score.
                                  </DrawerDescription>
                                </DrawerHeader>
                                <div className="space-y-3 overflow-y-auto px-4 py-4">
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {normalizedGrowthOutlook.growthScoreComponents.map((component) => (
                                      <div
                                        key={component.key}
                                        className="rounded-lg border border-border/30 bg-background/70 px-3 py-2.5"
                                      >
                                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                                          {getGrowthScoreComponentLabel(component.key)}
                                        </p>
                                        <p className="mt-1 text-[18px] font-semibold leading-none text-foreground">
                                          {pctFormatter.format(component.score)}
                                          <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                                            /10
                                          </span>
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <DrawerFooter className="border-t border-border">
                                  <DrawerClose asChild>
                                    <Button variant="outline">Close</Button>
                                  </DrawerClose>
                                </DrawerFooter>
                              </DrawerContent>
                            </Drawer>
                          )}
                          {growthUpdatedAt && (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground border border-border/60 text-[10px]">
                              Updated: {growthUpdatedAt}
                            </span>
                          )}
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {normalizedGrowthOutlook.summaryBullets.slice(0, 5).map((bullet, idx) => (
                          <li key={idx} className="text-[11px] text-foreground leading-snug">
                            • {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}

              {normalizedGrowthOutlook.catalysts.length > 0 && (
                <div className={`${elevatedMutedBlockClass} p-3 space-y-3`}>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wide text-foreground/90 font-semibold">
                        Top 3 Growth Catalysts
                      </p>
                      {normalizedGrowthOutlook.alsoConsidered.length > 0 && (
                        <Drawer direction="right">
                          <DrawerTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-full border-border/60 bg-background/70 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-none hover:bg-accent"
                            >
                              View also considered
                            </Button>
                          </DrawerTrigger>
                          <DrawerContent className="w-full max-w-xl">
                            <DrawerHeader className="border-b border-border">
                              <DrawerTitle>Also considered</DrawerTitle>
                              <DrawerDescription>
                                Secondary growth candidates screened but not included in the top catalyst set.
                              </DrawerDescription>
                            </DrawerHeader>
                            <div className="space-y-3 overflow-y-auto px-4 py-4">
                              {normalizedGrowthOutlook.alsoConsideredNote && (
                                <div className="rounded-lg border border-border/30 bg-muted/25 px-3 py-2.5">
                                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                                    Note
                                  </p>
                                  <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                                    {normalizedGrowthOutlook.alsoConsideredNote}
                                  </p>
                                </div>
                              )}
                              {normalizedGrowthOutlook.alsoConsidered
                                .slice(0, 2)
                                .map((item, idx) => (
                                  <div
                                    key={`also-considered-drawer-visible-${idx}`}
                                    className="rounded-lg border border-border/30 bg-background/70 px-3 py-2.5 space-y-1.5"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      {item.catalyst && (
                                        <p className="text-[12px] font-medium leading-snug text-foreground">
                                          {item.catalyst}
                                        </p>
                                      )}
                                      {item.currentStage && (
                                        <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                          {toDisplayLabel(item.currentStage) ?? formatCompactLabel(item.currentStage)}
                                        </span>
                                      )}
                                    </div>
                                    {item.whyNotTop3 && (
                                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                                        {item.whyNotTop3}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              {normalizedGrowthOutlook.alsoConsidered.length > 2 && (
                                <details className="border-t border-border/35 pt-2">
                                  <summary className="cursor-pointer list-none text-[10px] text-muted-foreground hover:text-foreground">
                                    Show more ({normalizedGrowthOutlook.alsoConsidered.length - 2})
                                  </summary>
                                  <div className="mt-2 space-y-3">
                                    {normalizedGrowthOutlook.alsoConsidered
                                      .slice(2)
                                      .map((item, idx) => (
                                        <div
                                          key={`also-considered-drawer-extra-${idx}`}
                                          className="rounded-lg border border-border/30 bg-background/70 px-3 py-2.5 space-y-1.5"
                                        >
                                          <div className="flex flex-wrap items-center gap-2">
                                            {item.catalyst && (
                                              <p className="text-[12px] font-medium leading-snug text-foreground">
                                                {item.catalyst}
                                              </p>
                                            )}
                                            {item.currentStage && (
                                              <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                                {toDisplayLabel(item.currentStage) ?? formatCompactLabel(item.currentStage)}
                                              </span>
                                            )}
                                          </div>
                                          {item.whyNotTop3 && (
                                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                              {item.whyNotTop3}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                </details>
                              )}
                            </div>
                            <DrawerFooter className="border-t border-border">
                              <DrawerClose asChild>
                                <Button variant="outline">Close</Button>
                              </DrawerClose>
                            </DrawerFooter>
                          </DrawerContent>
                        </Drawer>
                      )}
                    </div>
                    {normalizedGrowthOutlook.discoverySummary &&
                      (normalizedGrowthOutlook.discoverySummary.selectedCount != null ||
                        normalizedGrowthOutlook.discoverySummary.totalCandidatesConsidered != null ||
                        normalizedGrowthOutlook.discoverySummary.selectionPriorityStack) && (
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {[
                            normalizedGrowthOutlook.discoverySummary.selectedCount != null &&
                            normalizedGrowthOutlook.discoverySummary.totalCandidatesConsidered != null
                              ? `${normalizedGrowthOutlook.discoverySummary.selectedCount} selected from ${normalizedGrowthOutlook.discoverySummary.totalCandidatesConsidered} candidates`
                              : null,
                            normalizedGrowthOutlook.discoverySummary.selectionPriorityStack
                              ? formatCompactLabel(
                                  normalizedGrowthOutlook.discoverySummary.selectionPriorityStack,
                                ).replace(/>/g, " > ")
                              : null,
                          ]
                            .filter((value): value is string => Boolean(value))
                            .join(" · ")}
                        </p>
                      )}
                  </div>
                  <Carousel opts={{ align: "start" }} className="w-full">
                    <CarouselContent className="items-stretch">
                      {[...normalizedGrowthOutlook.catalysts]
                        .sort((a, b) => {
                          const aPriority = a.priority?.weightedPriority;
                          const bPriority = b.priority?.weightedPriority;

                          if (aPriority == null && bPriority == null) return 0;
                          if (aPriority == null) return 1;
                          if (bPriority == null) return -1;
                          return bPriority - aPriority;
                        })
                        .slice(0, 3)
                        .map((c, idx) => {
                        const timelineItems = c.timelineItems;
                        const hasTimelineDetails = timelineItems.length > 0;
                        const statusDisplay = getCatalystStatusDisplay(c.statusTag);
                        const confidenceDisplay = getCatalystConfidenceDisplay(c.pillConfidence);
                        const impactDisplay = getCatalystImpactPillDisplay(c);
                        const quantifiedLabel = formatCatalystQuantifiedLabel(c);
                        const quantifiedDisplay = splitCatalystQuantifiedLabel(quantifiedLabel);
                        const priorityLabel =
                          c.priority?.weightedPriority != null
                            ? `Priority ${pctFormatter.format(c.priority.weightedPriority)}/5`
                            : null;
                        const whatIsChanging =
                          c.whatIsChanging ??
                          c.evidenceLines.map((line) => line.text).find((line) => Boolean(line)) ??
                          null;
                        const whyItMatters =
                          c.whyItMatters ??
                          c.evidenceLines.map((line) => line.text).find((line) => line !== whatIsChanging) ??
                          null;
                        const catalystAccentClass =
                          c.expectedImpact === "revenue"
                            ? "before:bg-emerald-400/90"
                            : c.expectedImpact === "margin"
                              ? "before:bg-sky-400/90"
                              : "before:bg-amber-400/90";
                        const catalystDotClass =
                          c.expectedImpact === "revenue"
                            ? "bg-emerald-500"
                            : c.expectedImpact === "margin"
                              ? "bg-sky-500"
                              : "bg-amber-500";

                        return (
                          <CarouselItem key={idx} className="basis-full md:basis-1/2 xl:basis-1/3">
                            <article
                              className={`relative flex h-full flex-col overflow-hidden rounded-xl border border-border/25 bg-background/85 p-4 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 ${catalystAccentClass}`}
                            >
                              <div className="flex h-full flex-1 flex-col gap-4">
                                <div className="space-y-3">
                                  {c.catalyst && (
                                    <p className="min-h-[2.6rem] line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                                      {c.catalyst}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                    {statusDisplay && (
                                      <span className={`rounded-full border px-2.5 py-0.5 ${statusDisplay.className}`}>
                                        {statusDisplay.label}
                                      </span>
                                    )}
                                    {c.timing && (
                                      <span className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-foreground">
                                        {c.timing}
                                      </span>
                                    )}
                                    {c.type && (
                                      <span className="rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/35 dark:text-blue-200">
                                        {toDisplayLabel(c.type) ?? c.type}
                                      </span>
                                    )}
                                    {impactDisplay && (
                                      <span className={`rounded-full border px-2.5 py-0.5 ${impactDisplay.className}`}>
                                        {impactDisplay.label}
                                      </span>
                                    )}
                                    {confidenceDisplay && (
                                      <span className={`rounded-full border px-2.5 py-0.5 ${confidenceDisplay.className}`}>
                                        {confidenceDisplay.label}
                                      </span>
                                    )}
                                    {priorityLabel && (
                                      <span className="rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-violet-800 dark:border-violet-700/40 dark:bg-violet-900/35 dark:text-violet-200">
                                        {priorityLabel}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {quantifiedLabel && (
                                  <div className="rounded-xl border border-border/35 bg-muted/15 p-3">
                                    <div className="space-y-2">
                                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                        Quantified change
                                      </p>
                                      <div className="space-y-1">
                                        <p className="text-[18px] font-semibold leading-[1.02] tracking-tight text-foreground sm:text-[20px]">
                                          {quantifiedDisplay.headline ?? quantifiedLabel ?? "Unquantified"}
                                        </p>
                                        {quantifiedDisplay.subline && (
                                          <p className="max-w-[28rem] text-[11px] leading-relaxed text-muted-foreground">
                                            {quantifiedDisplay.subline}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {(whatIsChanging || whyItMatters) && (
                                  <div className="space-y-2">
                                    {whatIsChanging && (
                                      <div className="rounded-lg border border-border/35 bg-background/70 p-3 space-y-1">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                          What Is Changing
                                        </p>
                                        <p className="text-[12px] leading-relaxed text-foreground">
                                          {whatIsChanging}
                                        </p>
                                      </div>
                                    )}
                                    {whyItMatters && (
                                      <div className="rounded-lg border border-emerald-200/35 bg-emerald-50/35 p-3 space-y-1 dark:border-emerald-700/25 dark:bg-emerald-900/10">
                                        <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300 font-semibold">
                                          Why It Matters
                                        </p>
                                        <p className="text-[12px] leading-relaxed text-foreground">
                                          {whyItMatters}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {c.pillDependency && (
                                  <div className="rounded-lg border border-amber-200/35 bg-amber-50/35 px-3 py-2 dark:border-amber-700/25 dark:bg-amber-900/10">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300 font-semibold">
                                      Key dependency
                                    </p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                                      {c.pillDependency}
                                    </p>
                                  </div>
                                )}

                                {timelineItems.length > 0 && (
                                  <div className="space-y-2.5">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                                      Timeline
                                    </p>
                                  </div>
                                )}

                                {hasTimelineDetails && (
                                  <details className="group mt-auto border-t border-border/30 pt-3">
                                    <summary className="list-none cursor-pointer">
                                      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/25 px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/35">
                                        <div className="space-y-0.5">
                                          <span className="block text-[11px] font-medium text-foreground">
                                            Open full timeline
                                          </span>
                                          <span className="block text-[10px] text-muted-foreground">
                                            {timelineItems.length} updates across the full catalyst trail
                                          </span>
                                        </div>
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                          <span className="group-open:hidden">Open</span>
                                          <span className="hidden group-open:inline">Hide</span>
                                        </span>
                                      </div>
                                    </summary>
                                    <div className="mt-3 relative pl-6 before:absolute before:left-[8px] before:top-1 before:bottom-1 before:w-px before:bg-border/60">
                                      <ul className="space-y-3">
                                        {timelineItems.map((t, tIdx) => {
                                          const stageMeta = getTimelineStageDisplay(t.stage);
                                          const period = t.period ?? "";
                                          const source = t.source ?? "";
                                          const quote = t.quote ?? "";
                                          const delta = t.delta ?? "";

                                          return (
                                            <li
                                              key={`${idx}-timeline-extra-${tIdx}`}
                                              className="relative space-y-1.5 pl-4"
                                            >
                                              <span className={`absolute left-0 top-2 h-2.5 w-2.5 rounded-full border-2 border-background ${catalystDotClass}`} />
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span
                                                  className={`px-2 py-0.5 rounded-full uppercase tracking-wide text-[10px] ${stageMeta.className}`}
                                                >
                                                  {stageMeta.label}
                                                </span>
                                                {(period || source) && (
                                                  <span className="text-[11px] text-muted-foreground">
                                                    {period}
                                                    {period && source ? " · " : ""}
                                                    {source}
                                                  </span>
                                                )}
                                              </div>
                                              {quote && (
                                                <p className="text-[12px] leading-relaxed text-foreground">
                                                  {quote}
                                                </p>
                                              )}
                                              {delta && (
                                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                                  {delta}
                                                </p>
                                              )}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  </details>
                                )}
                              </div>
                            </article>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>

                    <div className="mt-2 flex justify-center gap-2 xl:hidden">
                      <div className="flex items-center gap-2">
                        <CarouselPrevious className="static size-9 translate-x-0 translate-y-0 border border-border bg-background/80 text-foreground hover:bg-accent" />
                        <CarouselNext className="static size-9 translate-x-0 translate-y-0 border border-border bg-background/80 text-foreground hover:bg-accent" />
                      </div>
                    </div>
                  </Carousel>
                </div>
              )}
              {hasFutureGrowthDeepDive && (
                <div className={`${nestedDetailClass} px-3 py-2.5 space-y-3`}>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/90">
                      Scenario Analysis
                    </p>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      Base case spans the left column; upside and downside stack on the right.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-stretch">
                    <div>
                      {renderBaseScenarioCard()}
                    </div>
                    <div className="grid gap-3 md:h-full md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="h-full">
                        {renderCompactScenarioCard("upside")}
                      </div>
                      <div className="h-full">
                        {renderCompactScenarioCard("downside")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            renderMissingSectionState(
              "future-growth",
              "Future Growth Prospects",
              "We have not generated forward growth outlook analysis for this company yet.",
            )
          )}
        </SectionCard>
          </div>

          <div data-section-id="guidance-history">
        <SectionCard
          id="guidance-history"
          title="Guidance History"
          headerDescription="Current management stance and quarter-by-quarter evolution."
          headerAction={
            renderGuidanceSnapshotContextDrawer() ?? (
              <span className="text-[11px] text-muted-foreground">
                {guidanceItems.length > 0
                  ? `${guidanceItems.length} tracked`
                  : normalizedGuidanceSnapshot
                    ? "Live"
                    : "Not ready"}
              </span>
            )
          }
        >
          {normalizedGuidanceSnapshot ? (
            <div className="space-y-4">
              {renderGuidanceSnapshotSummary()}
              {guidanceItems.length > 0 ? (
                <div className={`${elevatedMutedBlockClass} p-3 space-y-3`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-wide text-foreground/90 font-semibold">
                      Guidance Tracker
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {guidanceItems.length} thread{guidanceItems.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <GuidanceHistorySection items={guidanceItems} />
                </div>
              ) : null}
            </div>
          ) : guidanceItems.length > 0 ? (
            <GuidanceHistorySection items={guidanceItems} />
          ) : (
            renderMissingSectionState(
              "guidance-history",
              "Guidance History",
              "We have not tracked meaningful management guidance for this company yet.",
            )
          )}
        </SectionCard>
          </div>

          <div data-section-id="community">
        <SectionCard id="community" title="Community">
          <CompanyCommentsSection companyCode={code} />
        </SectionCard>
          </div>
        </CompanyPageWorkspace>
      </div>
    </div>
  );
}
