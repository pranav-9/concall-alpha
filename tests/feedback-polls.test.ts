import assert from "node:assert/strict";

import {
  DISMISS_SNOOZE_MS,
  adminPollWriteSchema,
  isDismissActive,
  multiSelectWithinCap,
  pollDefinitionSchema,
  responseKindMatchesQuestionType,
  responseValueSchema,
} from "../lib/feedback-polls/types";

let pass = 0;
let fail = 0;

function it(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    fail += 1;
    console.error(`  FAIL ${name}`);
    console.error("    ", err instanceof Error ? err.message : err);
  }
}

// ---------------------------------------------------------------------------
// pollDefinitionSchema
// ---------------------------------------------------------------------------

console.log("pollDefinitionSchema");

it("accepts a valid single_choice poll definition", () => {
  const result = pollDefinitionSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111",
    slug: "first-impression",
    question_text: "Which section was most useful?",
    question_type: "single_choice",
    options: {
      entries: [
        { key: "moat", label: "Moat analysis" },
        { key: "snapshot", label: "Business snapshot" },
      ],
    },
    starts_at: "2026-05-13T00:00:00Z",
    ends_at: null,
  });
  assert.equal(result.success, true);
});

it("rejects single_choice with fewer than 2 options", () => {
  const result = pollDefinitionSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111",
    slug: "too-few",
    question_text: "?",
    question_type: "single_choice",
    options: { entries: [{ key: "only", label: "Only" }] },
    starts_at: "2026-05-13T00:00:00Z",
    ends_at: null,
  });
  assert.equal(result.success, false);
});

it("accepts a valid multi_select poll with max_selections", () => {
  const result = pollDefinitionSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111",
    slug: "pick-two",
    question_text: "Pick up to 2",
    question_type: "multi_select",
    options: {
      entries: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
        { key: "c", label: "C" },
      ],
      max_selections: 2,
    },
    starts_at: "2026-05-13T00:00:00Z",
    ends_at: null,
  });
  assert.equal(result.success, true);
});

it("rejects multi_select missing max_selections", () => {
  const result = pollDefinitionSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111",
    slug: "missing-max",
    question_text: "Pick some",
    question_type: "multi_select",
    options: { entries: [{ key: "a", label: "A" }, { key: "b", label: "B" }] },
    starts_at: "2026-05-13T00:00:00Z",
    ends_at: null,
  });
  assert.equal(result.success, false);
});

it("accepts rating_1_5 without options", () => {
  const result = pollDefinitionSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111",
    slug: "rate-moat",
    question_text: "Rate moat coverage",
    question_type: "rating_1_5",
    options: null,
    starts_at: "2026-05-13T00:00:00Z",
    ends_at: null,
  });
  assert.equal(result.success, true);
});

it("rejects unknown question_type", () => {
  const result = pollDefinitionSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111",
    slug: "bad",
    question_text: "?",
    question_type: "open_text",
    options: null,
    starts_at: "2026-05-13T00:00:00Z",
    ends_at: null,
  });
  assert.equal(result.success, false);
});

