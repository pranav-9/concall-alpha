import { z } from "zod";

// Mirror concallyser/schemas/business_profile.schema.json. Optional additions
// are validated independently so malformed new data never hides a legacy About.
const text = (max: number) => z.string().min(1).max(max).regex(/\S/);
export const profileSourceSchema = z.object({
  label: text(160),
  url: z.string().regex(/^https?:\/\/[^\s/?#]+[^\s]*$/),
  locator: z.string().max(80).nullable().optional(),
}).strict();
const sources = z.array(profileSourceSchema).min(1).max(4);
export const companyMilestoneSchema = z.object({
  year: z.number().int().min(1000).max(2100),
  title: text(120),
  detail: z.string().max(400).nullable().optional(),
  sources,
}).strict();
export const factMetricSchema = z.object({
  label: text(40),
  value: z.number().min(0),
  unit: text(24),
}).strict();
export const businessFactSchema = z.object({
  category: z.enum(["customers", "geography", "footprint", "capabilities", "expansion", "business_model"]),
  title: text(80),
  text: text(700),
  period: text(60),
  sources,
  // Optional structured numeric breakdown backing the prose (e.g. customer-
  // concentration bands, manufacturing line counts, an order-book coverage
  // ratio). Omitted entirely for a narrative-only fact, never an empty array.
  metrics: z.array(factMetricSchema).min(1).max(6).optional(),
}).strict();
// The change's headline number, shown large beside its text. `value` is the
// figure as displayed (sign included), so it can't carry prose; the change's own
// `period` is appended to `label` at render time. [0-9], not \d: the pipeline's
// JSON-schema and pydantic copies of this pattern read \d as any Unicode digit.
export const changeStatSchema = z.object({
  value: z.string().regex(/^[+-]?[0-9]{1,4}(\.[0-9]{1,2})?$/),
  unit: z.enum(["pts", "%", "x", "bps"]).nullable().optional(),
  label: text(48),
}).strict();
export const businessChangeSchema = z.object({
  headline: text(160),
  text: text(700),
  period: text(60),
  sources,
  stat: changeStatSchema.nullable().optional(),
}).strict();
export const businessProfileSchema = z.object({
  business_intro: text(600).nullable().optional(),
  company_timeline: z.array(companyMilestoneSchema).max(6).optional(),
  business_facts: z.array(businessFactSchema).max(8).optional(),
  what_changed: businessChangeSchema.nullable().optional(),
}).strict();

export type ProfileSource = z.infer<typeof profileSourceSchema>;
export type CompanyMilestone = z.infer<typeof companyMilestoneSchema>;
export type FactMetric = z.infer<typeof factMetricSchema>;
export type BusinessFact = z.infer<typeof businessFactSchema>;
export type BusinessChange = z.infer<typeof businessChangeSchema>;
export type ChangeStat = z.infer<typeof changeStatSchema>;

// `stat` only decorates the change. A malformed one is dropped on its own, so it
// can't take the change's headline, text and citations down with it.
function withoutMalformedStat(change: unknown): { change: unknown; dropped: boolean } {
  if (typeof change !== "object" || change === null || Array.isArray(change) || !("stat" in change)) {
    return { change, dropped: false };
  }
  const { stat, ...rest } = change as Record<string, unknown>;
  if (stat === null || stat === undefined || changeStatSchema.safeParse(stat).success) {
    return { change, dropped: false };
  }
  return { change: rest, dropped: true };
}

export function normalizeBusinessProfile(source: Record<string, unknown> | null) {
  let hasInvalidProfile = false;
  function parse<T>(schema: z.ZodType<T>, value: unknown): T | null {
    if (value === undefined) return null;
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    hasInvalidProfile = true;
    return null;
  }
  const intro = parse(businessProfileSchema.shape.business_intro, source?.business_intro) ?? null;
  const timeline = parse(businessProfileSchema.shape.company_timeline, source?.company_timeline) ?? [];
  const facts = parse(businessProfileSchema.shape.business_facts, source?.business_facts) ?? [];
  const { change: changeSource, dropped: statDropped } = withoutMalformedStat(source?.what_changed);
  const change = parse(businessProfileSchema.shape.what_changed, changeSource) ?? null;
  if (statDropped) hasInvalidProfile = true;
  return {
    intro,
    timeline: [...timeline].sort((a, b) => a.year - b.year),
    facts,
    change,
    hasInvalidProfile,
  };
}
