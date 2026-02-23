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
}

export function OverviewCard({ data, companyInfo }: OverviewCardProps) {
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
      </div>
    </div>
  );
}
