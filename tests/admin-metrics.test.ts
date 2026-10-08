import assert from "node:assert/strict";

import { ageHours, describeAge, freshnessTone, type FreshnessFeed } from "../lib/admin/freshness";
import {
  activeSince,
  aggregateApiMetrics,
  buildAccountActivity,
  buildActiveVisitors,
  computeDelta,
  countRequestsByType,
  countUniqueVisitorsBetween,
  formatDelta,
  formatIst,
  percentile,
} from "../lib/admin/metrics";
import { adminHref, parseRange, priorLabel, resolveWindow } from "../lib/admin/range";

const NOW = new Date("2026-10-07T06:00:00.000Z"); // 11:30 IST

// ── range ────────────────────────────────────────────────────────────────────

assert.equal(parseRange("30d"), "30d");
assert.equal(parseRange(["90d"]), "90d");
assert.equal(parseRange("nope"), "7d", "unknown range falls back to 7d");
assert.equal(parseRange(undefined), "7d");

{
  const w = resolveWindow("7d", NOW);
  assert.equal(w.startIso, "2026-09-30T06:00:00.000Z");
  assert.equal(w.priorStartIso, "2026-09-23T06:00:00.000Z", "prior window is the same length, just before");
  assert.equal(w.chartStartIso, w.startIso);
  // MAU lookback (29d before the chart start) reaches further back than the prior window.
  assert.equal(w.fetchStartIso, "2026-09-01T06:00:00.000Z");
}
{
  const w = resolveWindow("90d", NOW);
  // Prior window (180d back) reaches further than the 29d lookback: the fetch floor follows it.
  assert.equal(w.priorStartIso, "2026-04-10T06:00:00.000Z");
  assert.equal(w.fetchStartIso, w.priorStartIso);
}
{
  const w = resolveWindow("all", NOW);
  assert.equal(w.startIso, null);
  assert.equal(w.priorStartIso, null, "All time has no prior window");
  assert.equal(w.chartStartIso, "2026-07-09T06:00:00.000Z", "chart is capped at 90 days");
}

assert.equal(priorLabel("7d"), "vs prior 7d");
assert.equal(priorLabel("all"), null);
assert.equal(adminHref("/admin/companies", "7d"), "/admin/companies", "default range stays out of the URL");
assert.equal(adminHref("/admin/companies", "30d"), "/admin/companies?range=30d");

// ── delta ────────────────────────────────────────────────────────────────────

assert.deepEqual(computeDelta(120, 100), { current: 120, prior: 100, pct: 20, direction: "up" });
assert.equal(computeDelta(80, 100).direction, "down");
assert.equal(computeDelta(100, 100).direction, "flat");
assert.equal(computeDelta(100, 100.4).direction, "flat", "sub-half-percent moves read as flat");
assert.deepEqual(computeDelta(5, 0), { current: 5, prior: 0, pct: null, direction: "up" });
assert.deepEqual(computeDelta(0, 0), { current: 0, prior: 0, pct: null, direction: "flat" });
assert.equal(computeDelta(5, null).direction, "none");

assert.equal(formatDelta(computeDelta(120, 100), "vs prior 7d"), "+20% vs prior 7d");
assert.equal(formatDelta(computeDelta(75, 100), "vs prior 7d"), "-25% vs prior 7d");
assert.equal(formatDelta(computeDelta(100, 100), "vs prior 7d"), "no change vs prior 7d");
assert.equal(formatDelta(computeDelta(5, 0), "vs prior 7d"), "new vs prior 7d");
assert.equal(formatDelta(computeDelta(0, 0), "vs prior 7d"), "none vs prior 7d");
assert.equal(formatDelta(computeDelta(5, null), "vs prior 7d"), null, "no prior → no line");
assert.equal(formatDelta(computeDelta(5, 4), null), null, "All time → no line");

// ── active visitors ──────────────────────────────────────────────────────────

{
  const rows = [
    { visitor_id: "a", created_at: "2026-10-05T04:00:00.000Z" },
    { visitor_id: "a", created_at: "2026-10-05T09:00:00.000Z" }, // same visitor, same IST day
    { visitor_id: "b", created_at: "2026-10-06T20:30:00.000Z" }, // 02:00 IST on the 7th
    { visitor_id: null, created_at: "2026-10-06T10:00:00.000Z" },
    { visitor_id: "c", created_at: "not a date" },
  ];
  const series = buildActiveVisitors(rows, "2026-10-05T00:00:00.000Z", NOW);
  assert.deepEqual(
    series.map((p) => [p.date, p.dau, p.wau]),
    [
      ["2026-10-05", 1, 1],
      ["2026-10-06", 0, 1],
      ["2026-10-07", 1, 2],
    ],
    "DAU buckets by IST day, WAU rolls 7 days; null ids and bad dates are dropped",
  );
  assert.equal(countUniqueVisitorsBetween(rows, "2026-10-05T00:00:00.000Z", "2026-10-06T00:00:00.000Z"), 1);
  assert.equal(countUniqueVisitorsBetween(rows, "2026-10-05T00:00:00.000Z", "2026-10-07T00:00:00.000Z"), 2);
  assert.equal(countUniqueVisitorsBetween(rows, "2026-10-06T20:30:00.000Z", "2026-10-08T00:00:00.000Z"), 1, "start is inclusive");
  assert.equal(countUniqueVisitorsBetween(rows, "2026-10-01T00:00:00.000Z", "2026-10-05T04:00:00.000Z"), 0, "end is exclusive");
}

