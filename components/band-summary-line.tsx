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
  return (
    <p className="px-1 text-[12px] text-muted-foreground">
      {scored === total ? (
        <span className="font-semibold text-foreground">{total} companies</span>
      ) : (
        <>
          <span className="font-semibold text-foreground">
            {scored} of {total}
          </span>{" "}
          companies {scopeNote}
        </>
      )}
      {" · "}
      {visible.map((b, i) => (
        <span key={b.key}>
          {i > 0 && " · "}
          <span className="font-semibold text-foreground">{b.count}</span> {b.label}
        </span>
      ))}
    </p>
  );
}
