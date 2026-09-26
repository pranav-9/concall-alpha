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

// ---- 7a fields: headline, thesis role, lead metric, directions, guide, radar latest ----

const richRow = {
  ...baseRow,
  section_headline: "  Vinyas has the orders. The open question is whether they turn into cash.  ",
  full_variable_list: {
    variables: [
      {
        variable: "Gross margin by build type",
        why_flagged: "Box-build is the second engine.",
        source_basis: "presentation",
        latest: { value: "24.5%", delta_label: "▲ +170 bps", effect: "helps", as_of: "Deck · Q1 FY27" },
        watch_for: "box-build crossing 50% of revenue.",
        next_to_promote: true,
      },
      {
        variable: "Top-5 customer concentration",
        why_flagged: "One delay dents a year.",
        source_basis: "annual_report",
        latest: { value: 68, delta_label: "High", effect: "bad-value", as_of: "Annual report · FY26" },
      },
    ],
  },
  deep_treatment: {
    variables: [
      {
        variable: "Net working capital days",
        thesis_role: "Sets the cash",
        lead_metric_index: 0,
        lead_unit: "days",
        metric_directions: { "NWC (days)": "lower_is_better", "Inventory (days)": "LOWER IS BETTER" },
        guide: { value: 120, label: "Guide 120 · FY27" },
        kpi_history: {
          periods: ["Q3 FY26", "Q4 FY26", "Q1 FY27"],
          rows: [
            { metric: "NWC (days)", values_by_period: { "Q3 FY26": 118, "Q4 FY26": 131, "Q1 FY27": 146 } },
            { metric: "Inventory (days)", values_by_period: { "Q3 FY26": 84, "Q4 FY26": 92, "Q1 FY27": 103 } },
            { metric: "Receivables (days)", values_by_period: { "Q3 FY26": 71, "Q4 FY26": 74, "Q1 FY27": 79 } },
          ],
        },
        trend_interpretation: "Three straight quarters of expansion.",
        transition: "promoted",
        transition_reason: "It went from a steady metric to a live risk.",
      },
    ],
  },
};

test("7a fields normalize: headline, thesis role, lead unit, directions, guide", () => {
  const snapshot = normalizeKeyVariablesSnapshot(richRow);
  assert.ok(snapshot);
  assert.equal(
    snapshot.sectionHeadline,
    "Vinyas has the orders. The open question is whether they turn into cash.",
  );

  const [nwc] = snapshot.deepTreatment;
  assert.equal(nwc.thesisRole, "Sets the cash");
  assert.equal(nwc.leadMetricIndex, 0);
  assert.equal(nwc.leadUnit, "days");
  assert.deepEqual(nwc.guide, { value: 120, label: "Guide 120 · FY27" });
  // Every row gets a direction; the unlisted one defaults to higher_is_better,
  // and a shouty variant of lower_is_better still parses.
  assert.deepEqual(nwc.metricDirections, {
    "NWC (days)": "lower_is_better",
    "Inventory (days)": "lower_is_better",
    "Receivables (days)": "higher_is_better",
  });
});

test("7a fields normalize: radar latest / watchFor / nextToPromote, bad effect → neutral", () => {
  const snapshot = normalizeKeyVariablesSnapshot(richRow);
  assert.ok(snapshot);
  const [gm, top5] = snapshot.fullVariableList;

  assert.deepEqual(gm.latest, {
    value: "24.5%",
    deltaLabel: "▲ +170 bps",
    effect: "helps",
    asOf: "Deck · Q1 FY27",
  });
  assert.equal(gm.watchFor, "box-build crossing 50% of revenue.");
  assert.equal(gm.nextToPromote, true);

  // numeric value is stringified; an unknown effect coerces to neutral; missing flags default off
  assert.ok(top5.latest);
  assert.equal(top5.latest.value, "68");
  assert.equal(top5.latest.effect, "neutral");
  assert.equal(top5.watchFor, null);
  assert.equal(top5.nextToPromote, false);
});

test("7a fields missing: everything falls back so live snapshots keep rendering", () => {
  const snapshot = normalizeKeyVariablesSnapshot(baseRow);
  assert.ok(snapshot);
  assert.equal(snapshot.sectionHeadline, null);

  const [retained] = snapshot.deepTreatment;
  assert.equal(retained.thesisRole, null);
  assert.equal(retained.leadMetricIndex, 0);
  assert.equal(retained.leadUnit, null);
  assert.equal(retained.guide, null);
  assert.deepEqual(retained.metricDirections, {
    "Annualized AI Revenue ($ Billion)": "higher_is_better",
  });

  const [orderBook] = snapshot.fullVariableList;
  assert.equal(orderBook.latest, null);
  assert.equal(orderBook.watchFor, null);
  assert.equal(orderBook.nextToPromote, false);
});

