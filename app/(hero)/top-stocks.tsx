import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import React from "react";

export const revalidate = 300;

const TopStocks = async () => {
  const supabase = await createClient();

  // Join company to get the display name
  const { data, error } = await supabase
    .from("concall_analysis")
    .select("score, company(name)")
    .eq("fy", 2026)
    .eq("qtr", 1)
    .order("score", { ascending: false })
    .limit(3)
    .returns<
      {
        score: number;
        company: { name: string } | null; // embedded parent is a single object
      }[]
    >(); // <<< key line;

  if (error) throw error;

  function scoreToLabel(score: number) {
    // Tune thresholds to match your example output (treat 6.5+ as "Extremely Bullish")
    if (score >= 8.5) return "Extremely Bullish";
    if (score >= 6.5) return "Bullish"; // adjust if you want a "Bullish" tier
    if (score >= 5.0) return "Neutral";
    if (score >= 3.5) return "Bearish";
    return "Extremely Bearish";
  }

  console.log(data);

  const data1 = (data ?? []).map((row) => {
    const name = row.company?.name ?? "—";
    const scoreNum = Number(row.score);
    return {
      name,
      score: Math.round(scoreNum * 100) / 100, // e.g., 7.86
      label: scoreToLabel(scoreNum),
    };
  });

  console.log(data1);

  const data2 = [
    {
      title: "Most Bullish Concalls (Q1FY26)",
      stocks: data1,
      //   [
      //   {
      //     name: "Aarti Pharmalabs",
      //     score: 7.89,
      //     label: "Extremely Bullish",
      //   },
      //   {
      //     name: "Aarti ",
      //     score: 7.86,
      //     label: "Extremely Bullish",
      //   },
      //   {
      //     name: "Aarti sdas",
      //     score: 6.83,
      //     label: "Extremely Bullish",
      //   },
      // ],
    },
    {
      title: "Most Bullish Concalls (Q4FY25)",
      stocks: [
        {
          name: "Aarti Pharmalabs",
          score: 7.89,
          label: "Extremely Bullish",
        },
        {
          name: " Pharmalabs",
          score: 7.89,
          label: "Extremely Bullish",
        },
        {
          name: "ghjghj Pharmalabs",
          score: 7.89,
          label: "Extremely Bullish",
        },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 sm:p-4 gap-8 sm:w-[80%] w-full">
      {data2.map((list, i) => (
        <div key={i} className="flex flex-col rounded-xl border-2">
          <div className=" p-4 font-bold text-white text-2xl bg-black rounded-t-xl border-2">
            {list.title}
          </div>
          <div className="flex flex-col gap-4 pb-8 p-4">
            {list.stocks.map((s, index) => (
              <div
                key={index}
                className="flex gap-4 bg-gray-900 rounded-xl p-4"
              >
                <div className="flex w-full gap-2 ">
                  <p className="p-1">{index + 1 + "."}</p>

                  <div className="flex flex-col w-3/4">
                    <p className="font-medium text-xl">{s.name}</p>

                    <div>
                      <Badge className="bg-green-400">{s.label}</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <Badge
                    className="h-12 rounded-full px-1  bg-green-400"
                    variant="destructive"
                  >
                    <p className="text-lg font-extrabold  text-black">
                      {s.score}
                    </p>
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopStocks;
