import { Badge } from "@/components/ui/badge";
import { categoryFor } from "@/components/concall-score";
import { QuarterData } from "../types";

interface OverviewCardProps {
  data: QuarterData;
}

export function OverviewCard({ data }: OverviewCardProps) {
  return (
    <div id="overview" className="bg-gray-900 rounded-lg p-6">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            <p className="font-bold text-2xl leading-tight">
              {data.company_code}
            </p>
            <Badge className={`${categoryFor(data.score).bg} text-xs px-2 py-1`}>
              {categoryFor(data.score).label}
            </Badge>
          </div>
          <div className="text-right text-xs text-gray-400 leading-tight space-y-0.5">
            <p>FY {data.fy}</p>
            <p>Q{data.qtr}</p>
            <p className="text-[11px] mt-1">{data.quarter_label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
