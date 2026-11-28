import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  BROKER_NOTES_FOOTER,
  BROKER_NOTES_ZERO_STATE,
  BrokerNotesSection,
} from "../app/company/components/broker-notes-section";
import { isBrokerNotesEnabled } from "../lib/broker-notes/flag";
import { median, normalizeBrokerNotes, targetFitsPrice } from "../lib/broker-notes/normalize";
import { BROKER_NOTES_SELECT, brokerNoteRowSchema, type BrokerNoteRow } from "../lib/broker-notes/types";
import { normalizeValuationCheck } from "../lib/valuation-check/normalize";
import type { NormalizedValuationCheck, ValuationCheckRow } from "../lib/valuation-check/types";

// tsconfig has jsx: "preserve" (Next compiles JSX itself), so under tsx the
// component's JSX uses the classic React.createElement transform and needs a
// React binding in scope.
(globalThis as { React?: typeof React }).React = React;

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

const TODAY = new Date("2026-11-28T06:00:00Z");

let nextId = 1000;
const note = (o: Partial<BrokerNoteRow> = {}): BrokerNoteRow => ({
  schema_version: "broker_notes_v1",
  message_id: nextId++,
  company_code: "TEST",
  report_date: "2026-11-10",
  broker: "Axis Securities",
  broker_raw: "Axis Securities",
  note_type: "company_update",
  headline: "Steady quarter, margins hold",
  direction: null,
  stated_upside_pct: null,
  target_price: null,
  target_source: null,
  has_estimate: false,
  rating_raw: null,
  rating_bucket: "not_read",
  rating_source: "none",
  revenue_cagr_pct: null,
  ebitda_cagr_pct: null,
  pat_cagr_pct: null,
  cagr_horizon: null,
  loaded_at: "2026-11-28T00:00:00+00:00",
  ...o,
});
/** A note with a hand-read estimate row. */
const read = (o: Partial<BrokerNoteRow> = {}): BrokerNoteRow =>
  note({ has_estimate: true, rating_source: "pdf_read", rating_raw: "BUY", rating_bucket: "bullish", ...o });

/** Built through the real normalizer, so the fraction → percent units are the real ones. */
const valuation = (
  o: { price?: number | null; pricedAsOf?: string | null; rdcf?: Record<string, unknown> } = {},
): NormalizedValuationCheck =>
  normalizeValuationCheck({
    company_code: "TEST",
    priced_as_of: o.pricedAsOf === undefined ? "2026-11-25" : o.pricedAsOf,
    price_at_run: o.price === undefined ? 1000 : o.price,
    reverse_dcf: {
      solve_status: "solved",
      zone_vs_phase5: "within",
      implied_cagr_pct: 30.5,
      ladder_basis: "earnings",
      ladder_metric: "pat",
      phase5_scenarios: { downside: 0.1, base: 0.4095, upside: 0.5 },
      ...o.rdcf,
    },
  } as unknown as ValuationCheckRow)!;

const view = (rows: unknown[], v: NormalizedValuationCheck | null = valuation()) => {
  const out = normalizeBrokerNotes(rows, v, TODAY);
  assert.equal(out.kind, "notes");
  return out as Extract<typeof out, { kind: "notes" }>;
};
const close = (a: number | undefined, b: number, msg?: string) =>
  assert.ok(a !== undefined && Math.abs(a - b) < 1e-6, `${msg ?? ""} ${a} ≈ ${b}`);

// ── Zero / invalid ───────────────────────────────────────────────────────────

test("zero rows → zero state", () => {
  assert.deepEqual(normalizeBrokerNotes([], valuation(), TODAY), { kind: "empty", parseErrors: [] });
  assert.deepEqual(normalizeBrokerNotes([], null, TODAY), { kind: "empty", parseErrors: [] });
});

