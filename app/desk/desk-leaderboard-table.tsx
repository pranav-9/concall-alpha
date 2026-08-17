"use client";

import { useState } from "react";
import Link from "next/link";

import ConcallScore from "@/components/concall-score";

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
};

type TabKey = "latest" | "quarter" | "twist" | "growth" | "moat";

const TABS: { key: TabKey; label: string; caption: string }[] = [
  { key: "latest", label: "Latest reads", caption: "sorted by filed" },
  { key: "quarter", label: "Quarter leaders", caption: "sorted by score" },
  { key: "twist", label: "Positive twist", caption: "latest vs prior 4Q avg" },
  { key: "growth", label: "Growth leaders", caption: "by growth outlook" },
  { key: "moat", label: "Moat leaders", caption: "by moat strength" },
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

  const byTab: Record<TabKey, DeskTableRow[]> = {
    latest: latestReads,
    quarter: quarterLeaders,
    twist: positiveTwist,
    growth: growthLeaders,
    moat: moatLeaders,
  };
  const rows = byTab[tab];
  const caption = TABS.find((t) => t.key === tab)?.caption ?? "";

  return (
    <div>
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
                onClick={() => setTab(t.key)}
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

      {/* Column heads — columnar only from md up */}
      <div className="hidden items-baseline gap-4 px-1 pb-2 pt-3 md:grid md:grid-cols-[minmax(0,1fr)_8rem_3.25rem_3.5rem_4.75rem_4.25rem]">
        <HeadCell>Company</HeadCell>
        <HeadCell>Sector</HeadCell>
        <HeadCell>Score</HeadCell>
        <HeadCell>Δ QoQ</HeadCell>
        <HeadCell>7-qtr</HeadCell>
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
          {/* Mobile-only supporting line: sector + delta + moat */}
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[var(--ink-soft)] md:hidden">
            {row.sector ? <span className="text-xs">{row.sector}</span> : null}
            <MobileDelta value={row.delta} />
            {tab === "moat" && row.moatLabel ? (
              <span className="house-data house-micro">{row.moatLabel}</span>
            ) : null}
            {tab === "growth" && row.growthLabel ? (
              <span className="house-data house-micro">{row.growthLabel} base growth</span>
            ) : null}
          </span>
        </span>
      </div>

      {/* Sector (or the active tab's leg label) */}
      <span className="hidden truncate text-xs text-[var(--ink-soft)] md:block">
        {tab === "moat" && row.moatLabel
          ? row.moatLabel
          : tab === "growth" && row.growthLabel
            ? `${row.growthLabel} base`
            : (row.sector ?? "—")}
      </span>

      {/* Score */}
      <span className="shrink-0">
        {row.latestScore != null ? (
          <ConcallScore score={row.latestScore} size="sm" />
        ) : (
          <span className="house-data text-xs text-[var(--ink-soft)]">—</span>
        )}
      </span>

      {/* Delta (desktop cell) */}
      <span className="hidden md:block">
        <DeltaValue value={row.delta} twist={tab === "twist" ? row.twistPct : null} />
      </span>

      {/* Sparkline */}
      <span className="hidden md:block">
        <Sparkline points={row.sparkPoints} />
      </span>

      {/* Filed */}
      <span className="house-data house-micro hidden text-[var(--ink-soft)] md:block md:text-right">
        {row.filedLabel}
      </span>
    </Link>
  );
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
