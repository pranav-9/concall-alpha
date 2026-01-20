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
  signal?: "sentiment" | "growth";
};

type GrowthRow = {
  company: string;
  fiscal_year?: string | null;
  base_growth_pct?: string | number | null;
  upside_growth_pct?: string | number | null;
  downside_growth_pct?: string | number | null;
  growth_score?: string | number | null;
  growth_score_formula?: string | null;
  growth_score_steps?: string[] | null;
};

type GrowthItem = {
  company: string;
  displayName?: string;
  fiscalYear?: string | null;
  base?: number | null;
  upside?: number | null;
  downside?: number | null;
  sum4?: number | null;
  avg4?: number | null;
  growthScore?: number | null;
  growthFormula?: string | null;
  growthSteps?: string[] | null;
  rank?: number;
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

  const leastBullish = companies
    .filter((c) => !Number.isNaN(c.latestScore) && c.latestScore <= 7)
    .sort((a, b) => a.latestScore - b.latestScore)
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
    { title: "Top Past Sentiment (4Q avg)", items: strong4Q, scoreKey: "avg4", signal: "sentiment" },
  ];

  const weakness: ListBlock[] = [
    { title: "Least Bullish", items: leastBullish, scoreKey: "latest" },
    { title: "Biggest Decliners (QoQ)", items: decliners, scoreKey: "latest" },
  ];

  return { strength, weakness, latestLabel: latest?.label ?? "" };
};

const parsePct = (val: string | number | null | undefined): number | null => {
  if (val == null) return null;
  if (typeof val === "number") return val;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : null;
};

const fetchGrowthList = async (supabase: SupabaseServerClient) => {
  const { data, error } = await supabase
    .from("growth_outlook")
    .select("company, fiscal_year, base_growth_pct, upside_growth_pct, downside_growth_pct, growth_score, growth_score_formula, growth_score_steps")
    .order("run_timestamp", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as GrowthRow[];
  const latestByCompany = new Map<string, GrowthRow>();
  rows.forEach((row) => {
    if (!latestByCompany.has(row.company)) {
      latestByCompany.set(row.company, row);
    }
  });

  const items: GrowthItem[] = Array.from(latestByCompany.values())
    .map((r) => ({
      company: r.company,
      fiscalYear: r.fiscal_year,
      base: parsePct(r.base_growth_pct),
      upside: parsePct(r.upside_growth_pct),
      downside: parsePct(r.downside_growth_pct),
      growthScore: parsePct(r.growth_score),
      growthFormula: r.growth_score_formula ?? null,
      growthSteps: Array.isArray(r.growth_score_steps) ? r.growth_score_steps : null,
    }))
    .filter((i) => i.base != null || i.upside != null || i.downside != null)
    .sort((a, b) => (b.base ?? b.upside ?? 0) - (a.base ?? a.upside ?? 0))
    .slice(0, 5);

  return items;
};

const buildFourQSumMap = (records: CompanyRecord[]) => {
  const map = new Map<string, { sum: number; count: number }>();
  const companyMap = new Map<string, CompanyRecord[]>();
  const nameMap = new Map<string, string>();

  records.forEach((r) => {
    if (!companyMap.has(r.company_code)) companyMap.set(r.company_code, []);
    companyMap.get(r.company_code)!.push(r);
    const codeKey = r.company_code?.toUpperCase();
    if (codeKey) {
      const disp = r.company?.name ?? r.company_code;
      nameMap.set(codeKey, disp);
    }
    if (r.company?.name) {
      nameMap.set(r.company.name.toUpperCase(), r.company.name);
    }
  });

  companyMap.forEach((rows) => {
    const sorted = [...rows].sort((a, b) => b.fy - a.fy || b.qtr - a.qtr);
    const last4 = sorted.slice(0, 4);
    const sum4 = last4.reduce((acc, curr) => acc + Number(curr.score ?? 0), 0);
    const count4 = last4.length;
    const codeKey = sorted[0]?.company_code?.toUpperCase();
    const nameKey = sorted[0]?.company?.name?.toUpperCase();
    if (codeKey) map.set(codeKey, { sum: sum4, count: count4 });
    if (nameKey) map.set(nameKey, { sum: sum4, count: count4 });
  });

  return { sumMap: map, nameMap };
};

const TopStocks = async () => {
  const supabase = await createClient();
  const [records, growthLeaders] = await Promise.all([
    fetchAll(supabase),
    fetchGrowthList(supabase),
  ]);

  if (!records.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-muted-foreground">
        <p>No concall data available yet.</p>
      </div>
    );
  }

  const { strength, latestLabel } = buildLists(records);
  const { sumMap, nameMap } = buildFourQSumMap(records);
  const enrichedGrowth = growthLeaders.map((g) => {
    const key = g.company?.toUpperCase();
    const sumEntry = key ? sumMap.get(key) ?? null : null;
    const sum4 = sumEntry?.sum ?? null;
    const avg4 = sumEntry ? sumEntry.sum / Math.max(1, sumEntry.count) : null;
    const displayName = key ? nameMap.get(key) ?? g.company : g.company;
    return { ...g, sum4, avg4, displayName };
  });
  const sortedGrowth = [...enrichedGrowth]
    .sort((a, b) => {
      const aScore = typeof a.growthScore === "number" ? a.growthScore : null;
      const bScore = typeof b.growthScore === "number" ? b.growthScore : null;
      if (aScore != null && bScore != null) return bScore - aScore;
      if (aScore != null) return -1;
      if (bScore != null) return 1;
      const aBase = a.base ?? a.upside ?? 0;
      const bBase = b.base ?? b.upside ?? 0;
      return bBase - aBase;
    })
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return (
    <div className="flex flex-col w-[95%] gap-4 justify-items-center items-center pt-12">
      <div className="text-center space-y-1">
        <p className="text-3xl lg:text-5xl font-extrabold !leading-tight">
          Concall Signals
        </p>
        <p className="text-sm text-gray-400">
          Latest quarter: {latestLabel || "n/a"} · Sentiment uses latest/4Q scores; Growth uses guidance %
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
          <GrowthListCard items={sortedGrowth} />
        </div>
      </div>
      <Link href={"/leaderboards"} prefetch={false}>
        <p className="text-2xl lg:text-4xl font-bold !leading-tight pt-8 underline">
          See full list {">>"}
        </p>
      </Link>
    </div>
  );
};