test("an invalid row is dropped and labelled; the rest render", () => {
  const out = view([note({ message_id: 1 }), { ...note({ message_id: 77 }), target_price: -5 }]);
  assert.equal(out.recent.length, 1);
  assert.equal(out.parseErrors.length, 1);
  assert.match(out.parseErrors[0], /message 77/);
  assert.match(out.parseErrors[0], /target_price/);
  // Unknown columns are rejected (additionalProperties: false), as is a wrong schema version.
  const extra = normalizeBrokerNotes([{ ...note({ message_id: 78 }), pdf_url: "x" }], null, TODAY);
  assert.equal(extra.kind, "empty");
  assert.equal(extra.parseErrors.length, 1);
  const wrongVersion = normalizeBrokerNotes([{ ...note(), schema_version: "broker_notes_v0" }], null, TODAY);
  assert.equal(wrongVersion.kind, "empty");
  assert.equal(normalizeBrokerNotes([null, "x"], null, TODAY).parseErrors.length, 2);
});

test("the select names exactly the schema's columns", () => {
  assert.equal(BROKER_NOTES_SELECT.split(", ").length, 21);
  assert.ok(brokerNoteRowSchema.safeParse(note()).success);
  // Drift guard against the versioned root schema when it is beside the repo (it lives outside git).
  const here = dirname(fileURLToPath(import.meta.url));
  const schemaPath = join(here, "..", "..", "schemas", "broker_notes_v1.json");
  if (existsSync(schemaPath)) {
    const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as { required: string[]; properties: object };
    assert.deepEqual([...BROKER_NOTES_SELECT.split(", ")].sort(), [...schema.required].sort());
    assert.deepEqual(Object.keys(schema.properties).sort(), [...schema.required].sort());
  } else {
    console.log("  skip root schema drift check (schemas/ not beside the repo)");
  }
});

// ── Brokers, median, ties ────────────────────────────────────────────────────

test("1 broker: single target, no median", () => {
  const out = view([read({ target_price: 1200 })]);
  assert.equal(out.header.brokerCount, 1);
  assert.equal(out.target?.kind, "single");
  assert.equal(out.target?.value, 1200);
  assert.equal(out.target?.brokerCount, 1);
});

test("4 brokers: even median = mean of the middle two, with the range", () => {
  const out = view([
    read({ broker: "A", target_price: 1100 }),
    read({ broker: "B", target_price: 1500 }),
    read({ broker: "C", target_price: 1200 }),
    read({ broker: "D", target_price: 1300 }),
  ]);
  assert.equal(out.header.brokerCount, 4);
  assert.equal(out.target?.kind, "median");
  assert.equal(out.target?.value, 1250);
  assert.equal(out.target?.low, 1100);
  assert.equal(out.target?.high, 1500);
  close(out.target?.upsideFromPrice?.pct, 25, "fresh price → upside to target");
});

test("median: odd count takes the middle", () => {
  assert.equal(median([1500, 1100, 1200]), 1200);
  assert.equal(median([3, 1]), 2);
  assert.equal(view([read({ broker: "A", target_price: 1100 }), read({ broker: "B", target_price: 1200 }), read({ broker: "C", target_price: 1500 })]).target?.value, 1200);
});

test("0 targets → target block hidden", () => {
  assert.equal(view([read(), note({ broker: "B" })]).target, null);
});

test("one firm counts once (group on the canonical broker)", () => {
  const out = view([read({ broker: "Choice Equities", broker_raw: "Choice Equity" }), note({ broker: "Choice Equities", broker_raw: "Choice Equites", report_date: "2026-11-20" })]);
  assert.equal(out.header.brokerCount, 1);
  assert.equal(out.recent.length, 2);
});

test("same-day tie → the higher message_id wins", () => {
  const out = view([
    read({ message_id: 500, report_date: "2026-11-10", target_price: 1200, rating_raw: "Hold", rating_bucket: "neutral" }),
    read({ message_id: 501, report_date: "2026-11-10", target_price: 1300, rating_raw: "Buy", rating_bucket: "bullish" }),
  ]);
  assert.equal(out.brokers[0].latestNote.messageId, 501);
  assert.equal(out.target?.value, 1300);
  assert.equal(out.brokers[0].rating?.label, "Buy");
  assert.deepEqual(out.recent.map((n) => n.messageId), [501, 500]);
});

// ── R10: each part from its own newest note, dated ───────────────────────────

