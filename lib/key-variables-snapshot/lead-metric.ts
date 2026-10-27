// The hero metric behind a deep-tracked key variable: which kpiHistory row
// leads, its unit split, the trailing window plotted, and the first → latest
// change coloured by effect on the case. Shared by the Key Variables deep
// card and the ConcallScore tab's "Top highlights" strip, so both read the
// same number off the same row.

import { getThesisEffect } from "@/app/company/components/thesis-effect";

import {
  asNumericValue,
  classifyUnit,
  formatTrendChange,
  splitMetricName,
  splitUnitAffixes,
} from "./presentation";
import type {
  NormalizedKeyVariableDeepTreatmentItem,
  NormalizedKeyVariableKpiHistory,
  NormalizedKeyVariableKpiHistoryRow,
  ThesisEffect,
} from "./types";

/** The hero trend plots up to this many trailing periods. */
export const TREND_PERIODS = 8;

export type LeadMetric = {
  row: NormalizedKeyVariableKpiHistoryRow;
  name: string;
  unitPrefix: string;
  unitSuffix: string;
  latestPeriod: string;
  latestValue: number | null;
  /** The trend's periods: up to TREND_PERIODS, starting at the first one with a value. */
  trendPeriods: string[];
  trendValues: Array<number | null>;
  /** First plotted → latest, over the trend. */
  change: { label: string; delta: number } | null;
  effect: ThesisEffect;
};

/** History periods, falling back to the union of row keys when the list is empty. */
export const resolveHistoryPeriods = (history: NormalizedKeyVariableKpiHistory) => {
  if (history.periods.length > 0) return history.periods;
  return Array.from(new Set(history.rows.flatMap((row) => Object.keys(row.valuesByPeriod))));
};

export const buildLeadMetric = (item: NormalizedKeyVariableDeepTreatmentItem): LeadMetric | null => {
  const history = item.kpiHistory;
  if (!history || history.rows.length === 0) return null;
  const periods = resolveHistoryPeriods(history);
  if (periods.length === 0) return null;

  const row = history.rows[item.leadMetricIndex] ?? history.rows[0];
  const { name, unit: parsedUnit } = splitMetricName(row.metric);
  const unit = item.leadUnit ?? parsedUnit;
  const { prefix, suffix } = splitUnitAffixes(unit);

  const latestPeriod = periods[periods.length - 1];
  const latestValue = asNumericValue(row.valuesByPeriod[latestPeriod]);

  const recent = periods.slice(-TREND_PERIODS);
  const recentValues = recent.map((period) => asNumericValue(row.valuesByPeriod[period]));
  const firstIndex = recentValues.findIndex((value) => value != null);
  const trendPeriods = firstIndex > 0 ? recent.slice(firstIndex) : recent;
  const trendValues = firstIndex > 0 ? recentValues.slice(firstIndex) : recentValues;
  // One plotted period has no "first → latest": a lone value must not print "0 pp".
  const change =
    trendPeriods.length >= 2
      ? formatTrendChange(trendValues[0] ?? null, latestValue, classifyUnit(unit))
      : null;
  const direction = item.metricDirections?.[row.metric] ?? "higher_is_better";

  return {
    row,
    name,
    unitPrefix: prefix,
    unitSuffix: suffix,
    latestPeriod,
    latestValue,
    trendPeriods,
    trendValues,
    change,
    effect: getThesisEffect(change?.delta ?? null, direction),
  };
};
