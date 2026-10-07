// Watchlist analytics (2026-10-07) — the list read as a list, on the house
// skin the board already wears. Four blocks, top to bottom:
//   1. Where the list sits   — sector / sub-sector / Hot Theme make-up
//   2. The good and the bad  — the Overview's pros-cons rules across the list
//   3. Big filings           — the list's material filings, last 30 days
//   4. Latest changes        — what moved in the analysis, last 30 days
// Everything is derived at load time (lib/watchlist-analytics); this file only
// paints. Server component: no client state, every control is a link or a
// <details>. Copy describes, never advises.

import Link from "next/link";
import type { ReactNode } from "react";

import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { mobileChipClass } from "@/components/mobile-card";
import { TONE_VAR } from "@/components/signal-cells";
import { formatRelativeActivityTime } from "@/lib/activity-feed";
import { STORY_EFFECT_META } from "@/lib/announcement-story-read/types";
import { formatOrderSize, IMPACT_META } from "@/lib/exchange-desk/types";
import { PROS_CONS_SOURCES, type ProsConsSide } from "@/lib/overview-pros-cons";
import { cn } from "@/lib/utils";
import { buildWatchlistAnalytics } from "@/lib/watchlist-analytics/build";
import type {
  CrossProsConsItem,
  WatchlistAnalytics,
  WatchlistChange,
  WatchlistFiling,
} from "@/lib/watchlist-analytics/types";

export type WatchlistView = "board" | "analytics";

export function parseWatchlistView(value: string | string[] | undefined): WatchlistView {
  return value === "analytics" ? "analytics" : "board";
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const PANEL = "rounded-[1.45rem] border";
const PANEL_STYLE = { borderColor: "var(--rule)", background: "var(--paper-2)" } as const;
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]";
const PILL = "house-data house-micro inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 leading-none";
const CHIP =
  "house-data inline-flex items-center rounded border border-[var(--rule)] px-1.5 py-0.5 text-[11px] leading-none text-[var(--ink)] transition-colors hover:border-[var(--signal)] hover:text-[var(--signal)]";
const RULE = "border-[var(--rule)]";

