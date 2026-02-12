import Link from "next/link";
import ConcallScore from "@/components/concall-score";
import { createClient } from "@/lib/supabase/server";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export const revalidate = 120;

type RawRow = {
  company_code: string;
  score: number;
  fy: number;
  qtr: number;
  quarter_label?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  company?: { name: string | null }[] | { name: string | null } | null;
};

type UpdateItem = {
  companyCode: string;
  companyName: string;
  score: number;
  quarterLabel: string;
  updatedAt: string | null;
};

type NewCompanyItem = {
  code: string;
  name: string;
  createdAt: string | null;
};

const parseDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: string | null) => {
  const date = parseDate(value);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const eventTimeMs = (row: RawRow) =>
  parseDate(row.updated_at)?.getTime() ??
  parseDate(row.created_at)?.getTime() ??
  0;

async function getRecentUpdates() {
  const supabase = await createClient();
  const { data: latestQuarterRow } = await supabase
    .from("concall_analysis")
    .select("fy,qtr")
    .order("fy", { ascending: false })
    .order("qtr", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestQuarterRow) return [] as UpdateItem[];

  const { data, error } = await supabase
    .from("concall_analysis")
    .select(
      "company_code,score,fy,qtr,quarter_label,updated_at,created_at,company(name)"
    )
    .eq("fy", latestQuarterRow.fy)
    .eq("qtr", latestQuarterRow.qtr)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return [] as UpdateItem[];

  const rows = (data ?? []) as RawRow[];
  const latestByCompany = new Map<string, RawRow>();

  rows.forEach((row) => {
    const existing = latestByCompany.get(row.company_code);
    if (!existing || eventTimeMs(row) > eventTimeMs(existing)) {
      latestByCompany.set(row.company_code, row);
    }
  });

  return Array.from(latestByCompany.values())
    .sort((a, b) => eventTimeMs(b) - eventTimeMs(a))
    .slice(0, 5)
    .map((row) => {
      const companyNameRaw = Array.isArray(row.company)
        ? row.company[0]?.name
        : row.company?.name;

      return {
        companyCode: row.company_code,
        companyName: companyNameRaw ?? row.company_code,
        score: Number(row.score),
        quarterLabel: row.quarter_label ?? `Q${row.qtr} FY${row.fy}`,
        updatedAt: row.updated_at ?? row.created_at ?? null,
      };
    });
}

async function getNewestCompanies() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company")
    .select("code,name,created_at")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(5);

  if (error) return [] as NewCompanyItem[];

  return (data ?? []).map((row) => ({
    code: String(row.code ?? ""),
    name: String(row.name ?? row.code ?? "—"),
    createdAt: (row.created_at as string | null | undefined) ?? null,
  }));
}

export default async function RecentScoreUpdates() {
  const [updates, newestCompanies] = await Promise.all([
    getRecentUpdates(),
    getNewestCompanies(),
  ]);
  if (updates.length === 0 && newestCompanies.length === 0) return null;

  return (
    <section className="w-[95%] sm:w-[90%] pt-6 sm:pt-8">
      <div className="md:hidden mb-2">
        <h2 className="text-base font-bold text-white">Latest Updates</h2>
      </div>

      <div className="md:hidden">
        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent>
            <CarouselItem className="basis-[94%]">
              <div className="rounded-xl border border-gray-800 bg-gray-950/70">
                <div className="p-3 sm:p-4 border-b border-gray-800">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Recent Score Updates
                  </h2>
                  <p className="text-xs text-gray-400">
                    Latest 5 companies with updated quarterly scores
                  </p>
                </div>
                <div className="divide-y divide-gray-800">
                  {updates.length === 0 && (
                    <div className="p-3 sm:p-4 text-sm text-gray-400">
                      No recent score updates available.
                    </div>
                  )}
                  {updates.map((item) => (
                    <Link
                      key={item.companyCode}
                      href={`/company/${item.companyCode}`}
                      prefetch={false}
                      className="flex items-center justify-between gap-2 p-3 sm:p-4 hover:bg-gray-900/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {item.companyName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.quarterLabel} · {formatDate(item.updatedAt)}
                        </p>
                      </div>
                      <ConcallScore score={item.score} size="sm" />
                    </Link>
                  ))}
                </div>
              </div>
            </CarouselItem>

            <CarouselItem className="basis-[94%]">
              <div className="rounded-xl border border-gray-800 bg-gray-950/70">
                <div className="p-3 sm:p-4 border-b border-gray-800">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    New Companies Added
                  </h2>
                  <p className="text-xs text-gray-400">
                    Latest 5 companies added to the portal
                  </p>
                </div>
                <div className="divide-y divide-gray-800">
                  {newestCompanies.length === 0 && (
                    <div className="p-3 sm:p-4 text-sm text-gray-400">
                      No recently added companies found.
                    </div>
                  )}
                  {newestCompanies.map((item) => (
                    <Link
                      key={item.code}
                      href={`/company/${item.code}`}
                      prefetch={false}
                      className="flex items-center justify-between gap-2 p-3 sm:p-4 hover:bg-gray-900/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Added · {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-gray-900 border border-gray-700 text-gray-300">
                        New
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </CarouselItem>
          </CarouselContent>
          <div className="mt-2 flex justify-center gap-2">
            <CarouselPrevious className="static translate-x-0 translate-y-0" />
            <CarouselNext className="static translate-x-0 translate-y-0" />
          </div>
        </Carousel>
      </div>

      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-950/70">
          <div className="p-3 sm:p-4 border-b border-gray-800">
            <h2 className="text-base sm:text-lg font-bold text-white">
              Recent Score Updates
            </h2>
            <p className="text-xs text-gray-400">
              Latest 5 companies with updated quarterly scores
            </p>
          </div>
          <div className="divide-y divide-gray-800">
            {updates.length === 0 && (
              <div className="p-3 sm:p-4 text-sm text-gray-400">
                No recent score updates available.
              </div>
            )}
            {updates.map((item) => (
              <Link
                key={item.companyCode}
                href={`/company/${item.companyCode}`}
                prefetch={false}
                className="flex items-center justify-between gap-2 p-3 sm:p-4 hover:bg-gray-900/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {item.companyName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.quarterLabel} · {formatDate(item.updatedAt)}
                  </p>
                </div>
                <ConcallScore score={item.score} size="sm" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-950/70">
          <div className="p-3 sm:p-4 border-b border-gray-800">
            <h2 className="text-base sm:text-lg font-bold text-white">
              New Companies Added
            </h2>
            <p className="text-xs text-gray-400">
              Latest 5 companies added to the portal
            </p>
          </div>
          <div className="divide-y divide-gray-800">
            {newestCompanies.length === 0 && (
              <div className="p-3 sm:p-4 text-sm text-gray-400">
                No recently added companies found.
              </div>
            )}
            {newestCompanies.map((item) => (
              <Link
                key={item.code}
                href={`/company/${item.code}`}
                prefetch={false}
                className="flex items-center justify-between gap-2 p-3 sm:p-4 hover:bg-gray-900/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    Added · {formatDate(item.createdAt)}
                  </p>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full bg-gray-900 border border-gray-700 text-gray-300">
                  New
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