test("R10: a newer unread note keeps the older read target and rating, dated", () => {
  const out = view([
    note({ report_date: "2026-11-20", headline: "Plant visit: ramp on track" }),
    read({ report_date: "2026-10-01", rating_raw: "Hold", rating_bucket: "neutral", target_price: 1100 }),
  ]);
  const b = out.brokers[0];
  assert.equal(b.latestNote.reportDate, "2026-11-20");
  assert.equal(b.latestNote.headline, "Plant visit: ramp on track");
  assert.deepEqual(b.rating, { bucket: "neutral", label: "Hold", asOf: "2026-10-01" });
  assert.deepEqual(b.target, { price: 1100, asOf: "2026-10-01", excluded: false });
  assert.equal(out.ratings?.neutral, 1);
  assert.equal(out.ratings?.notRead, 0);
});

test("R10: the target comes from the newest note with a target, read or not", () => {
  const out = view([
    note({ report_date: "2026-11-20", target_price: 1400, target_source: "caption" }),
    read({ report_date: "2026-10-01", target_price: 1200 }),
  ]);
  assert.deepEqual(out.brokers[0].target, { price: 1400, asOf: "2026-11-20", excluded: false });
  assert.equal(out.brokers[0].rating?.asOf, "2026-10-01");
});

test("R10: no read note inside 180 days → rating not read, no target", () => {
  const out = view([
    note({ report_date: "2026-11-20", direction: "UPSIDE", stated_upside_pct: 12 }),
    read({ report_date: "2026-04-01", target_price: 1200 }), // 241 days old: outside the window
  ]);
  assert.equal(out.brokers[0].rating, null);
  assert.equal(out.brokers[0].target, null);
  assert.equal(out.target, null);
  assert.equal(out.ratings?.notRead, 1);
  assert.equal(out.ratings?.bullish, 0, "a stated upside is never a rating");
  assert.equal(out.older.length, 1);
});

// ── Ratings (R1 / R15) ───────────────────────────────────────────────────────

test("ratings: all read", () => {
  const r = view([
    read({ broker: "A" }),
    read({ broker: "B", rating_raw: "Hold", rating_bucket: "neutral" }),
    read({ broker: "C", rating_raw: "Sell", rating_bucket: "bearish" }),
  ]).ratings!;
  assert.deepEqual([r.bullish, r.neutral, r.bearish, r.notRead], [1, 1, 1, 0]);
});

test("ratings: none read, stated directions counted beside, never as ratings", () => {
  const r = view([
    note({ broker: "A", direction: "UPSIDE", stated_upside_pct: 20 }),
    note({ broker: "B", direction: "UPSIDE", stated_upside_pct: 3 }),
    note({ broker: "C", direction: "DOWNSIDE", stated_upside_pct: 8 }),
    note({ broker: "D" }),
  ]).ratings!;
  assert.deepEqual([r.bullish, r.neutral, r.bearish, r.notRead], [0, 0, 0, 4]);
  assert.deepEqual(r.notReadStated, { upside: 2, downside: 1, none: 1 });
});

test("ratings: mixed, with not_rated, not_stated and other kept apart", () => {
  const out = view([
    read({ broker: "A" }),
    read({ broker: "B", rating_raw: "NR", rating_bucket: "not_rated" }),
    read({ broker: "C", rating_raw: null, rating_bucket: "not_stated" }),
    read({ broker: "D", rating_raw: "Trading Buy", rating_bucket: "other" }),
    note({ broker: "E", direction: "UPSIDE", stated_upside_pct: 15 }),
  ]);
  const r = out.ratings!;
  assert.deepEqual(
    [r.bullish, r.neutral, r.bearish, r.notRated, r.notStated, r.other, r.notRead],
    [1, 0, 0, 1, 1, 1, 1],
  );
  const labels = Object.fromEntries(out.brokers.map((b) => [b.broker, b.rating?.label ?? null]));
  assert.deepEqual(labels, { A: "BUY", B: "NR", C: "No rating stated", D: "Trading Buy", E: null });
});

// ── Target guard (R6 / R14) ──────────────────────────────────────────────────

