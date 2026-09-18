// This year / Long-term split of the LIVE guidance book (2026-09-18).
//
// The Guidance section's top row answers "what did they promise, and by
// when": one card for commitments that come due inside the current financial
// year, one for everything later (the multi-year vision), and a collapsed
// "Ongoing" list for commitments with no deadline to sort on.
//
//   live rows (materiality-ranked by buildGuidanceVerdict)
//     ├─ standing / rolling horizon ............ ongoing
//     ├─ horizon can't be read ................. ongoing  (never "this year")
//     ├─ due <= Q4 of the current FY ........... thisYear
//     └─ due later ............................. longTerm
//
// "Live" is the portal's definition (classifyGuidanceItem), so a `delayed`
// thread — graded as a broken promise the moment it slips — is not here even
// though the pipeline scorer counts it as live. Every live row lands in
// exactly one bucket, in the order it arrived, so a commitment is never shown
// twice and the ranking is decided in one place (compareMaterialityKeys).
//
// Evidence counts cover the rows ON SCREEN, not the company's full live book:
// guidance_snapshot.guidance_items is the curated subset the producer
// promoted, while forward_strength.evidence is rolled up over every live
// guidance_tracking row. The two totals are different populations and are
// never shown side by side.

import { fyLabelFor, type ReportingQuarter } from "@/lib/current-quarter";
import { horizonQuarterIndex, isStandingHorizon, type LiveRow } from "@/lib/guidance-tracking/verdict";

export const EVIDENCE_CLASSES = ["order_backed", "asserted", "aspiration"] as const;
export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];

export const parseEvidenceClass = (value: unknown): EvidenceClass | null =>
  typeof value === "string" && (EVIDENCE_CLASSES as readonly string[]).includes(value)
    ? (value as EvidenceClass)
    : null;

// guidance_key -> evidence_class, built from guidance_tracking.details. A
// junk or missing class is dropped here rather than carried as a string the
// count below would have to second-guess.
export type EvidenceByKey = Record<string, EvidenceClass>;

export const buildEvidenceByKey = (
  rows: ReadonlyArray<{ guidance_key?: unknown; evidence_class?: unknown }> | null | undefined,
): EvidenceByKey => {
  const out: EvidenceByKey = {};
  for (const row of rows ?? []) {
    const key = typeof row.guidance_key === "string" ? row.guidance_key : null;
    const cls = parseEvidenceClass(row.evidence_class);
    if (key && cls) out[key] = cls;
  }
  return out;
};

export type EvidenceCount = {
  orderBacked: number;
  asserted: number;
  aspiration: number;
  classed: number; // rows that carried a class; 0 hides the line
};

export type HorizonBucket = {
  rows: LiveRow[];
  evidence: EvidenceCount;
};

export type HorizonSplit = {
  thisYear: HorizonBucket;
  longTerm: HorizonBucket;
  ongoing: HorizonBucket;
  thisYearLabel: string; // "FY27"
  longTermLabel: string; // "FY28+"
};

const countEvidence = (rows: LiveRow[], evidenceByKey: EvidenceByKey): EvidenceCount => {
  const count: EvidenceCount = { orderBacked: 0, asserted: 0, aspiration: 0, classed: 0 };
  for (const row of rows) {
    const cls = evidenceByKey[row.item.guidanceKey];
    if (!cls) continue;
    count.classed += 1;
    if (cls === "order_backed") count.orderBacked += 1;
    else if (cls === "asserted") count.asserted += 1;
    else count.aspiration += 1;
  }
  return count;
};

export const splitLiveByHorizon = (
  live: LiveRow[],
  current: ReportingQuarter,
  evidenceByKey: EvidenceByKey = {},
): HorizonSplit => {
  // Same fy*4+qtr scale as horizonQuarterIndex; Q4 closes the year.
  const yearEndIndex = current.fy * 4 + 4;
  const thisYear: LiveRow[] = [];
  const longTerm: LiveRow[] = [];
  const ongoing: LiveRow[] = [];
  for (const row of live) {
    const index = isStandingHorizon(row.item) ? null : horizonQuarterIndex(row.item);
    if (index == null) ongoing.push(row);
    else if (index <= yearEndIndex) thisYear.push(row);
    else longTerm.push(row);
  }
  const bucket = (rows: LiveRow[]): HorizonBucket => ({ rows, evidence: countEvidence(rows, evidenceByKey) });
  return {
    thisYear: bucket(thisYear),
    longTerm: bucket(longTerm),
    ongoing: bucket(ongoing),
    thisYearLabel: fyLabelFor(current.fy),
    longTermLabel: `${fyLabelFor(current.fy + 1)}+`,
  };
};

// "3 order-backed · 1 asserted" — zero classes are left out, and the whole
// line is null when nothing on the card carried a class (legacy snapshots).
export const evidenceCountLine = (count: EvidenceCount): string | null => {
  if (count.classed === 0) return null;
  const parts: string[] = [];
  if (count.orderBacked > 0) parts.push(`${count.orderBacked} order-backed`);
  if (count.asserted > 0) parts.push(`${count.asserted} asserted`);
  if (count.aspiration > 0) {
    parts.push(`${count.aspiration} ${count.aspiration === 1 ? "aspiration" : "aspirations"}`);
  }
  return parts.join(" · ");
};
