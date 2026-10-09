// Price trend scan — every covered company in its current price phase, grouped
// Up / Sideways / Down, with what drove the phase as a column. Each row is the
// company page's Price journey card in one line (same row, same normalizer), and
// links straight to that card.

import Link from "next/link";
import type { ReactNode } from "react";

import { formatShortDate } from "@/app/company/[code]/page-helpers";
import { monthLabel } from "@/lib/price-phases/normalize";
import type { PhaseKind } from "@/lib/price-phases/types";
import {
  SPLIT_MISSING_NOTE,
  TREND_KINDS,
  trendEps,
  trendMove,
  trendPe,
  trendReason,
  type TrendRow,
  type TrendScan,
} from "@/lib/scanners/price-trend";
import { VALUATION_STALE_AFTER_DAYS } from "@/lib/valuation-check/normalize";
import { cn } from "@/lib/utils";

const GROUP_LABEL: Record<PhaseKind, string> = { up: "Rising", side: "Sideways", down: "Falling" };
const MOVE_TONE: Record<PhaseKind, string> = {
  up: "text-[var(--signal)]",
  side: "text-[var(--ink-soft)]",
  down: "text-[var(--alarm)]",
};

const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-[minmax(0,1fr)_7.75rem_4.75rem_8.5rem_4.25rem_7rem] sm:items-center sm:gap-y-0";

function span(years: number): string {
  const months = Math.max(1, Math.round(years * 12));
  return months < 24 ? `${months} mo` : `${(years).toFixed(1)} yr`;
}

export function PriceTrendScanView({
  scan,
  mine,
  filter,
}: {
  scan: TrendScan;
  /** Scanning the reader's watchlist companies instead of the covered universe. */
  mine: boolean;
  filter: ReactNode;
}) {
  const { groups, multipleLed } = scan;
  const latest = formatShortDate(scan.latestAsOf, true);
  const anyNoSplit = TREND_KINDS.some((k) => groups[k].some((r) => r.driver == null));

  return (
    <section aria-labelledby="trend-heading">
      <h2 id="trend-heading" className="house-display max-w-3xl text-[22px] leading-[1.12] sm:text-[30px]">
        Of {mine ? "your " : ""}
        {scan.scanned} {mine ? "watchlist companies" : "companies"},{" "}
        <span className="text-[var(--signal)]">{groups.up.length}</span> are rising,{" "}
        {groups.side.length} moving sideways and <span className="text-[var(--alarm)]">{groups.down.length}</span>{" "}
        falling
      </h2>
      <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.55] text-[var(--ink-soft)] sm:text-[14px]">
        Each company&rsquo;s latest price phase, from its Price journey card. Price = earnings per share × P/E, so every
        move splits exactly into the change in earnings and the change in the multiple; the reason names the larger.
        {groups.up.length > 0 ? (
          <>
            {" "}
            The P/E did more of the work in {multipleLed.up} of the {groups.up.length} rises
            {groups.down.length > 0 ? ` and ${multipleLed.down} of the ${groups.down.length} falls` : ""}.
          </>
        ) : null}{" "}
        Descriptive, not a buy list.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {filter}
        <nav aria-label="Jump to group" className="house-data flex items-center gap-3 text-[10.5px] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
          {TREND_KINDS.map((k) => (
            <a key={k} href={`#trend-${k}`} className="hover:text-[var(--ink)]">
              {GROUP_LABEL[k]} {groups[k].length}
            </a>
          ))}
        </nav>
      </div>

      {scan.scanned === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
          {mine ? "None of your watchlist companies has a current price journey yet." : "No price journey to scan right now."}
        </p>
      ) : (
        TREND_KINDS.map((k) =>
          groups[k].length > 0 ? (
            <div key={k} id={`trend-${k}`} className="mt-7 scroll-mt-28">
              <h3 className="house-data flex items-baseline gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                <span className={cn("text-[13px] font-semibold", MOVE_TONE[k])}>{GROUP_LABEL[k]}</span>
                {groups[k].length}
              </h3>
              <div className="mt-2.5 overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]">
                <div
                  aria-hidden
                  className={cn(
                    GRID,
                    "house-data hidden border-b border-[var(--rule)] px-5 py-2.5 text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-soft)] sm:grid",
                  )}
                >
                  <span>Company</span>
                  <span>Since</span>
                  <span className="text-right">Move</span>
                  <span>Reason</span>
                  <span className="text-right">EPS</span>
                  <span className="text-right">P/E</span>
                </div>
                <ul>
                  {groups[k].map((row) => (
                    <li key={row.code} className="border-b border-[var(--rule)] last:border-b-0">
                      <TrendRowView row={row} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null,
        )
      )}

      <ul className="house-data mt-4 max-w-2xl space-y-1.5 text-[10.5px] leading-[1.5] text-[var(--ink-soft)]">
        <li>
          Phases and turning points are picked automatically from weekly closes (adjusted for splits and bonus issues).
          Sideways: a year or more inside 0.7&ndash;1.5×, or any stretch that moved less than about 15%.
        </li>
        {anyNoSplit ? (
          <li>No split: one end of the phase has no usable P/E (losses, near-zero or stale earnings), so the move is shown without its reason.</li>
        ) : null}
        {scan.staleCount > 0 ? (
          <li>
            {scan.staleCount} {scan.staleCount === 1 ? "company is" : "companies are"} held back: prices more than{" "}
            {VALUATION_STALE_AFTER_DAYS} days old, so their current phase is out of date.
          </li>
        ) : null}
        {latest ? <li>Prices to {latest}.</li> : null}
      </ul>
    </section>
  );
}

function TrendRowView({ row }: { row: TrendRow }) {
  const eps = trendEps(row);
  const pe = trendPe(row);
  return (
    <Link
      href={`/company/${encodeURIComponent(row.code)}#valuation-check-price-journey`}
      prefetch={false}
      className={cn(
        GRID,
        "px-4 py-3.5 transition-colors hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)] sm:px-5 sm:py-3",
      )}
    >
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <p className="truncate text-[14.5px] font-semibold leading-tight text-[var(--ink)]">{row.name ?? row.code}</p>
        <p className="house-data mt-1 truncate text-[10px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          {row.code}
          {row.sector ? ` · ${row.sector}` : ""}
        </p>
      </div>
      <p className="house-data whitespace-nowrap text-[11.5px] text-[var(--ink-soft)]">
        <span className="text-[var(--ink)]">{monthLabel(row.since)}</span> · {span(row.years)}
      </p>
      <p className={cn("house-data text-right text-[17px] leading-none sm:text-[16px]", MOVE_TONE[row.kind])}>
        {trendMove(row)}
      </p>
      <p className="col-span-2 text-[13px] leading-snug text-[var(--ink)] sm:col-span-1">
        {row.driver ? (
          trendReason(row)
        ) : (
          <span className="text-[var(--ink-soft)]" title={row.splitMissing ? SPLIT_MISSING_NOTE[row.splitMissing] : undefined}>
            No split
          </span>
        )}
        {eps || pe ? (
          <span className="house-data ml-1.5 text-[10.5px] text-[var(--ink-soft)] sm:hidden">
            {[eps ? `EPS ${eps}` : null, pe ? `P/E ${pe}` : null].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </p>
      <p className="house-data hidden text-right text-[12.5px] text-[var(--ink)] sm:block">{eps ?? "—"}</p>
      <p className="house-data hidden text-right text-[12.5px] text-[var(--ink)] sm:block">{pe ?? "—"}</p>
    </Link>
  );
}
