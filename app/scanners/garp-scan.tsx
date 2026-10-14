// GARP scan — growth at a reasonable price: the covered companies whose Growth
// score is Solid or better AND whose Valuation score is Fair or better. Both
// numbers and their band words are the leaderboard's own columns, so a row here
// always matches that company's Growth and Valuation cells on the board.

import Link from "next/link";
import type { ReactNode } from "react";

import { formatShortDate } from "@/app/company/[code]/page-helpers";
import {
  GARP_GROWTH_MIN,
  GARP_VALUATION_MIN,
  garpGrowthBand,
  garpScore,
  garpValuationBand,
  type GarpRow,
  type GarpScan,
} from "@/lib/scanners/garp";
import { GROWTH_BANDS } from "@/lib/growth-band";
import { VALUATION_BANDS } from "@/lib/valuation-band";
import { VALUATION_STALE_AFTER_DAYS } from "@/lib/valuation-check/normalize";
import { cn } from "@/lib/utils";

const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_4rem_4.5rem] sm:items-center sm:gap-y-0";

export function GarpScanView({
  scan,
  mine,
  filter,
}: {
  scan: GarpScan;
  /** Scanning the reader's watchlist companies instead of the covered universe. */
  mine: boolean;
  filter: ReactNode;
}) {
  const n = scan.hits.length;
  const latest = formatShortDate(scan.latestPricedAsOf, true);

  return (
    <section aria-labelledby="garp-heading">
      <h2 id="garp-heading" className="house-display max-w-3xl text-[22px] leading-[1.12] sm:text-[30px]">
        <span className="text-[var(--signal)]">{n}</span> of {mine ? "your " : ""}
        {scan.scanned} {mine ? "watchlist companies" : "companies"} {n === 1 ? "pairs" : "pair"} solid growth with a
        reasonable price
      </h2>
      <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.55] text-[var(--ink-soft)] sm:text-[14px]">
        Growth at a reasonable price: a Growth score of {GARP_GROWTH_MIN.toFixed(1)} or more (Solid or better) and a
        Valuation score of {GARP_VALUATION_MIN.toFixed(1)} or more (Fair or better) &mdash; the same two columns as the
        leaderboard. Ordered by the two weighed equally.
        {scan.richGrowers > 0 ? (
          <>
            {" "}
            Another {scan.richGrowers} grow as well but are priced above Fair.
          </>
        ) : null}{" "}
        Context, not a buy list.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">{filter}</div>

      {n > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]">
          <div
            aria-hidden
            className={cn(
              GRID,
              "house-data hidden border-b border-[var(--rule)] px-5 py-2.5 text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-soft)] sm:grid",
            )}
          >
            <span>Company</span>
            <span className="text-right">Growth</span>
            <span className="text-right">Valuation</span>
            <span className="text-right">Blend</span>
            <span className="text-right">Priced</span>
          </div>
          <ul>
            {scan.hits.map((row) => (
              <li key={row.code} className="border-b border-[var(--rule)] last:border-b-0">
                <GarpRowView row={row} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
          {mine
            ? "None of your watchlist companies pairs solid growth with a fair price right now."
            : "No covered company pairs solid growth with a fair price right now."}
        </p>
      )}

      <ul className="house-data mt-4 max-w-2xl space-y-1.5 text-[10.5px] leading-[1.5] text-[var(--ink-soft)]">
        <li>
          Growth score: our forward growth outlook, 0&ndash;10. Valuation score: the Valuation Check&rsquo;s 0&ndash;100
          read shown on 0&ndash;10 &mdash; higher means more attractively priced.
        </li>
        {scan.staleCount > 0 ? (
          <li>
            {scan.staleCount} {scan.staleCount === 1 ? "company is" : "companies are"} held back: priced more than{" "}
            {VALUATION_STALE_AFTER_DAYS} days ago, so the valuation score is out of date.
          </li>
        ) : null}
        {latest ? <li>Latest pricing {latest}.</li> : null}
      </ul>
    </section>
  );
}

function GarpRowView({ row }: { row: GarpRow }) {
  const growth = GROWTH_BANDS[garpGrowthBand(row)];
  const valuation = VALUATION_BANDS[garpValuationBand(row)];
  const blend = garpScore(row).toFixed(1);
  return (
    <Link
      href={`/company/${encodeURIComponent(row.code)}`}
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
          <span className="sm:hidden"> · Blend {blend}</span>
        </p>
      </div>
      <ScoreCell
        label="Growth"
        score={row.growth}
        band={growth.label}
        note={row.baseGrowth ? `${row.baseGrowth} base case` : null}
        tone="text-[var(--signal)]"
      />
      <ScoreCell
        label="Valuation"
        score={row.valuation}
        band={valuation.label}
        note={null}
        tone={valuation.key === "fair" ? "text-[var(--ink)]" : "text-[var(--signal)]"}
      />
      <p className="house-data hidden text-right text-[13px] text-[var(--ink)] sm:block">{blend}</p>
      <p className="house-data hidden text-right text-[11px] text-[var(--ink-soft)] sm:block">
        {formatShortDate(row.pricedAsOf) ?? "—"}
      </p>
    </Link>
  );
}

function ScoreCell({
  label,
  score,
  band,
  note,
  tone,
}: {
  label: string;
  score: number;
  band: string;
  note: string | null;
  tone: string;
}) {
  return (
    <div className="min-w-0 sm:text-right">
      <p className="house-data text-[9px] uppercase tracking-[0.12em] text-[var(--ink-soft)] sm:hidden">{label}</p>
      <p className="house-data flex items-baseline gap-1.5 sm:justify-end">
        <span className={cn("text-[17px] leading-none", tone)}>{score.toFixed(1)}</span>
        <span className="text-[9.5px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">{band}</span>
      </p>
      {note ? <p className="house-data mt-1 text-[10px] text-[var(--ink-soft)]">{note}</p> : null}
    </div>
  );
}
