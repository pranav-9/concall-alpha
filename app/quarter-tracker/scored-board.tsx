// Every company scored this quarter, as a sortable table: score + band, Δ on
// the prior quarter, a 7-quarter sparkline, where the transcript came from and
// when the score landed. Column heads are links (`?sort=`), so the order is a
// URL and the table needs no client JS. Below `md` the trailing three columns
// fold into a meta line under the company name.

import Link from "next/link";
import type { ReactNode } from "react";

import { MobileTag } from "@/components/mobile-card";
import { BANDS, bandForScore } from "@/lib/score-band";
import { formatScoredAt } from "@/lib/score-freshness";
import { cn } from "@/lib/utils";

import type { TrackerEntry } from "./data";
import { formatAgo, scoreDelta, type SortDir, type SortKey } from "./season";

const HEAD =
  "house-data px-3 py-2.5 text-left text-[10px] font-normal uppercase tracking-[0.14em] text-[var(--ink-soft)] md:px-4";
const CELL = "px-3 py-3 align-top md:px-4";
const RULES = "divide-x divide-[var(--rule)]";

function SortHead({
  active,
  dir,
  href,
  children,
  className,
}: {
  active: boolean;
  dir: SortDir;
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <th scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined} className={cn(HEAD, className)}>
      <Link
        href={href}
        scroll={false}
        prefetch={false}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-[var(--ink)]",
          active && "text-[var(--ink)]",
        )}
      >
        {children}
        <span aria-hidden className={cn("text-[8px]", !active && "opacity-0")}>
          {active && dir === "asc" ? "▴" : "▾"}
        </span>
      </Link>
    </th>
  );
}

