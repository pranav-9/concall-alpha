import { z } from "zod";

/**
 * Frontend validation gate for the `price_phases` row (the Price journey block).
 * Mirrors /schemas/price_phases_v1.json (the structural authority) — accept what it
 * accepts, reject what it rejects. If one changes, change both.
 *
 * Produced by concallyser/scripts/price_phases.py: Screener's weekly price and
 * trailing P/E, split into phases automatically, each move split exactly as
 * EPS × P/E. Nothing in it is hand-written.
 */

export type PricePhasesRow = {
  company_code: string;
  schema_version?: string | null;
  as_of?: string | null;
  generated_at?: string | null;
  payload?: unknown;
  updated_at?: string | null;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ratio = z.number().positive().nullable();
const kind = z.enum(["up", "down", "side"]);
const driver = z.enum(["EARNINGS", "MULTIPLE"]).nullable();

const changeSchema = z
  .object({
    metric: z.enum(["Net profit", "Sales", "OPM", "ROCE", "Borrowings", "Working capital days"]),
    from: z.number(),
    to: z.number(),
    unit: z.enum(["cr", "pct", "days"]),
    score: z.number().min(0),
  })
  .strict();

export const phaseSchema = z
  .object({
    start: isoDate,
    end: isoDate,
    kind,
    price_ratio: z.number().positive(),
    years: z.number().min(0),
    rate: z.string(),
    eps_ratio: ratio,
    pe_ratio: ratio,
    driver,
    split_missing: z.enum(["no_pe", "near_zero_eps", "stale_eps"]).nullable(),
    what_changed: z
      .object({
        fy_from: z.string(),
        fy_to: z.string(),
        items: z.array(changeSchema).max(3),
        text: z.string().nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const pivotSchema = z
  .object({
    date: isoDate,
    price: z.number().positive(),
    pe: z.number().positive().nullable(),
    eps: z.number().positive().nullable(),
    pe_source: z.enum(["screener", "derived"]).nullable(),
  })
  .strict();

export const pricePhasesSchema = z
  .object({
    schema_version: z.literal("price_phases_v1"),
    company_code: z.string().min(1).max(50),
    basis: z.enum(["consolidated", "standalone"]),
    as_of: isoDate,
    source: z
      .object({
        provider: z.literal("screener"),
        chart_url: z.string().nullable(),
        fetched_at: z.string().nullable(),
        method: z.literal("auto_segmentation_v1"),
        computed_at: z.string(),
        params: z.record(z.string(), z.unknown()),
      })
      .strict(),
    series: z.array(z.tuple([isoDate, z.number().positive()])).min(2),
    pivots: z.array(pivotSchema).min(2).max(9),
    phases: z.array(phaseSchema).min(1).max(8),
    summary: z
      .object({
        current_kind: kind.nullable(),
        current_driver: driver,
        current_since: isoDate.nullable(),
        window_start: isoDate,
        price_ratio: z.number().positive(),
        eps_ratio: ratio,
        pe_ratio: ratio,
      })
      .strict(),
  })
  .strict();

export type PricePhasesV1 = z.infer<typeof pricePhasesSchema>;
export type PricePhase = PricePhasesV1["phases"][number];
export type PricePivot = PricePhasesV1["pivots"][number];
export type PhaseKind = z.infer<typeof kind>;

export function parsePricePhasesPayload(
  payload: unknown,
): { ok: true; data: PricePhasesV1 } | { ok: false; error: string } {
  const parsed = pricePhasesSchema.safeParse(payload);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  return { ok: false, error: `${issue?.path.join(".") || "<root>"}: ${issue?.message ?? "invalid"}` };
}
