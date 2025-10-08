import React from "react";
import { ChartLineLabel } from "./chart";
import { Badge } from "@/components/ui/badge";

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  // fetch data with company_code if needed
  // const data = await getCompany(company_code)
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
            <p className="font-medium text-xl">s.name</p>

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
            <p className="text-lg font-extrabold  text-black">8.7</p>
          </Badge>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          {" "}
          <p className="text-3xl lg:text-5xl font-extrabold !leading-tight  ">
            Current Quarter Breakdown
          </p>
        </div>
        <div className="grid grid-cols-2">
          <div>section 1</div>
          <div>section 1</div>
          <div>section 1</div>
          <div>section 1</div>
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
