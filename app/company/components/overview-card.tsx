import { Badge } from "@/components/ui/badge";
import { categoryFor } from "@/components/concall-score";
import { QuarterData } from "../types";

interface OverviewCardProps {
  data: QuarterData;
}

export function OverviewCard({ data }: OverviewCardProps) {
  return (
    <div id="overview" className="bg-gray-900 rounded-xl p-8">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <p className="font-bold text-3xl">{data.company_code}</p>
            <Badge className={categoryFor(data.score).bg}>
              {categoryFor(data.score).label}
            </Badge>
          </div>
          <div className="text-right text-sm text-gray-400">
            <p>FY {data.fy}</p>
            <p>Q{data.qtr}</p>
            <p className="text-xs mt-1">{data.quarter_label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
