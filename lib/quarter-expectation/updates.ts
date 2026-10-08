import { quarterLabelFor, type ReportingQuarter } from "@/lib/current-quarter";
import { rankCatalysts } from "@/lib/growth-outlook/summary";
import type { NormalizedGrowthCatalyst } from "@/lib/growth-outlook/types";
import type { NormalizedGuidanceItem } from "@/lib/guidance-tracking/types";
import {
  buildGuidanceVerdict,
  commitmentCoreLabel,
  horizonDeadlineFy,
  horizonQuarterIndex,
  isStandingHorizon,
} from "@/lib/guidance-tracking/verdict";
import type {
  NormalizedKeyVariableDeepTreatmentItem,
  NormalizedKeyVariableListItem,
} from "@/lib/key-variables-snapshot/types";

import type { ExpectationFiling, ExpectedUpdate, ExpectedUpdateLean } from "./types";

// What the call is due to update on — templated from the sections the page
// already holds, in a fixed order of precedence, never curated per company:
//
//   1. due       a guidance commitment whose horizon has elapsed at (or one
//                quarter before) the target and that nobody has graded yet —
//                classifyGuidanceItem's resolved/unclear set. The Guidance tab
//                counts these in one line; this is where they are named.
//   2. filing    the strongest material exchange filing made inside the
//                target quarter's window (quarter start → today) — an order
//                win, a capex approval, a rating cut. The call has to speak
//                to it. One at most; neutral filings never qualify.
//   3. progress  live commitments that come due inside the target's FY, in the
//                Guidance tab's own materiality order (buildGuidanceVerdict.live).
//   4. catalyst  the growth catalyst whose timing names the target's FY,
//                preferring one that names the target's quarter or half.
//   5. variable  the key variable with a "watch for" trigger, else the
//                deep-treatment headline.
//   6. fix       the last call's negative rationale item — did they fix it?
//
// Each item carries a lean (upside / downside / open) so the card can say
// which way it points without a second read. Caps keep the list readable and
// leave room for the later kinds: two due, two progress, five in all.

export const MAX_EXPECTED_UPDATES = 5;
export const MAX_DUE_UPDATES = 2;
export const MAX_PROGRESS_UPDATES = 2;

export const UPDATE_SECTION = {
  guidance: "guidance-history",
  growth: "future-growth",
  variables: "key-variables",
  quarterly: "sentiment-score",
  filings: "company-announcements",
} as const;

export const FILING_HEADING_MAX = 90;

// Strongest first; neutral is 0 and never shown.
const FILING_WEIGHT: Record<ExpectationFiling["impact"], number> = {
  transformative: 3,
  severe: 3,
  positive: 2,
  negative: 2,
  neutral: 0,
};

const filingLean = (impact: ExpectationFiling["impact"]): ExpectedUpdateLean =>
  impact === "transformative" || impact === "positive" ? "upside" : "downside";

const istDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// The one filing the call must speak to: strongest impact, newest on a tie.
export const pickFiling = (filings: ExpectationFiling[]): ExpectationFiling | null => {
  let best: ExpectationFiling | null = null;
  for (const f of filings) {
    if (FILING_WEIGHT[f.impact] === 0 || !f.summary?.trim()) continue;
    if (
      !best ||
      FILING_WEIGHT[f.impact] > FILING_WEIGHT[best.impact] ||
      (FILING_WEIGHT[f.impact] === FILING_WEIGHT[best.impact] && f.filedAt > best.filedAt)
    ) {
      best = f;
    }
  }
  return best;
};

export type RationaleLine = {
  direction: "positive" | "negative" | "neutral" | null;
  heading: string;
  detail: string;
};

// concall_analysis.details.rationale: new rows carry {direction, heading,
// detail}; legacy rows are flat strings (direction null). Mirrors the parse in
// concall-score-section.tsx so the server-built list and the on-screen
// "Why this score" read the same items.
export const parseRationaleLines = (details: unknown): RationaleLine[] => {
  const record =
    details && typeof details === "object"
      ? (details as { rationale?: unknown })
      : typeof details === "string"
        ? (() => {
            try {
              return JSON.parse(details) as { rationale?: unknown };
            } catch {
              return null;
            }
          })()
        : null;
  if (!record || !Array.isArray(record.rationale)) return [];
  return record.rationale
    .map((it): RationaleLine => {
      if (typeof it === "string") return { direction: null, heading: "", detail: it };
      if (it && typeof it === "object") {
        const o = it as { direction?: unknown; heading?: unknown; detail?: unknown };
        const direction =
          o.direction === "positive" || o.direction === "negative" || o.direction === "neutral" ? o.direction : null;
        return {
          direction,
          heading: typeof o.heading === "string" ? o.heading : "",
          detail: typeof o.detail === "string" ? o.detail : "",
        };
      }
      return { direction: null, heading: "", detail: String(it) };
    })
    .filter((r) => r.heading || r.detail);
};

