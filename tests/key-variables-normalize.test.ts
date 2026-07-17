import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeKeyVariablesSnapshot } from "../lib/key-variables-snapshot/normalize";

const baseRow = {
  company_code: "TCS",
  generated_at: "2026-07-17T13:07:09.714339",
  section_synthesis: "Synthesis text.",
  discovery_summary: {
    total_candidates_considered: 12,
    selected_full_list_count: 8,
    selected_deep_treatment_count: 4,
    selection_priority_stack: "growth_quality_signal>source_availability>incremental_insight",
  },
  full_variable_list: {
    variables: [
      { variable: "Order Book Momentum", why_flagged: "Visibility.", source_basis: "both" },
    ],
  },
  deep_treatment: {
    variables: [
      {
        variable: "AI Services Adoption",
        kpi_history: {
          periods: ["Q4 FY26", "Q1 FY27"],
          rows: [
            {
              metric: "Annualized AI Revenue ($ Billion)",
              values_by_period: { "Q4 FY26": 2.3, "Q1 FY27": 2.6 },
            },
          ],
        },
        trend_interpretation: "Scaling with lumpy quarterly adds.",
        transition: "retained",
      },
      {
        variable: "HyperVault Capacity",
        kpi_history: {
          periods: ["Q4 FY26", "Q1 FY27"],
          rows: [
            { metric: "Committed capacity (MW)", values_by_period: { "Q4 FY26": 100, "Q1 FY27": 150 } },
          ],
        },
        trend_interpretation: "Anchor commitments building.",
        transition: "promoted",
        transition_reason: "Disclosure cadence increased with committed offtake.",
      },
    ],
    dropped_variables: [
      { variable: "Accounts Receivable DSO", reason: "Stable and low-signal; displaced by promotion." },
    ],
  },
};

test("normalizes transitions, reasons, and dropped variables", () => {
  const snapshot = normalizeKeyVariablesSnapshot(baseRow);
  assert.ok(snapshot);

  const [retained, promoted] = snapshot.deepTreatment;
  assert.equal(retained.transition, "retained");
  assert.equal(retained.transitionReason, null);
  assert.equal(promoted.transition, "promoted");
  assert.equal(
    promoted.transitionReason,
    "Disclosure cadence increased with committed offtake.",
  );

  assert.deepEqual(snapshot.droppedVariables, [
    { variable: "Accounts Receivable DSO", reason: "Stable and low-signal; displaced by promotion." },
  ]);
});

test("pre-continuity payloads normalize with null transitions and no dropped list", () => {
  const legacy = {
    ...baseRow,
    deep_treatment: {
      variables: [
        {
          variable: "Order Book TCV",
          kpi_history: {
            periods: ["Q3 FY26", "Q4 FY26"],
            rows: [{ metric: "TCV ($B)", values_by_period: { "Q3 FY26": 9.3, "Q4 FY26": 12 } }],
          },
          trend_interpretation: "Resilient order book.",
        },
      ],
    },
  };
  const snapshot = normalizeKeyVariablesSnapshot(legacy);
  assert.ok(snapshot);
  assert.equal(snapshot.deepTreatment[0].transition, null);
  assert.equal(snapshot.deepTreatment[0].transitionReason, null);
  assert.deepEqual(snapshot.droppedVariables, []);
});

test("garbage transition values coerce to null", () => {
  const noisy = {
    ...baseRow,
    deep_treatment: {
      variables: [
        {
          variable: "Order Book TCV",
          kpi_history: {
            periods: ["Q3 FY26", "Q4 FY26"],
            rows: [{ metric: "TCV ($B)", values_by_period: { "Q3 FY26": 9.3, "Q4 FY26": 12 } }],
          },
          trend_interpretation: "Resilient order book.",
          transition: "demoted",
        },
      ],
      dropped_variables: [{ reason: "missing variable name → dropped entry ignored" }],
    },
  };
  const snapshot = normalizeKeyVariablesSnapshot(noisy);
  assert.ok(snapshot);
  assert.equal(snapshot.deepTreatment[0].transition, null);
  assert.deepEqual(snapshot.droppedVariables, []);
});
