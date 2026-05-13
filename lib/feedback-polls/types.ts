import { z } from "zod";

// ---------------------------------------------------------------------------
// Database row shape
// ---------------------------------------------------------------------------

export type FeedbackPollRow = {
  id: string;
  slug: string;
  question_text: string;
  question_type: string;
  options: unknown;
  starts_at: string;
  ends_at: string | null;
  status?: string;
  created_at?: string;
};

export type FeedbackPollResponseRow = {
  id: string;
  poll_id: string;
  visitor_id: string;
  response_value: unknown;
  source_path: string | null;
  user_agent: string | null;
  submitted_at: string;
};

// ---------------------------------------------------------------------------
// Question type enum + display labels
// ---------------------------------------------------------------------------

export const QUESTION_TYPES = ["single_choice", "multi_select", "rating_1_5"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const POLL_STATUSES = ["draft", "live", "closed"] as const;
export type PollStatus = (typeof POLL_STATUSES)[number];

export const RATING_VALUES = [1, 2, 3, 4, 5] as const;
export type RatingValue = (typeof RATING_VALUES)[number];

// ---------------------------------------------------------------------------
// Poll option schema (used by single_choice and multi_select question types)
// ---------------------------------------------------------------------------

const optionEntrySchema = z.object({
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_-]+$/, "option key must be lowercase alphanumeric/_/-"),
  label: z.string().min(1).max(60),
});

const optionListSchema = z.array(optionEntrySchema).min(2).max(6);

const multiSelectOptionsSchema = z.object({
  entries: optionListSchema,
  max_selections: z.number().int().min(1).max(6),
});

const singleChoiceOptionsSchema = z.object({
  entries: optionListSchema,
});

// ---------------------------------------------------------------------------
// Poll definition schema (discriminated by question_type)
// ---------------------------------------------------------------------------

const baseDefinitionFields = {
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_-]+$/, "slug must be lowercase alphanumeric/_/-"),
  question_text: z.string().min(1).max(240),
  starts_at: z.string(),
  ends_at: z.string().nullable(),
};

export const pollDefinitionSchema = z.discriminatedUnion("question_type", [
  z.object({
    ...baseDefinitionFields,
    question_type: z.literal("single_choice"),
    options: singleChoiceOptionsSchema,
  }),
  z.object({
    ...baseDefinitionFields,
    question_type: z.literal("multi_select"),
    options: multiSelectOptionsSchema,
  }),
  z.object({
    ...baseDefinitionFields,
    question_type: z.literal("rating_1_5"),
    options: z.null().optional(),
  }),
]);

export type PollDefinition = z.infer<typeof pollDefinitionSchema>;

// ---------------------------------------------------------------------------
// Response value schema (discriminated by kind; the API layer additionally
// asserts that kind matches the active poll's question_type before insert).
// ---------------------------------------------------------------------------

export const responseValueSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("single_choice"),
    option_key: z
      .string()
      .min(1)
      .max(40)
      .regex(/^[a-z0-9_-]+$/),
  }),
  z.object({
    kind: z.literal("multi_select"),
    option_keys: z
      .array(
        z
          .string()
          .min(1)
          .max(40)
          .regex(/^[a-z0-9_-]+$/),
      )
      .min(1)
      .max(6),
  }),
  z.object({
    kind: z.literal("rating_1_5"),
    value: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
  }),
]);

export type ResponseValue = z.infer<typeof responseValueSchema>;

// Map a response's kind onto the poll's question_type. The API layer rejects
// any submission where this mapping fails.
export function responseKindMatchesQuestionType(
  responseKind: ResponseValue["kind"],
  questionType: QuestionType,
): boolean {
  return responseKind === questionType;
}

// Multi-select submissions must respect the poll's max_selections cap.
// Two helpers: one for the raw PollDefinition shape (admin path) and one for
// the NormalizedPoll display shape (banner-submission path) so callers don't
// have to re-shape the data.
export function multiSelectWithinCap(
  response: Extract<ResponseValue, { kind: "multi_select" }>,
  poll: Extract<PollDefinition, { question_type: "multi_select" }>,
): boolean {
  return response.option_keys.length <= poll.options.max_selections;
}

export function multiSelectWithinCapNormalized(
  response: Extract<ResponseValue, { kind: "multi_select" }>,
  options: Extract<NormalizedPoll["options"], { kind: "multi_select" }>,
): boolean {
  return response.option_keys.length <= options.maxSelections;
}

// ---------------------------------------------------------------------------
// POST /api/feedback-polls/respond payload
// ---------------------------------------------------------------------------

export const responsePayloadSchema = z.object({
  poll_id: z.string().uuid(),
  response_value: responseValueSchema,
  source_path: z.string().nullable().optional(),
});

export type ResponsePayload = z.infer<typeof responsePayloadSchema>;

// ---------------------------------------------------------------------------
// Admin POST /api/admin/feedback-polls — create or update a poll definition.
// ---------------------------------------------------------------------------

const adminWriteBase = {
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_-]+$/),
  question_text: z.string().min(1).max(240),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().nullable(),
  status: z.enum(POLL_STATUSES),
};

export const adminPollWriteSchema = z.discriminatedUnion("question_type", [
  z.object({
    ...adminWriteBase,
    question_type: z.literal("single_choice"),
    options: singleChoiceOptionsSchema,
  }),
  z.object({
    ...adminWriteBase,
    question_type: z.literal("multi_select"),
    options: multiSelectOptionsSchema,
  }),
  z.object({
    ...adminWriteBase,
    question_type: z.literal("rating_1_5"),
    options: z.null().optional(),
  }),
]);

export type AdminPollWrite = z.infer<typeof adminPollWriteSchema>;

// ---------------------------------------------------------------------------
// Normalized display shape — what banner + admin view consume.
// ---------------------------------------------------------------------------

export type NormalizedPoll = {
  id: string;
  slug: string;
  questionText: string;
  questionType: QuestionType;
  options:
    | { kind: "single_choice"; entries: Array<{ key: string; label: string }> }
    | {
        kind: "multi_select";
        entries: Array<{ key: string; label: string }>;
        maxSelections: number;
      }
    | { kind: "rating_1_5" };
  startsAt: string;
  endsAt: string | null;
};

// Aggregate shape returned by the SQL function aggregate_feedback_poll_responses.
export type PollAggregate = {
  total_responses: number;
  question_type: QuestionType | null;
  counts: Record<string, number>;
  mean?: number | null;
};

// ---------------------------------------------------------------------------
// Dismiss snooze constants (used by the banner client component).
// ---------------------------------------------------------------------------

export const DISMISS_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export const STORAGE_KEY_LAST_DISMISS = "feedback-poll:last-dismiss";
export const storageKeyResponded = (pollId: string) =>
  `feedback-poll:responded:${pollId}`;

// Pure function: returns true if a stored dismiss timestamp still falls within
// the snooze window. Used in tests and at banner mount.
export function isDismissActive(
  storedTimestampMs: number | null,
  nowMs: number,
): boolean {
  if (storedTimestampMs === null) return false;
  if (!Number.isFinite(storedTimestampMs)) return false;
  return nowMs - storedTimestampMs < DISMISS_SNOOZE_MS;
}
