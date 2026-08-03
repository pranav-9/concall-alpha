import assert from "node:assert/strict";

import {
  formatScoredAt,
  isScoredWithin24h,
  normalizeSourceStatus,
  scoreWrittenAt,
} from "../lib/score-freshness";

// Only the exact marker concallyser stamps counts. Anything else — a future
// status word, a stray truthy value — must read as issuer-filed rather than
// silently painting an "Unofficial" chip on a score that isn't.
{
  assert.equal(normalizeSourceStatus("unofficial"), "unofficial");
  assert.equal(normalizeSourceStatus(null), null);
  assert.equal(normalizeSourceStatus(undefined), null);
  assert.equal(normalizeSourceStatus("official"), null);
  assert.equal(normalizeSourceStatus("UNOFFICIAL"), null, "case-sensitive: matches the stamper");
  assert.equal(normalizeSourceStatus(true), null);
}

// The 24h boundary. `now` is injected so one render can't straddle the edge.
{
  const now = new Date("2026-08-03T12:00:00Z");
  assert.equal(isScoredWithin24h("2026-08-03T11:58:00Z", now), true, "minutes ago");
  assert.equal(isScoredWithin24h("2026-08-02T12:00:01Z", now), true, "one second inside");
  assert.equal(isScoredWithin24h("2026-08-02T11:59:59Z", now), false, "one second outside");
  assert.equal(isScoredWithin24h("2026-07-31T12:46:51Z", now), false, "three days old");
  assert.equal(isScoredWithin24h(null, now), false);
  assert.equal(isScoredWithin24h("not a date", now), false);
  // Pipeline host ahead of the renderer: still certainly not older than a day.
  assert.equal(isScoredWithin24h("2026-08-03T12:30:00Z", now), true, "clock skew stays fresh");
}

// scored_at wins over BOTH row timestamps. This is the whole point: a re-score
// upserts in place, so created_at/updated_at still describe the superseded
// score. ADANIPORTS on 2026-08-03 is the live case — row created 30 Jul,
// re-scored that morning. Reading created_at would have called it four days old.
{
  assert.equal(
    scoreWrittenAt({
      scored_at: "2026-08-03T11:50:00Z",
      updated_at: "2026-07-30T12:14:00Z",
      created_at: "2026-07-30T12:14:00Z",
    }),
    "2026-08-03T11:50:00Z",
    "scored_at beats a stale created_at/updated_at",
  );
  assert.equal(
    scoreWrittenAt({ updated_at: "2026-08-03T11:58:00Z", created_at: "2026-07-01T00:00:00Z" }),
    "2026-08-03T11:58:00Z",
    "no scored_at: updated_at is the next best",
  );
  assert.equal(scoreWrittenAt({ updated_at: null, created_at: "2026-07-01T00:00:00Z" }), "2026-07-01T00:00:00Z");
  assert.equal(scoreWrittenAt({}), null);
}

// Deterministic IST formatting — the same string on the server (UTC on Vercel)
// and in the browser, or the title attribute trips hydration.
{
  assert.equal(formatScoredAt("2026-08-03T11:58:00.305251+00:00"), "3 Aug 2026, 17:28 IST");
  assert.equal(formatScoredAt("2026-08-03T19:00:00Z"), "4 Aug 2026, 00:30 IST", "rolls the date");
  assert.equal(formatScoredAt(null), null);
  assert.equal(formatScoredAt("nope"), null);
}

console.log("score-freshness: ok");