/** Board · Analytics — links, so a view is shareable and needs no client JS. */
export function WatchlistViewSwitch({ watchlistId, view }: { watchlistId: number; view: WatchlistView }) {
  const views: { key: WatchlistView; label: string; href: string }[] = [
    { key: "board", label: "Board", href: `/watchlists/${watchlistId}` },
    { key: "analytics", label: "Analytics", href: `/watchlists/${watchlistId}?view=analytics` },
  ];
  return (
    <nav aria-label="Watchlist views" className="flex gap-2">
      {views.map((v) => (
        <Link
          key={v.key}
          href={v.href}
          prefetch={false}
          scroll={false}
          aria-current={view === v.key ? "page" : undefined}
          className={mobileChipClass(view === v.key)}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  );
}

function BlockHead({ eyebrow, title, dek }: { eyebrow: string; title: string; dek?: string | null }) {
  return (
    <header className="mb-3 space-y-1">
      <p className="house-data house-micro text-[var(--ink-soft)]">{eyebrow}</p>
      <h2 className="house-display text-[20px] leading-tight sm:text-[22px] [text-wrap:balance]">{title}</h2>
      {dek ? <p className="max-w-3xl text-[13px] leading-relaxed text-[var(--ink-soft)] [text-wrap:pretty]">{dek}</p> : null}
    </header>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(PANEL, "p-4 sm:p-5", className)} style={PANEL_STYLE}>
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">{children}</p>;
}

function CompanyChip({ code, name, href, title }: { code: string; name: string; href: string; title?: string }) {
  return (
    <Link href={href} prefetch={false} className={cn(CHIP, FOCUS)} title={title ?? name}>
      {code}
    </Link>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// 1. Where the list sits
// ---------------------------------------------------------------------------

function DistributionBlock({ analytics }: { analytics: WatchlistAnalytics }) {
  const { distribution: d, companies } = analytics;
  const nameOf = new Map(companies.map((c) => [c.code, c.name]));
  const multiSubSectors = d.subSectors.filter((s) => s.count >= 2);
  const singles = d.subSectors.length - multiSubSectors.length;

  return (
    <section aria-labelledby="wa-sits">
      <BlockHead eyebrow="Where the list sits" title={d.line ?? "Sectors and themes"} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Panel>
          <p id="wa-sits" className="house-data house-micro text-[var(--ink-soft)]">
            Sectors · {plural(d.sectors.length, "sector")}
            {d.unclassified.length > 0 ? ` · ${d.unclassified.length} unclassified` : ""}
          </p>
          {d.sectors.length === 0 ? (
            <div className="mt-3">
              <Empty>No sector on record for these companies.</Empty>
            </div>
          ) : (
            <ol className="mt-3 space-y-3">
              {d.sectors.map((bucket) => (
                <li key={bucket.label} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    {bucket.href ? (
                      <Link href={bucket.href} prefetch={false} className={cn("house-link text-[14px] font-semibold", FOCUS)}>
                        {bucket.label}
                      </Link>
                    ) : (
                      <span className="text-[14px] font-semibold text-[var(--ink)]">{bucket.label}</span>
                    )}
                    <span className="house-data shrink-0 text-[12px] tabular-nums text-[var(--ink-soft)]">
                      {bucket.count} · {Math.round(bucket.share * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--rule)]" aria-hidden>
                    <div className="h-full rounded-full bg-[var(--signal)]" style={{ width: `${Math.max(2, Math.round(bucket.share * 100))}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {bucket.codes.map((code) => (
                      <CompanyChip key={code} code={code} name={nameOf.get(code) ?? code} href={`/company/${code}`} />
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {multiSubSectors.length > 0 || singles > 0 ? (
            <div className={cn("mt-4 border-t pt-3", RULE)}>
              <p className="house-data house-micro text-[var(--ink-soft)]">Sub-sectors shared by two or more</p>
              {multiSubSectors.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                  {multiSubSectors.map((bucket) => (
                    <li key={bucket.label} className="text-[13px] text-[var(--ink)]">
                      {bucket.label} <span className="house-data text-[11px] text-[var(--ink-soft)]">×{bucket.count}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {singles > 0 ? (
                <p className="mt-1.5 text-[12px] text-[var(--ink-soft)]">
                  {multiSubSectors.length > 0 ? "Plus " : ""}
                  {plural(singles, "sub-sector")} with one name each.
                </p>
              ) : null}
            </div>
          ) : null}
        </Panel>

        <Panel>
          <p className="house-data house-micro text-[var(--ink-soft)]">
            Hot Themes ·{" "}
            <Link href="/themes" prefetch={false} className={cn("house-link", FOCUS)}>
              all themes
            </Link>
          </p>
          {d.themes.length === 0 ? (
            <div className="mt-3">
              <Empty>None of these companies sits in a featured Hot Theme right now.</Empty>
            </div>
          ) : (
            <ol className="mt-3 divide-y" style={{ borderColor: "var(--rule)" }}>
              {d.themes.map((theme) => (
                <li key={theme.slug} className={cn("py-2.5 first:pt-0 last:pb-0", RULE)}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-semibold text-[var(--ink)]">{theme.title}</span>
                    <span className="house-data shrink-0 text-[12px] tabular-nums text-[var(--ink-soft)]">
                      {plural(theme.count, "name")}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {theme.codes.map((code) => (
                      <CompanyChip key={code} code={code} name={nameOf.get(code) ?? code} href={`/company/${code}`} />
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. The good and the bad
// ---------------------------------------------------------------------------

const SIDE: Record<ProsConsSide, { kicker: string; tone: "good" | "bad"; empty: string }> = {
  good: { kicker: "The good", tone: "good", empty: "No clear strengths fire for these companies in the sections published so far." },
  bad: { kicker: "The bad", tone: "bad", empty: "No clear red flags fire for these companies in the sections published so far." },
};

function ProsConsPanel({ side, items, total }: { side: ProsConsSide; items: CrossProsConsItem[]; total: number }) {
  const meta = SIDE[side];
  return (
    <Panel>
      <p className="house-data house-micro flex items-center gap-2 text-[var(--ink-soft)]">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_VAR[meta.tone] }} />
        {meta.kicker}
      </p>
      {items.length === 0 ? (
        <div className="mt-3">
          <Empty>{meta.empty}</Empty>
        </div>
      ) : (
        <ol className="mt-2 divide-y" style={{ borderColor: "var(--rule)" }}>
          {items.map((item, index) => {
            const source = PROS_CONS_SOURCES[item.source];
            return (
              <li key={item.key} className={cn("flex gap-3 py-3 last:pb-0", RULE)}>
                <span className="house-data w-3 shrink-0 pt-px text-[12px] font-semibold" style={{ color: TONE_VAR[meta.tone] }}>
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-semibold leading-snug text-[var(--ink)]">{item.label}</span>
                    <span className="house-data shrink-0 text-[12px] tabular-nums text-[var(--ink-soft)]">
                      {item.count} of {total}
                    </span>
                  </div>
                  <p className="house-data house-micro mt-1 text-[var(--ink-soft)]">{source.label}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.companies.map((company) => (
                      <CompanyChip
                        key={company.code}
                        code={company.code}
                        name={company.name}
                        href={`/company/${company.code}#${source.sectionId}`}
                        title={company.evidence ? `${company.name}: ${company.evidence}` : company.name}
                      />
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

function ProsConsBlock({ analytics }: { analytics: WatchlistAnalytics }) {
  const { prosCons } = analytics;
  return (
    <section aria-label="The good and the bad, across the list">
      <BlockHead
        eyebrow="Across the list"
        title="The good and the bad"
        dek={`The company Overview's own good / bad rules, run for every name and counted. ${plural(prosCons.readCount, "company", "companies")} of ${prosCons.total} had a reading on either side. Hover a code for that company's number.`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProsConsPanel side="good" items={prosCons.good} total={prosCons.total} />
        <ProsConsPanel side="bad" items={prosCons.bad} total={prosCons.total} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. Big filings
// ---------------------------------------------------------------------------

function shortAge(label: string): string {
  return label === "just now" ? "now" : label.replace(/ ago$/, "");
}

function FilingRow({ pick }: { pick: WatchlistFiling }) {
  const { update, read } = pick;
  const impact = IMPACT_META[update.impact];
  const effect = read && read.story_effect !== "none" ? STORY_EFFECT_META[read.story_effect] : null;
  return (
    <li className={cn("grid gap-x-4 gap-y-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto]", RULE)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span aria-hidden className="house-data text-[11px] tabular-nums text-[var(--ink-soft)]">
            {pick.rank}
          </span>
          <Link
            href={`/company/${update.companyCode}#announcements`}
            prefetch={false}
            className={cn("house-display text-[15px] leading-tight hover:text-[var(--signal)]", FOCUS)}
          >
            {update.companyName}
          </Link>
          <span className="house-data text-[11px] text-[var(--ink-soft)]">{shortAge(update.filedLabel)}</span>
          <span className={cn(PILL, impact.className)}>{impact.label}</span>
          <span className="house-data house-micro font-semibold text-[var(--ink)]">{update.categoryLabel}</span>
        </div>
        <p className="mt-1 text-[14px] leading-snug text-[var(--ink)] [text-wrap:pretty]">{pick.headline}</p>
        {read ? (
          <details className="group mt-1.5">
            <summary className={cn("flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--ink-soft)]", FOCUS)}>
              <span className="underline decoration-[var(--rule)] underline-offset-4 group-open:no-underline">What it changes</span>
              {effect ? (
                <span className={cn(PILL, effect.className)} title={effect.title}>
                  {effect.label}
                </span>
              ) : null}
            </summary>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--ink)]">{read.changes}</p>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-[var(--ink-soft)]">{read.what}</p>
          </details>
        ) : null}
      </div>
      <div className="flex items-start gap-3 sm:flex-col sm:items-end sm:text-right">
        {update.orderSize ? (
          <span className="house-data text-[12px] leading-snug tabular-nums text-[var(--ink)]">{formatOrderSize(update.orderSize)}</span>
        ) : null}
        {update.attachmentUrl ? (
          <a
            href={update.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("house-data whitespace-nowrap text-[12px] text-[var(--ink-soft)] hover:text-[var(--signal)]", FOCUS)}
          >
            filing ↗
          </a>
        ) : null}
      </div>
    </li>
  );
}

function FilingsBlock({ analytics }: { analytics: WatchlistAnalytics }) {
  const { filings } = analytics;
  const counts = [
    filings.good > 0 ? `${filings.good} positive` : null,
    filings.adverse > 0 ? `${filings.adverse} adverse` : null,
    filings.routine > 0 ? `${filings.routine} routine` : null,
  ].filter(Boolean);
  const dek =
    filings.total === 0
      ? null
      : `${plural(filings.total, "material filing")} from these companies in the last ${filings.windowDays} days${counts.length ? ` — ${counts.join(", ")}` : ""}. Ranked as the Announcements page ranks its Top 5; routine filings are counted, not listed.`;
  return (
    <section aria-label="Big filings">
      <BlockHead eyebrow={`Last ${filings.windowDays} days`} title="Big filings" dek={dek} />
      <Panel>
        {filings.picks.length === 0 ? (
          <Empty>
            {filings.total === 0
              ? `No material filings from these companies in the last ${filings.windowDays} days.`
              : `Only routine filings from these companies in the last ${filings.windowDays} days.`}
          </Empty>
        ) : (
          <>
            <ol className="divide-y" style={{ borderColor: "var(--rule)" }}>
              {filings.picks.map((pick) => (
                <FilingRow key={pick.update.id} pick={pick} />
              ))}
            </ol>
            {filings.hidden > 0 ? (
              <p className={cn("mt-3 border-t pt-3 text-[12px] text-[var(--ink-soft)]", RULE)}>
                {plural(filings.hidden, "more non-routine filing")} not listed — at most two per company, eight in all. Each company&rsquo;s
                Announcements tab has its full tape.
              </p>
            ) : null}
          </>
        )}
      </Panel>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. Latest changes
// ---------------------------------------------------------------------------

function ChangeRow({ change }: { change: WatchlistChange }) {
  return (
    <li className={cn("grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 py-2.5 first:pt-0 last:pb-0", RULE)}>
      <span className="house-data pt-px text-[11px] text-[var(--ink-soft)]">{shortAge(formatRelativeActivityTime(change.at))}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link href={change.href} prefetch={false} className={cn("text-[13.5px] font-semibold text-[var(--ink)] hover:text-[var(--signal)]", FOCUS)}>
            {change.name}
          </Link>
          <span className="text-[13.5px] text-[var(--ink)]">{change.title}</span>
          {change.detail ? (
            <span className="house-data text-[12px]" style={{ color: TONE_VAR[change.tone] }}>
              {change.detail}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ChangesBlock({ analytics }: { analytics: WatchlistAnalytics }) {
  const { changes } = analytics;
  return (
    <section aria-label="Latest changes">
      <BlockHead
        eyebrow={`Last ${changes.windowDays} days`}
        title="Latest changes"
        dek="What moved in these companies' analysis: new ConcallScore prints with the change on the quarter before, growth and valuation reads that moved a band, and sections refreshed. Dated by when the read was written, not when the row landed."
      />
      <Panel>
        {changes.buckets.length === 0 ? (
          <Empty>Nothing in the analysis of these companies changed in the last {changes.windowDays} days.</Empty>
        ) : (
          <div className="space-y-5">
            {changes.buckets.map((bucket) => (
              <div key={bucket.key}>
                <p className="house-data house-micro mb-2 text-[var(--ink-soft)]">{bucket.label}</p>
                <ol className="divide-y" style={{ borderColor: "var(--rule)" }}>
                  {bucket.items.map((change) => (
                    <ChangeRow key={change.id} change={change} />
                  ))}
                </ol>
              </div>
            ))}
            {changes.total > changes.shown ? (
              <p className={cn("border-t pt-3 text-[12px] text-[var(--ink-soft)]", RULE)}>
                Showing the newest {changes.shown} of {changes.total}.
              </p>
            ) : null}
          </div>
        )}
      </Panel>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

export function WatchlistAnalyticsFallback() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading analytics">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={cn(PANEL, "h-40 animate-pulse")} style={PANEL_STYLE} />
      ))}
    </div>
  );
}

export async function WatchlistAnalyticsView({ codes }: { codes: string[] }) {
  const analytics = await buildWatchlistAnalytics(codes);
  return (
    <div className="space-y-8">
      <AnalyticsBeacon event="watchlist_analytics_view" count={analytics.companies.length} />
      <DistributionBlock analytics={analytics} />
      <ProsConsBlock analytics={analytics} />
      <FilingsBlock analytics={analytics} />
      <ChangesBlock analytics={analytics} />
    </div>
  );
}
