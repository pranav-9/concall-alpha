"use client";

// Desk "Exchange filings" — the human-readable BSE announcement feed. The
// pipeline (concallyser/scripts/exchange_desk_classify.py) keeps only
// business-material filings (order wins, capex, M&A, fundraises, approvals,
// partnerships, ratings, business updates) and drops procedural noise, so this
// tape is signal-only. Quality chips filter (impact tier); recency (Today /
// This week / Earlier) is the spine. Reuses the house skin from desk-recency-ledger.

import { useMemo, useState } from "react";
import Link from "next/link";

import { BREAKPOINT_SM, useMinWidth } from "@/hooks/use-min-width";
import {
  MOBILE_CARD,
  MOBILE_CHIP_STRIP,
  MOBILE_FOCUS,
  MOBILE_ROW,
  MobileDivider,
  mobileChipClass,
} from "@/components/mobile-card";
import { cn } from "@/lib/utils";
import {
  IMPACT_META,
  type ExchangeImpact,
  type ExchangeDeskData,
  type ExchangeUpdate,
  type RecencyBucketKey,
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
// The below-cut watch list is a smaller signal — keep the default slice tight.
const MAX_BELOW_CUT = 8;
// The desk carries only a compact teaser (recency top slice) that links out to
// the full /announcements page; the full feed + below-cut list live there.
const MAX_COMPACT = 6;

type Filter = "all" | ExchangeImpact;

function FilterTab({
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

function ImpactBadge({ item }: { item: ExchangeUpdate }) {
  const meta = IMPACT_META[item.impact];
  return (
    <span
      className={cn(
        "house-data house-micro inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 leading-none",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function UpdateRow({
  item,
  companyContext = false,
}: {
  item: ExchangeUpdate;
  /** On a company page, repeating the company name on every row adds no signal. */
  companyContext?: boolean;
}) {
  return (
    <div
      className={cn(
        "block border-b border-[var(--rule)] py-3 last:border-b-0 transition-colors",
        ROW_HOVER,
      )}
    >
      {/* Desktop: the dedicated feed needs a company column; the company tab
          uses that space for the actual filing summary. The company tab is
          full history, so most dates are absolute ("24 Jun 2026", 82px) and
          wrapped in 3.25rem; widen from md, where the summary can spare it
          (at sm it has only ~80px left, so a wrapped date is the lesser cost). */}
      <div
        className={cn(
          "hidden items-center gap-4 sm:grid",
          companyContext
            ? "sm:grid-cols-[3.25rem_7.5rem_8rem_minmax(0,1.5fr)_4.5rem] md:grid-cols-[5.5rem_7.5rem_8rem_minmax(0,1.5fr)_4.5rem]"
            : "sm:grid-cols-[3.25rem_minmax(8rem,1fr)_7.5rem_8rem_minmax(0,1.5fr)_4.5rem]",
        )}
      >
        <span className="house-data house-micro text-[var(--ink-soft)]">{item.filedLabel}</span>
        {!companyContext ? (
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
        ) : null}
        <span>
          <ImpactBadge item={item} />
        </span>
        <span className="house-data house-micro truncate text-[var(--ink-soft)]">
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

      {/* Mobile: (1) time + company + impact + filing, (2) category · summary */}
      <div className="sm:hidden">
        <div className="flex items-start gap-3">
          <span className="house-data house-micro shrink-0 pt-0.5 text-[var(--ink-soft)]">{item.filedLabel}</span>
          <Link
            href={`/company/${item.companyCode}`}
            prefetch={false}
            className="house-display min-w-0 flex-1 text-sm leading-snug text-[var(--ink)]"
          >
            {item.companyName}
          </Link>
          <ImpactBadge item={item} />
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
        {/* Wraps rather than truncates: a phone row whose name AND summary
            both end in "…" carried nothing. Two lines of summary is the cap. */}
        {/* One clamped block: line-clamp is display:-webkit-box, so it has to
            be the container, with the category label inline inside it. */}
        <p className="mt-1 line-clamp-2 pl-[3.5rem] text-xs leading-snug text-[var(--ink-soft)]">
          <span className="house-data house-micro mr-2">{item.categoryLabel}</span>
          {item.summary}
        </p>
      </div>
    </div>
  );
}

/**
 * Below-cut watch list — material filings from names just outside the ranked
 * hundred (Gate 2, still one of ours). Kept visually quieter than the main tape
 * so it reads as a secondary signal, not part of the covered universe, while
 * still surfacing an update that might earn a name back in.
 */
function BelowCutBlock({
  updates,
  windowDays,
  expanded,
  onToggle,
}: {
  updates: ExchangeUpdate[];
  windowDays: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (updates.length === 0) return null;

  const visible = expanded ? updates : updates.slice(0, MAX_BELOW_CUT);
  const hiddenCount = Math.max(0, updates.length - MAX_BELOW_CUT);

  return (
    <section aria-labelledby="desk-exchange-belowcut" className="house-block mt-12">
      <p className="house-data house-micro flex items-center gap-2 text-[var(--ink-soft)]">
        <span aria-hidden className="text-[var(--ink-soft)]">
          ○
        </span>
        Just outside coverage · last {windowDays} days
      </p>
      <h2 id="desk-exchange-belowcut" className="house-display mt-2 text-xl sm:text-2xl text-[var(--ink-soft)]">
        Below the cut, but worth a look
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">
        Names that fell below the coverage cut are still ours — de-emphasised, never dropped. A
        strong filing here (a big order, a fundraise) can be the thing that earns a company back
        into the ranked hundred, so we keep their material announcements on the tape.
      </p>

      <div className="mt-4 rounded-lg border border-dashed border-[var(--rule)] bg-[var(--paper-2)] px-5 py-2 opacity-90 sm:px-6">
        {visible.map((item) => (
          <UpdateRow key={item.id} item={item} />
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={cn("house-link mt-4 inline-block", ROW_FOCUS)}
        >
          {expanded ? "Show fewer" : `Show all ${updates.length} below-cut filings →`}
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Phone presentation of the full /announcements feed (handoff 2026-09-13,
// "Filings — mobile"): impact chips in one horizontal scroller, then a single
// card whose spine is recency — Today / This week / Earlier sub-headers over
// whole-row links — and the below-cut watch list as a dashed card. Same state
// (filter, both show-all toggles) as the desktop tree; only the paint differs.
// ---------------------------------------------------------------------------

/**
 * "4h ago" → "4h", "just now" → "now": the phone row's time gutter is sized for
 * a short token. A date (past five weeks) or "Date unavailable" is left alone —
 * the gutter is min-width, so it grows rather than overlapping the name.
 */
function shortAge(label: string): string {
  if (label === "just now") return "now";
  return label.replace(/ ago$/, "");
}

function PhoneImpactPill({ item }: { item: ExchangeUpdate }) {
  const meta = IMPACT_META[item.impact];
  return (
    <span
      className={cn(
        "house-data inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-[7px] py-[2px] text-[8px] uppercase leading-none tracking-[0.08em]",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function PhoneUpdateRow({
  item,
  dim = false,
  companyContext = false,
}: {
  item: ExchangeUpdate;
  dim?: boolean;
  companyContext?: boolean;
}) {
  const rowBody = (
    <>
      <span className="flex items-center gap-[9px]">
        <span className="house-data min-w-[30px] shrink-0 whitespace-nowrap text-[10px] text-[var(--ink-soft)]">
          {shortAge(item.filedLabel)}
        </span>
        {!companyContext ? (
          <span
            className={cn(
              "house-display min-w-0 flex-1 truncate text-sm",
              dim ? "text-[var(--ink-soft)]" : "text-[var(--ink)]",
            )}
          >
            {item.companyName}
          </span>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <PhoneImpactPill item={item} />
      </span>
      {/* One clamped block: line-clamp is display:-webkit-box, so it has to be
          the container, with the category label inline inside it. No `block`
          here — it's emitted after line-clamp-2 and its display:block
          silently cancels the -webkit-box, so nothing clamps. */}
      <span className="mt-[5px] line-clamp-2 pl-[39px] text-xs leading-[1.45] text-[var(--ink-soft)] [text-wrap:pretty]">
        <span className="house-data mr-[7px] text-[9px] uppercase tracking-[0.08em]">
          {item.categoryLabel}
        </span>
        {item.summary}
      </span>
    </>
  );

  return (
    <div className={cn(MOBILE_ROW, "flex items-stretch")}>
      {companyContext ? (
        <div className="min-w-0 flex-1 px-3.5 py-3">{rowBody}</div>
      ) : (
        <Link
          href={`/company/${item.companyCode}`}
          prefetch={false}
          className={cn("min-w-0 flex-1 px-3.5 py-3", MOBILE_FOCUS)}
        >
          {rowBody}
        </Link>
      )}
      {item.attachmentUrl ? (
        <a
          href={item.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open the ${item.companyName} filing`}
          className={cn(
            "house-data flex w-11 shrink-0 touch-manipulation items-center justify-center border-l border-[var(--rule)] text-xs text-[var(--ink-soft)] transition-colors active:text-[var(--ink)]",
            MOBILE_FOCUS,
          )}
        >
          ↗
        </a>
      ) : null}
    </div>
  );
}

function PhoneBelowCut({
  updates,
  expanded,
  onToggle,
}: {
  updates: ExchangeUpdate[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (updates.length === 0) return null;
  const visible = expanded ? updates : updates.slice(0, MAX_BELOW_CUT);
  const hiddenCount = Math.max(0, updates.length - MAX_BELOW_CUT);

  return (
    <section aria-labelledby="phone-exchange-belowcut" className="pt-[22px]">
      <MobileDivider
        label={
          <span id="phone-exchange-belowcut">
            <span aria-hidden>○ </span>Just outside coverage
          </span>
        }
      />
      <p className="mx-4 mt-2 text-xs leading-[1.5] text-[var(--ink-soft)] [text-wrap:pretty]">
        Names below the coverage cut are still ours — a strong filing here can earn a company
        back into the ranked hundred.
      </p>
      <div className={cn(MOBILE_CARD, "mt-3 border-dashed opacity-[.92]")}>
        {visible.map((item) => (
          <PhoneUpdateRow key={item.id} item={item} dim />
        ))}
        {hiddenCount > 0 ? (
          <div className="p-3.5">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              className={cn("house-data house-link text-[11px]", ROW_FOCUS)}
            >
              {expanded ? "Show fewer" : `Show all ${updates.length} below-cut filings →`}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PhoneAnnouncements({
  data,
  filter,
  onSelectFilter,
  buckets,
  filteredCount,
  expanded,
  onToggleExpanded,
  hiddenCount,
  belowCutExpanded,
  onToggleBelowCut,
  companyContext = false,
}: {
  data: ExchangeDeskData;
  filter: Filter;
  onSelectFilter: (next: Filter) => void;
  buckets: { key: RecencyBucketKey; label: string; items: ExchangeUpdate[] }[];
  filteredCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  hiddenCount: number;
  belowCutExpanded: boolean;
  onToggleBelowCut: () => void;
  companyContext?: boolean;
}) {
  return (
    <div className="sm:hidden">
      {data.total > 0 ? (
        <section aria-label="Company announcements">
          {/* Page gutters (px-4 / MOBILE_CARD's mx-4) line up with the phone
              page edge on /announcements; inside the company SectionCard,
              which is already padded, they double up and knock the feed out
              of line with the cards above it. */}
          <div
            role="group"
            aria-label="Filter by impact"
            className={cn(MOBILE_CHIP_STRIP, companyContext ? "pb-1" : "px-4 pb-1 pt-3.5")}
          >
            <button
              type="button"
              aria-pressed={filter === "all"}
              onClick={() => onSelectFilter("all")}
              className={mobileChipClass(filter === "all")}
            >
              <span>All</span>
              <span className="ml-1.5 tabular-nums">{data.total}</span>
            </button>
            {data.impacts.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={filter === c.key}
                onClick={() => onSelectFilter(c.key)}
                className={mobileChipClass(filter === c.key)}
              >
                <span>{c.label}</span>
                <span className="ml-1.5 tabular-nums">{c.count}</span>
              </button>
            ))}
          </div>

          <div className={cn(MOBILE_CARD, "mt-2.5", companyContext && "mx-0")}>
            {buckets.length === 0 ? (
              <p className="house-data px-3.5 py-6 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                No filings in this band in the last {data.windowDays} days.
              </p>
            ) : (
              buckets.map((bucket) => (
                <div key={bucket.key}>
                  <div className="flex items-baseline gap-2 border-b border-[var(--rule)] bg-[var(--paper)] px-3.5 py-[11px]">
                    <span className="house-data text-[10px] uppercase tracking-[0.1em] text-[var(--ink)]">
                      {bucket.label}
                    </span>
                    <span className="house-data text-[10px] text-[var(--ink-soft)]">
                      {bucket.items.length} filing{bucket.items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {bucket.items.map((item) => (
                    <PhoneUpdateRow key={item.id} item={item} companyContext={companyContext} />
                  ))}
                </div>
              ))
            )}
            {hiddenCount > 0 ? (
              <div className="p-3.5">
                <button
                  type="button"
                  onClick={onToggleExpanded}
                  aria-expanded={expanded}
                  className={cn("house-data house-link text-[11px]", ROW_FOCUS)}
                >
                  {expanded ? "Show fewer" : `Show all ${filteredCount} filings →`}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <PhoneBelowCut
        updates={data.belowCut}
        expanded={belowCutExpanded}
        onToggle={onToggleBelowCut}
      />
    </div>
  );
}

/**
 * Full announcements experience — the covered-universe feed (recency spine +
 * impact filter tabs + show-all) followed by the below-cut watch list. Lives on
 * the dedicated /announcements page; the desk only shows the compact teaser.
 */
function FullAnnouncements({
  data,
  companyContext = false,
}: {
  data: ExchangeDeskData;
  companyContext?: boolean;
}) {
  // All three live here, not in the paints, so a breakpoint crossing (tablet
  // rotation across sm) keeps the reader's filter and both show-all toggles.
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);
  const [belowCutExpanded, setBelowCutExpanded] = useState(false);

  // Changing the filter should always start from the collapsed view.
  const selectFilter = (next: Filter) => {
    setFilter(next);
    setExpanded(false);
  };

  const filtered = useMemo(
    () => (filter === "all" ? data.updates : data.updates.filter((u) => u.impact === filter)),
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

  // null until hydration → render both presentations (matches the server HTML);
  // then only the one the viewport needs. See hooks/use-min-width.
  const isSm = useMinWidth(BREAKPOINT_SM);

  // Nothing material in the window (or the feed isn't wired yet) — render nothing.
  // The below-cut watch list can still carry the section on a quiet covered week.
  if (data.total === 0 && data.belowCut.length === 0) return null;

  return (
    <>
      {isSm !== true && (
        <PhoneAnnouncements
          data={data}
          filter={filter}
          onSelectFilter={selectFilter}
          buckets={buckets}
          filteredCount={filtered.length}
          expanded={expanded}
          onToggleExpanded={() => setExpanded((v) => !v)}
          hiddenCount={hiddenCount}
          belowCutExpanded={belowCutExpanded}
          onToggleBelowCut={() => setBelowCutExpanded((v) => !v)}
          companyContext={companyContext}
        />
      )}
      {isSm !== false && (
      <div className="hidden sm:block">
      {data.total > 0 && (
    <section
      aria-label="Company announcements"
      // house-block is a page-level section divider (top rule + 2.25rem).
      // Inside the company SectionCard it drew a rule tight under the
      // "Filing tape" header with a dead gap below it; the card is the frame.
      className={companyContext ? undefined : "house-block"}
    >
      {/* No eyebrow / heading / intro here: this variant renders under the
          /announcements page header, which already says all three. */}
      <div className="flex flex-wrap gap-2">
        <FilterTab
          active={filter === "all"}
          label="All"
          count={data.total}
          onClick={() => selectFilter("all")}
        />
        {data.impacts.map((c) => (
          <FilterTab
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
            No filings in this band in the last {data.windowDays} days.
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
                  <UpdateRow key={item.id} item={item} companyContext={companyContext} />
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
      )}

      <BelowCutBlock
        updates={data.belowCut}
        windowDays={data.windowDays}
        expanded={belowCutExpanded}
        onToggle={() => setBelowCutExpanded((v) => !v)}
      />
      </div>
      )}
    </>
  );
}

/**
 * Desk teaser — the most recent covered filings only, no filter tabs and no
 * below-cut block, ending in a link to the full /announcements page. Keeps the
 * desk to a single announcements section instead of the full tape.
 */
function CompactAnnouncements({ data }: { data: ExchangeDeskData }) {
  if (data.total === 0) return null;
  const visible = data.updates.slice(0, MAX_COMPACT);

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

      <div className="mt-5 rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] px-5 py-2 sm:px-6">
        {visible.map((item) => (
          <UpdateRow key={item.id} item={item} />
        ))}
      </div>

      <Link
        href="/announcements"
        prefetch={false}
        className={cn("house-link mt-4 inline-block", ROW_FOCUS)}
      >
        See all {data.total} announcements →
      </Link>
    </section>
  );
}

export default function DeskExchangeUpdates({
  data,
  variant = "full",
}: {
  data: ExchangeDeskData;
  // "compact" = desk teaser (top slice + link out); "full" = the /announcements
  // page (whole covered feed + below-cut watch list); "company" reuses the
  // full feed controls but removes the redundant company-name column.
  variant?: "full" | "compact" | "company";
}) {
  return variant === "compact" ? (
    <CompactAnnouncements data={data} />
  ) : (
    <FullAnnouncements data={data} companyContext={variant === "company"} />
  );
}
