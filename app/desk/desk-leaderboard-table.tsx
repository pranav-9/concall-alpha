"use client";

import { useState } from "react";
import Link from "next/link";

import ConcallScore from "@/components/concall-score";
import { BREAKPOINT_SM, useMinWidth } from "@/hooks/use-min-width";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { MOBILE_CARD, MOBILE_HEAD_RIGHT, MOBILE_ROW, NewBadge } from "./desk-mobile-card";

// Client-facing row: the lib's DeskRow with a server-formatted "filed" label
// (formatting there, not here, so the relative time can't drift on hydration).
export type DeskTableRow = {
  code: string;
  name: string;
  sector: string | null;
  isNew: boolean;
  latestScore: number | null;
  delta: number | null;
  twistPct: number | null;
  sparkPoints: number[];
  filedLabel: string;
  moatLabel: string | null;
  growthLabel: string | null;
  growthDownside: string | null;
  growthUpside: string | null;
  growthScore: number | null;
};

type TabKey = "latest" | "quarter" | "twist" | "growth" | "moat";

// `caption` is the desktop sort caption; `trailHead` / `sortNote` label the
// phone list's single trail column and its column-label row.
const TABS: { key: TabKey; label: string; caption: string; trailHead: string; sortNote: string }[] = [
  { key: "latest", label: "Latest reads", caption: "sorted by filed", trailHead: "Filed", sortNote: "sorted by filed ↓" },
  { key: "quarter", label: "Quarter leaders", caption: "sorted by score", trailHead: "Δ QoQ", sortNote: "sorted by ConcallScore ↓" },
  { key: "twist", label: "Positive twist", caption: "latest vs prior 4Q avg", trailHead: "vs 4Q", sortNote: "sorted by trend twist ↓" },
  { key: "growth", label: "Growth leaders", caption: "by growth outlook", trailHead: "Base growth", sortNote: "sorted by growth outlook ↓" },
  { key: "moat", label: "Moat leaders", caption: "by moat strength", trailHead: "Moat", sortNote: "sorted by moat, then score ↓" },
];

