import type { FactMetric } from "./profile";

// Which picture a fact's `metrics` can honestly draw. Metrics are freeform {label, value, unit}, so
// the shape is read off them: the same measure at several periods is a trend; shares of one whole at
// one period are a donut; anything else stays a row of headline numbers.

export type FactVisual =
  | { kind: "trend"; measure: string; unit: string; points: { period: string; value: number }[] }
  | { kind: "donut"; slices: { label: string; value: number }[]; rest: number }
  | { kind: "hero"; label: string; value: number; unit: string }
  | { kind: "stats"; metrics: FactMetric[] };

const PERIOD = /\b(?:(Q[1-4]|H[12]|9M)\s*)?FY\s?(\d{2,4})\b/i;
const isPercent = (metric: FactMetric) => metric.unit.trim().startsWith("%");
// The bands that complete a "top N" figure without overlapping it: "6-10", "Next 5", "Others".
const isBand = (label: string) => /^\s*(\d+\s*[-–]\s*\d+|next \d+|others?|rest|remaining)\b/i.test(label);
const isTopN = (label: string) => /\btop[ -]?\d+\b|\btop customer|\blargest customer/i.test(label);

function parseLabel(label: string) {
  const match = label.match(PERIOD);
  if (!match) return { period: null, order: null, measure: label.trim() };
  const year = Number(match[2]) % 100;
  const part = (match[1] ?? "").toUpperCase();
  const within = part.startsWith("Q") ? Number(part[1]) : part === "H1" ? 2 : part === "9M" ? 3.5 : part === "H2" ? 4 : 5;
  return {
    period: match[0].replace(/\s+/g, " ").trim(),
    order: year * 10 + within,
    measure: label.replace(PERIOD, "").replace(/^[\s,·:–-]+|[\s,·:–-]+$/g, "").replace(/\s{2,}/g, " "),
  };
}

export function buildFactVisual(metrics: FactMetric[], category: string): FactVisual | null {
  if (metrics.length === 0) return null;
  const percents = metrics.filter(isPercent).map((metric) => ({ metric, ...parseLabel(metric.label) }));

  // Trend: one measure, in one unit, at two or more periods. The longest such run wins.
  const runs = new Map<string, typeof percents>();
  for (const entry of percents) {
    if (entry.order == null) continue;
    const key = `${entry.measure.toLowerCase()}|${entry.metric.unit.trim().toLowerCase()}`;
    runs.set(key, [...(runs.get(key) ?? []), entry]);
  }
  const run = [...runs.values()]
    .map((entries) => [...new Map(entries.map((entry) => [entry.order, entry])).values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
    .filter((entries) => entries.length >= 2)
    .sort((a, b) => b.length - a.length)[0];
  const trend: FactVisual | null = run
    ? { kind: "trend", measure: run[run.length - 1].measure || run[run.length - 1].metric.label, unit: run[0].metric.unit.trim(), points: run.map((entry) => ({ period: entry.period ?? "", value: entry.metric.value })) }
    : null;

  // Donut: shares of one whole. Only the latest period's metrics in one unit count as parts, and a
  // "top N customers" figure sits only beside the bands that complete it (a named customer would overlap it).
  const latest = Math.max(...percents.map((entry) => entry.order ?? -1));
  const current = percents.filter((entry) => entry.order == null || entry.order === latest);
  const sameUnit = current.filter((entry) => entry.metric.unit.trim().toLowerCase() === current[0].metric.unit.trim().toLowerCase());
  const topN = sameUnit.find((entry) => isTopN(entry.metric.label));
  const parts = topN ? [topN, ...sameUnit.filter((entry) => entry !== topN && isBand(entry.metric.label))] : sameUnit;
  const total = parts.reduce((sum, entry) => sum + entry.metric.value, 0);
  const donut: FactVisual | null = parts.length > 0 && total > 0 && total <= 100.5 && (parts.length >= 2 || category === "customers")
    ? { kind: "donut", slices: parts.map((entry) => ({ label: entry.measure || entry.metric.label, value: entry.metric.value })), rest: total < 99 && !parts.some((entry) => /^\s*(others?|rest|remaining)\b/i.test(entry.metric.label)) ? 100 - total : 0 }
    : null;

  // Customers lead with who holds the book (donut); everything else with how it has moved (trend).
  const picked = category === "customers" ? donut ?? trend : trend ?? donut;
  if (picked) return picked;
  if (percents.length === 1 && metrics.length <= 2) {
    const { metric, measure } = percents[0];
    return { kind: "hero", label: measure || metric.label, value: metric.value, unit: metric.unit.trim() };
  }
  return { kind: "stats", metrics };
}
