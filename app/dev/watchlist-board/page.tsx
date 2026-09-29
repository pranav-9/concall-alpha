import { notFound } from "next/navigation";

import { getConcallData } from "@/app/company/get-concall-data";
import {
  buildWatchlistBoard,
  type CompanyNameRow,
  type GrowthRankRow,
} from "@/app/watchlists/[id]/build-board";
import { ScoreBoardTable } from "@/components/score-board-table";
import { COVERAGE_SELECT } from "@/lib/coverage-policy";
import { PAGE_SHELL } from "@/lib/design/shell";
import { createClient } from "@/lib/supabase/server";

// Dev-only preview of the watchlist board (the "signals" layout) without a
// signed-in session: ?codes=TDPOWERSYS,KAYNES,... renders the same rows the
// real page would build for a list holding those codes, live signals included.
// Pick codes that exercise the branches: a deep-tracked company (guidance
// strength present), one without a quality row, a large cap, a no-moat one.
const DEFAULT_CODES = "TDPOWERSYS,KAYNES,DIXON,VINYAS,ZAGGLE,SYRMA,HFCL,STLTECH";

export default async function WatchlistBoardPreview({
  searchParams,
}: {
  searchParams: Promise<{ codes?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { codes } = await searchParams;
  const watchlistCodes = (codes ?? DEFAULT_CODES)
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z0-9&-]+$/.test(c));

  const supabase = await createClient();
  const [{ rows, latestLabel }, { data: companyNameRows }, { data: growthRows }] = await Promise.all([
    getConcallData(),
    supabase.from("company").select(`code, name, ${COVERAGE_SELECT}`),
    supabase
      .from("growth_outlook")
      .select("company, growth_score, run_timestamp")
      .order("run_timestamp", { ascending: false }),
  ]);

  const { tableRows, overallRankByCode } = await buildWatchlistBoard({
    watchlistCodes,
    rows,
    latestLabel: latestLabel ?? null,
    companyNameRows: (companyNameRows ?? []) as CompanyNameRow[],
    growthRows: (growthRows ?? []) as GrowthRankRow[],
  });

  return (
    <main className="house relative min-h-screen">
      <div className={`${PAGE_SHELL} gap-4 pt-6 sm:pt-8`}>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="house-data text-[12px]" style={{ color: "var(--ink-soft)" }}>
              {tableRows.length} companies{latestLabel ? ` · latest quarter ${latestLabel}` : ""} · dev preview
            </p>
            <h1 className="house-display text-3xl sm:text-[2.6rem]">Watchlist board</h1>
          </div>
          <p className="shrink-0 text-[12px] sm:pb-1.5" style={{ color: "var(--ink-soft)" }}>
            Ranked by SOAS score · quality weighted 2:1 over price
          </p>
        </header>
        <div
          className="overflow-hidden rounded-[1.45rem] border shadow-[0_18px_38px_-32px_rgba(15,23,42,0.24)]"
          style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}
        >
          <ScoreBoardTable
            rows={tableRows}
            watchlistId={0}
            overallRankByCode={overallRankByCode}
            layout="signals"
          />
        </div>
      </div>
    </main>
  );
}
