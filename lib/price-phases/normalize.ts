import { VALUATION_STALE_AFTER_DAYS } from "@/lib/valuation-check/normalize";

import {
  parsePricePhasesPayload,
  type PhaseKind,
  type PricePhase,
  type PricePhasesRow,
  type PricePivot,
} from "./types";

/**
 * Display shape for the Price journey block. Every word here is templated from the
 * payload's numbers — the producer writes no prose, and neither does this file
 * beyond fixed phrasing. Descriptive only: what moved, never what to do.
 */

export type PhaseSplit = {
  driver: "EARNINGS" | "MULTIPLE";
  /** "Mostly the P/E" / "Mostly earnings" */
  lead: string;
  /** The factor that moved more, from → to: "30x → 69x" (the lead names the P/E) / "EPS ×2.6" */
  primary: string;
  /** The other factor: "EPS ×1.7" / "P/E 54x → 55x" */
  secondary: string;
};

export type NormalizedPricePhase = {
  start: string;
  end: string;
  startMs: number;
  endMs: number;
  kind: PhaseKind;
  kindLabel: string;
  moveLabel: string;
  dateRange: string;
  /** CAGR for a phase of a year or more; "in N months" below that (the move already says how far). */
  rate: string;
  split: PhaseSplit | null;
  missingReason: string | null;
  whatChanged: string | null;
  isCurrent: boolean;
};

export type NormalizedPricePhases = {
  companyCode: string;
  basis: "consolidated" | "standalone";
  asOf: string;
  ageDays: number | null;
  stale: boolean;
  series: { t: number; price: number }[];
  pivots: { t: number; price: number; date: string }[];
  phases: NormalizedPricePhase[];
  /** One sentence on the current phase. */
  headline: string;
  /** Whole-window line, when both ends have a P/E: "Since Oct ’16: price ×12.4 · EPS ×17.5 · P/E 77x → 54x" */
  windowLine: string | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function monthLabel(iso: string): string {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ’${iso.slice(2, 4)}`;
}

export function formatMultiple(pe: number): string {
  return pe < 10 ? `${pe.toFixed(1)}x` : `${Math.round(pe)}x`;
}

export function formatTimes(ratio: number): string {
  if (ratio >= 0.95 && ratio <= 1.05) return "flat";
  return `×${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(ratio < 1 ? 2 : 1)}`;
}

/** "3.8x" for a doubling or more, else a signed percent: "+23%", "−37%". */
export function moveLabel(ratio: number): string {
  if (ratio >= 2) return `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}x`;
  const pct = Math.round((ratio - 1) * 100);
  if (pct === 0) return "0%";
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

const KIND_LABEL: Record<PhaseKind, string> = { up: "Up", down: "Down", side: "Sideways" };

const MISSING: Record<NonNullable<PricePhase["split_missing"]>, string> = {
  no_pe: "No split: no P/E at one end (losses, or before Screener's P/E history).",
  near_zero_eps: "No split: earnings near zero at one end.",
  stale_eps: "No split: Screener's EPS was stale at one end.",
};

function splitFor(phase: PricePhase, a: PricePivot | undefined, b: PricePivot | undefined): PhaseSplit | null {
  if (!phase.driver || phase.eps_ratio == null || phase.pe_ratio == null || !a?.pe || !b?.pe) return null;
  const pe = `${formatMultiple(a.pe)} → ${formatMultiple(b.pe)}`;
  const eps = `EPS ${formatTimes(phase.eps_ratio)}`;
  return phase.driver === "MULTIPLE"
    ? { driver: "MULTIPLE", lead: "Mostly the P/E", primary: pe, secondary: eps }
    : { driver: "EARNINGS", lead: "Mostly earnings", primary: eps, secondary: `P/E ${pe}` };
}

function headlineFor(p: NormalizedPricePhase): string {
  const since = monthLabel(p.start);
  const move =
    p.kind === "side"
      ? `Sideways since ${since} (${p.moveLabel})`
      : p.kind === "up"
        ? `Up ${p.moveLabel.replace(/^\+/, "")} since ${since}`
        : `Down ${p.moveLabel.replace(/^−/, "")} since ${since}`;
  if (!p.split) return `${move}. ${p.missingReason ?? ""}`.trim();
  const { driver, primary, secondary } = p.split;
  return driver === "MULTIPLE"
    ? `${move}, mostly the P/E (${primary}); ${secondary}.`
    : `${move}, mostly earnings (EPS ${primary.replace(/^EPS /, "")}); ${secondary}.`;
}

export function assessPhasesStaleness(asOf: string, now: number = Date.now()): { ageDays: number | null; stale: boolean } {
  const t = ms(asOf);
  if (Number.isNaN(t)) return { ageDays: null, stale: true };
  const ageDays = Math.floor((now - t) / DAY_MS);
  return { ageDays, stale: ageDays > VALUATION_STALE_AFTER_DAYS };
}

export function normalizePricePhases(
  row: PricePhasesRow | null,
  now: number = Date.now(),
): { ok: true; data: NormalizedPricePhases } | { ok: false; error: string } | null {
  if (!row) return null;
  const parsed = parsePricePhasesPayload(row.payload);
  if (!parsed.ok) return parsed;
  const d = parsed.data;
  const pivotAt = new Map(d.pivots.map((p) => [p.date, p]));
  const last = d.phases.length - 1;

  const phases: NormalizedPricePhase[] = d.phases.map((ph, i) => ({
    start: ph.start,
    end: ph.end,
    startMs: ms(ph.start),
    endMs: ms(ph.end),
    kind: ph.kind,
    kindLabel: KIND_LABEL[ph.kind],
    moveLabel: moveLabel(ph.price_ratio),
    dateRange: `${monthLabel(ph.start)} → ${monthLabel(ph.end)}`,
    rate: ph.years >= 1 ? ph.rate : ph.rate.replace(/^[+−-]\d+% /, ""),
    split: splitFor(ph, pivotAt.get(ph.start), pivotAt.get(ph.end)),
    missingReason: ph.split_missing ? MISSING[ph.split_missing] : null,
    whatChanged: ph.what_changed?.text ?? null,
    isCurrent: i === last,
  }));

  const first = d.pivots[0];
  const end = d.pivots[d.pivots.length - 1];
  const windowLine =
    d.summary.eps_ratio != null && first.pe && end.pe
      ? `Since ${monthLabel(d.summary.window_start)}: price ${formatTimes(d.summary.price_ratio)} · EPS ${formatTimes(
          d.summary.eps_ratio,
        )} · P/E ${formatMultiple(first.pe)} → ${formatMultiple(end.pe)}`
      : null;

  return {
    ok: true,
    data: {
      companyCode: d.company_code,
      basis: d.basis,
      asOf: d.as_of,
      ...assessPhasesStaleness(d.as_of, now),
      series: d.series.map(([date, price]) => ({ t: ms(date), price })),
      pivots: d.pivots.map((p) => ({ t: ms(p.date), price: p.price, date: p.date })),
      phases,
      headline: headlineFor(phases[last]),
      windowLine,
    },
  };
}
