import type { Metadata } from "next";
import Link from "next/link";
import { HERO_CARD, PAGE_SHELL } from "@/lib/design/shell";
import {
  BUCKETS,
  BUCKET_ORDER,
  type BucketKey,
  type TrackerEntry,
  getTargetQuarter,
  getTrackerData,
} from "./data";
import { SectorFilter } from "./sector-filter";
import { TrackerTable } from "./tracker-table";

// generateMetadata (not a static export) so the label is computed per request
// and never freezes at a season boundary.
export async function generateMetadata(): Promise<Metadata> {
  const { label } = getTargetQuarter();
  return {
    title: `${label} Quality Tracker – Story of a Stock`,
    description: `Track ${label} quarter quality across coverage by score movement and sector.`,
  };
}

const PAGE_BACKGROUND_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.78),_transparent_62%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.34),_transparent_62%)]";

const SCORE_DELTA_EPSILON = 0.05;

type MovementKey = "improvers" | "decliners" | "flat" | "upcoming";

const MOVEMENT_OPTIONS: Array<{ key: MovementKey | null; label: string }> = [
  { key: null, label: "All reported" },
  { key: "improvers", label: "Improvers" },
  { key: "decliners", label: "Decliners" },
  { key: "flat", label: "Flat" },
  { key: "upcoming", label: "Upcoming" },
];

const isMovementKey = (val: string | undefined): val is MovementKey =>
  val === "improvers" || val === "decliners" || val === "flat" || val === "upcoming";

const isImprover = (entry: TrackerEntry) =>
  entry.score != null &&
  entry.priorScore != null &&
  entry.score - entry.priorScore >= SCORE_DELTA_EPSILON;

const isDecliner = (entry: TrackerEntry) =>
  entry.score != null &&
  entry.priorScore != null &&
  entry.score - entry.priorScore <= -SCORE_DELTA_EPSILON;

const isFlat = (entry: TrackerEntry) =>
  entry.score != null &&
  entry.priorScore != null &&
  Math.abs(entry.score - entry.priorScore) < SCORE_DELTA_EPSILON;

const matchesMovement = (entry: TrackerEntry, movement: MovementKey | null) => {
  if (movement == null) return entry.bucket !== "upcoming";
  if (movement === "upcoming") return entry.bucket === "upcoming";
  if (movement === "improvers") return isImprover(entry);
  if (movement === "decliners") return isDecliner(entry);
  return isFlat(entry);
};

const getMovementCount = (entries: TrackerEntry[], movement: MovementKey | null) =>
  entries.filter((entry) => matchesMovement(entry, movement)).length;

export default async function QuarterTrackerPage({
  searchParams,
}: {
  searchParams?: Promise<{ movement?: string; sector?: string }>;
}) {
  const resolved = await searchParams;
  const activeMovement = isMovementKey(resolved?.movement) ? resolved!.movement : null;
  const activeSector = resolved?.sector ?? null;

  const { target, entries, countsByBucket, sectors, totalCompanies, reportedCompanies } =
    await getTrackerData();
  const upcomingCompanies = countsByBucket.upcoming;

  const sectorFiltered = entries.filter((entry) => {
    if (activeSector && entry.sector !== activeSector) return false;
    return true;
  });
  const movementCounts = MOVEMENT_OPTIONS.reduce(
    (acc, option) => ({
      ...acc,
      [option.key ?? "reported"]: getMovementCount(sectorFiltered, option.key),
    }),
    {} as Record<MovementKey | "reported", number>,
  );
  const resultEntries = sectorFiltered.filter((entry) =>
    matchesMovement(entry, activeMovement),
  );

  const buildHref = (overrides: Partial<{ movement: MovementKey | null; sector: string | null }>) => {
    const params = new URLSearchParams();
    const movement =
      overrides.movement !== undefined ? overrides.movement : activeMovement;
    const sector = overrides.sector !== undefined ? overrides.sector : activeSector;
    if (movement) params.set("movement", movement);
    if (sector) params.set("sector", sector);
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <section className={`${HERO_CARD} sm:p-5`}>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-200">
                  {target.label} quarter quality tracker
                </p>
                <h1 className="text-2xl font-black text-foreground sm:text-3xl">
                  {target.label} Quality Tracker
                </h1>
              </div>
              <p className="inline-flex w-fit rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm shadow-black/5">
                {reportedCompanies} / {totalCompanies} reported · {upcomingCompanies} upcoming ·{" "}
                {target.label}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
                <span>Reported score mix</span>
                <span>{reportedCompanies} reported</span>
              </div>
              <DistributionBar countsByBucket={countsByBucket} total={reportedCompanies} />
            </div>

            <BucketSummary countsByBucket={countsByBucket} />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-border/35 bg-background/45 px-3 py-3 shadow-sm shadow-black/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
            <span className="mr-1 font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Movement
            </span>
            {MOVEMENT_OPTIONS.map((option) => {
              const isActive = activeMovement === option.key;
              const count = movementCounts[option.key ?? "reported"];
              return (
                <Link
                  key={option.key ?? "reported"}
                  href={buildHref({ movement: option.key })}
                  scroll={false}
                  prefetch={false}
                  className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${
                    isActive
                      ? "border-sky-300/70 bg-sky-100/80 text-sky-900 ring-1 ring-sky-300/40 dark:border-sky-700/45 dark:bg-sky-900/35 dark:text-sky-100"
                      : "border-border/45 bg-background/60 text-muted-foreground hover:bg-accent/70"
                  }`}
                >
                  {option.label} ({count})
                </Link>
              );
            })}
          </div>
          <SectorFilter sectors={sectors} selected={activeSector} />
        </section>

        {resultEntries.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No companies match the current filters.
          </div>
        ) : (
          <TrackerTable entries={resultEntries} scoreLabel={target.label} />
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

function BucketSummary({
  countsByBucket,
}: {
  countsByBucket: Record<BucketKey, number>;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {BUCKET_ORDER.map((key) => {
        const def = BUCKETS[key];
        return (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${def.barClass}`} />
            <span className="font-medium text-foreground/80">{def.label}</span>
            <span className="tabular-nums">{countsByBucket[key]}</span>
          </span>
        );
      })}
    </div>
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
        if (key === "upcoming") return null;
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

