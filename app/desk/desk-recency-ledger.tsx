// Desk "What landed most recently" — the grouped recency ledger (mockup 1b).
// A vertical tape, not a carousel: recency is the spine. Updates are bucketed
// Today / This week / Earlier, and every row lands on one line —
// time · company · event · substance · score+Δ. Reuses the platform activity
// feed (getCachedHomepageActivityFeed); no new data. Renders the whole section
// or nothing — an empty feed returns null, leaving no empty shell.

import Link from "next/link";

import { formatRelativeActivityTime, type UnifiedUpdate } from "@/lib/activity-feed";
import { getCachedHomepageActivityFeed } from "@/lib/homepage-activity-feed";
import { BANDS, bandForScore } from "@/lib/score-band";
import { GROWTH_BANDS, bandForGrowthScore, type GrowthBandDef } from "@/lib/growth-band";
import type { BandDef } from "@/lib/score-band";
import { cn } from "@/lib/utils";

const LEDGER_SIZE = 14;

// Shared keyboard-focus ring for the whole-row links — the house skin has no
// default focus-visible on bare <a>, so make it explicit and on-brand (teal),
// inset so it reads inside the hairline row rather than clipping past it.
const ROW_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";

// A visible-but-quiet hover: a faint teal wash over the card ground. The card is
// already --paper-2, so a plain paper-2 hover would be invisible.
const ROW_HOVER = "hover:bg-[color-mix(in_srgb,var(--signal)_7%,transparent)]";

// One IST calendar day, so "Today" tracks the date a reader is looking at rather
// than a rolling 24h window (an 8pm-yesterday print shouldn't read as "today").
const istDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;

type Bucket = { key: "today" | "week" | "earlier"; label: string; items: UnifiedUpdate[] };

function bucketUpdates(updates: UnifiedUpdate[]): Bucket[] {
  const now = new Date();
  const todayStr = istDay(now);
  const nowMs = now.getTime();

  const today: UnifiedUpdate[] = [];
  const week: UnifiedUpdate[] = [];
  const earlier: UnifiedUpdate[] = [];

  for (const u of updates) {
    const at = u.atRaw ? new Date(u.atRaw) : null;
    if (at && !Number.isNaN(at.getTime()) && istDay(at) === todayStr) today.push(u);
    else if (at && !Number.isNaN(at.getTime()) && nowMs - at.getTime() < MS_WEEK) week.push(u);
    else earlier.push(u);
  }

  return (
    [
      { key: "today", label: "Today", items: today },
      { key: "week", label: "This week", items: week },
      { key: "earlier", label: "Earlier", items: earlier },
    ] as Bucket[]
  ).filter((b) => b.items.length > 0);
}

// The score leg + its band vocabulary, per update type. Quarter reads on the
// sentiment scale; growth on the forward-outlook scale — the same two schemes
// the rest of the portal uses, so a pill here reads identically to the board.
function scoreView(u: UnifiedUpdate): { score: number; band: BandDef | GrowthBandDef } | null {
  if (u.score == null) return null;
  if (u.type === "quarter") return { score: u.score, band: BANDS[bandForScore(u.score)] };
  if (u.type === "growth") return { score: u.score, band: GROWTH_BANDS[bandForGrowthScore(u.score)] };
  return null;
}

// Growth outlooks carry a direction the number alone hides: a raised vs trimmed
// FY read. Derived straight from the score delta, so it never asserts more than
// the data. Quarter/other rows keep their own substance (the quarter label).
// May return "" (e.g. business snapshots carry no detail) — the caller renders
// nothing rather than echoing the event label into the substance column.
function substanceFor(u: UnifiedUpdate): string {
  if (u.type === "growth" && u.priorScore != null && u.score != null) {
    const delta = u.score - u.priorScore;
    const verb = delta > 0.049 ? "raised" : delta < -0.049 ? "trimmed" : "held";
    return u.detail ? `${u.detail} ${verb}` : `Outlook ${verb}`;
  }
  return u.detail;
}

// Number-forward chip on the paper ground with a band-coloured word. Deliberately
// NOT a filled band pill: white-on-teal-500/orange-500 fails AA, and a candy pill
// is off-key against the paper-and-hairline house skin. Band colour lives in the
// word (band.textClass is contrast-safe on paper in both themes), the number in ink.
function ScorePill({ score, band }: { score: number; band: BandDef | GrowthBandDef }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--rule)] bg-[var(--paper)] px-2 py-0.5">
      <span className="house-data text-xs font-bold tabular-nums leading-none text-[var(--ink)]">
        {score.toFixed(1)}
      </span>
      <span className={cn("house-micro leading-none", band.textClass)}>{band.label}</span>
    </span>
  );
}

function Delta({ prior, score }: { prior: number | null; score: number | null }) {
  if (prior == null || score == null) return null;
  const delta = score - prior;
  const up = delta > 0.049;
  const down = delta < -0.049;
  // Flat: a bare rule, never a signed zero (the old "— +0.0" read as flat AND up).
  if (!up && !down) {
    return (
      <span
        className="house-data ml-2 shrink-0 text-[11px] text-[var(--ink-soft)]"
        aria-label="unchanged"
      >
        —
      </span>
    );
  }
  const sign = up ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  return (
    <span
      className={cn(
        "house-data ml-2 inline-flex shrink-0 items-center gap-0.5 text-[11px] tabular-nums",
        up ? "text-[var(--signal)]" : "text-[var(--alarm)]",
      )}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {sign}
    </span>
  );
}

