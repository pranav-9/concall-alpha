import assert from "node:assert/strict";

import {
  ADVERSE_FLOOR,
  MAX_STORY_PICKS,
  MIN_STORY_PICKS,
  SCORE_FLOOR,
  parseStoryReads,
  qualifies,
  selectTopStoryReads,
} from "../lib/announcement-story-read/select";
import {
  AnnouncementStoryReadSchema,
  CHECK_KEYS,
  STORY_EFFECT_META,
  type AnnouncementStoryRead,
} from "../lib/announcement-story-read/types";
import type { ExchangeCategory, ExchangeImpact, ExchangeUpdate } from "../lib/exchange-desk/types";

// "What moved a story this week" — the load-time ranking. The list cases mirror
// concallyser/tests/test_announcement_story_read.py (the producer's preview uses
// the same sort); change one, change both.

const NOW = new Date("2026-10-03T16:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

function update(
  id: string,
  code: string,
  over: { category?: ExchangeCategory; impact?: ExchangeImpact; days?: number; pct?: number } = {},
): ExchangeUpdate {
  const category = over.category ?? "order_win";
  return {
    id,
    companyCode: code,
    companyName: `${code} Ltd`,
    category,
    categoryLabel: category,
    impact: over.impact ?? "positive",
    orderSize: over.pct ? { pctOfMcap: over.pct, softness: null } : null,
    summary: `Summary ${id}.`,
    headline: `Headline ${id}`,
    attachmentUrl: null,
    filedRaw: daysAgo(over.days ?? 1),
    filedLabel: "1d ago",
    bucketKey: "week",
  };
}

function read(
  id: string,
  code: string,
  score: number,
  effect: AnnouncementStoryRead["story_effect"] = "confirms",
  yes: (typeof CHECK_KEYS)[number][] = [],
): AnnouncementStoryRead {
  return {
    announcement_id: id,
    company_code: code,
    filed_at: daysAgo(1),
    generated_at: NOW.toISOString(),
    model: "deepseek-v4-flash",
    prompt_version: "v1",
    checks: Object.fromEntries(CHECK_KEYS.map((k) => [k, yes.includes(k)])) as AnnouncementStoryRead["checks"],
    score,
    story_effect: effect,
    what: "What was filed, in a sentence long enough to pass.",
    changes: "What it changes for the company, in a sentence.",
    anchor: effect === "none" ? null : { kind: "guidance", source: "Q1 FY27 concall", text: "Order intake of INR 10,000 crore plus in FY27" },
    pdf_read: true,
  };
}

// --- schema gate ------------------------------------------------------------------

{
  const good = read("a", "AAA", 4, "cuts_against", ["stated_item", "central_to_story", "behind_stated_pace"]);
  assert.equal(AnnouncementStoryReadSchema.safeParse(good).success, true);
  // The schema is strict: an unknown effect, an out-of-range score, a stray key, a missing check all fail.
  assert.equal(AnnouncementStoryReadSchema.safeParse({ ...good, story_effect: "bullish" }).success, false);
  assert.equal(AnnouncementStoryReadSchema.safeParse({ ...good, score: 12 }).success, false);
  assert.equal(AnnouncementStoryReadSchema.safeParse({ ...good, what: "x".repeat(301) }).success, false);
  assert.equal(AnnouncementStoryReadSchema.safeParse({ ...good, verdict: "buy" }).success, false);
  assert.equal(AnnouncementStoryReadSchema.safeParse({ ...good, checks: { stated_item: true } }).success, false);
  assert.equal(AnnouncementStoryReadSchema.safeParse({ ...good, changes: "Too short." }).success, false);
  assert.equal(AnnouncementStoryReadSchema.safeParse({ ...good, anchor: { kind: "scale", source: "Scale", text: "x".repeat(20) } }).success, false);
  assert.equal(AnnouncementStoryReadSchema.safeParse({ ...good, anchor: null, story_effect: "none" }).success, true);

  const { reads, invalid } = parseStoryReads([
    { announcement_id: "a", payload: good },
    { announcement_id: "b", payload: { ...good, announcement_id: "b", score: 99 } },
    { announcement_id: "c", payload: good }, // payload names a different filing than its row
    { announcement_id: "d", payload: null },
  ]);
  assert.deepEqual(reads.map((r) => r.announcement_id), ["a"]);
  assert.deepEqual(invalid, ["b", "c", "d"]);
  assert.deepEqual(parseStoryReads(null), { reads: [], invalid: [] });
}

// --- the floor --------------------------------------------------------------------

{
  const none = read("x", "X", 0, "none");
  assert.equal(qualifies({ ...none, score: SCORE_FLOOR }, "positive"), true);
  assert.equal(qualifies({ ...none, score: SCORE_FLOOR - 1 }, "positive"), false);
  const adverse = read("x", "X", ADVERSE_FLOOR, "none", ["adverse"]);
  assert.equal(qualifies(adverse, "negative"), true);
  assert.equal(qualifies({ ...adverse, checks: { ...adverse.checks, adverse: false } }, "negative"), false); // a routine notice
  assert.equal(qualifies(adverse, "positive"), false); // the lift is for the risk tail only
  assert.equal(qualifies(none, "severe"), true);
  assert.equal(qualifies(none, "transformative"), true);
}

// --- the list ---------------------------------------------------------------------

{
  const listed = [
    update("stl", "STLTECH", { pct: 27.4, days: 2 }),
    update("trans", "TRANSRAILL", { pct: 9.5, days: 3 }),
    update("trans2", "TRANSRAILL", { category: "capex", days: 3 }), // same company, lower rank
    update("time", "TIMETECHNO", { category: "ma", days: 4 }),
    update("bond", "BONDADA", { pct: 4.8, days: 4 }), // sized, but routine for the company
    update("sev", "YATRA", { category: "business_update", impact: "severe", days: 1 }),
    update("gst", "KEI", { category: "business_update", impact: "negative", days: 2 }),
    update("unread", "DIXON", { category: "partnership" }),
  ];
  const belowCut = [
    update("ellen", "ELLEN", { pct: 9.5, days: 5 }),
    update("azad", "AZAD", { category: "capex", days: 5 }),
    update("coo", "TRITURBINE", { category: "business_update", impact: "negative", days: 2 }),
  ];
  const reads = [
    read("stl", "STLTECH", 7, "extends"),
    read("ellen", "ELLEN", 5, "reshapes"),
    read("trans", "TRANSRAILL", 3, "cuts_against"),
    read("trans2", "TRANSRAILL", 3),
    read("azad", "AZAD", 4),
    read("time", "TIMETECHNO", 3),
    read("bond", "BONDADA", 1),
    read("sev", "YATRA", 1, "none"),
    read("coo", "TRITURBINE", 2, "none", ["adverse"]),
    read("gst", "KEI", 2, "none"),
    read("ghost", "GONE", 11), // its filing is no longer on the tape (folded twin / re-classified)
  ];
  const picks = selectTopStoryReads(reads, listed, belowCut, NOW);
  // A severe filing leads whatever its score; then by score, size breaking the tie.
  assert.deepEqual(picks.map((p) => p.update.companyCode), ["YATRA", "STLTECH", "ELLEN", "AZAD", "TRANSRAILL"]);
  assert.deepEqual(picks.map((p) => p.rank), [1, 2, 3, 4, 5]);
  assert.equal(picks.length, MAX_STORY_PICKS);
  assert.equal(picks[4].update.id, "trans"); // the order, not the capacity note
  // Below-cut companies list, tagged; listed ones are not tagged.
  assert.deepEqual(picks.map((p) => p.belowCut), [false, false, true, true, false]);

  // Order of the input never changes the output.
  assert.deepEqual(
    selectTopStoryReads([...reads].reverse(), [...listed].reverse(), [...belowCut].reverse(), NOW).map((p) => p.update.id),
    picks.map((p) => p.update.id),
  );

  // The window is the last seven days at load time: a week later every pick has aged out.
  assert.deepEqual(selectTopStoryReads(reads, listed, belowCut, new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000)), []);
  // A future-dated tape row never lists.
  const future = selectTopStoryReads(reads, [...listed, update("fut", "FUTCO", { days: -1 })], belowCut, NOW);
  assert.equal(future.some((p) => p.update.id === "fut"), false);
  // A row re-classified to neutral after it was read drops out.
  const neutralised = listed.map((u) => (u.id === "stl" ? { ...u, impact: "neutral" as const } : u));
  assert.equal(selectTopStoryReads(reads, neutralised, belowCut, NOW).some((p) => p.update.id === "stl"), false);
}

