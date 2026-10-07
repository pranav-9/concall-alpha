import type { TrackerEntry } from "../app/quarter-tracker/data";
import {
  buildSeasonChart,
  callLabel,
  formatDay,
  formatTick,
  formatTime,
  groupUpcoming,
  isImprover,
  istDateOf,
  quarterEnd,
  relativeDay,
  seasonWindow,
  sortScored,
} from "../app/quarter-tracker/season";
import { trackerHref } from "../app/quarter-tracker/href";

const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error("FAIL", msg); process.exit(1); }
  console.log("ok  ", msg);
};

const entry = (over: Partial<TrackerEntry> & { code: string }): TrackerEntry => ({
  name: over.code,
  sector: null,
  subSector: null,
  score: null,
  bucket: "upcoming",
  priorScore: null,
  priorLabel: null,
  resultsDate: null,
  callDate: null,
  callTime: null,
  callUnreadable: false,
  callUrl: null,
  scoredAt: null,
  sourceStatus: null,
  scoredWithin24h: false,
  scorePath: [],
  ...over,
});

// --- the season window -----------------------------------------------------

assert(quarterEnd({ fy: 2027, qtr: 2 }) === "2026-09-30", "Q2 FY27 ends 30 Sep 2026");
assert(quarterEnd({ fy: 2027, qtr: 4 }) === "2027-03-31", "Q4 FY27 ends 31 Mar 2027");
assert(quarterEnd({ fy: 2027, qtr: 1 }) === "2026-06-30", "Q1 FY27 ends 30 Jun 2026");
assert(quarterEnd({ fy: 2027, qtr: 3 }) === "2026-12-31", "Q3 FY27 ends 31 Dec 2026");

const q2 = seasonWindow({ fy: 2027, qtr: 2 });
assert(q2.start === "2026-10-01" && q2.deadline === "2026-11-14", "Q2 season: 1 Oct → 14 Nov (45 days)");
const q4 = seasonWindow({ fy: 2027, qtr: 4 });
assert(q4.start === "2027-04-01" && q4.deadline === "2027-05-30", "Q4 season: 1 Apr → 30 May (60 days)");

// --- formatting --------------------------------------------------------------

assert(formatDay("2026-10-29") === "Thu 29 Oct", "formatDay");
assert(formatTick("2026-10-05") === "5 Oct", "formatTick");
assert(formatTime("16:00") === "4:00 PM" && formatTime("09:30") === "9:30 AM" && formatTime("00:15") === "12:15 AM", "formatTime");
assert(relativeDay("2026-10-29", "2026-10-29") === "Today", "relativeDay today");
assert(relativeDay("2026-10-29", "2026-10-30") === "Tomorrow", "relativeDay tomorrow");
assert(relativeDay("2026-10-29", "2026-11-02") === "In 4 days", "relativeDay ahead");
// An instant late on 6 Oct UTC is already 7 Oct in IST.
assert(istDateOf("2026-10-06T19:30:00Z") === "2026-10-07", "istDateOf rolls the IST day");
assert(istDateOf("2026-10-06T18:00:00Z") === "2026-10-06", "istDateOf before midnight IST");
assert(istDateOf("garbage") === null, "istDateOf rejects garbage");

// --- improvers + sorting ---------------------------------------------------

const up = entry({ code: "UP", score: 8.0, priorScore: 7.0, scoredAt: "2026-10-20T10:00:00Z" });
const flat = entry({ code: "FLAT", score: 7.5, priorScore: 7.52, scoredAt: "2026-10-22T10:00:00Z" });
const down = entry({ code: "DOWN", score: 6.0, priorScore: 7.0, scoredAt: "2026-10-21T10:00:00Z" });
const fresh = entry({ code: "FRESH", score: 7.0, priorScore: null, scoredAt: "2026-10-23T10:00:00Z" });
assert(isImprover(up) && !isImprover(flat) && !isImprover(down) && !isImprover(fresh), "isImprover needs ≥0.05 on a prior score");

const byScore = sortScored([down, up, flat, fresh], "score", "desc").map((e) => e.code);
assert(byScore.join() === "UP,FLAT,FRESH,DOWN", `score desc: ${byScore.join()}`);
const byScoreAsc = sortScored([down, up, flat, fresh], "score", "asc").map((e) => e.code);
assert(byScoreAsc.join() === "DOWN,FRESH,FLAT,UP", `score asc: ${byScoreAsc.join()}`);
const byDelta = sortScored([down, up, flat, fresh], "delta", "desc").map((e) => e.code);
assert(byDelta.join() === "UP,FLAT,DOWN,FRESH", `delta desc puts the no-prior row last: ${byDelta.join()}`);
const byDeltaAsc = sortScored([down, up, flat, fresh], "delta", "asc").map((e) => e.code);
assert(byDeltaAsc.join() === "DOWN,FLAT,UP,FRESH", `delta asc still puts the no-prior row last: ${byDeltaAsc.join()}`);
const byScored = sortScored([down, up, flat, fresh], "scored", "desc").map((e) => e.code);
assert(byScored.join() === "FRESH,FLAT,DOWN,UP", `scored desc = most recent first: ${byScored.join()}`);