export default TopStocks;

function ListCard({ list }: { list: { title: string; items: ListItem[]; scoreKey?: "latest" | "avg4"; signal?: "sentiment" | "growth" } }) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-800 bg-gray-950/70">
      <div className="p-3 font-bold text-white text-lg bg-black rounded-t-xl border-b border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <span>{list.title}</span>
          {list.signal && (
            <Badge variant="outline" className="text-[11px] px-2 py-0.5 border-gray-700 uppercase tracking-wide">
              {list.signal === "sentiment" ? "Sentiment" : "Growth"}
            </Badge>
          )}
        </div>
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

function GrowthListCard({ items }: { items: GrowthItem[] }) {
  const visible = items.slice(0, 5);

  return (
    <div className="flex flex-col rounded-xl border border-gray-800 bg-gray-950/70">
      <div className="p-3 font-bold text-white text-lg bg-black rounded-t-xl border-b border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <span>Top Growth Outlook</span>
          <Badge variant="outline" className="text-[11px] px-2 py-0.5 border-gray-700 uppercase tracking-wide">
            Growth
          </Badge>
        </div>
      </div>
      <div className="flex flex-col gap-3 pb-5 p-3">
        {visible.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No growth outlook data yet.
          </p>
        )}
        {visible.map((item, index) => (
          <Link key={item.company + index} href={"/company/" + item.company} prefetch={false}>
            <div className="flex gap-2 bg-gray-900 rounded-lg p-2 border border-gray-800 hover:border-emerald-400/50 transition items-start">
              <p className="p-1 text-[11px] text-gray-400 leading-snug">
                {typeof item.rank === "number" ? `${item.rank}.` : `${index + 1}.`}
              </p>
              <div className="flex w-full gap-2 items-start">
                <div className="flex flex-col w-3/4 gap-1">
                  <p className="font-medium text-sm leading-tight line-clamp-1 text-white">
                    {item.displayName || item.company}
                  </p>
                  {/* FY badge removed per request */}
                </div>
                <div className="flex flex-col items-end gap-0.5 min-w-[72px]">
                  {typeof item.growthScore === "number" ? (
                    <ConcallScore score={item.growthScore} />
                  ) : (
                    <div className="h-10 w-10 rounded-full border border-gray-700 bg-gray-900 flex items-center justify-center text-sm text-gray-400">
                      -
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400">Growth score</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
