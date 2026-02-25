import { Badge } from "@/components/ui/badge";
import { categoryFor } from "@/components/concall-score";
import { QuarterData } from "../types";

interface OverviewCardProps {
  data?: QuarterData;
  companyInfo?: {
    code?: string;
    name?: string;
    sector?: string;
    subSector?: string;
    exchange?: string;
    country?: string;
  };
  rankInfo?: {
    quarter?: { rank: number; total: number; percentile: number } | null;
    growth?: { rank: number; total: number; percentile: number } | null;
  };
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
  label: string,
  rankData?: { rank: number; total: number; percentile: number } | null,
) => {
  if (!rankData) return `${label}: Not ranked`;
  return `${label} ${rankData.rank} / ${rankData.total} (Top ${Math.round(rankData.percentile)} percentile)`;
};

export function OverviewCard({ data, companyInfo, rankInfo }: OverviewCardProps) {
  const sentiment = data ? categoryFor(data.score) : null;
  const codeLabel = companyInfo?.code ?? data?.company_code ?? "—";
  return (
    <div id="overview" className="bg-card border border-border rounded-lg p-6">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex items-start justify-between w-full gap-3">
            <div className="flex flex-col gap-1.5">
              {companyInfo?.name && (
                <p className="font-bold text-2xl leading-tight text-foreground">
                  {companyInfo.name}
                </p>
              )}
              <p className="text-sm text-muted-foreground leading-tight">
                {codeLabel}
              </p>
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
        {companyInfo?.sector && (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="px-2 py-1 rounded-full bg-muted text-foreground border border-border">
                Sector: {companyInfo.sector}
              </span>
              {companyInfo?.subSector && (
                <span className="px-2 py-1 rounded-full bg-muted text-foreground border border-border">
                  Sub-sector: {companyInfo.subSector}
                </span>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span
            className={`px-2 py-1 rounded-full border ${rankInfo?.quarter ? percentilePillClass(rankInfo.quarter.percentile) : "bg-muted text-muted-foreground border-border"}`}
          >
            {rankPillText("Qtr Score Rank", rankInfo?.quarter)}
          </span>
          <span
            className={`px-2 py-1 rounded-full border ${rankInfo?.growth ? percentilePillClass(rankInfo.growth.percentile) : "bg-muted text-muted-foreground border-border"}`}
          >
            {rankPillText("Growth Score Rank", rankInfo?.growth)}
          </span>
        </div>
      </div>
    </div>
  );
}
