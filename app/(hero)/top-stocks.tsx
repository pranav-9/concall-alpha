import React from "react";
import Link from "next/link";

import ConcallScore, { categoryFor } from "@/components/concall-score";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type CompanyRecord = {
  company_code: string;
  score: number;
  fy: number;
  qtr: number;
  quarter_label: string | null;
  company: { name: string | null } | null;
};

type RawConcallRow = {
  company_code: string;
  score: number;
  fy: number;
  qtr: number;
  quarter_label?: string | null;
  company?: { name: string | null }[] | { name: string | null } | null;
};

type ListItem = {
  code: string;
  name: string;
  latestScore: number;
  delta?: number | null;
  sum4?: number | null;
  avg4?: number | null;
};

type ListBlock = {
  title: string;
  scoreKey?: "latest" | "avg4";
  items: ListItem[];
};

const fetchAll = async (supabase: SupabaseServerClient) => {
  const { data, error } = await supabase
    .from("concall_analysis")
    .select("company_code, score, fy, qtr, quarter_label, company(name)")
    .order("fy", { ascending: false })
    .order("qtr", { ascending: false });

  if (error) throw error;
  const normalized: CompanyRecord[] = (data ?? []).map((row) => {
    const r = row as RawConcallRow;
    return {
      company_code: r.company_code,
      score: Number(r.score),
      fy: r.fy,
      qtr: r.qtr,
      quarter_label: r.quarter_label ?? null,
      company: Array.isArray(r.company)
        ? r.company[0] ?? { name: null }
        : r.company ?? { name: null },
    };
  });
  return normalized;
};

const uniqueQuarters = (records: CompanyRecord[]) => {
  const seen = new Set<string>();
  const quarters: { fy: number; qtr: number; label: string }[] = [];
  records.forEach((r) => {
    const key = `${r.fy}-${r.qtr}`;
    if (!seen.has(key)) {
      seen.add(key);
      quarters.push({
        fy: r.fy,
        qtr: r.qtr,
        label: r.quarter_label ?? `Q${r.qtr} FY${r.fy}`,
      });
    }
  });
  return quarters;
};

const buildLists = (records: CompanyRecord[]) => {
  if (!records.length) return { strength: [], weakness: [], latestLabel: "" };

  const quarters = uniqueQuarters(records);
  const latest = quarters[0];
  const prev = quarters[1];

  const companyMap = new Map<string, CompanyRecord[]>();
  records.forEach((r) => {
    if (!companyMap.has(r.company_code)) companyMap.set(r.company_code, []);
    companyMap.get(r.company_code)!.push(r);
  });

  const companies: ListItem[] = [];
  companyMap.forEach((rows, code) => {
    const sorted = [...rows].sort((a, b) => b.fy - a.fy || b.qtr - a.qtr);
    const name = sorted[0]?.company?.name ?? "—";
    const latestRec =
      latest &&
      sorted.find((r) => r.fy === latest.fy && r.qtr === latest.qtr);
    const prevRec =
      prev && sorted.find((r) => r.fy === prev.fy && r.qtr === prev.qtr);
    const delta =
      latestRec && prevRec ? Number(latestRec.score) - Number(prevRec.score) : null;
    const last4 = sorted.slice(0, 4);
    const sum4 =
      last4.length > 0
        ? last4.reduce((acc, curr) => acc + Number(curr.score ?? 0), 0)
        : null;
    const avg4 = sum4 != null ? sum4 / last4.length : null;

    companies.push({
      code,
      name,
      latestScore: latestRec ? Number(latestRec.score) : NaN,
      delta,
      sum4,
      avg4,
    });
  });

  const mostBullish = companies
    .filter((c) => !Number.isNaN(c.latestScore) && c.latestScore >= 7)
    .sort((a, b) => b.latestScore - a.latestScore)
    .slice(0, 5);

  const leastBullish = companies
    .filter((c) => !Number.isNaN(c.latestScore) && c.latestScore <= 7)
    .sort((a, b) => a.latestScore - b.latestScore)
    .slice(0, 5);

  const improvers = companies
    .filter((c) => c.delta != null && c.delta > 0)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
    .slice(0, 5);

  const decliners = companies
    .filter((c) => c.delta != null && c.delta < 0)
    .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
    .slice(0, 5);

  const strong4Q = companies
    .filter((c) => c.sum4 != null)
    .sort((a, b) => (b.sum4 ?? 0) - (a.sum4 ?? 0))
    .slice(0, 5);

  const strength: ListBlock[] = [
    { title: "4Q Strength (cumulative)", items: strong4Q, scoreKey: "avg4" },
    { title: "Most Bullish (latest qtr)", items: mostBullish, scoreKey: "latest" },
    { title: "Biggest Improvers (QoQ)", items: improvers, scoreKey: "latest" },
  ];

  const weakness: ListBlock[] = [
    { title: "Least Bullish", items: leastBullish, scoreKey: "latest" },
    { title: "Biggest Decliners (QoQ)", items: decliners, scoreKey: "latest" },
  ];

  return { strength, weakness, latestLabel: latest?.label ?? "" };
};