export type BuildExpectedUpdatesInput = {
  target: ReportingQuarter;
  guidanceItems: NormalizedGuidanceItem[];
  catalysts: NormalizedGrowthCatalyst[];
  variables: NormalizedKeyVariableListItem[];
  deepVariables: NormalizedKeyVariableDeepTreatmentItem[];
  lastRationale: RationaleLine[];
  /** Material filings inside the target quarter's window; optional for callers without the feed. */
  filings?: ExpectationFiling[];
  /** Human label for a filing category ("Order win"); defaults to the raw key. */
  filingCategoryLabel?: (category: string) => string;
};

const joinParts = (parts: (string | null | undefined)[]): string | null => {
  const kept = parts.filter((p): p is string => Boolean(p && p.trim()));
  return kept.length > 0 ? kept.join(" · ") : null;
};

const humanTag = (tag: string | null): string | null =>
  tag ? tag.replace(/[_-]+/g, " ").trim() || null : null;

const previousQuarter = (target: ReportingQuarter): { fy: number; qtr: number } =>
  target.qtr === 1 ? { fy: target.fy - 1, qtr: 4 } : { fy: target.fy, qtr: target.qtr - 1 };

// ---------------------------------------------------------------------------
// Catalyst timing — free text ("H2 FY27", "2HFY27", "by Q3 FY27", "FY27",
// "next 12–18 months"). Every FY token is read; a quarter or half prefix
// narrows it. No token → the catalyst is not datable and is skipped.
// ---------------------------------------------------------------------------

const TIMING_TOKEN = /\b(?:Q\s*([1-4])|H\s*([12])|([12])\s*H)?\s*FY\s*'?(\d{2}|\d{4})\b/gi;

export type TimingWindow = { fy: number; qtrFrom: number; qtrTo: number };

export const parseTimingWindows = (timing: string | null | undefined): TimingWindow[] => {
  if (!timing) return [];
  const windows: TimingWindow[] = [];
  for (const m of timing.matchAll(TIMING_TOKEN)) {
    const digits = m[4];
    const parsed = parseInt(digits, 10);
    if (!Number.isFinite(parsed)) continue;
    const fy = digits.length <= 2 ? 2000 + parsed : parsed;
    if (m[1]) {
      const q = parseInt(m[1], 10);
      windows.push({ fy, qtrFrom: q, qtrTo: q });
    } else if (m[2] || m[3]) {
      const half = m[2] ?? m[3];
      windows.push(half === "1" ? { fy, qtrFrom: 1, qtrTo: 2 } : { fy, qtrFrom: 3, qtrTo: 4 });
    } else {
      windows.push({ fy, qtrFrom: 1, qtrTo: 4 });
    }
  }
  return windows;
};

// 2 = names the target's quarter or half; 1 = names its FY; 0 = not this year.
export const catalystFit = (timing: string | null | undefined, target: ReportingQuarter): 0 | 1 | 2 => {
  let fit: 0 | 1 | 2 = 0;
  for (const w of parseTimingWindows(timing)) {
    if (w.fy !== target.fy) continue;
    const specific = w.qtrTo - w.qtrFrom < 3;
    if (specific && target.qtr >= w.qtrFrom && target.qtr <= w.qtrTo) return 2;
    fit = 1;
  }
  return fit;
};

// ---------------------------------------------------------------------------