it("rejects option key with disallowed characters", () => {
  const result = pollDefinitionSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111",
    slug: "bad-keys",
    question_text: "?",
    question_type: "single_choice",
    options: {
      entries: [
        { key: "Bad Key!", label: "X" },
        { key: "ok", label: "Y" },
      ],
    },
    starts_at: "2026-05-13T00:00:00Z",
    ends_at: null,
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// responseValueSchema
// ---------------------------------------------------------------------------

console.log("responseValueSchema");

it("accepts a single_choice response", () => {
  const result = responseValueSchema.safeParse({
    kind: "single_choice",
    option_key: "moat",
  });
  assert.equal(result.success, true);
});

it("accepts a multi_select response with array of keys", () => {
  const result = responseValueSchema.safeParse({
    kind: "multi_select",
    option_keys: ["a", "b"],
  });
  assert.equal(result.success, true);
});

it("rejects multi_select with empty array", () => {
  const result = responseValueSchema.safeParse({
    kind: "multi_select",
    option_keys: [],
  });
  assert.equal(result.success, false);
});

it("accepts a rating value within 1-5", () => {
  for (const value of [1, 2, 3, 4, 5] as const) {
    const result = responseValueSchema.safeParse({ kind: "rating_1_5", value });
    assert.equal(result.success, true, `value ${value} should parse`);
  }
});

it("rejects rating value outside 1-5", () => {
  for (const value of [0, 6, -1, 3.5]) {
    const result = responseValueSchema.safeParse({ kind: "rating_1_5", value });
    assert.equal(result.success, false, `value ${value} should not parse`);
  }
});

it("rejects unknown kind", () => {
  const result = responseValueSchema.safeParse({
    kind: "freeform",
    text: "anything",
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// kind / question_type matching
// ---------------------------------------------------------------------------

console.log("responseKindMatchesQuestionType");

it("matches when kind equals question_type", () => {
  assert.equal(
    responseKindMatchesQuestionType("single_choice", "single_choice"),
    true,
  );
  assert.equal(
    responseKindMatchesQuestionType("multi_select", "multi_select"),
    true,
  );
  assert.equal(
    responseKindMatchesQuestionType("rating_1_5", "rating_1_5"),
    true,
  );
});

it("rejects when kind does not match question_type", () => {
  assert.equal(
    responseKindMatchesQuestionType("single_choice", "multi_select"),
    false,
  );
  assert.equal(
    responseKindMatchesQuestionType("rating_1_5", "single_choice"),
    false,
  );
});

// ---------------------------------------------------------------------------
// multiSelectWithinCap
// ---------------------------------------------------------------------------

console.log("multiSelectWithinCap");

it("accepts selections within the cap", () => {
  const poll = {
    question_type: "multi_select" as const,
    options: {
      entries: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
        { key: "c", label: "C" },
      ],
      max_selections: 2,
    },
  };
  assert.equal(
    multiSelectWithinCap(
      { kind: "multi_select", option_keys: ["a", "b"] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      poll as any,
    ),
    true,
  );
});

it("rejects selections exceeding the cap", () => {
  const poll = {
    question_type: "multi_select" as const,
    options: {
      entries: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
        { key: "c", label: "C" },
      ],
      max_selections: 2,
    },
  };
  assert.equal(
    multiSelectWithinCap(
      { kind: "multi_select", option_keys: ["a", "b", "c"] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      poll as any,
    ),
    false,
  );
});

// ---------------------------------------------------------------------------
// isDismissActive — cross-poll snooze pure function
// ---------------------------------------------------------------------------

console.log("isDismissActive");

it("returns false when no dismiss timestamp is stored", () => {
  assert.equal(isDismissActive(null, Date.now()), false);
});

it("returns true within the 7-day window", () => {
  const now = 1_700_000_000_000;
  const dismissedAt = now - DISMISS_SNOOZE_MS + 60_000;
  assert.equal(isDismissActive(dismissedAt, now), true);
});

it("returns false once the window has elapsed", () => {
  const now = 1_700_000_000_000;
  const dismissedAt = now - DISMISS_SNOOZE_MS - 1;
  assert.equal(isDismissActive(dismissedAt, now), false);
});

it("returns false for non-finite stored values", () => {
  const now = 1_700_000_000_000;
  assert.equal(isDismissActive(NaN, now), false);
  assert.equal(isDismissActive(Infinity, now), false);
});

// ---------------------------------------------------------------------------
// adminPollWriteSchema spot checks
// ---------------------------------------------------------------------------

console.log("adminPollWriteSchema");

it("accepts a draft single_choice payload", () => {
  const result = adminPollWriteSchema.safeParse({
    slug: "draft-poll",
    question_text: "Hi",
    question_type: "single_choice",
    options: {
      entries: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ],
    },
    starts_at: "2026-05-13T00:00:00.000Z",
    ends_at: null,
    status: "draft",
  });
  assert.equal(result.success, true);
});

it("rejects invalid status", () => {
  const result = adminPollWriteSchema.safeParse({
    slug: "bad-status",
    question_text: "Hi",
    question_type: "rating_1_5",
    options: null,
    starts_at: "2026-05-13T00:00:00.000Z",
    ends_at: null,
    status: "archived",
  });
  assert.equal(result.success, false);
});

// ---------------------------------------------------------------------------
// summary
// ---------------------------------------------------------------------------

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
