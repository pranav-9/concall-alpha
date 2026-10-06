// PEG scan — forward and trailing PEG for every covered company with a fresh
// price, filtered to the cheap band by default. The ratios and the four bands
// are the Valuation Check's own (derivePeg + pegBandFor), so a row here always
// matches the PEG cards on that company's Valuation tab.

import Link from "next/link";

import { mobileChipClass, MOBILE_CHIP_STRIP } from "@/components/mobile-card";
import { formatShortDate } from "@/app/company/[code]/page-helpers";
import { pegBandFor, type PegBandKey } from "@/app/company/components/valuation-peg-meter";
import {
  PEG_VIEW_LABEL,
  PEG_VIEWS,
  selectPegRows,
  type PegRow,
  type PegScan,
  type PegSort,
  type PegView,
} from "@/lib/scanners/peg";
import { VALUATION_STALE_AFTER_DAYS } from "@/lib/valuation-check/normalize";
import { cn } from "@/lib/utils";

const BAND_TONE: Record<PegBandKey, string> = {
  cheap: "text-[var(--signal)]",
  fair: "text-[var(--ink)]",
  rich: "text-[var(--warn)]",
  expensive: "text-[var(--alarm)]",
};

const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-[minmax(0,1fr)_3.75rem_9rem_9rem_4.5rem] sm:items-center sm:gap-y-0";

const href = (view: PegView, sort: PegSort) => {
  const qs = new URLSearchParams({ scan: "peg" });
  if (view !== "both") qs.set("view", view);
  if (sort !== "forward") qs.set("sort", sort);
  return `/scanners?${qs.toString()}`;
};

function headline(view: PegView, n: number) {
  const companies = n === 1 ? "company is" : "companies are";
  switch (view) {
    case "both":
      return { lead: `${n}`, rest: ` ${companies} priced under 1× PEG on both forward and trailing growth` };
    case "forward":
      return { lead: `${n}`, rest: ` ${companies} priced under 1× forward PEG` };
    case "trailing":
      return { lead: `${n}`, rest: ` ${companies} priced under 1× trailing PEG` };
    case "all":
      return { lead: "PEG", rest: ` for all ${n} covered companies with a fresh price` };
  }
}