// ── requests ─────────────────────────────────────────────────────────────────

{
  const counts = countRequestsByType([
    { id: "1", request_type: "bug_report", subject_target: "x", message: null, source_path: null, user_agent: null, created_at: "" },
    { id: "2", request_type: "bug_report", subject_target: "y", message: null, source_path: null, user_agent: null, created_at: "" },
    { id: "3", request_type: "feedback", subject_target: "z", message: null, source_path: null, user_agent: null, created_at: "" },
  ]);
  assert.equal(counts.bug_report, 2);
  assert.equal(counts.feedback, 1);
  assert.equal(counts.stock_addition, 0, "every type is present even at zero");
}

// ── api metrics ──────────────────────────────────────────────────────────────

assert.equal(percentile([], 95), null);
assert.equal(percentile([10, 20, 30, 40], 50), 20);
assert.equal(percentile([10, 20, 30, 40], 95), 40);

{
  const raw = [
    { id: "1", route: "/api/search", method: "GET", status_code: 200, duration_ms: 100, result_count: 3, query_length: 4, error_code: null, created_at: null },
    { id: "2", route: "/api/search", method: "GET", status_code: 500, duration_ms: 900, result_count: null, query_length: 4, error_code: "boom", created_at: null },
    { id: "3", route: "/api/page-view", method: "POST", status_code: 400, duration_ms: 10, result_count: null, query_length: null, error_code: null, created_at: null },
    { id: "4", route: null, method: null, status_code: null, duration_ms: null, result_count: null, query_length: null, error_code: null, created_at: null },
  ];
  const agg = aggregateApiMetrics(raw, 40, 2);
  assert.equal(agg.totalCalls, 40);
  assert.equal(agg.sampledCalls, 4);
  assert.equal(agg.sampled, true, "count above the sample flags it");
  assert.equal(agg.serverErrorCount, 1);
  assert.equal(agg.clientErrorCount, 1);
  assert.equal(agg.slowRows.length, 2);
  assert.equal(agg.slowRows[0].id, "2", "slowest first");
  assert.deepEqual(
    agg.perRoute.map((r) => [r.route, r.calls, r.serverErrorCount, r.clientErrorCount]),
    [
      ["/api/search", 2, 1, 0],
      ["/api/page-view", 1, 0, 1],
      ["unknown", 1, 0, 0],
    ],
    "per-route keeps 5xx and 4xx apart and orders by calls",
  );
  assert.equal(agg.perRoute[0].p95Ms, 900);
  assert.equal(aggregateApiMetrics([], null).sampled, false);
}

// ── formatting ───────────────────────────────────────────────────────────────

assert.equal(formatIst("2026-10-05T04:05:00.000Z", NOW), "5 Oct, 09:35", "IST, no year when current");
assert.equal(formatIst("2025-12-31T20:00:00.000Z", NOW), "1 Jan, 01:30", "the IST day decides the year, not the UTC one");
assert.equal(formatIst("2025-06-30T20:00:00.000Z", NOW), "1 Jul 2025, 01:30", "year shown when not current");
assert.equal(formatIst(null), "–");

// ── freshness ────────────────────────────────────────────────────────────────

assert.equal(ageHours(null, NOW), null);
assert.equal(ageHours("2026-10-07T03:00:00.000Z", NOW), 3);
assert.equal(ageHours("2026-10-07T07:00:00.000Z", NOW), 0, "clock skew never reads negative");
assert.equal(describeAge("2026-10-07T05:59:50.000Z", NOW), "just now");
assert.equal(describeAge("2026-10-07T05:25:00.000Z", NOW), "35m ago");
assert.equal(describeAge("2026-10-07T03:00:00.000Z", NOW), "3h ago");
assert.equal(describeAge("2026-10-04T06:00:00.000Z", NOW), "3d ago");
assert.equal(describeAge("2026-08-01T06:00:00.000Z", NOW), "10w ago");
assert.equal(describeAge(null, NOW), "never");

