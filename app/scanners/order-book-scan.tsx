// Order book scan — every covered company that discloses an order book, ranked
// by that book against today's market cap, with the book's growth beside it.
// The book is the ₹ level series the company's Key Variables card tracks; the
// market cap is the Screener figure under its Valuation Check — so a row here
// always matches what the company page prints.

import Link from "next/link";
import type { ReactNode } from "react";

import { formatShortDate } from "@/app/company/[code]/page-helpers";
import {
  OLD_BOOK_AFTER_DAYS,
  orderBookRatio,
  sortOrderBookRows,
  type OrderBookRow,
  type OrderBookScan,
  type OrderBookSort,
} from "@/lib/scanners/order-book";
import { VALUATION_STALE_AFTER_DAYS } from "@/lib/valuation-check/normalize";
import { cn } from "@/lib/utils";

const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-[minmax(0,1fr)_11.5rem_6rem_7rem_7rem] sm:items-center sm:gap-y-0";

const crore = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const croreSmall = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
/** "₹2,329 cr" — one decimal under ten, whole crore above. */
const formatCrore = (value: number) => `₹${(value < 10 ? croreSmall : crore).format(value)} cr`;

/** The row label without its unit — "Firm unexecuted order book, excluding L1". */
const metricName = (metric: string) => metric.replace(/\s*\([^)]*\)\s*$/, "").trim();

const formatRatio = (x: number) => `${x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toFixed(2)}×`;

const formatGrowth = (pct: number) =>
  `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(0)}%`;

export function OrderBookScanView({
  scan,
  sort,
  mine,
  filter,
  sortHref,
}: {
  scan: OrderBookScan;
  sort: OrderBookSort;
  /** Scanning the reader's watchlist companies instead of the covered universe. */
  mine: boolean;
  filter: ReactNode;
  sortHref: (sort: OrderBookSort) => string;
}) {
  const rows = sortOrderBookRows(scan, sort);
  const n = scan.rows.length;
  const above = scan.rows.filter((r) => orderBookRatio(r) >= 1).length;
  const latest = formatShortDate(scan.latestPricedAsOf, true);

  return (
    <section aria-labelledby="order-book-heading">
      <h2 id="order-book-heading" className="house-display max-w-3xl text-[22px] leading-[1.12] sm:text-[30px]">
        <span className="text-[var(--signal)]">{n}</span> {mine ? "of your watchlist companies" : "companies"}{" "}
        {n === 1 ? "discloses" : "disclose"} an order book
        {above > 0 ? (
          <>
            {" "}
            &mdash; {above} {above === 1 ? "carries" : "carry"} more backlog than market value
          </>
        ) : null}
      </h2>
      <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.55] text-[var(--ink-soft)] sm:text-[14px]">
        Order book over market cap: how many rupees of signed-but-unbilled work sit behind each rupee the market
        pays today. Above 1&times; the backlog alone is worth more than the company. The growth column reads the
        book against the same period a year earlier, so a small book that is compounding shows too. Context, not
        a buy list: a backlog is not revenue until it is executed, and a book can run over several years.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {filter}
        <p className="house-data flex items-center gap-2 text-[10.5px] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
          Sort
          {(["ratio", "growth"] as const).map((s) => (
            <Link
              key={s}
              href={sortHref(s)}
              scroll={false}
              aria-current={sort === s ? "true" : undefined}
              className={cn(
                "rounded px-1 py-0.5 transition-colors",
                sort === s
                  ? "text-[var(--ink)] underline decoration-[var(--mark)] decoration-2 underline-offset-4"
                  : "hover:text-[var(--ink)]",
              )}
            >
              {s === "ratio" ? "book / mcap" : "book growth"}
            </Link>
          ))}
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]">
          <div
            aria-hidden
            className={cn(
              GRID,
              "house-data hidden border-b border-[var(--rule)] px-5 py-2.5 text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-soft)] sm:grid",
            )}
          >
            <span>Company</span>
            <span className="text-right">Order book</span>
            <span className="text-right">Book / mcap</span>
            <span className="text-right">Book growth</span>
            <span className="text-right">Market cap</span>
          </div>
          <ul>
            {rows.map((row) => (
              <li key={row.code} className="border-b border-[var(--rule)] last:border-b-0">
                <OrderBookRowView row={row} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
          {mine
            ? "None of your watchlist companies discloses an order book we track."
            : "No covered company discloses an order book we track right now."}
        </p>
      )}

      <ul className="house-data mt-4 max-w-2xl space-y-1.5 text-[10.5px] leading-[1.5] text-[var(--ink-soft)]">
        <li>
          Order book: the level the company last disclosed, as its Key Variables card tracks it. Where a company
          reports only one segment&rsquo;s book, that segment is named under the figure. Market cap: Screener, on
          the Valuation Check&rsquo;s pricing date.
        </li>
        <li>
          Growth reads &ldquo;YoY&rdquo; against the same period a year earlier; where no such point exists it
          reads against the previous disclosure, named.
        </li>
        {scan.oldBookCount > 0 ? (
          <li>
            {scan.oldBookCount} {scan.oldBookCount === 1 ? "company is" : "companies are"} held back: the book was
            last disclosed more than {Math.round(OLD_BOOK_AFTER_DAYS / 30)} months ago.
          </li>
        ) : null}
        {scan.staleCount > 0 ? (
          <li>
            {scan.staleCount} {scan.staleCount === 1 ? "company is" : "companies are"} held back: priced more than{" "}
            {VALUATION_STALE_AFTER_DAYS} days ago, so the market cap is out of date.
          </li>
        ) : null}
        {latest ? <li>Latest pricing {latest}.</li> : null}
      </ul>
    </section>
  );
}

function OrderBookRowView({ row }: { row: OrderBookRow }) {
  const ratio = orderBookRatio(row);
  const growthNote =
    row.growthKind === "yoy" ? "YoY" : row.growthKind === "prior" && row.growthFrom ? `vs ${row.growthFrom.label}` : null;
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
        </p>
      </div>
      <Cell label="Order book" value={formatCrore(row.book)} note={`${row.period.label} · ${metricName(row.metric)}`} tone="text-[var(--ink)]" />
      <Cell
        label="Book / mcap"
        value={formatRatio(ratio)}
        note={null}
        tone={ratio >= 1 ? "text-[var(--signal)]" : "text-[var(--ink)]"}
      />
      <Cell
        label="Book growth"
        value={row.growthPct == null ? "—" : formatGrowth(row.growthPct)}
        note={growthNote}
        tone={row.growthPct == null ? "text-[var(--ink-soft)]" : row.growthPct >= 0 ? "text-[var(--signal)]" : "text-[var(--ink)]"}
      />
      <Cell label="Market cap" value={formatCrore(row.marketCap)} note={formatShortDate(row.pricedAsOf) ?? null} tone="text-[var(--ink)]" />
    </Link>
  );
}

function Cell({ label, value, note, tone }: { label: string; value: string; note: string | null; tone: string }) {
  return (
    <div className="min-w-0 sm:text-right">
      <p className="house-data text-[9px] uppercase tracking-[0.12em] text-[var(--ink-soft)] sm:hidden">{label}</p>
      <p className={cn("house-data text-[15px] leading-none", tone)}>{value}</p>
      {note ? <p className="house-data mt-1 truncate text-[10px] text-[var(--ink-soft)]">{note}</p> : null}
    </div>
  );
}
