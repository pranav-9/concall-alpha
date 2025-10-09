import React from "react";
import { ChartLineLabel } from "./chart";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  // fetch data with company_code if needed
  // const data = await getCompany(company_code)

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("concall_analysis")
    .select()
    .eq("company_code", code)
    .order("fy", { ascending: false })
    .order("qtr", { ascending: false });

  if (error) {
    throw error;
  }

  console.log(data);

  const latestQuarterData = data[0];

  console.log(latestQuarterData);

  return (
    <div className="flex flex-col w-[80%] p-8 gap-8 justify-self-center">
      {/* <div className="flex gap-2 ">
        <div className="w-3/4">{code}</div>
        <div>rating</div>
      </div> */}
      <div className="flex gap-4 bg-gray-900 rounded-xl p-4">
        <div className="flex w-full gap-2 ">
          {/* <p className="p-1">{1 + "."}</p> */}

          <div className="flex flex-col w-3/4">
            <p className="font-bold text-3xl ">
              {latestQuarterData.company_code}
            </p>

            <div>
              <Badge className="bg-green-400">s.label</Badge>
            </div>
          </div>
        </div>
        <div>
          <Badge
            className="h-12 rounded-full px-1  bg-green-400"
            variant="destructive"
          >
            <p className="text-lg font-extrabold  text-black">
              {latestQuarterData.score}
            </p>
          </Badge>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          {" "}
          <p className="text-3xl lg:text-5xl font-extrabold !leading-tight  ">
            Current Quarter Breakdown for {code}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          {latestQuarterData.summary.map((s, i) => (
            <div key={i} className="bg-gray-900 p-2 rounded-2xl">
              <div className="font-bold text-xl">{s.topic}</div>
              <div className="text-gray-300">{s.detail}</div>

              {/* <div>section 1</div> */}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4 w-full">
        <div>
          {" "}
          <p className="text-3xl lg:text-5xl font-extrabold !leading-tight  ">
            Historical Trend
          </p>
        </div>
        <div className="flex justify-center">
          <ChartLineLabel></ChartLineLabel>
        </div>
      </div>
    </div>
  );
}