const fits = (target: number, price: number, upside: number | null, direction: "UPSIDE" | "DOWNSIDE" | null = upside === null ? null : "UPSIDE") =>
  targetFitsPrice({ target_price: target, stated_upside_pct: upside, direction }, price);

test("guard: TDPOWERSYS (₹1,751 target, ₹619 today, ratio ≈0.42) is excluded", () => {
  assert.ok(Math.abs(619 / (1751 / 1.19) - 0.42) < 0.01);
  assert.equal(fits(1751, 619, 19), false);
  const out = view([read({ target_price: 1751, direction: "UPSIDE", stated_upside_pct: 19 })], valuation({ price: 619 }));
  assert.equal(out.target, null, "the only target is left out");
  assert.equal(out.brokers[0].target?.excluded, true);
  assert.equal(out.recent[0].priceMovedFlag, true, "the note stays in the list, flagged");
});

test("guard: SONACOMS (₹10 target vs ₹889) is excluded, with or without a stated upside", () => {
  assert.equal(fits(10, 889, 15), false);
  assert.equal(fits(10, 889, null), false);
});

test("guard: ATHERENERG (ratio 2.06) is excluded", () => {
  assert.ok(Math.abs(704 / (400 / 1.17) - 2.06) < 0.01);
  assert.equal(fits(400, 704, 17), false);
});

test("guard: a 2:1 split then +10% is excluded; a genuine +20% move is kept", () => {
  // Note-date price 1,000 (target 1,200 at 20% upside). Split halves it to 500; +10% → 550.
  assert.equal(fits(1200, 550, 20), false);
  assert.equal(fits(1200, 1200, 20), true);
});

test("guard: in-band controls are kept, downside notes included", () => {
  assert.equal(fits(1200, 1010, 20), true);
  assert.equal(fits(900, 1000, 10, "DOWNSIDE"), true);
  assert.equal(fits(1200, 640, 20), false, "0.64 is below the band");
  assert.equal(fits(1200, 660, 20), true, "0.66 is inside it");
  assert.equal(fits(100, 1000, 100, "DOWNSIDE"), false, "a 100% downside implies no price");
  assert.equal(fits(3000, 1000, null), true, "no stated move: 3x passes the 0.2x–5x fallback");
});

test("guard: an excluded broker leaves the median to the rest and is counted", () => {
  const out = view(
    [
      read({ broker: "A", target_price: 1100, direction: "UPSIDE", stated_upside_pct: 10 }),
      read({ broker: "B", target_price: 1300, direction: "UPSIDE", stated_upside_pct: 30 }),
      read({ broker: "C", target_price: 10, direction: "UPSIDE", stated_upside_pct: 15 }),
    ],
    valuation({ price: 1000 }),
  );
  assert.equal(out.target?.kind, "median");
  assert.equal(out.target?.value, 1200);
  assert.equal(out.target?.excludedCount, 1);
});

test("no price → no guard and no upside", () => {
  const out = view([read({ target_price: 10, direction: "UPSIDE", stated_upside_pct: 15 })], valuation({ price: null }));
  assert.equal(out.target?.value, 10);
  assert.equal(out.target?.upsideFromPrice, null);
  assert.equal(out.recent[0].priceMovedFlag, false);
  const noValuation = view([read({ target_price: 1200 })], null);
  assert.equal(noValuation.target?.value, 1200);
  assert.equal(noValuation.target?.upsideFromPrice, null);
});

test("a stale valuation price hides the upside but keeps the target", () => {
  const stale = view([read({ target_price: 1200 })], valuation({ pricedAsOf: "2026-11-10" }));
  assert.equal(stale.target?.value, 1200);
  assert.equal(stale.target?.upsideFromPrice, null);
  const fresh = view([read({ target_price: 1200 })], valuation({ pricedAsOf: "2026-11-25" }));
  assert.deepEqual(fresh.target?.upsideFromPrice, { pct: fresh.target!.upsideFromPrice!.pct, price: 1000, pricedAsOf: "2026-11-25" });
  close(fresh.target?.upsideFromPrice?.pct, 20);
  assert.equal(view([read({ target_price: 1200 })], valuation({ pricedAsOf: null })).target?.upsideFromPrice, null);
});