// --- the season chart --------------------------------------------------------

const today = "2026-10-29";
const chartEntries = [
  entry({ code: "SCORED", score: 8.7, resultsDate: "2026-10-15" }),
  entry({ code: "UNOFF", score: 6.0, resultsDate: "2026-10-15", sourceStatus: "unofficial" }),
  entry({ code: "LOW", score: 4.0, resultsDate: "2026-10-15" }),
  entry({ code: "PENDING", resultsDate: "2026-10-27" }),
  entry({ code: "SET", resultsDate: "2026-10-30", callDate: "2026-11-02", callTime: "16:00" }),
  // Scored, no calendar row: sits on the IST day it was scored.
  entry({ code: "NODATE", score: 7.2, scoredAt: "2026-10-20T13:00:00Z" }),
  entry({ code: "TBA" }),
  // A late filer past the regulatory deadline stretches the drawn range.
  entry({ code: "LATE", resultsDate: "2026-11-20" }),
];
const chart = buildSeasonChart(chartEntries, { fy: 2027, qtr: 2 }, today);
assert(chart.days[0].date === "2026-10-01", "chart starts at the season start");
assert(chart.days[chart.days.length - 1].date === "2026-11-20", "chart stretches to the late filer");
assert(chart.todayIndex === 28 && chart.days[28].today, "today column is marked");
assert(chart.days[2].weekend && chart.days[3].weekend && !chart.days[4].weekend, "3–4 Oct shaded as a weekend");
assert(chart.days[4].monday && formatTick(chart.days[4].date) === "5 Oct", "first Monday tick is 5 Oct");
const oct15 = chart.days.find((d) => d.date === "2026-10-15")!;
assert(oct15.cells.length === 3 && chart.rows === 3, "three companies stacked on 15 Oct");
assert(
  oct15.cells.map((c) => `${c.entry.code}:${c.state}`).join() === "SCORED:scored,UNOFF:unofficial,LOW:scored",
  `15 Oct stacks best score at the bottom: ${oct15.cells.map((c) => c.entry.code).join()}`,
);
assert(chart.days.find((d) => d.date === "2026-10-27")!.cells[0].state === "pending", "board met before today, no score → pending");
assert(chart.days.find((d) => d.date === "2026-10-30")!.cells[0].state === "set", "date ahead → set");
const nodate = chart.days.find((d) => d.date === "2026-10-20")!.cells[0];
assert(nodate.entry.code === "NODATE" && nodate.placedByScore, "scored with no calendar row sits on its scored day, flagged");
assert(chart.undated.length === 1 && chart.undated[0].code === "TBA", "only the undated upcoming company is TBA");

// Today outside the range (a season viewed after it closed) draws no today column.
const closed = buildSeasonChart([entry({ code: "X", score: 7, resultsDate: "2026-10-15" })], { fy: 2027, qtr: 2 }, "2026-12-20");
assert(closed.todayIndex === -1 && closed.days[closed.days.length - 1].date === "2026-11-14", "closed season keeps its own extent");

// --- the upcoming panel ------------------------------------------------------

const groups = groupUpcoming(chartEntries, today);
assert(groups.pending.map((e) => e.code).join() === "PENDING", "pending = board met, no score");
assert(groups.ahead.map((g) => g.date).join() === "2026-10-30,2026-11-20", "ahead grouped by date in order");
assert(groups.undated.map((e) => e.code).join() === "TBA", "undated listed");

const set = chartEntries.find((e) => e.code === "SET")!;
assert(callLabel(set).text === "Call Mon 4:00 PM", `call on another day names the weekday: ${callLabel(set).text}`);
assert(callLabel(entry({ code: "A", resultsDate: "2026-10-30", callDate: "2026-10-30", callTime: "10:00" })).text === "Call 10:00 AM", "same-day call drops the weekday");
assert(callLabel(entry({ code: "B", callUnreadable: true, callUrl: "https://x" })).text === "Invite filed", "unreadable invite");
assert(callLabel(entry({ code: "C" })).muted && callLabel(entry({ code: "C" })).text === "Call TBA", "no invite → muted TBA");

// --- hrefs -------------------------------------------------------------------

assert(trackerHref({ sort: "score", dir: "desc", improvers: false, mine: false }) === "/quarter-tracker", "defaults carry no query");
assert(
  trackerHref({ sort: "delta", dir: "asc", improvers: true, mine: true }) === "/quarter-tracker?sort=delta&dir=asc&filter=improvers&mine=1",
  "every non-default is a parameter",
);

console.log("\nAll quarter-tracker season tests passed.");
