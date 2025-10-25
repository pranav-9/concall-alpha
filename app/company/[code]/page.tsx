import React from "react";
import { ChartLineLabel } from "./chart";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import ConcallScore, { categoryFor } from "@/components/concall-score";
import { ChartRadarLabelCustom } from "./radarchart";

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
    <div className="flex px-16 p-8 gap-4 justify-self-center">
      {/* left side  */}
      <div id="left-side" className="w-[65%] flex flex-col gap-8">
        {/* title card */}
        <div id="card-holder" className="bg-gray-900 rounded-xl p-8">
          <div className="flex flex-col  gap-2 px-8 w-3/4">
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

        {/* qtr breakdown card*/}
        <div id="card-holder" className="bg-gray-900 rounded-xl p-8">
          <div className="flex flex-col gap-4">
            <div>
              {" "}
              <p className="text-xl lg:text-xl font-bold !leading-tight  ">
                Concall Highlights
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
                    <div className="font-bold text-md">{s.topic}</div>
                    <div className="text-gray-300 text-xs">{s.detail}</div>
                    <div className="text-gray-300 text-sm">{s.text}</div>

                    {/* <div>section 1</div> */}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* historical trend card  */}
        <div id="card-holder" className="bg-gray-900 rounded-xl p-8">
          <div className="flex flex-col gap-4 w-full">
            <div>
              {" "}
              <p className="text-xl lg:text-xl font-extrabold !leading-tight  ">
                Historical Trend
              </p>
            </div>
            <div className="flex justify-center">
              <ChartLineLabel chartData={chartData}></ChartLineLabel>
            </div>
          </div>
        </div>
      </div>

      {/* right side */}
      <div id="right-side" className="w-[35%]">
        {/* title card */}
        <div
          id="card-holder"
          className="bg-gray-900 rounded-3xl p-8 flex flex-col gap-4"
        >
          <div className="flex">
            <div className="flex w-full gap-2 ">
              {/* <p className="p-1">{1 + "."}</p> */}

              <div className="flex flex-col w-3/4">
                <p className="font-bold text-xl ">
                  Concall Score Breakdown
                  {/* {latestQuarterData.company_code} */}
                </p>

                <p className="font-bold text-sm text-gray-300">
                  {latestQuarterData.company_code}
                </p>
              </div>
            </div>
            <div>
              <ConcallScore score={latestQuarterData.score}></ConcallScore>
            </div>
          </div>

          <ChartRadarLabelCustom></ChartRadarLabelCustom>
        </div>
      </div>
    </div>
  );
}
