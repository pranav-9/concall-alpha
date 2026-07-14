import { currentReportingQuarter, quarterLabelFor } from "../lib/current-quarter";

const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error("FAIL", msg); process.exit(1); }
  console.log("ok  ", msg);
};

const eq = (d: string, fy: number, qtr: number, label: string) => {
  const got = currentReportingQuarter(new Date(d));
  assert(
    got.fy === fy && got.qtr === qtr && got.label === label,
    `${d} -> ${label} (got Q${got.qtr} fy=${got.fy} "${got.label}")`,
  );
};

// Results-season mapping: a date in month M is the reporting window for the
// quarter that ended just before it (Indian FY, Apr–Mar).
eq("2026-07-14", 2027, 1, "Q1 FY27"); // today: Apr–Jun quarter reporting
eq("2026-07-01", 2027, 1, "Q1 FY27"); // season boundary
eq("2026-06-30", 2026, 4, "Q4 FY26"); // day before the flip
eq("2026-04-01", 2026, 4, "Q4 FY26"); // Jan–Mar quarter reporting
eq("2026-10-01", 2027, 2, "Q2 FY27"); // Jul–Sep quarter reporting
eq("2027-01-15", 2027, 3, "Q3 FY27"); // Oct–Dec quarter reporting
eq("2027-03-31", 2027, 3, "Q3 FY27"); // last day before Q4 season
eq("2027-04-01", 2027, 4, "Q4 FY27");

assert(quarterLabelFor(2027, 1) === "Q1 FY27", "quarterLabelFor 4-digit fy");
assert(quarterLabelFor(2007, 3) === "Q3 FY07", "quarterLabelFor zero-pads");

console.log("\nAll current-quarter tests passed.");
