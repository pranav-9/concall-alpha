import { z } from "zod";

// ---------------------------------------------------------------------------
// Announcement story read — one material exchange filing read against the
// company's own story and guidance. One row per announcement_id in
// announcement_story_read; `payload` mirrors
// ../../../schemas/announcement_story_read_v1.json, produced by
// concallyser/scripts/judge_announcements.py. The zod schema below is the
// runtime validator AND the TypeScript source of truth — derived from the JSON
// schema, never from a stored row.
//
// The /announcements page's opening block ("What moved a story this week") is
// not stored anywhere: lib/announcement-story-read/select.ts sorts the last
// seven days of these reads at load time.
// ---------------------------------------------------------------------------

export type AnnouncementStoryReadRow = {
  announcement_id: string;
  score?: number | null;
  payload: unknown;
};

export const STORY_EFFECTS = ["confirms", "extends", "reshapes", "cuts_against", "none"] as const;
export type StoryEffect = (typeof STORY_EFFECTS)[number];

/**
 * Chip per story effect. The chip says what the filing does to the company's
 * story, never to the stock — so no green/red verdict: three share one quiet
 * outline, and only "cuts against" takes the warn ink (the same asymmetry as the
 * desk's risk flag). `none` renders no chip.
 */
export const STORY_EFFECT_META: Record<
  Exclude<StoryEffect, "none">,
  { label: string; title: string; className: string }
> = {
  confirms: {
    label: "Confirms",
    title: "Direct progress on what the company's story already rests on",
    className: "border-[var(--rule)] text-[var(--ink)]",
  },
  extends: {
    label: "Extends",
    title: "The same story, taken further or for longer",
    className: "border-[var(--rule)] text-[var(--ink)]",
  },
  reshapes: {
    label: "Reshapes",
    title: "Changes the business mix or what the story rests on",
    className: "border-[var(--ink-soft)] text-[var(--ink)]",
  },
  cuts_against: {
    label: "Cuts against",
    title: "Runs behind, delays or contradicts a stated guide or milestone",
    className: "border-[color-mix(in_srgb,var(--warn)_55%,transparent)] text-[var(--warn)]",
  },
};

export const CHECK_KEYS = [
  "stated_item",
  "central_to_story",
  "advances_or_secures",
  "behind_stated_pace",
  "beyond_run_rate",
  "changes_mix_or_engine",
  "durable",
  "adverse",
] as const;

export const ChecksSchema = z
  .object({
    stated_item: z.boolean(),
    central_to_story: z.boolean(),
    advances_or_secures: z.boolean(),
    behind_stated_pace: z.boolean(),
    beyond_run_rate: z.boolean(),
    changes_mix_or_engine: z.boolean(),
    durable: z.boolean(),
    adverse: z.boolean(),
  })
  .strict();

export const AnchorSchema = z
  .object({
    kind: z.enum(["story", "guidance", "fact", "business"]),
    source: z.string().min(1).max(60),
    text: z.string().min(12).max(240),
  })
  .strict();

export const AnnouncementStoryReadSchema = z
  .object({
    announcement_id: z.string().min(1),
    company_code: z.string().min(1),
    filed_at: z.string().min(1),
    generated_at: z.string().min(1),
    model: z.string(),
    prompt_version: z.string().min(1),
    checks: ChecksSchema,
    score: z.number().int().min(0).max(11),
    story_effect: z.enum(STORY_EFFECTS),
    what: z.string().min(20).max(300),
    changes: z.string().min(20).max(340),
    anchor: AnchorSchema.nullable(),
    pdf_read: z.boolean(),
  })
  .strict();

export type AnnouncementStoryRead = z.infer<typeof AnnouncementStoryReadSchema>;
export type StoryReadAnchor = z.infer<typeof AnchorSchema>;