// Non-scored rows (guidance, business snapshot, key variables) show their own
// small context chip on the right rather than a score.
function ContextChip({ label }: { label: string }) {
  return (
    <span className="house-data house-micro rounded-full border border-[var(--rule)] px-2 py-0.5 text-[var(--ink-soft)]">
      {label}
    </span>
  );
}

function LedgerRow({ item }: { item: UnifiedUpdate }) {
  const view = scoreView(item);
  const href = item.artifactHref ?? (item.companyCode ? `/company/${item.companyCode}` : null);
  const time = formatRelativeActivityTime(item.atRaw);
  const event = item.sourceLabel;
  const substance = substanceFor(item);

  const right = view ? (
    <span className="flex items-center justify-end whitespace-nowrap">
      <ScorePill score={view.score} band={view.band} />
      <Delta prior={item.priorScore} score={item.score} />
    </span>
  ) : item.contextLabel ? (
    <span className="flex justify-end">
      <ContextChip label={item.contextLabel} />
    </span>
  ) : null;

  const inner = (
    <>
      {/* Desktop: one line — time · company · event · substance · score+Δ */}
      <div className="hidden items-center gap-4 sm:grid sm:grid-cols-[3.25rem_minmax(9rem,1.1fr)_8.5rem_minmax(0,1.4fr)_13rem]">
        <span className="house-data house-micro text-[var(--ink-soft)]">{time}</span>
        <span className="house-display min-w-0 truncate text-sm text-[var(--ink)]">
          {item.companyName}
          {item.companyIsNew && (
            <span className="house-data house-micro ml-2 align-middle text-[var(--signal)]">new</span>
          )}
        </span>
        <span className="house-data house-micro truncate text-[var(--signal)]">{event}</span>
        <span className="truncate text-sm text-[var(--ink-soft)]">{substance}</span>
        <span className="justify-self-end">{right}</span>
      </div>

      {/* Mobile: two lines — (1) time + company + score, (2) event · substance */}
      <div className="sm:hidden">
        <div className="flex items-start gap-3">
          <span className="house-data house-micro shrink-0 pt-0.5 text-[var(--ink-soft)]">{time}</span>
          <span className="house-display min-w-0 flex-1 text-sm leading-snug text-[var(--ink)]">
            {item.companyName}
            {item.companyIsNew && (
              <span className="house-data house-micro ml-2 align-middle text-[var(--signal)]">new</span>
            )}
          </span>
          {right}
        </div>
        {/* One clamped block (line-clamp is display:-webkit-box) with the
            event label inline, so the row is two lines, not three. */}
        <p className="mt-1 line-clamp-2 pl-[3.5rem] text-xs leading-snug text-[var(--ink-soft)]">
          <span className="house-data house-micro mr-2 text-[var(--signal)]">{event}</span>
          {substance}
        </p>
      </div>
    </>
  );

  const rowClass = cn(
    "block border-b border-[var(--rule)] py-3 last:border-b-0 transition-colors",
    ROW_HOVER,
    ROW_FOCUS,
  );

  if (!href) return <div className={rowClass}>{inner}</div>;
  return (
    <Link href={href} prefetch={false} className={rowClass}>
      {inner}
    </Link>
  );
}

export function DeskRecencyLedgerFallback() {
  return (
    <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] p-5">
      <div className="h-4 w-40 animate-pulse rounded bg-[var(--rule)]" />
      <div className="mt-6 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 w-full animate-pulse rounded bg-[var(--rule)]" />
        ))}
      </div>
    </div>
  );
}

export default async function DeskRecencyLedger({ quarterLabel }: { quarterLabel?: string }) {
  const updates = await getCachedHomepageActivityFeed(LEDGER_SIZE).catch(() => []);
  if (updates.length === 0) return null;
  const buckets = bucketUpdates(updates);

  return (
    <section aria-labelledby="desk-recency" className="house-block">
      <p className="house-data house-micro flex items-center gap-2 text-[var(--ink-soft)]">
        <span aria-hidden className="text-[var(--signal)]">
          ●
        </span>
        What&apos;s new{quarterLabel ? ` · ${quarterLabel}` : ""}
      </p>
      <h2 id="desk-recency" className="house-display mt-2 text-2xl sm:text-3xl">
        What landed most recently
      </h2>

      <div className="mt-6 rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] px-5 py-2 sm:px-6">
        {buckets.map((bucket) => (
          <div
            key={bucket.key}
            className="border-t border-[var(--rule)] py-3 first:border-t-0"
          >
            <p className="house-data house-micro flex items-baseline gap-2 text-[var(--ink-soft)]">
              <span className="text-[var(--ink)]">{bucket.label}</span>
              <span>
                {bucket.items.length} update{bucket.items.length === 1 ? "" : "s"}
              </span>
            </p>
            <div className="mt-1">
              {bucket.items.map((item) => (
                <LedgerRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Link href="/activity" prefetch={false} className="house-link mt-5 inline-block">
        See all activity →
      </Link>
    </section>
  );
}
