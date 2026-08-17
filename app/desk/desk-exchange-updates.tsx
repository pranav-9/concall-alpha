"use client";

// Desk "Exchange filings" — the human-readable BSE announcement feed. The
// pipeline (concallyser/scripts/exchange_desk_classify.py) keeps only
// business-material filings (order wins, capex, M&A, fundraises, approvals,
// partnerships, ratings, business updates) and drops procedural noise, so this
// tape is signal-only. Category chips filter; recency (Today / This week /
// Earlier) is the spine. Reuses the house skin from desk-recency-ledger.

import { useMemo, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type {
  ExchangeCategory,
  ExchangeDeskData,
  ExchangeUpdate,
  RecencyBucketKey,
} from "@/lib/exchange-desk/types";

const ROW_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";
const ROW_HOVER = "hover:bg-[color-mix(in_srgb,var(--signal)_7%,transparent)]";

const BUCKET_ORDER: { key: RecencyBucketKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "earlier", label: "Earlier" },
];

// The feed can run to a few hundred filings over the window; show the most recent
// slice by default so the section stays a scannable tape, not an endless scroll.
const MAX_COLLAPSED = 18;

type Filter = "all" | ExchangeCategory;

function CategoryTab({
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
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "house-data house-micro inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors",
        ROW_FOCUS,
        active
          ? "border-[var(--signal)] bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] text-[var(--ink)]"
          : "border-[var(--rule)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums text-[var(--ink-soft)]">{count}</span>
    </button>
  );
}

function UpdateRow({ item }: { item: ExchangeUpdate }) {
  return (
    <div
      className={cn(
        "block border-b border-[var(--rule)] py-3 last:border-b-0 transition-colors",
        ROW_HOVER,
      )}
    >
      {/* Desktop: time · company · category · summary · filing */}
      <div className="hidden items-center gap-4 sm:grid sm:grid-cols-[3.25rem_minmax(9rem,1fr)_9rem_minmax(0,1.6fr)_5rem]">
        <span className="house-data house-micro text-[var(--ink-soft)]">{item.filedLabel}</span>
        <Link
          href={`/company/${item.companyCode}`}
          prefetch={false}
          className={cn(
            "house-display min-w-0 truncate text-sm text-[var(--ink)] hover:text-[var(--signal)]",
            ROW_FOCUS,
          )}
        >
          {item.companyName}
        </Link>
        <span className="house-data house-micro truncate text-[var(--signal)]">
          {item.categoryLabel}
        </span>
        <span className="truncate text-sm text-[var(--ink-soft)]">{item.summary}</span>
        <span className="justify-self-end">
          {item.attachmentUrl ? (
            <a
              href={item.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("house-data house-micro text-[var(--ink-soft)] hover:text-[var(--signal)]", ROW_FOCUS)}
            >
              filing ↗
            </a>
          ) : null}
        </span>
      </div>

      {/* Mobile: (1) time + company + filing, (2) category · summary */}
      <div className="sm:hidden">
        <div className="flex items-center gap-3">
          <span className="house-data house-micro shrink-0 text-[var(--ink-soft)]">{item.filedLabel}</span>
          <Link
            href={`/company/${item.companyCode}`}
            prefetch={false}
            className="house-display min-w-0 flex-1 truncate text-sm text-[var(--ink)]"
          >
            {item.companyName}
          </Link>
          {item.attachmentUrl ? (
            <a
              href={item.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="house-data house-micro shrink-0 text-[var(--ink-soft)]"
            >
              ↗
            </a>
          ) : null}
        </div>
        <div className="mt-1 flex items-baseline gap-2 pl-[3.5rem]">
          <span className="house-data house-micro shrink-0 text-[var(--signal)]">
            {item.categoryLabel}
          </span>
          <span className="truncate text-xs text-[var(--ink-soft)]">{item.summary}</span>
        </div>
      </div>
    </div>
  );
}

export default function DeskExchangeUpdates({ data }: { data: ExchangeDeskData }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);

  // Changing the category should always start from the collapsed view.
  const selectFilter = (next: Filter) => {
    setFilter(next);
    setExpanded(false);
  };

  const filtered = useMemo(
    () => (filter === "all" ? data.updates : data.updates.filter((u) => u.category === filter)),
    [data.updates, filter],
  );

  const buckets = useMemo(() => {
    const visible = expanded ? filtered : filtered.slice(0, MAX_COLLAPSED);
    return BUCKET_ORDER.map((b) => ({
      ...b,
      items: visible.filter((u) => u.bucketKey === b.key),
    })).filter((b) => b.items.length > 0);
  }, [filtered, expanded]);

  const hiddenCount = Math.max(0, filtered.length - MAX_COLLAPSED);

  // Nothing material in the window (or the feed isn't wired yet) — render nothing.
  if (data.total === 0) return null;

  return (
    <section aria-labelledby="desk-exchange" className="house-block">
      <p className="house-data house-micro flex items-center gap-2 text-[var(--ink-soft)]">
        <span aria-hidden className="text-[var(--signal)]">
          ●
        </span>
        Exchange filings · last {data.windowDays} days
      </p>
      <h2 id="desk-exchange" className="house-display mt-2 text-2xl sm:text-3xl">
        What companies are announcing
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">
        BSE filings across the covered universe, read into plain English and filtered to the
        business events — order wins, capex, deals, fundraises, approvals. The procedural noise is
        left out.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <CategoryTab
          active={filter === "all"}
          label="All"
          count={data.total}
          onClick={() => selectFilter("all")}
        />
        {data.categories.map((c) => (
          <CategoryTab
            key={c.key}
            active={filter === c.key}
            label={c.label}
            count={c.count}
            onClick={() => selectFilter(c.key)}
          />
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] px-5 py-2 sm:px-6">
        {buckets.length === 0 ? (
          <p className="house-data house-micro py-4 text-[var(--ink-soft)]">
            No filings in this category in the last {data.windowDays} days.
          </p>
        ) : (
          buckets.map((bucket) => (
            <div key={bucket.key} className="border-t border-[var(--rule)] py-3 first:border-t-0">
              <p className="house-data house-micro flex items-baseline gap-2 text-[var(--ink-soft)]">
                <span className="text-[var(--ink)]">{bucket.label}</span>
                <span>
                  {bucket.items.length} filing{bucket.items.length === 1 ? "" : "s"}
                </span>
              </p>
              <div className="mt-1">
                {bucket.items.map((item) => (
                  <UpdateRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={cn("house-link mt-4 inline-block", ROW_FOCUS)}
        >
          {expanded ? "Show fewer" : `Show all ${filtered.length} filings →`}
        </button>
      )}
    </section>
  );
}
