// "Top highlights" on the ConcallScore tab: the company's deep-tracked key
// variables, slimmed to what three small cards need — the variable, its
// verdict headline, the hero value, the trailing trend and the guide (when
// one is tracked). Derived from the same normalized snapshot the Key
// Variables tab renders; nothing is curated per company. The shape is plain
// JSON so it can cross from the server panel into the client chunk.

import { buildLeadMetric } from "./lead-metric";
import type { NormalizedKeyVariablesSnapshot, ThesisEffect } from "./types";

export const MAX_HIGHLIGHTS = 3;

export type QuarterHighlight = {
  variable: string;
  /** The deep card's verdict line; null → the card shows only the number. */
  headline: string | null;
  /** "Sets the growth" | "Sets the cash" … */
  thesisRole: string | null;
  unitPrefix: string;
  unitSuffix: string;
  latestValue: number | null;
  latestPeriod: string;
  trendPeriods: string[];
  trendValues: Array<number | null>;
  /** First plotted → latest ("+42%", "2.1×"), coloured by `effect`. */
  changeLabel: string | null;
  effect: ThesisEffect;
  /** A tracked target: "Guide 62 · July 2028". */
  guide: { label: string; value: number } | null;
};

/**
 * Up to MAX_HIGHLIGHTS items, in the snapshot's own (ranked) order, keeping
 * only variables with a readable hero value — a highlight card with "—" for
 * its number says nothing.
 */
export function buildQuarterHighlights(
  snapshot: NormalizedKeyVariablesSnapshot | null | undefined,
  max = MAX_HIGHLIGHTS,
): QuarterHighlight[] {
  if (!snapshot) return [];
  const out: QuarterHighlight[] = [];
  for (const item of snapshot.deepTreatment) {
    if (out.length >= max) break;
    const lead = buildLeadMetric(item);
    if (!lead || lead.latestValue == null) continue;
    out.push({
      variable: item.variable,
      headline: item.headline,
      thesisRole: item.thesisRole,
      unitPrefix: lead.unitPrefix,
      unitSuffix: lead.unitSuffix,
      latestValue: lead.latestValue,
      latestPeriod: lead.latestPeriod,
      trendPeriods: lead.trendPeriods,
      trendValues: lead.trendValues,
      changeLabel: lead.change?.label ?? null,
      effect: lead.effect,
      guide:
        item.guide && typeof item.guide.value === "number" && Number.isFinite(item.guide.value)
          ? { label: item.guide.label, value: item.guide.value }
          : null,
    });
  }
  return out;
}
