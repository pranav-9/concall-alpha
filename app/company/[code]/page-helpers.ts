import type {
  CompanyIndustryAnalysisRow,
  NormalizedIndustryTheme,
} from "@/lib/company-industry-analysis/types";

export type SectorRankInfo = { rank: number | null; total: number } | null;
export type ThemeItemWithSource = NormalizedIndustryTheme & {
  sourceSubSector?: string;
};

export type CompanyIndustryAnalysisRowMaybe = CompanyIndustryAnalysisRow | null | undefined;

export const computeAvgScore = (
  latestQuarterScore: number | null,
  growthScore: number | null,
  avg4QuarterScore: number | null = null,
) => {
  const valid = [latestQuarterScore, growthScore, avg4QuarterScore].filter(
    (value): value is number => value != null,
  );
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

export const compareNullableNumbers = (
  a: number | null,
  b: number | null,
  order: "asc" | "desc",
) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return order === "asc" ? a - b : b - a;
};

export const pctFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

export const formatPctLabel = (value: number) => `${pctFormatter.format(value)}%`;

export const formatShortDate = (
  raw: string | null | undefined,
  includeYear = false,
): string | null => {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    ...(includeYear ? { year: "numeric" as const } : {}),
  }).format(date);
};

export const formatRangeLabel = (start: string | null, end: string | null) => {
  if (start && end) return `${start} -> ${end}`;
  return start ?? end ?? null;
};

export const extractSortNumber = (value: string | null | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const matches = value.match(/\d{2,4}/g);
  if (!matches?.length) return Number.NEGATIVE_INFINITY;
  const raw = matches[matches.length - 1];
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};
