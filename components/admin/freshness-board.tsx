import Link from "next/link";

import { describeAge, freshnessTone, type FreshnessFeed, type FreshnessTone } from "@/lib/admin/freshness";
import { formatIst } from "@/lib/admin/metrics";
import { cn } from "@/lib/utils";

import { AdminPanel, AdminTag } from "./shell";
import { EYEBROW } from "./tokens";

const DOT: Record<FreshnessTone, string> = {
  fresh: "bg-[var(--signal)]",
  warn: "bg-[var(--warn)]",
  alarm: "bg-[var(--alarm)]",
  unknown: "bg-[var(--rule)]",
};

const AGE_INK: Record<FreshnessTone, string> = {
  fresh: "text-[var(--ink)]",
  warn: "text-[var(--warn)]",
  alarm: "text-[var(--alarm)]",
  unknown: "text-[var(--ink-soft)]",
};

export function FreshnessBoard({ feeds, now }: { feeds: FreshnessFeed[]; now: Date }) {
  const stale = feeds.filter((f) => {
    const tone = freshnessTone(f, now);
    return tone === "warn" || tone === "alarm";
  }).length;

  return (
    <AdminPanel
      eyebrow="Pipeline freshness"
      flush
      right={
        stale > 0 ? (
          <AdminTag tone="warn">{stale} behind cadence</AdminTag>
        ) : (
          <AdminTag tone="signal">all on cadence</AdminTag>
        )
      }
    >
      <ul>
        {feeds.map((feed) => {
          const tone = freshnessTone(feed, now);
          const pivot = feed.oldestIso ?? feed.latestIso;
          return (
            <li
              key={feed.key}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-[var(--rule)] px-4 py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
            >
              <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full sm:mt-0", DOT[tone])} />
              <div className="min-w-0">
                <p className="text-[13px] text-[var(--ink)]">{feed.label}</p>
                <p className="house-data mt-0.5 truncate text-[11px] text-[var(--ink-soft)]">
                  {feed.detail} · {feed.cadence}
                </p>
              </div>
              <div className="col-start-2 mt-1 min-w-0 sm:col-start-3 sm:mt-0">
                {feed.error ? (
                  <p className="house-data truncate text-[11px] text-[var(--alarm)]" title={feed.error}>
                    read failed · {feed.error}
                  </p>
                ) : (
                  <p className="house-data text-[12px]">
                    <span className={AGE_INK[tone]}>{describeAge(pivot, now)}</span>
                    <span className="text-[var(--ink-soft)]">
                      {" "}
                      · {formatIst(pivot, now)}
                      {feed.oldestIso && feed.latestIso && feed.oldestIso !== feed.latestIso
                        ? ` (newest ${describeAge(feed.latestIso, now)})`
                        : ""}
                    </span>
                  </p>
                )}
              </div>
              <div className="col-start-3 row-start-1 sm:col-start-4">
                {feed.action ? (
                  <Link href={feed.action.href} prefetch={false} className={cn(EYEBROW, "house-link")}>
                    {feed.action.label}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </AdminPanel>
  );
}
