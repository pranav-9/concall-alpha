// Red flags scan — the companies whose Quality-tab forensic checks land in the
// Flag band, worst first, filterable to one check. Every word on a row (check
// name, metric, note) is the company page's own (lib/company-quality/forensics);
// this view only gathers them.

import Link from "next/link";

import { mobileChipClass, MOBILE_CHIP_STRIP } from "@/components/mobile-card";
import { filterByCheck, type RedFlagHit, type RedFlagRow, type RedFlagScan } from "@/lib/scanners/red-flags";
import { cn } from "@/lib/utils";

const ROW_LINK =
  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-2.5 px-4 py-3.5 transition-colors hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)] sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_5.5rem] sm:px-5 sm:py-4";

export function RedFlagScanView({ scan, checkId }: { scan: RedFlagScan; checkId: string | null }) {
  const activeCheck = scan.checkCounts.find((c) => c.id === checkId) ?? null;
  const rows = filterByCheck(scan.flagged, activeCheck?.id);

  return (
    <section aria-labelledby="red-flags-heading">
      <h2 id="red-flags-heading" className="house-display max-w-3xl text-[22px] leading-[1.12] sm:text-[30px]">
        <span className="text-[var(--alarm)]">{scan.flagged.length}</span> of {scan.scanned} companies trip
        a forensic red flag
      </h2>
      <p className="mt-2.5 max-w-2xl text-[13px] leading-[1.55] text-[var(--ink-soft)] sm:text-[14px]">
        The nine checks on every company&rsquo;s Quality tab: does profit turn into cash, how long customers
        take to pay, debt, new shares, pledged promoter shares, related-party dealings, contingent liabilities,
        other income and the auditor. A flag is a check&rsquo;s worst band; watch is the one below it.
      </p>
      <p className="house-data mt-2 max-w-2xl text-[10.5px] leading-[1.5] text-[var(--ink-soft)]">
        Scanned: the {scan.scanned} covered companies with a Quality read so far. A company missing here may
        not have been read yet &mdash; that is not a clean bill.
      </p>

      {scan.checkCounts.length > 0 ? (
        <nav aria-label="Filter by check" className={cn(MOBILE_CHIP_STRIP, "-mx-4 mt-5 px-4 sm:mx-0 sm:flex-wrap sm:px-0")}>
          <Link href="/scanners" scroll={false} className={mobileChipClass(!activeCheck)} aria-current={!activeCheck ? "true" : undefined}>
            Any flag <span className="ml-2 opacity-70">{scan.flagged.length}</span>
          </Link>
          {scan.checkCounts.map((c) => (
            <Link
              key={c.id}
              href={`/scanners?check=${c.id}`}
              scroll={false}
              className={mobileChipClass(activeCheck?.id === c.id)}
              aria-current={activeCheck?.id === c.id ? "true" : undefined}
            >
              {c.name} <span className="ml-2 opacity-70">{c.count}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      {rows.length > 0 ? (
        <ul className="mt-4 overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]">
          {rows.map((row) => (
            <li key={row.code} className="border-b border-[var(--rule)] last:border-b-0">
              <ScanRow row={row} mode="flags" leadCheck={activeCheck?.id ?? null} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[13px] text-[var(--ink-soft)]">No covered company trips a red flag right now.</p>
      )}

      {scan.watchOnly.length > 0 && !activeCheck ? (
        <details className="group mt-6">
          <summary className="house-data inline-flex cursor-pointer list-none items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="inline-block transition-transform group-open:rotate-90">›</span>
            On watch, no flags &middot; {scan.watchOnly.length}
          </summary>
          <ul className="mt-3 overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]">
            {scan.watchOnly.map((row) => (
              <li key={row.code} className="border-b border-[var(--rule)] last:border-b-0">
                <ScanRow row={row} mode="watch" leadCheck={null} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function ScanRow({
  row,
  mode,
  leadCheck,
}: {
  row: RedFlagRow;
  mode: "flags" | "watch";
  leadCheck: string | null;
}) {
  // The filtered check leads the row, so the reason it is listed reads first.
  const flags = leadCheck
    ? [...row.flags].sort((a, b) => Number(b.id === leadCheck) - Number(a.id === leadCheck))
    : row.flags;
  const count = mode === "flags" ? row.flags.length : row.watches.length;
  return (
    <Link href={`/company/${encodeURIComponent(row.code)}#quality`} prefetch={false} className={ROW_LINK}>
      <div className="min-w-0">
        <p className="truncate text-[14.5px] font-semibold leading-tight text-[var(--ink)]">{row.name ?? row.code}</p>
        <p className="house-data mt-1 truncate text-[10px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          {row.code}
          {row.sector ? ` · ${row.sector}` : ""}
        </p>
      </div>

      <div className="house-data text-right sm:order-last">
        <p
          className={cn(
            "text-[20px] leading-none",
            mode === "flags" ? "text-[var(--alarm)]" : "text-[var(--warn)]",
          )}
        >
          {count}
        </p>
        <p className="mt-1 whitespace-nowrap text-[9.5px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          {mode === "flags" ? (count === 1 ? "flag" : "flags") : "watch"} &middot; of {row.assessed}
        </p>
      </div>

      <div className="col-span-2 min-w-0 sm:col-span-1">
        {mode === "flags" ? (
          <ul className="flex flex-wrap gap-1.5">
            {flags.map((f) => (
              <li key={f.id}>
                <HitChip hit={f} tone="alarm" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {row.watches.map((w) => (
              <li key={w.id}>
                <HitChip hit={w} tone="warn" />
              </li>
            ))}
          </ul>
        )}
        {mode === "flags" && row.watches.length > 0 ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-snug text-[var(--ink-soft)]">
            <span aria-hidden className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warn)]" />
            <span>
              Watch: {row.watches.map((w) => w.name).join(" · ")}
            </span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function HitChip({ hit, tone }: { hit: RedFlagHit; tone: "alarm" | "warn" }) {
  return (
    <span
      title={hit.note}
      className={cn(
        "inline-flex max-w-full items-baseline gap-1.5 rounded-[5px] border px-2 py-[5px] text-[12px] leading-tight",
        tone === "alarm"
          ? "border-[color-mix(in_srgb,var(--alarm)_38%,transparent)] bg-[color-mix(in_srgb,var(--alarm)_6%,transparent)]"
          : "border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--warn)_6%,transparent)]",
      )}
    >
      <span className="font-medium text-[var(--ink)]">{hit.name}</span>
      <span
        className={cn(
          "house-data truncate text-[11px]",
          tone === "alarm" ? "text-[var(--alarm)]" : "text-[var(--warn)]",
        )}
      >
        {hit.metric}
      </span>
    </span>
  );
}
