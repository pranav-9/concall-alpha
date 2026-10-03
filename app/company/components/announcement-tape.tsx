"use client";

// Announcements tab, lower half (redesign 2026-10-03): the filing-history chart
// (one tile per filing, stacked by fiscal quarter) over the quarter-grouped
// tape. One client component because they share state — picking a quarter in
// the chart filters the tape, and the impact chips count within that pick.

import { useMemo, useState } from "react";

import {
  IMPACT_META,
  IMPACT_ORDER,
  IMPACT_TAB_LABEL,
  type ExchangeImpact,
} from "@/lib/exchange-desk/types";
import {
  TIER_LABEL,
  TIER_ORDER,
  matchesTapeFilter,
  type HistorySlot,
  type TapeFilter,
} from "@/lib/announcement-tape";
import { cn } from "@/lib/utils";
import {
  TIER_TILE,
  accentTextClass,
  cardClass,
  displayClass,
  impactPillClass,
  kickerClass,
  monoClass,
} from "./announcement-tokens";

export type TapeRow = {
  id: string;
  impact: ExchangeImpact;
  categoryLabel: string;
  /** "18% of mcap" — order wins the pipeline could size; null otherwise. */
  orderSizeLabel: string | null;
  summary: string;
  attachmentUrl: string | null;
  /** "2 Oct" — formatted on the server so hydration can't drift it. */
  dateLabel: string;
  quarterKey: string;
  quarterLabel: string;
};

// The tape opens on a screenful; the rest is one click away.
const MAX_COLLAPSED = 10;

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function slotTitle(slot: HistorySlot): string {
  if (slot.beforeRecord) return `${slot.label} · before the record starts`;
  if (slot.total === 0) return `${slot.label} · no material filings`;
  const parts = TIER_ORDER.filter((t) => slot.counts[t] > 0).map(
    (t) => `${slot.counts[t]} ${TIER_LABEL[t].toLowerCase()}`,
  );
  const note = slot.current ? " so far" : slot.partial ? " (record starts mid-quarter)" : "";
  return `${slot.label} · ${plural(slot.total, "filing")}${note}: ${parts.join(", ")}`;
}

