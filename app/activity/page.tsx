import Link from "next/link";
import type { Metadata } from "next";
import ConcallScore from "@/components/concall-score";
import { ScoreDelta } from "@/components/score-delta";
import {
  formatRelativeActivityTime,
  getUnifiedUpdates,
  typeChipClass,
  UPDATE_TYPE_LABELS,
  type UnifiedUpdate,
  type UpdateType,
} from "@/lib/activity-feed";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Activity – Story of a Stock",
  description: "Time-ordered feed of updates across covered companies.",
};

type FilterKey = "all" | UpdateType | "quarter_latest";

const FILTER_PILLS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "quarter_latest", label: "Latest quarter" },
  { key: "quarter", label: "Quarter scores" },
  { key: "growth", label: "Growth" },
  { key: "guidance_monitor", label: "Guidance" },
  { key: "business_snapshot", label: "Snapshots" },
  { key: "key_variables", label: "Key variables" },
];

function ActivityRow({ item }: { item: UnifiedUpdate }) {
  const showTypeChip = true;
  const row = (
    <div className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/70">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {item.companyName}
          {item.companyIsNew && (
            <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-medium leading-none text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
              New
            </span>
          )}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {showTypeChip && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${typeChipClass(item.type)}`}
            >
              {item.sourceLabel}
            </span>
          )}
          {item.detail && (
            <span
              className={`text-[12px] text-muted-foreground ${item.type === "guidance_monitor" ? "line-clamp-1" : ""}`}
            >
              {item.detail}
            </span>
          )}
          <span
            className="text-[11px] text-muted-foreground"
            title={item.atRaw ?? undefined}
          >
            {formatRelativeActivityTime(item.atRaw)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {typeof item.score === "number" ? (
          <>
            <ConcallScore score={item.score} size="sm" />
            <ScoreDelta score={item.score} priorScore={item.priorScore} />
          </>
        ) : item.contextLabel ? (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${typeChipClass(item.type)}`}
          >
            {item.contextLabel}
          </span>
        ) : null}
      </div>
    </div>
  );

  const href = item.artifactHref ?? (item.companyCode ? `/company/${item.companyCode}` : null);
  if (!href) {
    return <div>{row}</div>;
  }
  return (
    <Link href={href} prefetch={false}>
      {row}
    </Link>
  );
}

function FilterPills({
  active,
  latestQuarterLabel,
}: {
  active: FilterKey;
  latestQuarterLabel: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_PILLS.map((pill) => {
        const isActive = pill.key === active;
        const href = pill.key === "all" ? "/activity" : `/activity?type=${pill.key}`;
        const label =
          pill.key === "quarter_latest" && latestQuarterLabel
            ? `${pill.label} · ${latestQuarterLabel}`
            : pill.label;
        return (
          <Link
            key={pill.key}
            href={href}
            prefetch={false}
            className={
              isActive
                ? "rounded-full border border-foreground bg-foreground px-3 py-1 text-xs font-semibold text-background"
                : "rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function parseFilter(value: string | string[] | undefined): FilterKey {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return "all";
  if (candidate === "all" || candidate === "quarter_latest") return candidate;
  if (candidate in UPDATE_TYPE_LABELS) return candidate as FilterKey;
  return "all";
}

function findLatestQuarterKey(items: UnifiedUpdate[]) {
  return items.reduce<{ fy: number; qtr: number } | null>((acc, item) => {
    if (item.type !== "quarter" || item.fy == null || item.qtr == null) return acc;
    if (!acc) return { fy: item.fy, qtr: item.qtr };
    if (item.fy > acc.fy || (item.fy === acc.fy && item.qtr > acc.qtr)) {
      return { fy: item.fy, qtr: item.qtr };
    }
    return acc;
  }, null);
}

type ActivityPageProps = {
  searchParams?: Promise<{ type?: string | string[] }>;
};

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const params = (await searchParams) ?? {};
  const activeFilter = parseFilter(params.type);

  const updates = await getUnifiedUpdates({
    limit: 200,
    collapseSameCompanyRuns: false,
  });

  const latestQuarterKey = findLatestQuarterKey(updates);
  const latestQuarterLabel = latestQuarterKey
    ? `Q${latestQuarterKey.qtr} FY${latestQuarterKey.fy}`
    : null;

  const filtered =
    activeFilter === "all"
      ? updates
      : activeFilter === "quarter_latest"
        ? updates.filter(
            (item) =>
              item.type === "quarter" &&
              latestQuarterKey != null &&
              item.fy === latestQuarterKey.fy &&
              item.qtr === latestQuarterKey.qtr,
          )
        : updates.filter((item) => item.type === activeFilter);

  const recentCutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = filtered.filter((item) => item.atMs >= recentCutoffMs);
  const earlier = filtered.filter((item) => item.atMs < recentCutoffMs);

  const newCompanyCount = new Set(
    filtered.filter((item) => item.companyIsNew && item.companyCode).map((item) => item.companyCode),
  ).size;

  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 -top-28 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_38%)]" />
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 space-y-3">
          <h1 className="text-3xl font-black tracking-[-0.03em] text-foreground sm:text-4xl">
            Activity
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            What changed across covered companies — newest first. Click any row
            to jump to the source section on the company page.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{recent.length}</span>{" "}
              update{recent.length === 1 ? "" : "s"} in the last 7 days
            </span>
            {newCompanyCount > 0 && (
              <span>
                ·{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {newCompanyCount}
                </span>{" "}
                new compan{newCompanyCount === 1 ? "y" : "ies"} this window
              </span>
            )}
          </div>
        </header>

        <div className="mb-4">
          <FilterPills active={activeFilter} latestQuarterLabel={latestQuarterLabel} />
        </div>

        <section className="rounded-2xl border border-border bg-card">
          {filtered.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              No updates matching this filter.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Last 7 days
                </span>
                <span className="rounded-full border border-border bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {recent.length}
                </span>
              </div>
              {recent.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Nothing new in the last 7 days.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recent.map((item) => (
                    <ActivityRow key={item.id} item={item} />
                  ))}
                </div>
              )}
              {earlier.length > 0 && (
                <>
                  <div className="flex items-center justify-between gap-2 border-y border-border bg-background/40 px-4 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Earlier
                    </span>
                    <span className="rounded-full border border-border bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {earlier.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {earlier.map((item) => (
                      <ActivityRow key={item.id} item={item} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
