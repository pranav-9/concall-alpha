import "server-only";

// The tracker board's two reading columns, fetched for the companies scored
// this quarter: guidance moves (lib/guidance-snapshot/fleet-items, the same
// fleet read as the scanners) and key-variable YoY readings (one
// key_variables_snapshot read, batched). Each leg is its own unstable_cache
// entry and THROWS inside it, so a Supabase blip is never cached as "no
// signals"; getQuarterSignals catches each leg on its own, so the board still
// renders with an empty column when one read fails. Only the derived, compact
// result is cached — never the deep_treatment / guidance_items blobs.

import { unstable_cache } from "next/cache";

import type { ReportingQuarter } from "@/lib/current-quarter";
import { readFleetGuidance } from "@/lib/guidance-snapshot/fleet-items";
import { normalizeKeyVariablesSnapshot } from "@/lib/key-variables-snapshot/normalize";
import type { KeyVariablesSnapshotRow } from "@/lib/key-variables-snapshot/types";
import { logger } from "@/lib/logger";
import { createPublicReadClient } from "@/lib/supabase/public-read";

import {
  keyVariablesYoy,
  quarterGuidanceMoves,
  type KeyVariableYoy,
  type QuarterGuidance,
  type QuarterSignals,
} from "./signals";

const BATCH = 12;

const upper = (code: string | null | undefined) => (code ?? "").trim().toUpperCase();

const chunk = <T>(xs: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, (i + 1) * size));

async function fetchGuidanceMoves(
  target: ReportingQuarter,
  codes: string[],
): Promise<Record<string, QuarterGuidance>> {
  const fleet = await readFleetGuidance(codes);
  const out: Record<string, QuarterGuidance> = {};
  for (const [code, record] of fleet) {
    const moves = quarterGuidanceMoves(record.items, target, target);
    if (moves.raised || moves.lowered) out[code] = moves;
  }
  return out;
}

async function fetchKeyVariablesYoy(
  target: ReportingQuarter,
  codes: string[],
): Promise<Record<string, KeyVariableYoy[]>> {
  const supabase = createPublicReadClient();
  const batches = await Promise.all(
    chunk(codes, BATCH).map(async (batch) => {
      const { data, error } = await supabase
        .from("key_variables_snapshot")
        .select("company_code, generated_at, deep_treatment")
        .in("company_code", batch)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KeyVariablesSnapshotRow[];
    }),
  );
  const latest = new Map<string, KeyVariablesSnapshotRow>();
  for (const row of batches.flat()) {
    const code = upper(row.company_code);
    const seen = latest.get(code);
    if (code && (!seen || String(row.generated_at ?? "") > String(seen.generated_at ?? ""))) {
      latest.set(code, row);
    }
  }
  const out: Record<string, KeyVariableYoy[]> = {};
  for (const [code, row] of latest) {
    const readings = keyVariablesYoy(normalizeKeyVariablesSnapshot(row), target);
    if (readings.length > 0) out[code] = readings;
  }
  return out;
}

// The codes are part of the key on purpose: a newly scored company changes the
// list, so its row picks up its signals on the next render instead of waiting
// out the revalidate window. Bump the version when a cached shape changes.
const getCachedGuidanceMoves = unstable_cache(fetchGuidanceMoves, ["quarter-tracker-guidance-v1"], {
  revalidate: 600,
});
const getCachedKeyVariablesYoy = unstable_cache(fetchKeyVariablesYoy, ["quarter-tracker-kv-yoy-v1"], {
  revalidate: 600,
});

/** Upper-cased company code → its signals. A company with neither is absent. */
export async function getQuarterSignals(
  target: ReportingQuarter,
  scoredCodes: readonly string[],
): Promise<Map<string, QuarterSignals>> {
  const codes = [...new Set(scoredCodes.map(upper).filter(Boolean))].sort();
  if (codes.length === 0) return new Map();
  const [guidance, keyVariables] = await Promise.all([
    getCachedGuidanceMoves(target, codes).catch((error) => {
      logger.warn("quarter-tracker: guidance read failed", { error });
      return {} as Record<string, QuarterGuidance>;
    }),
    getCachedKeyVariablesYoy(target, codes).catch((error) => {
      logger.warn("quarter-tracker: key variables read failed", { error });
      return {} as Record<string, KeyVariableYoy[]>;
    }),
  ]);
  const out = new Map<string, QuarterSignals>();
  for (const code of codes) {
    const g = guidance[code] ?? null;
    const kv = keyVariables[code] ?? [];
    if (g || kv.length > 0) out.set(code, { guidance: g, keyVariables: kv });
  }
  return out;
}
