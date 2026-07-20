import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";
import { currentReportingQuarter } from "@/lib/current-quarter";

async function BannerCounts({ fy, qtr }: { fy: number; qtr: number }) {
  const supabase = await createClient();
  // Counts mirror the tracker page: discovery-listed companies only, so
  // de-emphasized large caps don't inflate "reported"/"upcoming".
  const [companiesRes, reportedRes] = await Promise.all([
    supabase.from("company").select(`code, ${COVERAGE_SELECT}`),
    supabase
      .from("concall_analysis")
      .select("company_code")
      .eq("fy", fy)
      .eq("qtr", qtr)
      // legacy-logic scores (no details.scoring_meta) are hidden portal-wide
      .not("details->scoring_meta", "is", null),
  ]);
  const listed = new Set(
    (companiesRes.data ?? [])
      .filter(isDiscoveryListed)
      .map((r) => (r.code as string).toUpperCase()),
  );
  const reported = new Set(
    (reportedRes.data ?? [])
      .map((r) => (r.company_code as string | null)?.toUpperCase() ?? "")
      .filter((code) => listed.has(code)),
  ).size;
  const total = listed.size;
  const upcoming = Math.max(total - reported, 0);
  return (
    <span className="text-[11px] font-medium text-emerald-100/90">
      {reported} reported · {upcoming} upcoming
    </span>
  );
}

export function QuarterTrackerBanner() {
  const { fy, qtr, label } = currentReportingQuarter();
  return (
    <Link
      href="/quarter-tracker"
      prefetch={false}
      className="group block w-full bg-gradient-to-r from-emerald-700 via-emerald-600 to-sky-700 text-emerald-50 transition-colors hover:from-emerald-800 hover:to-sky-800"
    >
      <div className="mx-auto flex h-[var(--quarter-tracker-banner-height,2.25rem)] w-full max-w-[1440px] items-center justify-between gap-3 px-3 sm:px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-emerald-50/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-50">
            Live
          </span>
          <span className="truncate text-xs font-semibold text-emerald-50 sm:text-sm">
            {label} Quality Tracker
            <span className="ml-2 hidden text-emerald-100/85 sm:inline">
              — score movement, quality buckets & sector splits across coverage
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Suspense fallback={null}>
            <BannerCounts fy={fy} qtr={qtr} />
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