/** Tiny score-history sparkline in the house ramp — teal up, red down, muted flat. */
function Sparkline({ entry }: { entry: TrackerEntry }) {
  const points = entry.scorePath.map((p) => p.value).filter((v): v is number => v != null);
  if (points.length < 2) {
    return <span className="house-data text-xs text-[var(--ink-soft)]">—</span>;
  }
  const w = 64;
  const h = 20;
  const pad = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const coords = points.map((v, i) => [pad + i * step, h - pad - ((v - min) / range) * (h - pad * 2)] as const);
  const d = coords.map((c, i) => `${i ? "L" : "M"}${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(" ");
  const dir = points[points.length - 1] - points[0];
  const stroke = dir > 0.05 ? "var(--signal)" : dir < -0.05 ? "var(--alarm)" : "var(--ink-soft)";
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`${entry.name}: score over the last ${points.length} quarters`}
      className="overflow-visible"
    >
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={1.9} fill={stroke} />
    </svg>
  );
}

function Delta({ entry }: { entry: TrackerEntry }) {
  const d = scoreDelta(entry);
  if (d == null) {
    return (
      <span className="house-data text-[12px] text-[var(--ink-soft)]" title="No prior scored quarter">
        —
      </span>
    );
  }
  const tone = d > 0.05 ? "text-[var(--signal)]" : d < -0.05 ? "text-[var(--alarm)]" : "text-[var(--ink-soft)]";
  const text = d > 0 ? `+${d.toFixed(1)}` : d < 0 ? `−${Math.abs(d).toFixed(1)}` : "0.0";
  return (
    <span className={cn("house-data text-[12px] tabular-nums", tone)} title={entry.priorLabel ? `vs ${entry.priorLabel}` : undefined}>
      {text}
    </span>
  );
}

const UNOFFICIAL_TITLE =
  "Scored from a third-party transcript, published before the company filed its own. It will be re-scored when the official transcript lands.";

function Source({ entry, className }: { entry: TrackerEntry; className?: string }) {
  if (entry.sourceStatus === "unofficial") {
    return (
      <span className={cn("text-[var(--warn)]", className)} title={UNOFFICIAL_TITLE}>
        Unofficial
      </span>
    );
  }
  return <span className={cn("text-[var(--ink-soft)]", className)}>Official</span>;
}

function Row({ entry, now }: { entry: TrackerEntry; now: Date }) {
  const score = entry.score!;
  const band = BANDS[bandForScore(score)];
  const ago = formatAgo(entry.scoredAt, now);
  const scoredTitle = formatScoredAt(entry.scoredAt) ?? undefined;
  return (
    <tr className={cn(RULES, "border-t border-[var(--rule)] transition-colors hover:bg-[var(--paper)]")}>
      <td className={CELL}>
        <Link
          href={`/company/${encodeURIComponent(entry.code)}#sentiment-score`}
          prefetch={false}
          className="group block min-w-0"
        >
          <span className="house-display block text-[14px] leading-tight text-[var(--ink)] transition-colors group-hover:text-[var(--signal)]">
            {entry.name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[11px] leading-tight text-[var(--ink-soft)]">
            <span className="house-data text-[10px]">{entry.code}</span>
            {entry.sector ? <span>{entry.sector}</span> : null}
          </span>
          <span className="house-data mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--ink-soft)] md:hidden">
            <Source entry={entry} />
            <span aria-hidden>·</span>
            <span className="whitespace-nowrap" title={scoredTitle}>
              {ago}
            </span>
            {entry.scoredWithin24h ? <MobileTag tone="signal">new</MobileTag> : null}
          </span>
        </Link>
      </td>
      <td className={CELL}>
        <span className={cn("block text-[16px] font-semibold leading-none tabular-nums", band.textClass)}>
          {score.toFixed(1)}
        </span>
        <span className={cn("mt-1 block text-[10.5px] leading-tight", band.textClass)}>{band.label}</span>
      </td>
      <td className={CELL}>
        <Delta entry={entry} />
      </td>
      <td className={cn(CELL, "hidden md:table-cell")}>
        <Sparkline entry={entry} />
      </td>
      <td className={cn(CELL, "hidden md:table-cell")}>
        <Source entry={entry} className="text-[12px]" />
      </td>
      <td className={cn(CELL, "hidden md:table-cell")}>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="house-data whitespace-nowrap text-[11px] tabular-nums text-[var(--ink-soft)]" title={scoredTitle}>
            {ago}
          </span>
          {entry.scoredWithin24h ? <MobileTag tone="signal" title="Scored in the last 24 hours">new</MobileTag> : null}
        </span>
      </td>
    </tr>
  );
}

export function ScoredBoard({
  rows,
  scoreLabel,
  sort,
  dir,
  sortHref,
  chips,
  now,
  emptyMessage,
}: {
  rows: TrackerEntry[];
  scoreLabel: string;
  sort: SortKey;
  dir: SortDir;
  sortHref: (key: SortKey) => string;
  chips: ReactNode;
  now: Date;
  emptyMessage: string;
}) {
  return (
    <section
      aria-labelledby="scored-board-heading"
      className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--rule)] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">{chips}</div>
        <h2
          id="scored-board-heading"
          className="house-data text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]"
        >
          {rows.length} scored
        </h2>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] leading-[1.5] text-[var(--ink-soft)]">{emptyMessage}</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className={RULES}>
              <th scope="col" className={HEAD}>
                Company
              </th>
              <SortHead active={sort === "score"} dir={dir} href={sortHref("score")} className="w-[6rem] md:w-[7.5rem]">
                {scoreLabel}
              </SortHead>
              <SortHead active={sort === "delta"} dir={dir} href={sortHref("delta")} className="w-[3.75rem] md:w-[4.75rem]">
                Δ QoQ
              </SortHead>
              <th scope="col" className={cn(HEAD, "hidden w-[6rem] md:table-cell")}>
                7 qtrs
              </th>
              <th scope="col" className={cn(HEAD, "hidden w-[5.75rem] md:table-cell")}>
                Source
              </th>
              <SortHead
                active={sort === "scored"}
                dir={dir}
                href={sortHref("scored")}
                className="hidden w-[6.5rem] md:table-cell"
              >
                Scored
              </SortHead>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <Row key={entry.code} entry={entry} now={now} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
