import { createClient } from "@/lib/supabase/server";
import { columns, ConcallRow } from "./columns";
import { DataTable } from "./data-table";

// 1) Unique VALUES for a given key (flat key)
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
  // Fetch data from your API here.

  const supabase = await createClient();
  const { data } = await supabase.from("concall_analysis").select();
  // console.log(data);

  const companies = uniqueValues(data, "company_code");

  console.log(companies);

  const output: ConcallRow[] = companies.map((n) => {
    return {
      company: n,
      q1fy26: data?.find(
        (x) => x.company_code == n && x.fy == 2026 && x.qtr == 1
      ).score,
      q4fy25: data?.find(
        (x) => x.company_code == n && x.fy == 2025 && x.qtr == 4
      ).score,
      q3fy25: data?.find(
        (x) => x.company_code == n && x.fy == 2025 && x.qtr == 3
      ).score,
      q2fy25: data?.find(
        (x) => x.company_code == n && x.fy == 2025 && x.qtr == 2
      ).score,
    };
  });

  console.log(output);

  return output.sort((a, b) => b.q1fy26 - a.q1fy26);
};

export default async function DemoPage() {
  // const data = await getData();
  const data = await getConcallData();

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  );
}
