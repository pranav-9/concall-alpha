import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WatchlistAnalyticsFallback, WatchlistAnalyticsView } from "@/app/watchlists/[id]/watchlist-analytics";
import { PAGE_SHELL } from "@/lib/design/shell";

// Dev-only preview of the watchlist analytics view without a signed-in
// session: ?codes=TDPOWERSYS,KAYNES,... builds the same four blocks the real
// page would for a list holding those codes, off live rows. Pick codes that
// exercise the branches: a deep-tracked company (guidance strength present),
// one without a quality row, a large cap, a theme member, one with a recent
// filing and one with none.
const DEFAULT_CODES = "TDPOWERSYS,KAYNES,DIXON,VINYAS,ZAGGLE,SYRMA,HFCL,STLTECH";

export default async function WatchlistAnalyticsPreview({
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

  return (
    <main className="house relative min-h-screen">
      <div className={`${PAGE_SHELL} gap-4 pt-6 sm:pt-8`}>
        <header className="space-y-2">
          <p className="house-data text-[12px]" style={{ color: "var(--ink-soft)" }}>
            {watchlistCodes.length} companies · dev preview
          </p>
          <h1 className="house-display text-3xl sm:text-[2.6rem]">Watchlist analytics</h1>
        </header>
        <Suspense fallback={<WatchlistAnalyticsFallback />}>
          <WatchlistAnalyticsView codes={watchlistCodes} />
        </Suspense>
      </div>
    </main>
  );
}
