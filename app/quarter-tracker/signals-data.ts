import "server-only";

// The tracker board's two reading columns, for the companies scored this
// quarter: guidance moves (lib/guidance-snapshot/fleet-items, the same fleet
// read as the scanners) and key-variable YoY readings (one
// key_variables_snapshot read, batched). The scored codes are read INSIDE the
// cached fetch, so the read stays at the ~157 that reported (not all ~231 in
// coverage: ~9.4MB of guidance_items a refresh at full width) while the key
// stays stable.
//
// Each leg is its own unstable_cache entry keyed on the quarter alone, so once
// warm a reader is always served the cached copy while it refreshes in the
// background — a key built from the scored codes changed with every new score
// and made the next reader wait ~3s for a cold fleet read (2026-11-06 review).
// The backoff (lib/read-backoff.ts) sits INSIDE the cache: it gates only the
// database read, so a failed background refresh of a stale entry also trips
// it, and a cache hit is never refused. One read per leg and quarter is in
// flight per server instance at a time; concurrent renders share it. A render
// waits at most READ_DEADLINE_MS, but the read itself runs on (kept alive past
// the response by after()) so its cache write still lands. A failed read
// THROWS inside the cache (never cached as "no signals"); getQuarterSignals
// reports each leg's availability, so the page can say "couldn't be read"
// instead of claiming that nobody moved guidance. Only the derived, compact
// result is cached — never the deep_treatment / guidance_items blobs.

import { unstable_cache } from "next/cache";
import { after } from "next/server";

import type { ReportingQuarter } from "@/lib/current-quarter";
import { readFleetGuidance } from "@/lib/guidance-snapshot/fleet-items";
import { normalizeKeyVariablesSnapshot } from "@/lib/key-variables-snapshot/normalize";
import type { KeyVariablesSnapshotRow } from "@/lib/key-variables-snapshot/types";
import { logger } from "@/lib/logger";
import { withBackoff } from "@/lib/read-backoff";
import { createPublicReadClient } from "@/lib/supabase/public-read";

import {
  keyVariablesYoy,
  quarterGuidanceMoves,
  type KeyVariableYoy,
  type QuarterGuidance,
  type QuarterSignals,
} from "./signals";

const BATCH = 12;

/** A cold fleet read takes ~3s; past this the render goes on without that column. */
export const READ_DEADLINE_MS = 8_000;

const upper = (code: string | null | undefined) => (code ?? "").trim().toUpperCase();

const chunk = <T>(xs: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, (i + 1) * size));

/** Companies scored this quarter (legacy-logic rows hidden portal-wide, as everywhere). */
async function readScoredCodes(target: ReportingQuarter): Promise<string[]> {
  const { data, error } = await createPublicReadClient()
    .from("concall_analysis")
    .select("company_code")
    .eq("fy", target.fy)
    .eq("qtr", target.qtr)
    .not("details->scoring_meta", "is", null);
  if (error) throw error;
  return [
    ...new Set((data ?? []).map((row: { company_code: string | null }) => upper(row.company_code)).filter(Boolean)),
  ].sort();
}

async function fetchGuidanceMoves(target: ReportingQuarter): Promise<Record<string, QuarterGuidance>> {
  const fleet = await readFleetGuidance(await readScoredCodes(target));
  const out: Record<string, QuarterGuidance> = {};
  for (const [code, record] of fleet) {
    const moves = quarterGuidanceMoves(record.items, target, target);
    if (moves.raised || moves.lowered) out[code] = moves;
  }
  return out;
}

async function fetchKeyVariablesYoy(target: ReportingQuarter): Promise<Record<string, KeyVariableYoy[]>> {
  const supabase = createPublicReadClient();
  const codes = await readScoredCodes(target);
  const batches = await Promise.all(
    chunk(codes, BATCH).map(async (batch) => {
      const { data, error } = await supabase
        .from("key_variables_snapshot")
        // Only the variables array (as the order-book scanner reads it), not
        // the whole deep_treatment blob; the normalizer takes a bare array.
        .select("company_code, generated_at, deep_treatment:deep_treatment->variables")
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

// The backoff wraps the fetcher, inside the cache. The wrapper's source is the
// same for every use, so the key parts carry the identity: bump the version by
// hand whenever a fetcher or its cached shape changes.
const cachedGuidanceMoves = unstable_cache(
  withBackoff("quarter-tracker: guidance", fetchGuidanceMoves),
  ["quarter-tracker-guidance-v4"],
  { revalidate: 600 },
);
const cachedKeyVariablesYoy = unstable_cache(
  withBackoff("quarter-tracker: key variables", fetchKeyVariablesYoy),
  ["quarter-tracker-kv-yoy-v4"],
  { revalidate: 600 },
);

// One read per leg and quarter in flight on this instance; concurrent renders
// share it instead of each starting a ~20-statement fleet read.
const inFlight = new Map<string, Promise<unknown>>();
function shared<T>(key: string, read: () => Promise<T>): Promise<T> {
  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const started = read().finally(() => inFlight.delete(key));
  inFlight.set(key, started);
  return started;
}

/** The read's value, or null when it failed, is backing off, or missed the deadline. */
async function settle<T>(label: string, read: Promise<T>): Promise<T | null> {
  // Past the deadline the render moves on; after() keeps the read (and the
  // cache write it ends in) alive past the response.
  after(() => read.then(
    () => undefined,
    () => undefined,
  ));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      logger.warn(`quarter-tracker: ${label} read missed the ${READ_DEADLINE_MS}ms deadline`);
      resolve(null);
    }, READ_DEADLINE_MS);
  });
  try {
    return await Promise.race([read, deadline]);
  } catch (error) {
    logger.warn(`quarter-tracker: ${label} read failed`, { error });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type QuarterSignalsRead = {
  /** Upper-cased company code → its signals. A company with neither is absent. */
  byCode: Map<string, QuarterSignals>;
  /** False when the guidance read failed: the Raised / Lowered filters can't run. */
  guidanceAvailable: boolean;
  keyVariablesAvailable: boolean;
};

export async function getQuarterSignals(target: ReportingQuarter): Promise<QuarterSignalsRead> {
  const quarter = `${target.fy}-${target.qtr}`;
  const [guidance, keyVariables] = await Promise.all([
    settle("guidance", shared(`guidance:${quarter}`, () => cachedGuidanceMoves(target))),
    settle("key variables", shared(`kv:${quarter}`, () => cachedKeyVariablesYoy(target))),
  ]);
  const byCode = new Map<string, QuarterSignals>();
  for (const code of new Set([...Object.keys(guidance ?? {}), ...Object.keys(keyVariables ?? {})])) {
    byCode.set(code, { guidance: guidance?.[code] ?? null, keyVariables: keyVariables?.[code] ?? [] });
  }
  return { byCode, guidanceAvailable: guidance != null, keyVariablesAvailable: keyVariables != null };
}