export function buildExpectedUpdates(input: BuildExpectedUpdatesInput): ExpectedUpdate[] {
  const { target } = input;
  const targetIndex = target.fy * 4 + target.qtr;
  const prev = previousQuarter(target);
  const out: ExpectedUpdate[] = [];
  const seen = new Set<string>();
  const push = (u: ExpectedUpdate) => {
    const key = u.heading.trim().toLowerCase();
    if (!key || seen.has(key) || out.length >= MAX_EXPECTED_UPDATES) return;
    seen.add(key);
    out.push(u);
  };

  const verdict = buildGuidanceVerdict(input.guidanceItems, target);

  // 1. due — elapsed at the target (or the quarter before), still ungraded.
  let due = 0;
  for (const row of verdict.resolved) {
    if (due >= MAX_DUE_UPDATES) break;
    if (row.outcome !== "unclear" || isStandingHorizon(row.item)) continue;
    const idx = horizonQuarterIndex(row.item);
    if (idx == null || idx < targetIndex - 1 || idx > targetIndex) continue;
    const dueNow = idx === targetIndex;
    push({
      kind: "due",
      heading: commitmentCoreLabel(row.item),
      detail: joinParts([
        row.guidedLabel ? `Guided ${row.guidedLabel}` : null,
        dueNow
          ? `due ${row.item.horizonLabel ?? target.label}`
          : `overdue since ${row.item.horizonLabel ?? quarterLabelFor(prev.fy, prev.qtr)}`,
      ]),
      sectionId: UPDATE_SECTION.guidance,
      tone: "caution",
      lean: dueNow ? "open" : "downside",
      dated: null,
    });
    due += 1;
  }

  // 2. filing — the strongest material filing of the quarter so far.
  const filing = pickFiling(input.filings ?? []);
  if (filing) {
    const at = new Date(filing.filedAt);
    push({
      kind: "filing",
      heading: clip(filing.summary.trim(), FILING_HEADING_MAX),
      detail: (input.filingCategoryLabel ?? ((c: string) => c))(filing.category),
      sectionId: UPDATE_SECTION.filings,
      tone: filingLean(filing.impact) === "downside" ? "caution" : "neutral",
      lean: filingLean(filing.impact),
      dated: Number.isNaN(at.getTime()) ? null : istDay.format(at),
    });
  }

  // 3. progress — live, decided inside the target's FY, materiality order.
  let progress = 0;
  for (const row of verdict.live) {
    if (progress >= MAX_PROGRESS_UPDATES) break;
    if (isStandingHorizon(row.item) || horizonDeadlineFy(row.item) !== target.fy) continue;
    const before = out.length;
    push({
      kind: "progress",
      heading: commitmentCoreLabel(row.item),
      detail: joinParts([
        row.guidedLabel ? `Guided ${row.guidedLabel}` : null,
        row.item.horizonLabel ? `for ${row.item.horizonLabel}` : null,
        row.direction === "up" ? "raised" : row.direction === "down" ? "lowered" : null,
      ]),
      sectionId: UPDATE_SECTION.guidance,
      tone: "neutral",
      lean: row.direction === "up" ? "upside" : row.direction === "down" ? "downside" : "open",
      dated: null,
    });
    if (out.length > before) progress += 1;
  }

  // 4. catalyst — best timing fit, then the Growth tab's priority order.
  let best: { catalyst: NormalizedGrowthCatalyst; fit: 1 | 2 } | null = null;
  for (const catalyst of rankCatalysts(input.catalysts)) {
    if (!catalyst.catalyst) continue;
    const fit = catalystFit(catalyst.timing, target);
    if (fit === 0) continue;
    if (!best || fit > best.fit) best = { catalyst, fit };
    if (best.fit === 2) break;
  }
  if (best) {
    push({
      kind: "catalyst",
      heading: best.catalyst.catalyst!,
      detail: joinParts([
        best.catalyst.timing ? `Timing ${best.catalyst.timing}` : null,
        humanTag(best.catalyst.statusTag),
      ]),
      sectionId: UPDATE_SECTION.growth,
      tone: "neutral",
      lean: "upside",
      dated: null,
    });
  }

  // 5. variable — the one with a trigger sentence, else the deep headline.
  const withWatch = input.variables.find((v) => v.variable && v.watchFor);
  if (withWatch) {
    push({
      kind: "variable",
      heading: withWatch.variable,
      detail: withWatch.watchFor,
      sectionId: UPDATE_SECTION.variables,
      tone: "neutral",
      lean: "open",
      dated: null,
    });
  } else {
    const deep = input.deepVariables.find((d) => d.variable && (d.headline || d.whyItMattersNow));
    if (deep) {
      push({
        kind: "variable",
        heading: deep.variable,
        detail: deep.headline ?? deep.whyItMattersNow,
        sectionId: UPDATE_SECTION.variables,
        tone: "neutral",
        lean: "open",
        dated: null,
      });
    }
  }

  // 6. fix — the last call's negative read. Legacy flat-string rationale has
  // no direction and is skipped rather than shown without a sign.
  const negative = input.lastRationale.find((r) => r.direction === "negative" && (r.heading || r.detail));
  if (negative) {
    push({
      kind: "fix",
      heading: negative.heading || negative.detail,
      detail: negative.heading ? negative.detail || null : null,
      sectionId: UPDATE_SECTION.quarterly,
      tone: "caution",
      lean: "downside",
      dated: null,
    });
  }

  return out;
}
