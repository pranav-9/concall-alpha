import Link from "next/link";

import ConcallScore from "@/components/concall-score";
import type { DeskTableRow } from "./desk-leaderboard-table";

// The right rail: two ranked blocks the mockup calls "Top of the book" — the
// quarter's highest reads and the biggest positive trend twists.
export default function DeskTopOfBook({
  quarterLabel,
  topPerformers,
  positiveTwist,
}: {
  quarterLabel: string;
  topPerformers: DeskTableRow[];
  positiveTwist: DeskTableRow[];
}) {
  return (
    <div className="space-y-8 lg:sticky lg:top-24">
      <Block title={`${quarterLabel} top performers`}>
        {topPerformers.map((row, i) => (
          <Link
            key={row.code}
            href={`/company/${row.code}`}
            prefetch={false}
            className="flex items-center gap-3 border-b border-[var(--rule)] py-2.5 last:border-b-0 transition-colors hover:bg-[var(--paper-2)]"
          >
            <span className="house-data house-micro w-4 shrink-0 text-[var(--ink-soft)]">
              {i + 1}
            </span>
            <span className="house-display min-w-0 flex-1 truncate text-sm text-[var(--ink)]">
              {row.name}
            </span>
            {row.latestScore != null ? (
              <ConcallScore score={row.latestScore} size="sm" />
            ) : null}
          </Link>
        ))}
      </Block>

      <Block title="Positive trend twist">
        {positiveTwist.map((row) => (
          <Link
            key={row.code}
            href={`/company/${row.code}`}
            prefetch={false}
            className="flex items-center gap-3 border-b border-[var(--rule)] py-2.5 last:border-b-0 transition-colors hover:bg-[var(--paper-2)]"
          >
            <span className="min-w-0 flex-1">
              <span className="house-display block truncate text-sm text-[var(--ink)]">
                {row.name}
              </span>
              {row.twistPct != null ? (
                <span className="house-data house-micro text-[var(--ink-soft)]">
                  +{row.twistPct.toFixed(1)}% vs prev 4Q avg
                </span>
              ) : null}
            </span>
            {row.latestScore != null ? (
              <ConcallScore score={row.latestScore} size="sm" />
            ) : null}
          </Link>
        ))}
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-[var(--rule)] bg-[var(--paper-2)] p-4">
      <h3 className="house-data house-micro mb-2 text-[var(--ink-soft)]">{title}</h3>
      <div>{children}</div>
    </section>
  );
}
