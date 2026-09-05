// The one-line distribution above a board: how many rows carry a read, and how
// they split across that column's own vocabulary. Shared by the leaderboard tabs
// and the watchlist so the same board is summarised the same way on both.

import type { BandCount } from "@/lib/leaderboard-distribution";

export function BandSummaryLine<K extends string>({
  scored,
  total,
  scopeNote,
  bandCounts,
}: {
  scored: number;
  total: number;
  scopeNote: string; // e.g. "scored this quarter" — shown when scored < total
  bandCounts: BandCount<K>[];
}) {
  const visible = bandCounts.filter((b) => b.count > 0);
  if (scored === 0 || visible.length === 0) return null;
  const headline =
    scored === total ? (
      <span className="font-semibold text-foreground">{total} companies</span>
    ) : (
      <>
        <span className="font-semibold text-foreground">
          {scored} of {total}
        </span>{" "}
        companies {scopeNote}
      </>
    );
  const breakdown = visible.map((b, i) => (
    <span key={b.key}>
      {i > 0 && " · "}
      <span className="font-semibold text-foreground">{b.count}</span> {b.label}
    </span>
  ));
  return (
    <>
      {/* Phone: the eight-way split ran to four lines above the board, so it
          folds behind the headline count until asked for. */}
      <details className="px-1 text-[12px] text-muted-foreground sm:hidden">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          {headline}
          <span className="ml-1.5 underline decoration-border underline-offset-2">read mix ▾</span>
        </summary>
        <p className="mt-1 leading-relaxed">{breakdown}</p>
      </details>
      <p className="hidden px-1 text-[12px] text-muted-foreground sm:block">
        {headline}
        {" · "}
        {breakdown}
      </p>
    </>
  );
}
