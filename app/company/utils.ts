import { QuarterData, ChartDataPoint } from "./types";

/**
 * Parse and validate summary data from database
 */
export function parseSummary(
  summary: QuarterData["summary"]
): QuarterData["summary"] {
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
export function transformToChartData(data: QuarterData[]): ChartDataPoint[] {
  return data
    .map((x) => ({
      qtr: x.quarter_label,
      score: x.score,
    }))
    .reverse();
}

/**
 * Calculate broader trend based on average scores
 * Compares recent average (last 3 quarters) vs historical average
 */
export function calculateTrend(data: QuarterData[]): {
  direction: "improving" | "declining" | "stable";
  change: number;
  recentAvg: number;
  historicalAvg: number;
  description: string;
} {
  if (data.length < 2) {
    return {
      direction: "stable",
      change: 0,
      recentAvg: 0,
      historicalAvg: 0,
      description: "Insufficient data for trend analysis",
    };
  }

  // Recent 3 quarters average
  const recentCount = Math.min(3, data.length);
  const recentScores = data.slice(0, recentCount).map((d) => d.score);
  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentCount;

  // Historical average (up to last 10 quarters, excluding recent 3)
  const historicalCount = Math.min(10, data.length - recentCount);
  const historicalScores =
    historicalCount > 0
      ? data
          .slice(recentCount, recentCount + historicalCount)
          .map((d) => d.score)
      : [];
  const historicalAvg =
    historicalScores.length > 0
      ? historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length
      : recentAvg;

  const change = recentAvg - historicalAvg;
  const absChange = Math.abs(change);

  if (absChange < 0.2) {
    return {
      direction: "stable",
      change,
      recentAvg,
      historicalAvg,
      description: `Sentiment stable - Recent avg: ${recentAvg.toFixed(
        2
      )}, Historical avg: ${historicalAvg.toFixed(2)}`,
    };
  }

  if (change > 0) {
    return {
      direction: "improving",
      change,
      recentAvg,
      historicalAvg,
      description: `Strong improvement - Recent 3Q avg ${recentAvg.toFixed(
        2
      )} vs ${historicalCount}Q avg ${historicalAvg.toFixed(
        2
      )} (+${change.toFixed(2)})`,
    };
  }

  return {
    direction: "declining",
    change,
    recentAvg,
    historicalAvg,
    description: `Concerning decline - Recent 3Q avg ${recentAvg.toFixed(
      2
    )} vs ${historicalCount}Q avg ${historicalAvg.toFixed(2)} (${change.toFixed(
      2
    )})`,
  };
}