export default function DeskLeaderboardTable({
  latestReads,
  quarterLeaders,
  positiveTwist,
  growthLeaders,
  moatLeaders,
  seeAllCount,
}: {
  latestReads: DeskTableRow[];
  quarterLeaders: DeskTableRow[];
  positiveTwist: DeskTableRow[];
  growthLeaders: DeskTableRow[];
  moatLeaders: DeskTableRow[];
  seeAllCount: number;
}) {
  const [tab, setTab] = useState<TabKey>("latest");
  // null until hydration → render both layouts (matches the server HTML); then
  // only the one the viewport needs. See hooks/use-min-width.
  const isSm = useMinWidth(BREAKPOINT_SM);

  const byTab: Record<TabKey, DeskTableRow[]> = {
    latest: latestReads,
    quarter: quarterLeaders,
    twist: positiveTwist,
    growth: growthLeaders,
    moat: moatLeaders,
  };
  const rows = byTab[tab];
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const caption = active.caption;

  const selectTab = (next: TabKey) => {
    if (next === tab) return; // idempotent — mirrors /leaderboards
    analytics.leaderboardTabChange(tab, next, "desk");
    setTab(next);
  };

  return (
    <>
      {isSm !== true && (
        <MobileRanking
          tab={tab}
          active={active}
          rows={rows}
          seeAllCount={seeAllCount}
          onSelectTab={selectTab}
        />
      )}
      {isSm !== false && (
    <div className="hidden sm:block">
      {/* Tabs + active caption */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-[var(--rule)] pb-2">
        <div
          role="tablist"
          aria-label="Leaderboard views"
          className="flex flex-wrap gap-x-5 gap-y-1"
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => selectTab(t.key)}
                className={`house-data house-micro pb-1 transition-colors ${
                  active
                    ? "border-b-2 border-[var(--mark)] text-[var(--ink)]"
                    : "border-b-2 border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <span className="house-data house-micro text-[var(--ink-soft)]">{caption} ↓</span>
      </div>

      {/* Column heads — columnar only from md up. The middle three columns
          re-label per tab: the growth tab is a bear/base/bull scenario read,
          not a concall trajectory, so its heads say so. */}
      <div className="hidden items-baseline gap-4 px-1 pb-2 pt-3 md:grid md:grid-cols-[minmax(0,1fr)_8rem_3.25rem_3.5rem_4.75rem_4.25rem]">
        <HeadCell>Company</HeadCell>
        <HeadCell>
          {tab === "moat" ? "Moat" : tab === "growth" ? "Base growth" : "Sector"}
        </HeadCell>
        <HeadCell>Score</HeadCell>
        <HeadCell>{tab === "growth" ? "Bear" : "Δ QoQ"}</HeadCell>
        <HeadCell>{tab === "growth" ? "Bull" : "7-qtr"}</HeadCell>
        <HeadCell className="md:text-right">Filed</HeadCell>
      </div>

      <div role="tabpanel" className="border-t border-[var(--rule)] md:border-t-0">
        {rows.length === 0 ? (
          <p className="px-1 py-8 text-sm text-[var(--ink-soft)]">Nothing to show here yet.</p>
        ) : (
          rows.map((row, i) => <Row key={`${row.code}-${i}`} row={row} rank={i + 1} tab={tab} />)
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-4">
        <Link href="/leaderboards" prefetch={false} className="house-data house-micro house-link">
          See all {seeAllCount} →
        </Link>
        <span className="house-data house-micro text-[var(--ink-soft)]">
          Scores read documents, not prices.
        </span>
      </div>
    </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Phone presentation (< sm): the 5-column table becomes a card of list rows —
// rank · monogram crest · name + sector · one trail metric · score circle —
// with the lens tabs as a horizontally scrolling chip row. Same rows, same
// tab state; only the trail column changes per lens.
// ---------------------------------------------------------------------------

// Company initials for the crest: first letter of the first two words; a
// single-word name takes its first two letters. "&" is not a word.
function initials(name: string): string {
  const words = name.replace(/&/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const pick = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return pick.toUpperCase();
}

function signedArrow(n: number): string {
  return n > 0 ? "▲" : n < 0 ? "▼" : "•";
}

function signedColor(n: number): string {
  return n > 0 ? "text-[var(--signal)]" : n < 0 ? "text-[var(--alarm)]" : "text-[var(--ink-soft)]";
}

// The one metric shown beside the score on the phone list, chosen by lens.
function TrailMetric({ row, tab }: { row: DeskTableRow; tab: TabKey }) {
  const base = "house-data min-w-[46px] shrink-0 whitespace-nowrap text-right text-xs tabular-nums";
  if (tab === "latest") {
    return <span className={cn(base, "text-[var(--ink-soft)]")}>{row.filedLabel}</span>;
  }
  if (tab === "quarter") {
    if (row.delta == null) return <span className={cn(base, "text-[var(--ink-soft)]")}>—</span>;
    return (
      <span className={cn(base, signedColor(row.delta))}>
        {signedArrow(row.delta)} {Math.abs(row.delta).toFixed(1)}
      </span>
    );
  }
  if (tab === "twist") {
    if (row.twistPct == null) return <span className={cn(base, "text-[var(--ink-soft)]")}>—</span>;
    return (
      <span className={cn(base, signedColor(row.twistPct))}>
        {signedArrow(row.twistPct)} {Math.abs(row.twistPct).toFixed(1)}%
      </span>
    );
  }
  if (tab === "growth") {
    return (
      <span className={cn(base, row.growthLabel ? "text-[var(--ink)]" : "text-[var(--ink-soft)]")}>
        {row.growthLabel ?? "—"}
      </span>
    );
  }
  return <span className={cn(base, "text-[var(--ink-soft)]")}>{row.moatLabel ?? "—"}</span>;
}

function MobileRow({ row, rank, tab }: { row: DeskTableRow; rank: number; tab: TabKey }) {
  const score = tab === "growth" ? row.growthScore : row.latestScore;
  return (
    <Link
      href={`/company/${row.code}`}
      prefetch={false}
      onClick={() =>
        analytics.leaderboardRowClick({
          companyCode: row.code,
          board: tab,
          belowCut: false,
          rank,
          surface: "desk",
        })
      }
      className={cn(MOBILE_ROW, "flex items-center gap-[11px] px-3.5 py-3")}
    >
      <span className="house-data w-[18px] shrink-0 text-center text-xs text-[var(--ink-soft)]">
        {String(rank).padStart(2, "0")}
      </span>
      <span
        aria-hidden
        className="house-data flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-[var(--rule)] bg-[var(--paper)] text-[11px] text-[var(--ink-soft)]"
      >
        {initials(row.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="house-display truncate text-sm tracking-[-0.01em] text-[var(--ink)]">
            {row.name}
          </span>
          {row.isNew ? <NewBadge /> : null}
        </span>
        <span className="house-data mt-0.5 block truncate text-[10px] text-[var(--ink-soft)]">
          {row.sector ?? row.code}
        </span>
      </span>
      <TrailMetric row={row} tab={tab} />
      <span className="flex shrink-0">
        {score != null ? (
          <ConcallScore score={score} kind={tab === "growth" ? "growth" : "quarterly"} size="sm" />
        ) : (
          <span className="house-data grid h-8 w-8 place-items-center text-xs text-[var(--ink-soft)]">—</span>
        )}
      </span>
    </Link>
  );
}

function MobileRanking({
  tab,
  active,
  rows,
  seeAllCount,
  onSelectTab,
}: {
  tab: TabKey;
  active: (typeof TABS)[number];
  rows: DeskTableRow[];
  seeAllCount: number;
  onSelectTab: (key: TabKey) => void;
}) {
  return (
    <section aria-labelledby="desk-ranking-mobile" className={cn(MOBILE_CARD, "sm:hidden")}>
      <div className="border-b border-[var(--rule)] px-3.5 py-3">
        <div className="flex items-center justify-between gap-2.5">
          <h2
            id="desk-ranking-mobile"
            className="house-data whitespace-nowrap text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]"
          >
            Ranking
          </h2>
          <Link href="/how-scores-work" prefetch={false} className={MOBILE_HEAD_RIGHT}>
            How scores work →
          </Link>
        </div>
        <p className="mt-[7px] text-[11px] leading-[1.45] text-[var(--ink-soft)] [text-wrap:pretty]">
          Our 0–10 read of the quarter from the transcript and deck — not a price call.
        </p>
      </div>

      {/* Lens chips — one horizontal scroller, scrollbar hidden, never wraps. */}
      <div
        role="tablist"
        aria-label="Leaderboard views"
        className="flex gap-2 overflow-x-auto border-b border-[var(--rule)] px-3.5 py-[11px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => onSelectTab(t.key)}
              className={cn(
                "house-data shrink-0 whitespace-nowrap rounded-full border px-[13px] py-2 text-[10px] uppercase tracking-[0.1em] transition-colors",
                on
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-2)]"
                  : "border-[var(--rule)] bg-transparent text-[var(--ink-soft)]",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Column-label row: the sort note on the left, trail · Score on the right. */}
      <div className="flex items-center justify-between gap-2.5 border-b border-[var(--rule)] px-3.5 py-[7px]">
        <span className="house-data whitespace-nowrap text-[9px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          {active.sortNote}
        </span>
        <span className="house-data whitespace-nowrap text-[9px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          {active.trailHead} · Score
        </span>
      </div>

      <div role="tabpanel">
        {rows.length === 0 ? (
          <p className="px-3.5 py-8 text-sm text-[var(--ink-soft)]">Nothing to show here yet.</p>
        ) : (
          rows.map((row, i) => <MobileRow key={`${row.code}-${i}`} row={row} rank={i + 1} tab={tab} />)
        )}
      </div>

      <div className="flex items-center justify-between gap-2.5 p-3.5">
        <Link href="/leaderboards" prefetch={false} className="house-data house-link text-[11px]">
          See all {seeAllCount} →
        </Link>
        <span className="house-data text-right text-[9px] text-[var(--ink-soft)] [text-wrap:pretty]">
          Scores read documents, not prices.
        </span>
      </div>
    </section>
  );
}

function HeadCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`house-data house-micro text-[var(--ink-soft)] ${className}`}>{children}</span>
  );
}

function Row({ row, rank, tab }: { row: DeskTableRow; rank: number; tab: TabKey }) {
  return (
    <Link
      href={`/company/${row.code}`}
      prefetch={false}
      onClick={() =>
        analytics.leaderboardRowClick({
          companyCode: row.code,
          // The desk board tab doubles as the leaderboard "board" value; the
          // desk only lists the discovery-covered 100, so nothing is below-cut.
          board: tab,
          belowCut: false,
          rank,
          surface: "desk",
        })
      }
      className="flex items-center gap-3 border-b border-[var(--rule)] px-1 py-3 transition-colors hover:bg-[var(--paper-2)] md:grid md:grid-cols-[minmax(0,1fr)_8rem_3.25rem_3.5rem_4.75rem_4.25rem] md:gap-4"
    >
      {/* Company */}
      <div className="flex min-w-0 flex-1 items-baseline gap-2 md:flex-none">
        <span className="house-data house-micro w-5 shrink-0 text-[var(--ink-soft)]">
          {String(rank).padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="house-display truncate text-sm text-[var(--ink)]">{row.name}</span>
            <span className="house-data house-micro text-[var(--ink-soft)]">{row.code}</span>
            {row.isNew ? (
              <span className="house-data house-micro rounded-sm bg-[var(--signal)] px-1 py-0.5 text-[0.55rem] text-[var(--paper-2)]">
                New
              </span>
            ) : null}
          </span>
          {/* Mobile-only supporting line. The growth tab shows its scenario
              read (base/bear/bull); every other tab shows sector + concall Δ. */}
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[var(--ink-soft)] md:hidden">
            {tab === "growth" ? (
              <span className="house-data house-micro">
                {row.growthLabel ? `Base ${row.growthLabel}` : "Base —"}
                {row.growthDownside ? ` · Bear ${row.growthDownside}` : ""}
                {row.growthUpside ? ` · Bull ${row.growthUpside}` : ""}
              </span>
            ) : (
              <>
                {row.sector ? <span className="text-xs">{row.sector}</span> : null}
                <MobileDelta value={row.delta} />
                {tab === "moat" && row.moatLabel ? (
                  <span className="house-data house-micro">{row.moatLabel}</span>
                ) : null}
              </>
            )}
          </span>
        </span>
      </div>

      {/* Sector (or the active tab's leg label). Growth shows base growth here;
          the header column reads "Base growth", so no redundant suffix. */}
      <span className="hidden truncate text-xs text-[var(--ink-soft)] md:block">
        {tab === "moat" && row.moatLabel
          ? row.moatLabel
          : tab === "growth"
            ? (row.growthLabel ?? "—")
            : (row.sector ?? "—")}
      </span>

      {/* Score — the growth tab leads with the growth score (the metric it's
          ranked by); every other tab shows the ConcallScore. */}
      <span className="shrink-0">
        {tab === "growth" ? (
          row.growthScore != null ? (
            <ConcallScore score={row.growthScore} kind="growth" size="sm" />
          ) : (
            <span className="house-data text-xs text-[var(--ink-soft)]">—</span>
          )
        ) : row.latestScore != null ? (
          <ConcallScore score={row.latestScore} size="sm" />
        ) : (
          <span className="house-data text-xs text-[var(--ink-soft)]">—</span>
        )}
      </span>

      {/* Δ QoQ / bear — growth swaps the concall delta for the bear-case
          growth, since a growth-ranked row has no quarterly trajectory. */}
      <span className="hidden md:block">
        {tab === "growth" ? (
          <ScenarioValue value={row.growthDownside} />
        ) : (
          <DeltaValue value={row.delta} twist={tab === "twist" ? row.twistPct : null} />
        )}
      </span>

      {/* 7-qtr / bull — growth swaps the concall sparkline for the bull case. */}
      <span className="hidden md:block">
        {tab === "growth" ? (
          <ScenarioValue value={row.growthUpside} />
        ) : (
          <Sparkline points={row.sparkPoints} />
        )}
      </span>

      {/* Filed */}
      <span className="house-data house-micro hidden text-[var(--ink-soft)] md:block md:text-right">
        {row.filedLabel}
      </span>
    </Link>
  );
}

// A growth-scenario figure (bear/bull) shown in the desktop metric columns on
// the growth tab. Plain text — it's a forward estimate, not a signed move.
function ScenarioValue({ value }: { value: string | null }) {
  if (!value) return <span className="house-data text-xs text-[var(--ink-soft)]">—</span>;
  return <span className="house-data text-xs text-[var(--ink)]">{value}</span>;
}

function DeltaValue({ value, twist }: { value: number | null; twist: number | null }) {
  if (twist != null) {
    return (
      <span className="house-data text-xs text-[var(--signal)]">+{twist.toFixed(1)}%</span>
    );
  }
  if (value == null) return <span className="house-data text-xs text-[var(--ink-soft)]">—</span>;
  const up = value >= 0;
  return (
    <span className={`house-data text-xs ${up ? "text-[var(--signal)]" : "text-[var(--alarm)]"}`}>
      {up ? "+" : ""}
      {value.toFixed(1)}
    </span>
  );
}

function MobileDelta({ value }: { value: number | null }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className={`house-data text-xs ${up ? "text-[var(--signal)]" : "text-[var(--alarm)]"}`}>
      {up ? "+" : ""}
      {value.toFixed(1)} QoQ
    </span>
  );
}

// Tiny score-history sparkline. Colour by first-vs-last direction, matching the
// house score ramp (teal up / red down / muted flat). Dot anchors the latest.
function Sparkline({ points }: { points: number[] }) {
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
  const coords = points.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = coords
    .map((c, i) => `${i ? "L" : "M"}${c[0].toFixed(1)} ${c[1].toFixed(1)}`)
    .join(" ");
  const dir = points[points.length - 1] - points[0];
  const stroke =
    dir > 0.05 ? "var(--signal)" : dir < -0.05 ? "var(--alarm)" : "var(--ink-soft)";
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Score trend, last quarters"
      className="overflow-visible"
    >
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={1.9} fill={stroke} />
    </svg>
  );
}
