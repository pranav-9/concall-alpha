import Link from "next/link";

import ConcallScore from "@/components/concall-score";
import type { DeskTableRow } from "./desk-leaderboard-table";
import DeskMostViewed from "./desk-most-viewed";
import { BelowSm, FromSm } from "@/components/viewport-gate";
import { MOBILE_CARD, MobileCardHead } from "./desk-mobile-card";
import { MobileMiniList, MobileMiniLabel } from "./desk-most-viewed";

// The right rail: two ranked blocks the mockup calls "Top of the book" — the
// quarter's highest reads and the companies readers are viewing most.
export default function DeskTopOfBook({
  quarterLabel,
  topPerformers,
  mostViewedWeek,
  mostViewedMonth,
  mostViewedInitial,
}: {
  quarterLabel: string;
  topPerformers: DeskTableRow[];
  mostViewedWeek: DeskTableRow[];
  mostViewedMonth: DeskTableRow[];
  mostViewedInitial: "week" | "month";
}) {
  return (
    <>
    {/* Phone (< sm): one card, two terse mini-lists — rank · name · score as
        mono text. Lighter than the ranking rows on purpose. */}
    <BelowSm>
      <section aria-labelledby="desk-top-of-book-mobile" className={MOBILE_CARD}>
        <MobileCardHead
          id="desk-top-of-book-mobile"
          eyebrow="Top of the book"
          right={
            <span className="house-data whitespace-nowrap text-[10px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
              {quarterLabel}
            </span>
          }
        />
        <MobileMiniLabel>Top performers</MobileMiniLabel>
        <MobileMiniList rows={topPerformers} />
        <DeskMostViewed
          week={mostViewedWeek}
          month={mostViewedMonth}
          initialWindow={mostViewedInitial}
          variant="mobile"
        />
      </section>
    </BelowSm>
    <FromSm>
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

      <DeskMostViewed
        week={mostViewedWeek}
        month={mostViewedMonth}
        initialWindow={mostViewedInitial}
      />
    </div>
    </FromSm>
    </>
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
