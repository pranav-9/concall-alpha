// The markers behind "What the price is assuming": our fair-value cases, what
// the company delivered, and the ask (what today's price implies). ONE builder
// feeds both renderings — the desktop horizon bar (valuation-horizon-bar.tsx)
// and the phone list (PriceAssumesList) — so they cannot drift on units.
// Scenarios arrive as FRACTIONS (0.19) and are scaled to percent here; delivered
// figures already arrive in percent.

export type PriceMarkerKind = "case" | "delivered" | "ask";

export type PriceMarker = {
  /** Stable id the bar keys its labels on: downside | base | upside | delivered-<key> | ask */
  id: string;
  /** Source label: "Downside"/"Base"/"Upside", the delivered meta label, or "Price implies". */
  label: string;
  pct: number;
  kind: PriceMarkerKind;
};

export type PriceAssumesInput = {
  impliedPct: number;
  scenarios: { downside: number | null; base: number | null; upside: number | null };
  delivered: { key: string; label: string; pct: number }[];
  /** "growth" = reverse-DCF implied revenue CAGR; "roe" = reverse residual-income implied RoE. */
  metric: "growth" | "roe";
};

/** Unsorted markers in source order: cases, delivered, then the ask. */
export function buildPriceMarkers({
  impliedPct,
  scenarios,
  delivered,
}: Omit<PriceAssumesInput, "metric">): PriceMarker[] {
  const markers: PriceMarker[] = [];
  if (scenarios.downside !== null)
    markers.push({ id: "downside", label: "Downside", pct: scenarios.downside * 100, kind: "case" });
  if (scenarios.base !== null)
    markers.push({ id: "base", label: "Base", pct: scenarios.base * 100, kind: "case" });
  if (scenarios.upside !== null)
    markers.push({ id: "upside", label: "Upside", pct: scenarios.upside * 100, kind: "case" });
  for (const d of delivered)
    markers.push({ id: `delivered-${d.key}`, label: d.label, pct: d.pct, kind: "delivered" });
  markers.push({ id: "ask", label: "Price implies", pct: impliedPct, kind: "ask" });
  return markers;
}

export type PriceAssumesRow = {
  key: string;
  label: string;
  pct: number;
  kind: PriceMarkerKind;
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

const CASE_ROW_LABEL: Record<string, string> = {
  downside: "Our downside case",
  base: "Our base case",
  upside: "Our upside case",
};

/**
 * The phone list: every marker, including the ask, in ascending numeric order.
 * The ask is emphasised by its row style, NOT by position — pinning it last
 * would read as "highest" on a cheap stock whose implied growth sits below our
 * base case. Ties keep source order (cases, delivered, ask); sort is stable.
 */
export function buildPriceAssumesRows(input: PriceAssumesInput): PriceAssumesRow[] {
  const rows: PriceAssumesRow[] = buildPriceMarkers(input).map((m) => ({
    key: m.id,
    kind: m.kind,
    pct: m.pct,
    label:
      m.kind === "case"
        ? (CASE_ROW_LABEL[m.id] ?? m.label)
        : m.kind === "delivered"
          ? deliveredRowLabel(m.label, input.metric)
          : input.metric === "roe"
            ? "The ask · implied by today's price"
            : "The ask · growth implied by today's price",
  }));
  return rows.sort((a, b) => a.pct - b.pct);
}
