import { createClient } from "@/lib/supabase/server";
import { columns, Payment } from "./columns";
import { DataTable } from "./data-table";

async function getData(): Promise<Payment[]> {
  // Fetch data from your API here.
  return [
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@example.com",
    },
    // ...
  ];
}

// 1) Unique VALUES for a given key (flat key)
const uniqueValues = (arr, key, { excludeNullish = true } = {}) => {
  const vals = arr.map((o) => o?.[key]);
  return [...new Set(excludeNullish ? vals.filter((v) => v != null) : vals)];
};

async function getConcallData(): Promise<any> {
  // Fetch data from your API here.

  const supabase = await createClient();
  const { data, error } = await supabase.from("concall_analysis").select();
  console.log(data);

  const companies = uniqueValues(data, "company_code");

  console.log(companies);

  const output = companies.map((n) => {
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

  return output;
}

export default async function DemoPage() {
  // const data = await getData();
  const data = await getConcallData();

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  );
}
