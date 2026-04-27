import Link from "next/link";
import type { Metadata } from "next";
import ConcallScore from "@/components/concall-score";
import {
  formatActivityDate,
  getUnifiedUpdates,
  typeChipClass,
  UPDATE_TYPE_LABELS,
  type UpdateType,
} from "@/lib/activity-feed";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Activity – Story of a Stock",
  description: "Time-ordered feed of updates across covered companies.",
};

const FILTER_TYPES: UpdateType[] = [
  "quarter",
  "growth",
  "business_snapshot",
  "industry_context",
  "key_variables",
  "guidance_monitor",
];

const isUpdateType = (value: string | undefined): value is UpdateType =>
  !!value && (FILTER_TYPES as string[]).includes(value);

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const resolved = await searchParams;
  const activeType = isUpdateType(resolved?.type) ? resolved.type : null;

  const updates = await getUnifiedUpdates({
    limit: 200,
    collapseSameCompanyRuns: false,
  });

  const filtered = activeType
    ? updates.filter((item) => item.type === activeType)
    : updates;

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors";
  const chipActive =
    "border-foreground bg-foreground text-background";
  const chipIdle =
    "border-border bg-background/70 text-muted-foreground hover:bg-accent/70 hover:text-foreground";

  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 -top-28 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_38%)]" />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-6 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Activity feed
          </p>
          <h1 className="text-3xl font-black tracking-[-0.03em] text-foreground sm:text-4xl">
            Activity
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Time-ordered feed of every update across covered companies — score moves,
            snapshot refreshes, industry context, key variables, and guidance.
          </p>
        </header>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link
            href="/activity"
            prefetch={false}
            className={`${chipBase} ${activeType === null ? chipActive : chipIdle}`}
          >
            All
            <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
              {updates.length}
            </span>
          </Link>
          {FILTER_TYPES.map((type) => {
            const count = updates.filter((item) => item.type === type).length;
            const isActive = activeType === type;
            return (
              <Link
                key={type}
                href={`/activity?type=${type}`}
                prefetch={false}
                className={`${chipBase} ${isActive ? chipActive : chipIdle}`}
              >
                {UPDATE_TYPE_LABELS[type]}
                <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-card">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              No updates yet for this filter.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((item) => {
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
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${typeChipClass(item.type)}`}
                        >
                          {item.sourceLabel}
                        </span>
                        {item.detail && item.type !== "guidance_monitor" && (
                          <span className="text-[12px] text-muted-foreground">
                            {item.detail}
                          </span>
                        )}
                        {item.type === "guidance_monitor" && item.detail && (
                          <span className="text-[12px] text-muted-foreground line-clamp-1">
                            {item.detail}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {formatActivityDate(item.atRaw)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {typeof item.score === "number" ? (
                        <ConcallScore score={item.score} size="sm" />
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

                if (!item.companyCode) {
                  return <div key={item.id}>{row}</div>;
                }
                return (
                  <Link
                    key={item.id}
                    href={`/company/${item.companyCode}`}
                    prefetch={false}
                  >
                    {row}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Showing {filtered.length} {activeType ? UPDATE_TYPE_LABELS[activeType].toLowerCase() : ""} update{filtered.length === 1 ? "" : "s"}.
          </p>
        )}
      </div>
    </main>
  );
}
