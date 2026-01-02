import { createClient } from "@/lib/supabase/server";
import { LeaderboardTable, type CompanyRow } from "./leaderboard-table";

type QuarterInfo = {
  fy: number;
  qtr: number;
  label: string;
};

const uniqueValues = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arr: any[] | null,
  key: string,
  { excludeNullish = true } = {}
) => {
  const vals = arr?.map((o) => o?.[key]);
  return [...new Set(excludeNullish ? vals?.filter((v) => v != null) : vals)];
};

const getConcallData = async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("concall_analysis").select();

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

  const companies = uniqueValues(records, "company_code");

  const rows: CompanyRow[] = companies.map((companyCode: string) => {
    const row: CompanyRow = { company: companyCode };
    const companyRecords = sorted.filter((x) => x.company_code === companyCode);

    selectedQuarters.forEach((q) => {
      const match = companyRecords.find(
        (x) => x.fy === q.fy && x.qtr === q.qtr
      );
      row[q.label] = match?.score ?? null;
    });

    return row;
  });

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
  };
};

export default async function CompanyLeaderboardPage() {
  const { rows, quarterLabels } = await getConcallData();

  return (
    <div className="container mx-auto py-10">
      <LeaderboardTable quarterLabels={quarterLabels} data={rows} />
    </div>
  );
}