// --- a quiet week shows nothing ---------------------------------------------------

{
  const tape = [update("a", "AAA"), update("b", "BBB"), update("c", "CCC")];
  const two = [read("a", "AAA", 5), read("b", "BBB", 4), read("c", "CCC", 1)];
  assert.equal(MIN_STORY_PICKS, 3);
  assert.deepEqual(selectTopStoryReads(two, tape, [], NOW), []); // two qualify: not worth a heading
  const three = [read("a", "AAA", 5), read("b", "BBB", 4), read("c", "CCC", 3)];
  assert.deepEqual(selectTopStoryReads(three, tape, [], NOW).map((p) => p.update.id), ["a", "b", "c"]);
  assert.deepEqual(selectTopStoryReads([], tape, [], NOW), []);
  assert.deepEqual(selectTopStoryReads(three, [], [], NOW), []);
}

// --- the chip never reads as a verdict on the stock ------------------------------

{
  for (const [effect, meta] of Object.entries(STORY_EFFECT_META)) {
    assert.ok(!/signal|alarm/.test(meta.className), `${effect}: no green/red verdict ink on a story chip`);
    assert.ok(!/buy|sell|bull|bear|upside|downside/i.test(`${meta.label} ${meta.title}`), `${effect}: no stance words`);
  }
  assert.ok(STORY_EFFECT_META.cuts_against.className.includes("--warn"));
}

console.log("announcement-story-read: all assertions passed");
