// Shared band-count helpers for the leaderboard one-line summary
// and the /how-scores-work histograms.

import {
  BANDS,
  SCORE_BAND_ORDER,
  bandForScore,
  type BandKey,
} from "@/lib/score-band";
import {
  GROWTH_BANDS,
  GROWTH_BAND_ORDER,
  bandForGrowthScore,
  type GrowthBandKey,
} from "@/lib/growth-band";

export type BandCount<K extends string> = {
  key: K;
  label: string;
  count: number;
};

const scoreBandOrder = SCORE_BAND_ORDER.filter((k): k is Exclude<BandKey, "upcoming"> => k !== "upcoming");

export function computeQuarterBandCounts(scores: Array<number | null | undefined>): BandCount<Exclude<BandKey, "upcoming">>[] {
  const counts = new Map<Exclude<BandKey, "upcoming">, number>();
  for (const key of scoreBandOrder) counts.set(key, 0);
  for (const score of scores) {
    if (typeof score !== "number" || !Number.isFinite(score)) continue;
    const key = bandForScore(score);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return scoreBandOrder.map((key) => ({ key, label: BANDS[key].label, count: counts.get(key) ?? 0 }));
}

export function computeGrowthBandCounts(scores: Array<number | null | undefined>): BandCount<GrowthBandKey>[] {
  const counts = new Map<GrowthBandKey, number>();
  for (const key of GROWTH_BAND_ORDER) counts.set(key, 0);
  for (const score of scores) {
    if (typeof score !== "number" || !Number.isFinite(score)) continue;
    const key = bandForGrowthScore(score);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return GROWTH_BAND_ORDER.map((key) => ({ key, label: GROWTH_BANDS[key].label, count: counts.get(key) ?? 0 }));
}
