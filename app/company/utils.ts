import { QuarterData, ChartDataPoint } from "./types";

/**
 * Parse and validate summary data from database (gracefully handles missing field)
 */
export function parseSummary(summary: unknown): QuarterData["summary"] {
  if (typeof summary === "string") {
    try {
      const parsed = JSON.parse(summary);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(summary) ? summary : [];
}

/**
 * Transform quarterly data into chart-ready format
 */
export function transformToChartData(data: QuarterData[], limit = 12): ChartDataPoint[] {
  // Keep only the most recent `limit` records (data is newest-first)
  const limited = data.slice(0, limit);

  return limited
    .map((x) => ({
      qtr: x.quarter_label,
      score: x.score,
    }))
    .reverse(); // reverse to show oldest-to-newest left-to-right
}

// Trend classification moved to lib/score-trajectory.ts (classifyTrajectory),
// which owns the label taxonomy, thresholds, and the Δ definition.