test("out-of-range or non-integer lead_metric_index clamps to 0; valid index sticks", () => {
  const withIndex = (lead_metric_index: unknown) => ({
    ...richRow,
    deep_treatment: {
      variables: [{ ...richRow.deep_treatment.variables[0], lead_metric_index }],
    },
  });
  for (const bad of [3, -1, 1.5, "two", null, undefined]) {
    const snapshot = normalizeKeyVariablesSnapshot(withIndex(bad));
    assert.ok(snapshot);
    assert.equal(snapshot.deepTreatment[0].leadMetricIndex, 0, `lead_metric_index=${String(bad)}`);
  }
  const ok = normalizeKeyVariablesSnapshot(withIndex(2));
  assert.ok(ok);
  assert.equal(ok.deepTreatment[0].leadMetricIndex, 2);
  // a string integer is accepted too
  const str = normalizeKeyVariablesSnapshot(withIndex("1"));
  assert.ok(str);
  assert.equal(str.deepTreatment[0].leadMetricIndex, 1);
});

test("a non-numeric guide value drops the whole guide; a guide without a label gets one", () => {
  const withGuide = (guide: unknown) => ({
    ...richRow,
    deep_treatment: {
      variables: [{ ...richRow.deep_treatment.variables[0], guide }],
    },
  });
  for (const bad of [{ value: "soon", label: "Guide" }, { label: "Guide 120" }, { value: NaN }, "120", null]) {
    const snapshot = normalizeKeyVariablesSnapshot(withGuide(bad));
    assert.ok(snapshot);
    assert.equal(snapshot.deepTreatment[0].guide, null, `guide=${JSON.stringify(bad)}`);
  }
  const unlabeled = normalizeKeyVariablesSnapshot(withGuide({ value: "120" }));
  assert.ok(unlabeled);
  assert.deepEqual(unlabeled.deepTreatment[0].guide, { value: 120, label: "Guide 120" });
});

test("a latest block without a value is dropped entirely", () => {
  const snapshot = normalizeKeyVariablesSnapshot({
    ...richRow,
    full_variable_list: {
      variables: [
        { variable: "Utilisation", why_flagged: "x", source_basis: "both", latest: { delta_label: "High" } },
      ],
    },
  });
  assert.ok(snapshot);
  assert.equal(snapshot.fullVariableList[0].latest, null);
});

test("the 7a preview fixture normalizes into the shape the section renders", async () => {
  const { keyVariablesPreview7a } = await import("./fixtures/key-variables-preview");
  const snapshot = normalizeKeyVariablesSnapshot(keyVariablesPreview7a);
  assert.ok(snapshot);
  assert.equal(snapshot.deepTreatment.length, 2);
  assert.equal(snapshot.deepTreatment[1].metricDirections?.["NWC (days)"], "lower_is_better");
  assert.equal(snapshot.deepTreatment[1].guide?.value, 120);
  const radar = snapshot.fullVariableList.filter(
    (item) => !snapshot.deepTreatment.some((deep) => deep.variable.toLowerCase() === item.variable.toLowerCase()),
  );
  assert.deepEqual(
    radar.map((item) => item.variable),
    ["Gross margin by build type", "Mysuru line utilisation", "Top-5 customer concentration"],
  );
  assert.equal(radar.filter((item) => item.nextToPromote).length, 1);
});

test("section_headline is read from details when the row has no top-level column", () => {
  const { section_headline, ...noColumn } = richRow;
  const snapshot = normalizeKeyVariablesSnapshot({
    ...noColumn,
    details: { section_headline: `  ${section_headline.trim()}  `, import_mode: "manual_json_overwrite" },
  });
  assert.ok(snapshot);
  assert.equal(snapshot.sectionHeadline, section_headline.trim());
  // a top-level value still wins over details
  const both = normalizeKeyVariablesSnapshot({ ...richRow, details: { section_headline: "from details" } });
  assert.ok(both);
  assert.equal(both.sectionHeadline, section_headline.trim());
  // neither → null
  const neither = normalizeKeyVariablesSnapshot({ ...noColumn, details: {} });
  assert.ok(neither);
  assert.equal(neither.sectionHeadline, null);
});