function FilingHistory({
  slots,
  kicker,
  headline,
  selectedKey,
  onSelect,
}: {
  slots: HistorySlot[];
  kicker: string;
  headline: string;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const maxTotal = Math.max(1, ...slots.map((s) => s.total));
  // One tile per filing. Tiles thin out as the tallest column grows so the
  // plot stays a glance rather than a tower.
  const tileH = maxTotal <= 8 ? 14 : maxTotal <= 14 ? 10 : maxTotal <= 24 ? 6 : 4;
  const gap = 3;
  const plotH = Math.max(48, maxTotal * (tileH + gap));

  return (
    <div className={cn(cardClass, "p-5 sm:p-6")}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <p className={kickerClass}>{kicker}</p>
          <p className={cn(displayClass, "mt-2 text-[17px] leading-[1.25] text-foreground sm:text-[20px] [text-wrap:balance]")}>
            {headline}
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {TIER_ORDER.map((tier) => (
            <li key={tier} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span aria-hidden className={cn("h-2.5 w-2.5 rounded-[3px]", TIER_TILE[tier])} />
              {TIER_LABEL[tier]}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="mt-5 grid items-end gap-1 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}
      >
        {slots.map((slot) => {
          const selected = slot.key === selectedKey;
          const title = slotTitle(slot);
          return (
            <button
              key={slot.key}
              type="button"
              disabled={slot.total === 0}
              aria-pressed={selected}
              aria-label={title}
              title={title}
              onClick={() => onSelect(slot.key)}
              className={cn(
                "flex min-w-0 flex-col items-center rounded-[10px] border border-transparent px-1 pb-2 pt-2 transition-colors",
                FOCUS,
                slot.total > 0 && "hover:bg-muted/40",
                selected && "border-sky-500/60 bg-sky-500/[0.07] hover:bg-sky-500/[0.07]",
              )}
            >
              <span
                className={cn(
                  monoClass,
                  "text-[13px] font-semibold",
                  slot.total > 0 ? "text-foreground" : "text-muted-foreground/60",
                )}
              >
                {slot.beforeRecord ? "–" : slot.total}
              </span>
              <span
                aria-hidden
                className="mt-2 flex w-full flex-col-reverse items-center"
                style={{ height: plotH, gap }}
              >
                {slot.total === 0 ? (
                  <span className="block h-px w-full max-w-[52px] bg-border" />
                ) : (
                  TIER_ORDER.flatMap((tier) =>
                    Array.from({ length: slot.counts[tier] }, (_, i) => (
                      <span
                        key={`${tier}-${i}`}
                        className={cn("block w-full max-w-[52px] shrink-0 rounded-[3px]", TIER_TILE[tier])}
                        style={{ height: tileH }}
                      />
                    )),
                  )
                )}
              </span>
              <span className={cn(monoClass, "mt-2.5 whitespace-nowrap text-[9.5px] text-muted-foreground sm:text-[11px]")}>
                {slot.label}
              </span>
              <span className={cn(monoClass, "h-3 text-[9px] leading-3 text-muted-foreground/80")}>
                {slot.current ? "so far" : slot.beforeRecord ? "no record" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        monoClass,
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition-colors",
        FOCUS,
        active
          ? "border-sky-500/60 bg-sky-500/15 text-foreground"
          : "border-border/70 text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span className={active ? "text-foreground/70" : "text-muted-foreground/70"}>{count}</span>
    </button>
  );
}

function TapeRowView({ row }: { row: TapeRow }) {
  const link = row.attachmentUrl ? (
    <a
      href={row.attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        monoClass,
        "shrink-0 whitespace-nowrap rounded text-[11px] text-muted-foreground transition-colors hover:text-foreground",
        FOCUS,
      )}
    >
      filing ↗
    </a>
  ) : null;
  const pill = <span className={impactPillClass(row.impact)}>{IMPACT_META[row.impact].label}</span>;

  return (
    <li className="border-t border-border/50 py-3.5 first:border-t-0">
      {/* From sm: one line — date · impact · category · read · filing. */}
      <div className="hidden items-baseline gap-4 sm:grid sm:grid-cols-[4.75rem_7.75rem_minmax(0,9.5rem)_minmax(0,1fr)_3.75rem]">
        <span className={cn(monoClass, "whitespace-nowrap text-[11.5px] text-muted-foreground")}>{row.dateLabel}</span>
        <span>{pill}</span>
        <span className={cn(monoClass, "truncate text-[11.5px] text-muted-foreground")}>{row.categoryLabel}</span>
        <span className="min-w-0 text-[14px] leading-snug text-foreground/90 [text-wrap:pretty]">
          {row.orderSizeLabel ? (
            <span className={cn(monoClass, "mr-2.5 whitespace-nowrap text-[11.5px] font-semibold text-foreground")}>
              {row.orderSizeLabel}
            </span>
          ) : null}
          {row.summary}
        </span>
        <span className="justify-self-end">{link}</span>
      </div>

      {/* Phone: date + impact + filing on one line, the read below it. */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2.5">
          <span className={cn(monoClass, "whitespace-nowrap text-[11px] text-muted-foreground")}>{row.dateLabel}</span>
          {pill}
          <span className="ml-auto">{link}</span>
        </div>
        <p className="mt-2 text-[13.5px] leading-snug text-foreground/90 [text-wrap:pretty]">
          {row.orderSizeLabel ? (
            <span className={cn(monoClass, "mr-2 whitespace-nowrap text-[11px] font-semibold text-foreground")}>
              {row.orderSizeLabel}
            </span>
          ) : null}
          {row.summary}
        </p>
        <p className={cn(monoClass, "mt-1.5 text-[10.5px] text-muted-foreground")}>{row.categoryLabel}</p>
      </div>
    </li>
  );
}

export function AnnouncementTape({
  rows,
  slots,
  historyKicker,
  historyHeadline,
  defaultFilter,
}: {
  rows: TapeRow[];
  slots: HistorySlot[];
  historyKicker: string;
  historyHeadline: string;
  defaultFilter: TapeFilter;
}) {
  const [filter, setFilter] = useState<TapeFilter>(defaultFilter);
  const [quarterKey, setQuarterKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const selectFilter = (next: TapeFilter) => {
    setFilter(next);
    setExpanded(false);
  };
  const selectQuarter = (key: string) => {
    setQuarterKey((current) => (current === key ? null : key));
    setExpanded(false);
  };

  const currentKey = slots.find((s) => s.current)?.key ?? null;
  const selectedSlot = slots.find((s) => s.key === quarterKey) ?? null;

  // The chips count inside the picked quarter, so a chip never promises rows
  // the tape then doesn't show.
  const scoped = useMemo(
    () => (quarterKey ? rows.filter((r) => r.quarterKey === quarterKey) : rows),
    [rows, quarterKey],
  );
  const chips = useMemo(() => {
    const count = (f: TapeFilter) => scoped.filter((r) => matchesTapeFilter(r.impact, f)).length;
    const tiers = IMPACT_ORDER.filter((impact) => count(impact) > 0 || filter === impact).map(
      (impact) => ({ key: impact as TapeFilter, label: IMPACT_TAB_LABEL[impact], count: count(impact) }),
    );
    return [
      { key: "non_neutral" as TapeFilter, label: "Non-neutral", count: count("non_neutral") },
      { key: "all" as TapeFilter, label: "All", count: scoped.length },
      ...tiers,
    ];
  }, [scoped, filter]);

  const filtered = useMemo(
    () => scoped.filter((r) => matchesTapeFilter(r.impact, filter)),
    [scoped, filter],
  );
  const visible = expanded ? filtered : filtered.slice(0, MAX_COLLAPSED);
  const hiddenCount = filtered.length - visible.length;

  // Group the visible rows by fiscal quarter (rows arrive newest first), but
  // count each quarter over everything that matches, so a group cut short by
  // the collapsed view still states its true size.
  const groups = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of filtered) totals.set(r.quarterKey, (totals.get(r.quarterKey) ?? 0) + 1);
    const out: { key: string; label: string; total: number; items: TapeRow[] }[] = [];
    for (const r of visible) {
      const last = out[out.length - 1];
      if (last && last.key === r.quarterKey) last.items.push(r);
      else out.push({ key: r.quarterKey, label: r.quarterLabel, total: totals.get(r.quarterKey) ?? 0, items: [r] });
    }
    return out;
  }, [filtered, visible]);

  return (
    <div className="flex flex-col gap-5">
      <FilingHistory
        slots={slots}
        kicker={historyKicker}
        headline={historyHeadline}
        selectedKey={quarterKey}
        onSelect={selectQuarter}
      />

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <p className={kickerClass}>Filing tape</p>
            {selectedSlot ? (
              <button
                type="button"
                onClick={() => selectQuarter(selectedSlot.key)}
                className={cn(
                  monoClass,
                  "inline-flex items-center gap-1.5 rounded-full border border-sky-500/50 bg-sky-500/10 px-2.5 py-1 text-[10.5px] text-foreground transition-colors hover:bg-sky-500/20",
                  FOCUS,
                )}
              >
                {selectedSlot.label}
                <span aria-hidden>×</span>
                <span className="sr-only">Clear the quarter filter</span>
              </button>
            ) : null}
          </div>
          <div
            role="group"
            aria-label="Filter filings by impact"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
          >
            {chips.map((chip) => (
              <FilterChip
                key={chip.key}
                active={filter === chip.key}
                label={chip.label}
                count={chip.count}
                onClick={() => selectFilter(chip.key)}
              />
            ))}
          </div>
        </div>

        <div className={cn(cardClass, "mt-3 px-4 py-4 sm:px-6 sm:py-5")}>
          {groups.length === 0 ? (
            <div className="py-3">
              <p className="text-sm text-muted-foreground">
                No filings match this filter{selectedSlot ? ` in ${selectedSlot.label}` : ""}.
              </p>
              {filter !== "all" ? (
                <button
                  type="button"
                  onClick={() => selectFilter("all")}
                  className={cn("mt-2 rounded text-[13px] font-semibold", accentTextClass, FOCUS)}
                >
                  Show all {plural(scoped.length, "filing")} →
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map((group) => (
                <section key={group.key} aria-label={`${group.label} filings`}>
                  <p className={cn(monoClass, "flex flex-wrap items-baseline gap-x-3 border-b border-border/50 pb-2.5 text-[11.5px]")}>
                    <span className="font-semibold text-foreground">
                      {group.label}
                      {group.key === currentKey ? " · so far" : ""}
                    </span>
                    <span className="text-muted-foreground">{plural(group.total, "filing")}</span>
                  </p>
                  <ul>
                    {group.items.map((row) => (
                      <TapeRowView key={row.id} row={row} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {hiddenCount > 0 || (expanded && filtered.length > MAX_COLLAPSED) ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className={cn("mt-4 rounded text-[13.5px] font-semibold", accentTextClass, FOCUS)}
            >
              {expanded ? "Show fewer" : `Show all ${plural(filtered.length, "filing")} →`}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
