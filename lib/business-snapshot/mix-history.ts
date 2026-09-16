import type { NormalizedRevenueMixHistoryBySegment } from "./types";

export function buildBusinessMixPeriods(history: NormalizedRevenueMixHistoryBySegment) {
  const rows = history.rows.filter((row) => !row.isTotal);
  return history.years.map((year) => {
    const known = rows.flatMap((row) => {
      const value = row.mixPercentByYear[year];
      const comparable = row.comparabilityLabel === "reported" || row.comparabilityLabel === "restated";
      return comparable && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
        ? [{ name: row.segment, value }] : [];
    });
    const total = known.reduce((sum, item) => sum + item.value, 0);
    return { year, known, total, valid: known.length >= 2 && total > 0 && total <= 100 };
  });
}