const feed = (over: Partial<FreshnessFeed>): FreshnessFeed => ({
  key: "k",
  label: "L",
  detail: "",
  cadence: "",
  latestIso: null,
  oldestIso: null,
  warnAfterHours: 6,
  alarmAfterHours: 24,
  action: null,
  error: null,
  ...over,
});

assert.equal(freshnessTone(feed({ latestIso: "2026-10-07T05:00:00.000Z" }), NOW), "fresh");
assert.equal(freshnessTone(feed({ latestIso: "2026-10-06T23:00:00.000Z" }), NOW), "warn", "7h ≥ 6h warn mark");
assert.equal(freshnessTone(feed({ latestIso: "2026-10-05T06:00:00.000Z" }), NOW), "alarm", "48h ≥ 24h alarm mark");
assert.equal(
  freshnessTone(feed({ latestIso: "2026-10-07T05:00:00.000Z", oldestIso: "2026-10-01T05:00:00.000Z" }), NOW),
  "alarm",
  "a fleet feed is judged on its OLDEST row",
);
assert.equal(freshnessTone(feed({ latestIso: null }), NOW), "unknown");
assert.equal(freshnessTone(feed({ latestIso: "2026-10-07T05:00:00.000Z", error: "x" }), NOW), "unknown");
assert.equal(
  freshnessTone(feed({ latestIso: "2026-01-01T00:00:00.000Z", warnAfterHours: null, alarmAfterHours: null }), NOW),
  "fresh",
  "no cadence → never flagged",
);

// ── account activity ─────────────────────────────────────────────────────────

{
  const user = (id: string, lastSignInAt: string | null) => ({
    id,
    email: `${id}@x.in`,
    displayName: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    lastSignInAt,
  });
  const users = [
    user("visitor", "2026-09-10T00:00:00.000Z"), // signed in long ago, visited this morning
    user("signer", "2026-10-06T00:00:00.000Z"), // fresh sign-in, no session row
    user("saver", "2026-09-01T00:00:00.000Z"), // old sign-in, saved a company yesterday
    user("tie", "2026-10-05T00:00:00.000Z"), // session and sign-in at the same instant
    user("ghost", null), // never signed in, nothing else
  ];
  const sessions = [
    { user_id: "visitor", last_active_at: "2026-10-07T03:00:00.000Z", session_count: 2 },
    { user_id: "tie", last_active_at: "2026-10-05T00:00:00.000Z", session_count: 1 },
    { user_id: "stranger", last_active_at: "2026-10-07T05:00:00.000Z", session_count: 1 }, // not an account
    { user_id: null, last_active_at: "2026-10-07T05:00:00.000Z", session_count: 1 },
  ];
  const watchlists = [
    { id: 1, user_id: "saver", created_at: "2026-09-02T00:00:00.000Z" },
    { id: 2, user_id: "visitor", created_at: "2026-09-12T00:00:00.000Z" },
  ];
  const items = [
    { watchlist_id: 1, created_at: "2026-10-06T12:00:00.000Z" },
    { watchlist_id: 1, created_at: "2026-09-03T00:00:00.000Z" },
    { watchlist_id: 2, created_at: "2026-09-13T00:00:00.000Z" },
    { watchlist_id: 99, created_at: "2026-10-07T05:59:00.000Z" }, // orphan list: ignored
  ];

  const rows = buildAccountActivity({ users, sessions, watchlists, items });
  assert.deepEqual(
    rows.map((r) => [r.id, r.source, r.lastActiveAt, r.saves]),
    [
      ["visitor", "session", "2026-10-07T03:00:00.000Z", 1],
      ["saver", "watchlist", "2026-10-06T12:00:00.000Z", 2],
      ["signer", "sign_in", "2026-10-06T00:00:00.000Z", 0],
      ["tie", "session", "2026-10-05T00:00:00.000Z", 0],
    ],
    "newest signal wins, ties go to the session, sorted newest first, never-active accounts dropped",
  );

  // Without the session RPC the visitor falls back to their watchlist write.
  const fallback = buildAccountActivity({ users, sessions: null, watchlists, items });
  assert.equal(fallback.find((r) => r.id === "visitor")?.source, "watchlist");
  assert.equal(fallback.find((r) => r.id === "visitor")?.lastActiveAt, "2026-09-13T00:00:00.000Z");
  assert.equal(fallback.find((r) => r.id === "tie")?.source, "sign_in");

  assert.deepEqual(
    activeSince(rows, "2026-10-06T00:00:00.000Z").map((r) => r.id),
    ["visitor", "saver", "signer"],
    "the window start is inclusive",
  );
  assert.equal(activeSince(rows, null).length, 4, "All time keeps every active account");
}

console.log("admin-metrics: ok");
