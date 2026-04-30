import type { Metadata } from "next";
import Link from "next/link";
import { HERO_CARD, PAGE_SHELL, PANEL_CARD_SKY } from "@/lib/design/shell";
import {
  BUCKETS,
  BUCKET_ORDER,
  TARGET_LABEL,
  type BucketKey,
  type TrackerEntry,
  getTrackerData,
} from "./data";
import { SectorFilter } from "./sector-filter";

export const metadata: Metadata = {
  title: `${TARGET_LABEL} Tracker – Story of a Stock`,
  description: `Track ${TARGET_LABEL} earnings calls across coverage by quality bucket and sector.`,
};

const PAGE_BACKGROUND_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.78),_transparent_62%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.34),_transparent_62%)]";

const isBucketKey = (val: string | undefined): val is BucketKey =>
  val != null && (BUCKET_ORDER as string[]).includes(val);

export default async function Q4FY26TrackerPage({
  searchParams,
}: {
  searchParams?: Promise<{ bucket?: string; sector?: string }>;
}) {
  const resolved = await searchParams;
  const activeBucket = isBucketKey(resolved?.bucket) ? resolved!.bucket : null;
  const activeSector = resolved?.sector ?? null;

  const { entries, countsByBucket, sectors, totalCompanies, reportedCompanies } =
    await getTrackerData();

  const filtered = entries.filter((entry) => {
    if (activeBucket && entry.bucket !== activeBucket) return false;
    if (activeSector && entry.sector !== activeSector) return false;
    return true;
  });

  const groups = BUCKET_ORDER.map((key) => ({
    key,
    entries: filtered.filter((e) => e.bucket === key),
  })).filter((g) => g.entries.length > 0);

  const buildHref = (overrides: Partial<{ bucket: string | null; sector: string | null }>) => {
    const params = new URLSearchParams();
    const bucket = overrides.bucket !== undefined ? overrides.bucket : activeBucket;
    const sector = overrides.sector !== undefined ? overrides.sector : activeSector;
    if (bucket) params.set("bucket", bucket);
    if (sector) params.set("sector", sector);
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-200">
                {TARGET_LABEL} earnings tracker
              </p>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                {TARGET_LABEL} Tracker
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {reportedCompanies} of {totalCompanies} covered companies have reported {TARGET_LABEL}.
                Bucketed by concall sentiment score; “Upcoming” covers companies in our coverage
                that haven’t filed yet.
              </p>
            </div>

            <DistributionBar countsByBucket={countsByBucket} total={totalCompanies} />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {BUCKET_ORDER.map((key) => {
                const def = BUCKETS[key];
                const count = countsByBucket[key];
                const isActive = activeBucket === key;
                return (
                  <Link
                    key={key}
                    href={buildHref({ bucket: isActive ? null : key })}
                    scroll={false}
                    prefetch={false}
                    aria-pressed={isActive}
                    className={`${PANEL_CARD_SKY} block transition-colors hover:bg-sky-100/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:hover:bg-sky-900/30 ${
                      isActive ? "ring-2 ring-sky-400/70" : ""
                    }`}
                  >
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${def.textClass}`}
                    >
                      {def.label}
                    </p>
                    <p className="mt-2 text-2xl font-black leading-none text-foreground">
                      {count}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{def.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href={buildHref({ bucket: null })}
              scroll={false}
              prefetch={false}
              className={`rounded-full border px-3 py-1.5 font-medium transition-colors ${
                activeBucket == null
                  ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
                  : "border-border/60 bg-background/80 text-muted-foreground hover:bg-accent"
              }`}
            >
              All ({totalCompanies})
            </Link>
            {BUCKET_ORDER.map((key) => {
              const def = BUCKETS[key];
              const isActive = activeBucket === key;
              return (
                <Link
                  key={key}
                  href={buildHref({ bucket: isActive ? null : key })}
                  scroll={false}
                  prefetch={false}
                  className={`rounded-full border px-3 py-1.5 font-medium transition-colors ${
                    isActive
                      ? `${def.borderClass} bg-background/90 ${def.textClass}`
                      : "border-border/60 bg-background/80 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {def.label} ({countsByBucket[key]})
                </Link>
              );
            })}
          </div>

          <SectorFilter sectors={sectors} selected={activeSector} />
        </section>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No companies match the current filters.
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <BucketSection
                key={group.key}
                bucketKey={group.key}
                entries={group.entries}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

function DistributionBar({
  countsByBucket,
  total,
}: {
  countsByBucket: Record<BucketKey, number>;
  total: number;
}) {
  if (total === 0) return null;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-200/60 dark:bg-zinc-800/60">
      {BUCKET_ORDER.map((key) => {
        const count = countsByBucket[key];
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <span
            key={key}
            className={BUCKETS[key].barClass}
            style={{ width: `${pct}%` }}
            title={`${BUCKETS[key].label}: ${count}`}
          />
        );
      })}
    </div>
  );
}

function BucketSection({
  bucketKey,
  entries,
}: {
  bucketKey: BucketKey;
  entries: TrackerEntry[];
}) {
  const def = BUCKETS[bucketKey];
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className={`text-sm font-semibold uppercase tracking-[0.16em] ${def.textClass}`}>
          {def.label}
        </h2>
        <span className="text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? "company" : "companies"} · {def.description}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {entries.map((entry) => (
          <CompanyCard key={entry.code} entry={entry} />
        ))}
      </div>
    </section>
  );
}

const SHORT_DATE = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
});

const formatExpectedDate = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return SHORT_DATE.format(d);
};

function CompanyCard({ entry }: { entry: TrackerEntry }) {
  const def = BUCKETS[entry.bucket];
  const isUpcoming = entry.bucket === "upcoming";
  const expectedLabel = formatExpectedDate(entry.expectedDate);
  return (
    <Link
      href={`/company/${encodeURIComponent(entry.code)}`}
      prefetch={false}
      className={`group flex h-full flex-col justify-between gap-2 rounded-2xl border bg-background/80 p-3 shadow-sm transition-colors hover:bg-accent ${def.borderClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{entry.code}</p>
        </div>
        {isUpcoming ? (
          <span className="inline-flex items-center rounded-full border border-zinc-300/60 bg-zinc-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-700/40 dark:bg-zinc-900/40 dark:text-zinc-300">
            {expectedLabel ?? "Upcoming"}
          </span>
        ) : (
          <span
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-extrabold text-black shadow-sm ${def.barClass}`}
            title={def.label}
          >
            {entry.score?.toFixed(1)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{entry.sector ?? "—"}</span>
        {entry.priorScore != null && entry.priorLabel ? (
          <span className="shrink-0">
            {entry.priorLabel}: {entry.priorScore.toFixed(1)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