export function PegScanView({ scan, view, sort }: { scan: PegScan; view: PegView; sort: PegSort }) {
  const rows = selectPegRows(scan, view, sort);
  const { lead, rest } = headline(view, scan.counts[view]);
  const anyRevenueBasis = rows.some((r) => r.forward?.basis === "revenue");
  const anyLossYear = rows.some((r) => r.trailing?.hasLossYear);
  const latest = formatShortDate(scan.latestPricedAsOf, true);

  return (
    <section aria-labelledby="peg-heading">
      <h2 id="peg-heading" className="house-display max-w-3xl text-[22px] leading-[1.12] sm:text-[30px]">
        <span className={view === "all" ? undefined : "text-[var(--signal)]"}>{lead}</span>
        {rest}
      </h2>
      <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.55] text-[var(--ink-soft)] sm:text-[14px]">
        PEG is the P/E divided by growth &mdash; what you pay for each point of it. Forward divides by our
        base-case growth; trailing by the EPS growth the company actually delivered over five years. Under 1 is
        cheap on the Valuation Check&rsquo;s bands, 1&ndash;1.5 fair, 1.5&ndash;2 rich, above 2 expensive.
        Context, not a buy list: a low PEG can also mean the market doubts the growth.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <nav aria-label="Filter" className={cn(MOBILE_CHIP_STRIP, "-mx-4 px-4 sm:mx-0 sm:flex-wrap sm:px-0")}>
          {PEG_VIEWS.map((v) => (
            <Link
              key={v}
              href={href(v, sort)}
              scroll={false}
              className={mobileChipClass(view === v)}
              aria-current={view === v ? "true" : undefined}
            >
              {PEG_VIEW_LABEL[v]} <span className="ml-2 opacity-70">{scan.counts[v]}</span>
            </Link>
          ))}
        </nav>
        <p className="house-data flex items-center gap-2 text-[10.5px] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
          Sort
          {(["forward", "trailing"] as const).map((s) => (
            <Link
              key={s}
              href={href(view, s)}
              scroll={false}
              aria-current={sort === s ? "true" : undefined}
              className={cn(
                "rounded px-1 py-0.5 transition-colors",
                sort === s
                  ? "text-[var(--ink)] underline decoration-[var(--mark)] decoration-2 underline-offset-4"
                  : "hover:text-[var(--ink)]",
              )}
            >
              {s}
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
            <span className="text-right">P/E</span>
            <span className="text-right">Forward PEG</span>
            <span className="text-right">Trailing PEG</span>
            <span className="text-right">Priced</span>
          </div>
          <ul>
            {rows.map((row) => (
              <li key={row.code} className="border-b border-[var(--rule)] last:border-b-0">
                <PegRowView row={row} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-[var(--ink-soft)]">No covered company is in this band right now.</p>
      )}

      <ul className="house-data mt-4 max-w-2xl space-y-1.5 text-[10.5px] leading-[1.5] text-[var(--ink-soft)]">
        {anyRevenueBasis ? (
          <li>
            <Tag>rev</Tag> forward PEG on base-case revenue growth: we don&rsquo;t model that company&rsquo;s margin,
            so it is directional only.
          </li>
        ) : null}
        {anyLossYear ? (
          <li>
            <Tag>loss yr</Tag> a loss year sits inside the five, so the trailing growth rate &mdash; and its PEG &mdash;
            are unreliable.
          </li>
        ) : null}
        <li>
          n/m: EPS grew under 5% a year, and a PEG on that says nothing about the price.
        </li>
        {scan.staleCount > 0 ? (
          <li>
            {scan.staleCount} {scan.staleCount === 1 ? "company is" : "companies are"} held back: priced more than{" "}
            {VALUATION_STALE_AFTER_DAYS} days ago, so the P/E under the PEG is out of date.
          </li>
        ) : null}
        {latest ? <li>Latest pricing {latest}.</li> : null}
      </ul>
    </section>
  );
}

function PegRowView({ row }: { row: PegRow }) {
  return (
    <Link
      href={`/company/${encodeURIComponent(row.code)}#valuation-check`}
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
          <span className="sm:hidden"> · P/E {row.pe.toFixed(1)}</span>
        </p>
      </div>
      <p className="house-data hidden text-right text-[13px] text-[var(--ink)] sm:block">{row.pe.toFixed(1)}</p>
      <PegCell
        label="Forward"
        leg={row.forward}
        growthNote={row.forward ? `${row.forward.growthPct.toFixed(0)}% base case` : null}
        tag={row.forward?.basis === "revenue" ? "rev" : null}
        empty="—"
        emptyTitle="No base-case growth to divide by."
      />
      <PegCell
        label="Trailing"
        leg={row.trailing}
        growthNote={row.trailing ? `${row.trailing.growthPct.toFixed(0)}% 5-yr EPS` : null}
        tag={row.trailing?.hasLossYear ? "loss yr" : null}
        empty={row.trailingWithheldGrowthPct != null ? "n/m" : "—"}
        emptyTitle={
          row.trailingWithheldGrowthPct != null
            ? `EPS grew ${row.trailingWithheldGrowthPct.toFixed(0)}% a year — too slow for PEG to mean anything.`
            : "No positive five-year EPS growth to divide by."
        }
      />
      <p className="house-data hidden text-right text-[11px] text-[var(--ink-soft)] sm:block">
        {formatShortDate(row.pricedAsOf) ?? "—"}
      </p>
    </Link>
  );
}

function PegCell({
  label,
  leg,
  growthNote,
  tag,
  empty,
  emptyTitle,
}: {
  label: string;
  leg: { ratio: number } | null;
  growthNote: string | null;
  tag: string | null;
  empty: string;
  emptyTitle: string;
}) {
  const band = leg ? pegBandFor(leg.ratio) : null;
  return (
    <div className="min-w-0 sm:text-right">
      <p className="house-data text-[9px] uppercase tracking-[0.12em] text-[var(--ink-soft)] sm:hidden">{label}</p>
      {leg && band ? (
        <>
          <p className="house-data flex items-baseline gap-1.5 sm:justify-end">
            <span className={cn("text-[17px] leading-none", BAND_TONE[band.key])}>{leg.ratio.toFixed(2)}</span>
            <span className="text-[9.5px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">{band.label}</span>
          </p>
          <p className="house-data mt-1 flex items-center gap-1.5 text-[10px] text-[var(--ink-soft)] sm:justify-end">
            {growthNote}
            {tag ? <Tag>{tag}</Tag> : null}
          </p>
        </>
      ) : (
        <p title={emptyTitle} className="house-data text-[13px] text-[var(--ink-soft)]">
          {empty}
        </p>
      )}
    </div>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <span className="house-data inline-block rounded-[3px] border border-[var(--rule)] px-1 py-px text-[8.5px] uppercase leading-tight tracking-[0.08em] text-[var(--ink-soft)]">
      {children}
    </span>
  );
}