const TopStocks = async () => {
  const supabase = await createClient();
  const records = await fetchAll(supabase);

  if (!records.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-muted-foreground">
        <p>No concall data available yet.</p>
      </div>
    );
  }

  const { strength, weakness, latestLabel } = buildLists(records);

  return (
    <div className="flex flex-col w-[95%] gap-4 justify-items-center items-center pt-12">
      <div className="text-center space-y-1">
        <p className="text-3xl lg:text-5xl font-extrabold !leading-tight">
          Concall Signals
        </p>
        <p className="text-sm text-gray-400">
          Latest quarter: {latestLabel || "n/a"}
        </p>
      </div>
      <div className="w-full flex flex-col gap-6 sm:w-[90%]">
        <div className="flex items-center gap-2">
          <div className="h-[1px] flex-1 bg-gray-800" />
          <span className="text-sm uppercase tracking-wide text-gray-300">Strength</span>
          <div className="h-[1px] flex-1 bg-gray-800" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strength.map((list, i) => (
            <ListCard key={`strength-${i}`} list={list} />
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <div className="h-[1px] flex-1 bg-gray-800" />
          <span className="text-sm uppercase tracking-wide text-gray-300">Weakness</span>
          <div className="h-[1px] flex-1 bg-gray-800" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weakness.map((list, i) => (
            <ListCard key={`weakness-${i}`} list={list} />
          ))}
        </div>
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

function ListCard({ list }: { list: { title: string; items: ListItem[]; scoreKey?: "latest" | "avg4" } }) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-800 bg-gray-950/70">
      <div className="p-3 font-bold text-white text-lg bg-black rounded-t-xl border-b border-gray-800">
        {list.title}
      </div>
      <div className="flex flex-col gap-3 pb-5 p-3">
        {list.items.length === 0 && (
          <p className="text-sm text-muted-foreground">Not enough data.</p>
        )}
        {list.items.map((s, index) => (
          <div key={index}>
            <Link href={"/company/" + s.code} prefetch={false}>
              <div className="flex gap-2 bg-gray-900 rounded-lg p-2 items-start">
                <div className="flex w-full gap-2 items-start">
                  <p className="p-1 text-[11px] text-gray-400 leading-snug">{index + 1}.</p>

                  <div className="flex flex-col w-3/4 gap-1">
                    <p className="font-medium text-sm leading-tight line-clamp-1 text-white">
                      {s.name}
                    </p>
                    <div>
                      {!Number.isNaN(s.latestScore) && (
                        <Badge className={`text-[11px] px-2 py-0.5 ${categoryFor(s.latestScore).bg}`}>
                          {categoryFor(s.latestScore).label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 min-w-[72px]">
                  {!Number.isNaN(s.latestScore) && (
                    <>
                      <ConcallScore
                        score={
                          list.scoreKey === "avg4" && typeof s.avg4 === "number"
                            ? s.avg4
                            : s.latestScore
                        }
                      />
                      <span className="text-[10px] text-gray-400">
                        {list.scoreKey === "avg4" ? "4Q avg" : "Latest qtr"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
