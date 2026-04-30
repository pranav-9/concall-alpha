import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { TARGET_FY, TARGET_QTR, TARGET_LABEL } from "@/app/q4fy26/data";

async function BannerCounts() {
  const supabase = await createClient();
  const [reportedRes, totalRes] = await Promise.all([
    supabase
      .from("concall_analysis")
      .select("company_code", { count: "exact", head: true })
      .eq("fy", TARGET_FY)
      .eq("qtr", TARGET_QTR),
    supabase
      .from("company")
      .select("code", { count: "exact", head: true }),
  ]);
  const reported = reportedRes.count ?? 0;
  const total = totalRes.count ?? 0;
  const upcoming = Math.max(total - reported, 0);
  return (
    <span className="text-[11px] font-medium text-emerald-100/90">
      {reported} reported · {upcoming} upcoming
    </span>
  );
}

export function Q4FY26Banner() {
  return (
    <Link
      href="/q4fy26"
      prefetch={false}
      className="group block w-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-sky-700 text-emerald-50 transition-colors hover:from-emerald-800 hover:to-sky-800"
    >
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3 px-3 py-2 sm:px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-emerald-50/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-50">
            Live
          </span>
          <span className="truncate text-xs font-semibold text-emerald-50 sm:text-sm">
            {TARGET_LABEL} Earnings Tracker
            <span className="ml-2 hidden text-emerald-100/85 sm:inline">
              — quality buckets, sector splits & expected dates across coverage
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Suspense fallback={null}>
            <BannerCounts />
          </Suspense>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-50 transition-transform group-hover:translate-x-0.5">
            View
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
