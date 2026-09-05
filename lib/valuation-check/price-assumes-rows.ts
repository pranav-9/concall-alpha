// Rows for the phone rendering of "What the price is assuming": the same
// markers the desktop horizon bar (valuation-horizon-bar.tsx) plots, as a
// sorted list. Kept as a pure function so the two renderings can't drift on
// units — scenarios arrive as FRACTIONS (0.19) and are scaled to percent here,
// exactly as the bar does; delivered figures already arrive in percent.

export type PriceAssumesRowKind = "case" | "delivered" | "ask";

export type PriceAssumesRow = {
  key: string;
  label: string;
  pct: number;
  kind: PriceAssumesRowKind;
};

export type PriceAssumesInput = {
  impliedPct: number;
  scenarios: { downside: number | null; base: number | null; upside: number | null };
  delivered: { key: string; label: string; pct: number }[];
  /** "growth" = reverse-DCF implied revenue CAGR; "roe" = reverse residual-income implied RoE. */
  metric: "growth" | "roe";
};

/**
 * Delivered labels arrive as "10-yr delivered" or "TTM". Say "delivered" once:
 * capitalise a label that already carries the word, append it otherwise.
 */
export const deliveredRowLabel = (label: string, metric: PriceAssumesInput["metric"]): string => {
  if (metric === "roe") return "Return on equity it earns";
  if (/delivered/i.test(label)) return label.replace(/^./, (c) => c.toUpperCase());
  return `${label} delivered`;
};

export function buildPriceAssumesRows({
  impliedPct,
  scenarios,
  delivered,
  metric,
}: PriceAssumesInput): PriceAssumesRow[] {
  const rows: PriceAssumesRow[] = [];
  if (scenarios.downside !== null)
    rows.push({ key: "down", label: "Our downside case", pct: scenarios.downside * 100, kind: "case" });
  if (scenarios.base !== null)
    rows.push({ key: "base", label: "Our base case", pct: scenarios.base * 100, kind: "case" });
  if (scenarios.upside !== null)
    rows.push({ key: "up", label: "Our upside case", pct: scenarios.upside * 100, kind: "case" });
  for (const d of delivered) {
    rows.push({
      key: `d-${d.key}`,
      label: deliveredRowLabel(d.label, metric),
      pct: d.pct,
      kind: "delivered",
    });
  }
  // Ascending, so the eye reads low → high; the ask is appended AFTER the sort
  // so it always closes the list regardless of where it falls numerically.
  rows.sort((a, b) => a.pct - b.pct);
  rows.push({
    key: "ask",
    label:
      metric === "roe"
        ? "The ask · implied by today's price"
        : "The ask · growth implied by today's price",
    pct: impliedPct,
    kind: "ask",
  });
  return rows;
}
