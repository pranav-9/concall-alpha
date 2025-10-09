import React from "react";
import { ChartLineLabel } from "./chart";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import ConcallScore, { categoryFor } from "@/components/concall-score";

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  // fetch data with company_code if needed
  // const data = await getCompany(company_code)

  type QuarterData = {
    id: number;
    company_code: string;
    fy: number;
    qtr: number;
    quarter_start_date: string;
    quarter_label: string;
    score: number;
    summary: {
      topic: string;
      text: string;
      detail: string;
    }[];
  };

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

  // console.log(data);

  const latestQuarterData: QuarterData = data[0];

  console.log(latestQuarterData);

  const chartData = data
    .map((x) => {
      return {
        qtr: x.quarter_label,
        score: x.score,
      };
    })
    .reverse();
  console.log(chartData);

  return (
    <div className="flex flex-col  p-8 gap-8 justify-self-center">
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
              {/* <Badge className="bg-green-400">s.label</Badge> */}
              <Badge className={categoryFor(latestQuarterData.score).bg}>
                {categoryFor(latestQuarterData.score).label}
              </Badge>
            </div>
          </div>
        </div>
        <div>
          <ConcallScore score={latestQuarterData.score}></ConcallScore>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          {" "}
          <p className="text-xl lg:text-3xl font-bold !leading-tight  ">
            Current Quarter Breakdown
          </p>
        </div>
        <div className="grid grod-cols-1 sm:grid-cols-2 gap-4 p-4">
          {latestQuarterData.summary.map(
            (
              s: {
                topic: string;
                text: string;
                detail: string;
              },
              i: number
            ) => (
              <div
                key={i}
                className="bg-gray-900 flex flex-col p-4 gap-2 rounded-2xl text-md"
              >
                <div className="font-bold text-xl">{s.topic}</div>
                <div className="text-gray-300">{s.detail}</div>
                <div className="text-gray-300">{s.text}</div>

                {/* <div>section 1</div> */}
              </div>
            )
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 w-full">
        <div>
          {" "}
          <p className="text-xl lg:text-3xl font-extrabold !leading-tight  ">
            Historical Trend
          </p>
        </div>
        <div className="flex justify-center">
          <ChartLineLabel chartData={chartData}></ChartLineLabel>
        </div>
      </div>
    </div>
  );
}
