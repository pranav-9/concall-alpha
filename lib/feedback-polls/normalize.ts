import {
  pollDefinitionSchema,
  type FeedbackPollRow,
  type NormalizedPoll,
  type PollDefinition,
} from "./types";

// Validates a raw poll row against pollDefinitionSchema and projects it onto
// the renderer-facing NormalizedPoll shape. Returns null when validation fails
// — callers (banner + admin) treat null as "no poll to render".
export function normalizePoll(row: FeedbackPollRow | null | undefined): NormalizedPoll | null {
  if (!row) return null;

  const parsed = pollDefinitionSchema.safeParse({
    id: row.id,
    slug: row.slug,
    question_text: row.question_text,
    question_type: row.question_type,
    options: row.options,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
  });

  if (!parsed.success) return null;

  return toNormalizedPoll(parsed.data);
}

function toNormalizedPoll(def: PollDefinition): NormalizedPoll {
  switch (def.question_type) {
    case "single_choice":
      return {
        id: def.id,
        slug: def.slug,
        questionText: def.question_text,
        questionType: "single_choice",
        options: { kind: "single_choice", entries: def.options.entries },
        startsAt: def.starts_at,
        endsAt: def.ends_at,
      };
    case "multi_select":
      return {
        id: def.id,
        slug: def.slug,
        questionText: def.question_text,
        questionType: "multi_select",
        options: {
          kind: "multi_select",
          entries: def.options.entries,
          maxSelections: def.options.max_selections,
        },
        startsAt: def.starts_at,
        endsAt: def.ends_at,
      };
    case "rating_1_5":
      return {
        id: def.id,
        slug: def.slug,
        questionText: def.question_text,
        questionType: "rating_1_5",
        options: { kind: "rating_1_5" },
        startsAt: def.starts_at,
        endsAt: def.ends_at,
      };
  }
}