// ── Growth (R13) ─────────────────────────────────────────────────────────────

const growthRows = () => [
  read({ broker: "A", pat_cagr_pct: 22.8, ebitda_cagr_pct: 19, revenue_cagr_pct: 15, cagr_horizon: "FY26-28E" }),
  read({ broker: "B", pat_cagr_pct: 30, ebitda_cagr_pct: 24, revenue_cagr_pct: 18, cagr_horizon: "FY25-28E" }),
  read({ broker: "C" }), // read, no CAGRs: not counted
  note({ broker: "D" }), // not read: not counted
];

test("growth: PAT ladder → broker PAT CAGR, our base (fraction → %) and price assumes", () => {
  const g = view(growthRows()).growth!;
  assert.equal(g.metric, "pat");
  assert.equal(g.metricLabel, "Profit");
  assert.deepEqual(g.brokers, { lowPct: 22.8, highPct: 30, brokerCount: 2, windows: ["FY25-28E", "FY26-28E"] });
  close(g.ourBase?.pct, 40.95, "scenarios.base 0.4095 is shown as 40.95%");
  assert.deepEqual(g.priceAssumes, { pct: 30.5, window: "next 2 years" });
  assert.equal(g.rebased, false);
});

test("growth: EBITDA ladder → broker EBITDA CAGR", () => {
  const g = view(growthRows(), valuation({ rdcf: { ladder_metric: "ebitda" } })).growth!;
  assert.equal(g.metric, "ebitda");
  assert.deepEqual([g.brokers.lowPct, g.brokers.highPct], [19, 24]);
});

test("growth: revenue basis → broker revenue CAGR", () => {
  const g = view(growthRows(), valuation({ rdcf: { ladder_basis: "revenue", ladder_metric: null } })).growth!;
  assert.equal(g.metric, "revenue");
  assert.deepEqual([g.brokers.lowPct, g.brokers.highPct], [15, 18]);
  // An unset basis is the revenue ladder too.
  assert.equal(view(growthRows(), valuation({ rdcf: { ladder_basis: undefined, ladder_metric: undefined } })).growth?.metric, "revenue");
});

test("growth: EBIT ladder, or an earnings ladder with no metric, hides the block", () => {
  assert.equal(view(growthRows(), valuation({ rdcf: { ladder_metric: "ebit" } })).growth, null);
  assert.equal(view(growthRows(), valuation({ rdcf: { ladder_metric: null } })).growth, null);
});

test("growth: rebased → our as-stated base from the last FY, no price assumes", () => {
  const g = view(
    growthRows(),
    valuation({
      rdcf: {
        phase5_scenarios: { downside: 0.05, base: 0.12, upside: 0.2 }, // restated from the TTM: never shown here
        ladder_rebase: { metric: "pat", fy_label: "FY26", ttm_end: "Sep 2026", ttm_over_fy: 1.3, scenarios_as_stated: { base: 0.25 } },
      },
    }),
  ).growth!;
  assert.equal(g.rebased, true);
  close(g.ourBase?.pct, 25);
  assert.equal(g.ourBase?.window, "2 years from FY26");
  assert.equal(g.priceAssumes, null);
});

test("growth: residual income or a null implied CAGR → no price assumes", () => {
  const ri = view(growthRows(), valuation({ rdcf: { zone_basis: "delivered_roe" } })).growth!;
  assert.equal(ri.priceAssumes, null);
  close(ri.ourBase?.pct, 40.95);
  assert.equal(view(growthRows(), valuation({ rdcf: { implied_cagr_pct: null } })).growth?.priceAssumes, null);
});

test("growth: no valuation, or no broker figure on the metric → hidden", () => {
  assert.equal(view(growthRows(), null).growth, null);
  assert.equal(view([read({ broker: "A", revenue_cagr_pct: 15 })]).growth, null, "PAT ladder, revenue-only brokers");
});

// ── Header + list ────────────────────────────────────────────────────────────

