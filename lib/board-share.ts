// The company page's "Where it sits" chip: where a company's Overall-board rank
// falls, in words a cold reader reads right. Pinned by tests/board-share-label.test.ts.
//
// "Top N%" (rank 11/81 → "Top 14%") only in the top half. Below the middle the
// chip says "Bottom N%" — the share of the board at or below the company — so a
// company ranked 185th of 190 reads "Bottom 3%", not "Top 97%". Until 2026-11-21
// the coverage cut capped this: anything past rank 100 showed "BELOW LINE".
//
// The stored percentile columns hold a different convention (share of the
// universe at-or-below you) and feed getPercentileTone — never put that number
// after the word "Top".
export function boardShareLabel(rank: number, total: number): { label: string; topHalf: boolean } {
  const topHalf = rank / total <= 0.5 || total <= 1;
  if (topHalf) {
    return { label: `Top ${Math.max(1, Math.round((rank / total) * 100))}%`, topHalf };
  }
  return { label: `Bottom ${Math.max(1, Math.round(((total - rank + 1) / total) * 100))}%`, topHalf };
}
