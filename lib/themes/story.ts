// Theme stories: the editorial "driving factor + KPI tiles" behind a Hot Theme
// (schema /schemas/theme_story_v1.json). They live in data/themes/stories.json,
// not in Supabase — a sourced macro figure changes rarely and should be reviewed
// in a diff. The Zod schema below is the frontend's mirror of the JSON schema:
// it must accept what the schema accepts and reject what it rejects.
//
// Also home to the "since" derivation: a theme's SINCE quarter is the earliest
// `as_of_quarter` on its memberships — no editorial field, nothing to maintain.

import { z } from "zod";

import storiesJson from "@/data/themes/stories.json";

const PERIOD_RE = /^(CY|FY)\d{2}(\d{2})?$/;

export const themeStoryPointSchema = z.object({
  period: z.string().regex(PERIOD_RE),
  value: z.number(),
  est: z.boolean().optional(),
});

export const themeStorySourceSchema = z.object({
  company_code: z.string().min(1).max(50).optional(),
  quarter: z.string().regex(/^Q[1-4] ?FY\d{2}$/).optional(),
  document: z.enum(["concall", "deck", "broker_note", "press_release", "annual_report"]).optional(),
  note: z.string().min(8).max(240),
});

export const themeStoryKpiSchema = z
  .object({
    label: z.string().min(3).max(32),
    value: z.string().min(1).max(20),
    sub: z.string().max(48).optional(),
    series: z.array(themeStoryPointSchema).min(2).max(12).optional(),
    source: themeStorySourceSchema,
  })
  .superRefine((kpi, ctx) => {
    // Estimates must trail the actuals: the sparkline draws actuals solid up to
    // the last real point, then dashed — an estimate before an actual has no
    // honest rendering.
    const series = kpi.series ?? [];
    let seenEst = false;
    for (const p of series) {
      if (p.est) seenEst = true;
      else if (seenEst) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "an actual point follows an estimate", path: ["series"] });
        return;
      }
    }
  });

export const themeStorySchema = z.object({
  schema_version: z.literal("theme_story_v1"),
  theme_slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  driver: z.object({
    kind: z.enum(["capex", "policy", "demand", "supply", "pricing"]),
    title: z.string().min(3).max(40),
    line: z.string().min(10).max(160),
  }),
  kpis: z.array(themeStoryKpiSchema).min(1).max(3),
});

export type ThemeStory = z.infer<typeof themeStorySchema>;
export type ThemeStoryKpi = z.infer<typeof themeStoryKpiSchema>;
export type ThemeStoryPoint = z.infer<typeof themeStoryPointSchema>;

export const DRIVER_KIND_LABEL: Record<ThemeStory["driver"]["kind"], string> = {
  capex: "Capex",
  policy: "Policy",
  demand: "Demand",
  supply: "Supply",
  pricing: "Pricing",
};

/**
 * Parse the stories file into a slug-keyed map. Invalid entries are dropped
 * (with the reason on `errors`) rather than failing the page: a bad story means
 * a card without tiles, never a missing theme.
 */
export function parseThemeStories(raw: unknown): { stories: Map<string, ThemeStory>; errors: string[] } {
  const stories = new Map<string, ThemeStory>();
  const errors: string[] = [];
  const list = (raw as { stories?: unknown })?.stories;
  if (!Array.isArray(list)) return { stories, errors: ["stories.json: no `stories` array"] };
  for (const entry of list) {
    const parsed = themeStorySchema.safeParse(entry);
    if (!parsed.success) {
      const slug = typeof (entry as { theme_slug?: unknown })?.theme_slug === "string" ? (entry as { theme_slug: string }).theme_slug : "?";
      errors.push(`${slug}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      continue;
    }
    if (stories.has(parsed.data.theme_slug)) {
      errors.push(`${parsed.data.theme_slug}: duplicate story`);
      continue;
    }
    stories.set(parsed.data.theme_slug, parsed.data);
  }
  return { stories, errors };
}

let cached: Map<string, ThemeStory> | null = null;

/** The bundled stories, validated once per process. */
export function getThemeStories(): Map<string, ThemeStory> {
  if (cached) return cached;
  const { stories, errors } = parseThemeStories(storiesJson);
  if (errors.length && process.env.NODE_ENV !== "production") {
    console.warn(`[themes] ${errors.length} story entr${errors.length === 1 ? "y" : "ies"} dropped: ${errors.join(" | ")}`);
  }
  cached = stories;
  return cached;
}

// --- SINCE quarter ------------------------------------------------------------

/** "Q1FY27" / "Q1 FY27" → { fy: 2027, qtr: 1 }; anything else → null. */
export function parseQuarterLabel(label: string | null | undefined): { fy: number; qtr: number } | null {
  if (!label) return null;
  const m = /^Q([1-4])\s?FY(\d{2})$/i.exec(label.trim());
  if (!m) return null;
  return { fy: 2000 + Number(m[2]), qtr: Number(m[1]) };
}

/** The earliest quarter among the labels, printed as "Q3 FY26"; null when none parse. */
export function earliestQuarterLabel(labels: readonly (string | null | undefined)[]): string | null {
  let best: { fy: number; qtr: number } | null = null;
  for (const label of labels) {
    const q = parseQuarterLabel(label);
    if (!q) continue;
    if (!best || q.fy < best.fy || (q.fy === best.fy && q.qtr < best.qtr)) best = q;
  }
  return best ? `Q${best.qtr} FY${String(best.fy - 2000).padStart(2, "0")}` : null;
}