test("header: brokers in 180 days, notes in 90, latest date, read-through date", () => {
  const out = view([
    note({ broker: "A", report_date: "2026-11-25" }),
    read({ broker: "B", report_date: "2026-10-22" }),
    note({ broker: "C", report_date: "2026-07-01" }), // 150 days: in the window, not in 90
    read({ broker: "D", report_date: "2026-03-01" }), // older than 180 days
  ]);
  assert.deepEqual(out.header, { brokerCount: 3, notesLast90: 2, latestDate: "2026-11-25", readThrough: "2026-10-22" });
  assert.deepEqual(out.recent.map((n) => n.broker), ["A", "B", "C"]);
  assert.deepEqual(out.older.map((n) => n.broker), ["D"]);
});

test("list item: rating word as printed, else the bucket label; stated move with direction", () => {
  const out = view([
    read({ broker: "A", report_date: "2026-11-12", rating_raw: "Accumulate", rating_bucket: "bullish", direction: "DOWNSIDE", stated_upside_pct: 4, target_price: 960, note_type: "results_review" }),
    read({ broker: "B", rating_raw: null, rating_bucket: "not_stated" }),
  ]);
  const [a, b] = out.recent;
  assert.equal(a.ratingLabel, "Accumulate");
  assert.equal(a.noteTypeLabel, "Results review");
  assert.deepEqual(a.stated, { direction: "DOWNSIDE", pct: 4 });
  assert.equal(a.targetPrice, 960);
  assert.equal(b.ratingLabel, "No rating stated");
});

// ── Section render: the gate marker (R11), copy, no links ────────────────────

const render = (rows: unknown[], v: NormalizedValuationCheck | null = valuation()) =>
  renderToStaticMarkup(React.createElement(BrokerNotesSection, { view: normalizeBrokerNotes(rows, v, TODAY) }));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

test("render: one gate marker right under the header line when notes exist", () => {
  const html = render([...growthRows(), read({ broker: "A", target_price: 1200, report_date: "2026-11-12" })]);
  assert.equal(count(html, "data-gate-cut"), 1);
  assert.ok(html.indexOf("brokers · ") < html.indexOf("data-gate-cut"), "header line sits above the cut");
  assert.ok(html.indexOf("data-gate-cut") < html.indexOf("Ratings"), "the strip sits below it");
  assert.ok(html.includes("Notes read through"));
  assert.ok(html.includes("Brokers&#x27; published views, not ours. Not investment advice."));
  assert.equal(BROKER_NOTES_FOOTER, "Brokers' published views, not ours. Not investment advice.");
  assert.ok(html.includes("upside to target"));
  assert.ok(!/IRR/.test(html));
  assert.ok(!/<a\s|href=/.test(html), "no links anywhere");
});

test("render: zero state has the copy and no gate marker", () => {
  const html = render([]);
  assert.ok(html.includes(BROKER_NOTES_ZERO_STATE));
  assert.equal(BROKER_NOTES_ZERO_STATE, "No broker notes since Sep 2025 in the notes we track.");
  assert.equal(count(html, "data-gate-cut"), 0);
});

test("render: older notes fold into an inline details", () => {
  const html = render([note({ report_date: "2026-11-01" }), note({ broker: "Old", report_date: "2026-02-01" })]);
  assert.ok(/<details[^>]*>\s*<summary[^>]*>Older notes, more than 180 days \(1\)/.test(html));
});

// ── Flag ─────────────────────────────────────────────────────────────────────

test("flag: only \"1\" or \"true\" turns the tab on", () => {
  assert.equal(isBrokerNotesEnabled({}), false);
  assert.equal(isBrokerNotesEnabled({ BROKER_NOTES_ENABLED: "" }), false);
  assert.equal(isBrokerNotesEnabled({ BROKER_NOTES_ENABLED: "0" }), false);
  assert.equal(isBrokerNotesEnabled({ BROKER_NOTES_ENABLED: "on" }), false);
  assert.equal(isBrokerNotesEnabled({ BROKER_NOTES_ENABLED: "1" }), true);
  assert.equal(isBrokerNotesEnabled({ BROKER_NOTES_ENABLED: "true" }), true);
});
