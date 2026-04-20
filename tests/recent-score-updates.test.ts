import assert from "node:assert/strict";

import { collapseConsecutiveSameCompanyUpdates } from "../app/(hero)/recent-score-updates-utils";

type Update = {
  companyCode?: string | null;
  label: string;
};

const collapseLabels = (updates: Update[]) =>
  collapseConsecutiveSameCompanyUpdates(updates).map((item) => item.label);

const runCase = (name: string, updates: Update[], expected: string[]) => {
  assert.deepStrictEqual(
    collapseLabels(updates),
    expected,
    `Unexpected result for case: ${name}`,
  );
};

runCase(
  "keeps the first item in a consecutive run",
  [
    { companyCode: "A", label: "A-1" },
    { companyCode: "a", label: "A-2" },
    { companyCode: "B", label: "B-1" },
  ],
  ["A-1", "B-1"],
);

runCase(
  "does not collapse non-consecutive repeats",
  [
    { companyCode: "A", label: "A-1" },
    { companyCode: "B", label: "B-1" },
    { companyCode: "A", label: "A-2" },
  ],
  ["A-1", "B-1", "A-2"],
);

runCase(
  "keeps the first item when different source types repeat consecutively",
  [
    { companyCode: "C", label: "quarter" },
    { companyCode: "c", label: "growth" },
    { companyCode: "D", label: "snapshot" },
  ],
  ["quarter", "snapshot"],
);

runCase(
  "leaves no-company rows untouched and uses them as separators",
  [
    { companyCode: "E", label: "E-1" },
    { label: "no-code" },
    { companyCode: "e", label: "E-2" },
  ],
  ["E-1", "no-code", "E-2"],
);

console.log("recent-score-updates collapse tests passed");
