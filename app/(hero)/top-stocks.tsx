import ConcallScore, { categoryFor } from "@/components/concall-score";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import React from "react";

export const revalidate = 300;

type Quarter = { fy: number; qtr: number; label: string };

const scoreToLabel = (score: number) => {
  if (score >= 8.5) return "Extremely Bullish";
  if (score >= 6.5) return "Bullish";
  if (score >= 5.0) return "Neutral";
  if (score >= 3.5) return "Bearish";
  return "Extremely Bearish";
};

const getLatestQuarter = async (supabase: ReturnType<typeof createClient>) => {
  const { data, error } = await supabase
    .from("concall_analysis")
    .select("fy,qtr,quarter_label")
    .order("fy", { ascending: false })
    .order("qtr", { ascending: false })
    .limit(1);

  if (error) throw error;
  const latest = data?.[0];
  if (!latest) return null;
  return {
    fy: latest.fy,
    qtr: latest.qtr,
    label: latest.quarter_label ?? `Q${latest.qtr} FY${latest.fy}`,
  } as Quarter;
};

const getTopStocks = async (
  supabase: ReturnType<typeof createClient>,
  quarter: Quarter,
  top: boolean,
  count: number,
) => {
  const { data, error } = await supabase
    .from("concall_analysis")
    .select("company_code, score, company(name)")
    .eq("fy", quarter.fy)
    .eq("qtr", quarter.qtr)
    .order("score", { ascending: !top })
    .limit(count)
    .returns<
      {
        company_code: string;
        score: number;
        company: { name: string } | null;
      }[]
    >();

  if (error) throw error;

  const normalized = (data ?? []).map((row) => {
    const name = row.company?.name ?? "—";
    const scoreNum = Number(row.score);
    return {
      code: row.company_code,
      name,
      score: Math.round(scoreNum * 100) / 100,
      label: scoreToLabel(scoreNum),
    };
  });

  // Only keep clearly bullish names in the "Most Bullish" list
  if (top) {
    return normalized.filter((n) => n.score >= 7);
  }

  // For the "Least Bullish" list, exclude anything above 7
  return normalized.filter((n) => n.score <= 7);
};

const TopStocks = async () => {
  const supabase = await createClient();
  const latestQuarter = await getLatestQuarter(supabase);

  if (!latestQuarter) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-muted-foreground">
        <p>No concall data available yet.</p>
      </div>
    );
  }

  const topStocks = await getTopStocks(supabase, latestQuarter, true, 5);
  const bottomStocks = await getTopStocks(supabase, latestQuarter, false, 5);

  const data2 = [
    {
      title: "Most Bullish",
      stocks: topStocks,
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
      title: "Least Bullish",
      stocks: bottomStocks,
      //   [
      //   {
      //     name: "Aarti Pharmalabs",
      //     score: 7.89,
      //     label: "Extremely Bullish",
      //   },
      //   {
      //     name: " Pharmalabs",
      //     score: 7.89,
      //     label: "Extremely Bullish",
      //   },
      //   {
      //     name: "ghjghj Pharmalabs",
      //     score: 7.89,
      //     label: "Extremely Bullish",
      //   },
      // ],
    },
  ];

  return (
    <div className="flex flex-col w-[95%] gap-4 justify-items-center items-center pt-16">
      <p className="text-4xl lg:text-6xl font-extrabold !leading-tight text-center">
        {latestQuarter.label} Concalls
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:p-4 gap-8 sm:w-[80%] w-full">
        {data2.map((list, i) => (
          <div key={i} className="flex flex-col rounded-xl border-2">
            <div className=" p-4 font-bold text-white text-2xl bg-black rounded-t-xl border-2">
              {list.title}
            </div>
            <div className="flex flex-col gap-4 pb-8 p-4">
              {list.stocks.map((s, index) => (
                <div key={index}>
                  <Link href={"/company/" + s.code} prefetch={false}>
                    <div className="flex gap-4 bg-gray-900 rounded-xl p-4">
                      <div className="flex w-full gap-2 ">
                        <p className="p-1">{index + 1 + "."}</p>

                        <div className="flex flex-col w-3/4">
                          <p className="font-medium text-xl  line-clamp-1 ">
                            {s.name}
                          </p>

                          <div>
                            <Badge className={categoryFor(s.score).bg}>
                              {categoryFor(s.score).label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ConcallScore score={s.score}></ConcallScore>
                    </div>{" "}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Link href={"/company"} prefetch={false}>
        <p className="text-2xl lg:text-4xl font-bold !leading-tight pt-8 underline">
          See full list {">>"}
        </p>
      </Link>
    </div>
  );
};

export default TopStocks;
