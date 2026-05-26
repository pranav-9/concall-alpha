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
export function transformToChartData(data: QuarterData[]): ChartDataPoint[] {
  // Keep only the most recent 12 records (data is newest-first)
  const limited = data.slice(0, 12);

  return limited
    .map((x) => ({
      qtr: x.quarter_label,
      score: x.score,
    }))
    .reverse(); // reverse to show oldest-to-newest left-to-right
}

/**
 * Trend = latest quarter score − the displayed 4Q average. Defined this way
 * so the row arithmetic reconciles for the reader (Latest − 4Q Avg = Trend).
 * Stable when |change| < 0.2 because the 4Q-avg baseline includes latest,
 * which dampens the delta vs a strict "prior quarters only" baseline.
 */
export function calculateTrend(data: QuarterData[]): {
  direction: "improving" | "declining" | "stable";
  change: number;
  latestScore: number;
  priorBaseline: number;
  description: string;
} {
  if (data.length < 2) {
    return {
      direction: "stable",
      change: 0,
      latestScore: data[0]?.score ?? 0,
      priorBaseline: 0,
      description: "Insufficient data for trend analysis",
    };
  }

  const latestScore = data[0].score;
  const fourQScores = data.slice(0, Math.min(4, data.length)).map((d) => d.score);
  const fourQAvg =
    fourQScores.reduce((a, b) => a + b, 0) / fourQScores.length;

  const change = latestScore - fourQAvg;
  const absChange = Math.abs(change);

  if (absChange < 0.2) {
    return {
      direction: "stable",
      change,
      latestScore,
      priorBaseline: fourQAvg,
      description: `Latest quarter ${latestScore.toFixed(2)}, holding near the 4-quarter average of ${fourQAvg.toFixed(2)}.`,
    };
  }

  if (change > 0) {
    return {
      direction: "improving",
      change,
      latestScore,
      priorBaseline: fourQAvg,
      description: `Latest quarter ${latestScore.toFixed(2)}, above the 4-quarter average of ${fourQAvg.toFixed(2)}.`,
    };
  }

  return {
    direction: "declining",
    change,
    latestScore,
    priorBaseline: fourQAvg,
    description: `Latest quarter ${latestScore.toFixed(2)}, below the 4-quarter average of ${fourQAvg.toFixed(2)}.`,
  };
}
