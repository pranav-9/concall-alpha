import { countResults, isResultsSeason } from "../lib/results-pulse/count";
import { resultsPillCount } from "../components/results-pill";

const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error("FAIL", msg); process.exit(1); }
  console.log("ok  ", msg);
};

const Q2 = { fy: 2027, qtr: 2 };
const Q4 = { fy: 2027, qtr: 4 };

// Season window: quarter end +1 → SEBI deadline (+45, +60 for Q4) + a 7-day tail.
assert(!isResultsSeason(Q2, "2026-09-30"), "Q2 not in season on quarter end");
assert(isResultsSeason(Q2, "2026-10-01"), "Q2 opens the day after quarter end");
assert(isResultsSeason(Q2, "2026-11-14"), "Q2 deadline day is in season");
assert(isResultsSeason(Q2, "2026-11-21"), "Q2 tail runs 7 days past the deadline");
assert(!isResultsSeason(Q2, "2026-11-22"), "Q2 closes after the tail");
assert(isResultsSeason(Q4, "2027-06-06"), "Q4 uses the 60-day audited deadline");

// Counts: future dates and nulls ignored; today counted in both.
const dates = ["2026-10-08", "2026-10-13", "2026-10-13", "2026-10-15", null, undefined, "garbage"];
const c = countResults(dates, "2026-10-13");
assert(c.today === 2, `two report today (got ${c.today})`);
assert(c.declared === 3, `three declared so far (got ${c.declared})`);
assert(countResults([], "2026-10-13").declared === 0, "empty calendar counts nothing");

// Pill copy: today wins, then the season total, then the quarter label.
assert(resultsPillCount({ label: "Q2 FY27", today: 2, declared: 3 }) === "2 today", "today count leads");
assert(resultsPillCount({ label: "Q2 FY27", today: 0, declared: 3 }) === "3 declared", "quiet day shows declared");
assert(resultsPillCount({ label: "Q2 FY27", today: 0, declared: 0 }) === "Q2 FY27", "nothing declared shows the quarter");

console.log("All results-pulse tests passed.");
