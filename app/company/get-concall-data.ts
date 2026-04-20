import { createClient } from "@/lib/supabase/server";
import { buildNewCompanySet } from "@/lib/company-freshness";
import { calculateTrend } from "./utils";
import type { CompanyRow } from "./leaderboard-table";
import type { QuarterData } from "./types";

type QuarterInfo = {
  fy: number;
  qtr: number;
  label: string;
};

export const getConcallData = async () => {
  const supabase = await createClient();
  const [{ data }, { data: companyRows }] = await Promise.all([
    supabase.from("concall_analysis").select(),
    supabase.from("company").select("code, created_at"),
  ]);
  const newCompanySet = buildNewCompanySet(
    ((companyRows ?? []) as Array<{ code: string; created_at?: string | null }>),
  );

  const records = data ?? [];

  // sort newest -> oldest
  const sorted = [...records].sort(
    (a, b) => b.fy - a.fy || b.qtr - a.qtr
  );

  // pick latest 4 unique quarters
  const quarters: QuarterInfo[] = [];
  sorted.forEach((row) => {
    const id = `${row.fy}-${row.qtr}`;
    if (quarters.some((q) => `${q.fy}-${q.qtr}` === id)) return;
    quarters.push({
      fy: row.fy,
      qtr: row.qtr,
      label: row.quarter_label ?? `Q${row.qtr} FY${row.fy}`,
    });
  });
  const selectedQuarters = quarters.slice(0, 4);

  const recordsByCompany = new Map<string, QuarterData[]>();
  for (const row of sorted as QuarterData[]) {
    const bucket = recordsByCompany.get(row.company_code);
    if (bucket) {
      bucket.push(row);
    } else {
      recordsByCompany.set(row.company_code, [row]);
    }
  }

  const rows: CompanyRow[] = Array.from(recordsByCompany.entries()).map(
    ([companyCode, companyRecords]) => {
      const row: CompanyRow = {
        company: companyCode,
        isNew: newCompanySet.has(companyCode.toUpperCase()),
      };
      const latest4 = companyRecords.slice(0, 4);
      const latest12 = companyRecords.slice(0, 12);
      const recordsByQuarter = new Map(
        companyRecords.map((record) => [`${record.fy}-${record.qtr}`, record] as const),
      );

      row["Latest 4Q Avg"] =
        latest4.length > 0
          ? latest4.reduce((acc, curr) => acc + Number(curr.score ?? 0), 0) / latest4.length
          : null;
      row["Latest 12Q Avg"] =
        latest12.length > 0
          ? latest12.reduce((acc, curr) => acc + Number(curr.score ?? 0), 0) / latest12.length
          : null;

      selectedQuarters.forEach((q) => {
        const match = recordsByQuarter.get(`${q.fy}-${q.qtr}`);
        row[q.label] = match?.score ?? null;
      });

      // Trend calculation reused from company detail page
      const trend = calculateTrend(companyRecords.slice(0, 12));
      row.trendDirection = trend.direction;
      row.trendDescription = trend.description;
      row.trendChange = trend.change;
      row.trendRecentAvg = trend.recentAvg;
      row.trendHistoricalAvg = trend.historicalAvg;

      return row;
    },
  );

  const latestLabel = selectedQuarters[0]?.label;
  const sortedRows = latestLabel
    ? rows.sort(
        (a, b) =>
          (Number(b[latestLabel]) || 0) - (Number(a[latestLabel]) || 0)
      )
    : rows;

  return {
    rows: sortedRows,
    quarterLabels: selectedQuarters.map((q) => q.label),
    latestLabel,
    previousLabel: selectedQuarters[1]?.label,
  };
};
