// Guidance upgrades scan — companies whose management raised a live
// commitment on the latest call, beside the Guidance tab's own
// credibility verdict so a reader can weigh what a raise from this management
// is worth. Labels, values and the tier are the Guidance tab's own
// (lib/guidance-tracking/verdict); this view only gathers them.

import Link from "next/link";
import type { ReactNode } from "react";

import { managementTone, type SignalTone } from "@/lib/board-signals";
import type { GuidanceUpgradeRow, GuidanceUpgradeScan } from "@/lib/scanners/guidance-upgrades";
import { cn } from "@/lib/utils";

/** Raises shown per company; the rest are on its Guidance tab. */
const RAISES_SHOWN = 3;

const TONE_CLASS: Record<SignalTone, string> = {
  good: "text-[var(--signal)]",
  warn: "text-[var(--warn)]",
  bad: "text-[var(--alarm)]",
  muted: "text-[var(--ink-soft)]",
};

export function GuidanceUpgradeScanView({
  scan,
  mine,
  filter,
}: {
  scan: GuidanceUpgradeScan;
  /** Scanning the reader's watchlist companies instead of the covered universe. */
  mine: boolean;
  filter: ReactNode;
}) {
  const rows = scan.rows;
  const n = rows.length;

  return (
    <section aria-labelledby="guidance-heading">
      <h2 id="guidance-heading" className="house-display max-w-3xl text-[22px] leading-[1.12] sm:text-[30px]">
        <span className="text-[var(--signal)]">{n}</span> of {mine ? "your " : ""}
        {scan.scanned} {mine ? "watchlist companies" : "companies"} raised guidance on their latest call
      </h2>
      <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.55] text-[var(--ink-soft)] sm:text-[14px]">
        A raise is a live commitment &mdash; its deadline still ahead &mdash; whose guided number went up the last
        time management changed it: the same &ldquo;Raised&rdquo; mark the company&rsquo;s Guidance tab shows.
        Beside each name is how this management has done on what it guided before, so you can judge what the raise
        is worth.
      </p>
      <p className="house-data mt-2 max-w-2xl text-[10.5px] leading-[1.5] text-[var(--ink-soft)]">
        Scanned: the {scan.scanned} {mine ? "companies on your watchlists" : "covered companies"} with guidance on
        record, for raises made on the {scan.sinceLabel} call or later.
        {scan.skippedRaises > 0
          ? ` ${scan.skippedRaises} ${scan.skippedRaises === 1 ? "raise is" : "raises are"} left out where the recorded numbers don't read as a raise on their own.`
          : ""}
      </p>

      <div className="mt-5">{filter}</div>

      {rows.length > 0 ? (
        <ul className="mt-4 overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]">
          {rows.map((row) => (
            <li key={row.code} className="border-b border-[var(--rule)] last:border-b-0">
              <UpgradeRow row={row} floor={scan.floor} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[13px] text-[var(--ink-soft)]">
          {mine
            ? `None of your watchlist companies has raised guidance since the ${scan.sinceLabel} call.`
            : `No covered company has raised guidance since the ${scan.sinceLabel} call.`}
        </p>
      )}
    </section>
  );
}

function UpgradeRow({ row, floor }: { row: GuidanceUpgradeRow; floor: number }) {
  const shown = row.raises.slice(0, RAISES_SHOWN);
  const more = row.raises.length - shown.length;
  const tone = TONE_CLASS[managementTone(row.tier)];
  return (
    <Link
      href={`/company/${encodeURIComponent(row.code)}#guidance-history`}
      prefetch={false}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-2.5 px-4 py-3.5 transition-colors hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)] sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_8.5rem] sm:px-5 sm:py-4"
    >
      <div className="min-w-0">
        <p className="truncate text-[14.5px] font-semibold leading-tight text-[var(--ink)]">{row.name ?? row.code}</p>
        <p className="house-data mt-1 truncate text-[10px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          {row.code}
          {row.sector ? ` · ${row.sector}` : ""}
        </p>
      </div>

      <div className="text-right sm:order-last">
        <p className={cn("house-data text-[10.5px] uppercase tracking-[0.08em]", tone)}>{row.tierLabel}</p>
        <p className="house-data mt-1 whitespace-nowrap text-[9.5px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          {row.countedCount > 0 ? `${row.metCount} of ${row.countedCount} met` : "No record yet"}
        </p>
        {row.loweredCount > 0 ? (
          <p className="house-data mt-1 whitespace-nowrap text-[9.5px] uppercase tracking-[0.08em] text-[var(--warn)]">
            Also lowered {row.loweredCount}
          </p>
        ) : null}
      </div>

      <div className="col-span-2 min-w-0 sm:col-span-1">
        <ul className="space-y-1.5">
          {shown.map((raise) => {
            const inWindow = raise.raisedIndex != null && raise.raisedIndex >= floor;
            return (
              <li key={raise.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12.5px] leading-snug">
                <span className="text-[var(--ink)]">{raise.label}</span>
                <span className="house-data text-[11.5px] text-[var(--ink-soft)]">
                  {raise.from ? `${raise.from} → ` : ""}
                  <span className="text-[var(--signal)]">{raise.to}</span>
                </span>
                {raise.raisedIn ? (
                  <span
                    className={cn(
                      "house-data rounded-[3px] border px-1 py-px text-[8.5px] uppercase leading-tight tracking-[0.08em]",
                      inWindow
                        ? "border-[color-mix(in_srgb,var(--signal)_40%,transparent)] text-[var(--signal)]"
                        : "border-[var(--rule)] text-[var(--ink-soft)]",
                    )}
                  >
                    {raise.raisedIn}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        {more > 0 ? (
          <p className="house-data mt-1.5 text-[10px] text-[var(--ink-soft)]">
            +{more} more on the Guidance tab
          </p>
        ) : null}
      </div>
    </Link>
  );
}
