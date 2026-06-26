import assert from "node:assert/strict";

import {
  pickHeadlineGuidance,
  type HeadlineGuidanceRow,
} from "../lib/guidance-tracking/headline-guidance";

const row = (r: Partial<HeadlineGuidanceRow>): HeadlineGuidanceRow => ({
  guidance_type: "revenue",
  target_period: "FY26",
  status: "active",
  guidance_text: null,
  latest_view: null,
  ...r,
});

const label = (rows: HeadlineGuidanceRow[]) => pickHeadlineGuidance(rows)?.label ?? null;

// --- real sampled cases (live guidance_tracking, 2026-06) ---

// ACUTAAS — "revised upwards to approximately 30%".
assert.equal(
  label([row({ guidance_text: "FY26 revenue growth guidance revised upwards to approximately 30%.", status: "revised" })]),
  "30% FY26",
);

// CCL — a range with "to".
assert.equal(
  label([row({ guidance_text: "Maintain 15% to 20% annual volume and EBITDA growth in FY26." })]),
  "15–20% FY26",
);

// AARTIPHARM CDMO revenue — "30-40%", take it (the EBITDA row is filtered by type).
assert.equal(
  label([
    row({ guidance_text: "Standalone EBITDA growth FY26 guided 12-15%, revised to 8-12%.", guidance_type: "margin" }),
    row({ guidance_text: "CDMO/CMO revenue estimated to grow 30-40% in FY26.", guidance_type: "revenue" }),
  ]),
  "30–40% FY26",
);

// "revised to X" — report the LAST number, not the first.
assert.equal(
  label([row({ guidance_text: "Guided 12-15% initially, revised to 8-12% in Q2.", status: "revised" })]),
  "8–12% FY26",
);

// HAPPYFORGE — multi-year CAGR → FY26+.
assert.equal(
  label([row({ target_period: "FY26-FY29", guidance_text: "15% to 20% organic revenue CAGR over the medium term." })]),
  "15–20% FY26+",
);

// ARMANFIN — single % in FY27.
assert.equal(
  label([row({ target_period: "FY27", guidance_text: "Expects AUM growth of at least 25% in FY27." })]),
  "25% FY27",
);

// --- exclusions: no accent ---

// SANSERA — qualitative ("teens"), no number.
assert.equal(label([row({ guidance_text: "Close FY26 with teens to mid-teens top-line growth." })]), null);
// MOLDTKPAC — absolute ₹cr, no %.
assert.equal(label([row({ target_period: "FY27", guidance_text: "Reach INR 1,000 crore topline by FY27." })]), null);
// Non-revenue metric is ignored.
assert.equal(label([row({ guidance_type: "margin", guidance_text: "EBITDA margin of 22% in FY26." })]), null);
// Old/irrelevant FY is ignored.
assert.equal(label([row({ target_period: "FY24", guidance_text: "Grew revenue 18% in FY24." })]), null);
// Empty input.
assert.equal(label([]), null);

// latest_view must NOT be a number source — it carries figures from other
// metrics. A qualitative revenue guide with a stray % in latest_view → null.
assert.equal(
  label([
    row({ guidance_text: "Close FY26 with teens to mid-teens top-line growth.", latest_view: "7.6% margin" }),
  ]),
  null,
);
// Absolute ₹cr guide with a stray % in latest_view → still null.
assert.equal(
  label([
    row({ target_period: "FY27", guidance_text: "Reach INR 1,000 crore topline by FY27.", latest_view: "12-15%" }),
  ]),
  null,
);

// --- selection: prefer current FY (FY27) + active ---
assert.equal(
  label([
    row({ target_period: "FY26", guidance_text: "18% in FY26.", status: "met" }),
    row({ target_period: "FY27", guidance_text: "22% in FY27.", status: "active" }),
  ]),
  "22% FY27",
);

// detail carries the full statement + non-active status.
const detail = pickHeadlineGuidance([
  row({ guidance_text: "Revenue growth ~30% in FY26.", status: "revised" }),
])?.detail;
assert.ok(detail?.startsWith("Management:"), "detail starts with Management:");
assert.ok(detail?.includes("revised"), "detail notes revised status");

console.log("headline-guidance: all assertions passed");
