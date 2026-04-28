import type { NormalizedGrowthCatalyst } from "@/lib/growth-outlook/types";
import { pctFormatter } from "./page-helpers";

export type OverviewBodyPillTone = "emerald" | "sky" | "amber" | "rose" | "slate";

export type DisplayBadge = {
  label: string;
  className: string;
};

export const getPercentileTone = (percentile: number): OverviewBodyPillTone => {
  if (percentile >= 90) return "emerald";
  if (percentile >= 75) return "sky";
  if (percentile >= 50) return "amber";
  return "rose";
};

export const overviewBodyPillClass = (tone: OverviewBodyPillTone | undefined): string => {
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

export const formatCompactLabel = (value: string) => value.replace(/_/g, " ").trim();

export type MarginQualityTone = "emerald" | "amber" | "rose" | "neutral";

export const getMarginQualityTone = (rangeOrLabel: string | null): MarginQualityTone => {
  if (!rangeOrLabel) return "neutral";
  const lower = rangeOrLabel.toLowerCase();
  if (/\b(thin|weak|poor|low|compressed|squeezed|negative|loss|depressed)\b/.test(lower)) {
    return "rose";
  }
  if (/\b(strong|healthy|high|robust|rich|attractive|premium|excellent|superior)\b/.test(lower)) {
    return "emerald";
  }
  return "amber";
};

export const marginQualityPillClass: Record<MarginQualityTone, string> = {
  emerald:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
  amber:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  rose:
    "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-300",
  neutral: "border-border/60 bg-muted/50 text-foreground",
};

export const toDisplayLabel = (value: string | null) => {
  const compact = value ? formatCompactLabel(value) : "";
  if (!compact) return null;
  return compact.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getImpactDirectionDisplay = (value: string | null): DisplayBadge | null => {
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

export const getTimeHorizonDisplay = (value: string | null): DisplayBadge | null => {
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

export const timelineStageConfig: Record<string, DisplayBadge> = {
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

export const getTimelineStageDisplay = (stage?: string | null): DisplayBadge => {
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

export const getCatalystStatusDisplay = (value: string | null): DisplayBadge | null => {
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

export const getCatalystConfidenceDisplay = (value: string | null): DisplayBadge | null => {
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
          "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
      };
    case "low":
      return {
        label: "Low confidence",
        className:
          "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
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

export const getCatalystImpactPillDisplay = (
  catalyst: NormalizedGrowthCatalyst,
): DisplayBadge | null => {
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

export const formatCatalystQuantifiedLabel = (catalyst: NormalizedGrowthCatalyst) => {
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

export const splitCatalystQuantifiedLabel = (label: string | null) => {
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
  const subline = [remainder || null, parenthetical]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return {
    headline,
    subline: subline || null,
  };
};

export const getGuidanceSnapshotStyleDisplay = (value: string | null): DisplayBadge | null => {
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

export const getGuidanceSignalTrendDisplay = (value: string | null): DisplayBadge | null => {
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

export const getGuidanceAccuracyVerdictDisplay = (value: string | null): DisplayBadge | null => {
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

export const getGuidanceCredibilityVerdictDisplay = (
  value: string | null,
): DisplayBadge | null => {
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

export const getGrowthScoreComponentLabel = (key: string) => {
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
