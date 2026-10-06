import "server-only";

// Server fetch for /scanners: one cached read per scan, over EVERY company,
// each row stamped `listed` (lib/coverage-policy). The page scans the
// discovery-listed ones by default — a scanner is a discovery surface — and,
// with the watchlist filter on, the reader's watchlist companies whether
// listed or not (watchlists are user-owned and unfiltered). A failed read
// THROWS, so unstable_cache never stores an empty scan from a Supabase blip;
// the page catches each scan on its own and shows that one as unavailable. Valuation freshness is judged at render time
// in buildPegScan, because it is the price underneath a row that ages, not the row.

import { unstable_cache } from "next/cache";

import { parseCompanyQualityPayload } from "@/lib/company-quality/types";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import type { GuidanceSnapshotRow } from "@/lib/guidance-snapshot/types";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import { COVERAGE_SELECT, isDiscoveryListed, type CoverageFields } from "@/lib/coverage-policy";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import { derivePeg } from "@/lib/valuation-check/normalize";
import type { ValuationCheckRow } from "@/lib/valuation-check/types";

import { buildGuidanceUpgradeRow, type GuidanceUpgradeRow } from "./guidance-upgrades";
import type { PegRow } from "./peg";
import { buildRedFlagRow, type RedFlagRow, type ScanCompany } from "./red-flags";

type CompanyRow = CoverageFields & { code: string | null; name: string | null; sector: string | null };

// Only the PEG inputs — the full valuation_check row carries the whole reverse
// DCF and Screener dump, which the scan never reads.
const VALUATION_SELECT = [
  "company_code",
  "priced_as_of",
  "price_at_run",
  "pe:relative_valuation->pe",
  "phase5_scenarios:reverse_dcf->phase5_scenarios",
  "ladder_basis:reverse_dcf->>ladder_basis",
  "eps_summary:market_data->eps_summary",
].join(", ");

type ValuationPegRow = {
  company_code: string | null;
  priced_as_of: string | null;
  price_at_run: number | null;
  pe: unknown;
  phase5_scenarios: unknown;
  ladder_basis: string | null;
  eps_summary: unknown;
};

const upper = (code: string | null | undefined) => (code ?? "").trim().toUpperCase();

async function readCompanies(): Promise<Map<string, ScanCompany>> {
  const out = new Map<string, ScanCompany>();
  const supabase = createPublicReadClient();
  const { data, error } = await supabase.from("company").select(`code, name, sector, ${COVERAGE_SELECT}`);
  if (error) throw error;
  for (const row of (data ?? []) as CompanyRow[]) {
    const code = upper(row.code);
    if (!code) continue;
    out.set(code, {
      code,
      name: row.name?.trim() || null,
      sector: row.sector ?? null,
      listed: isDiscoveryListed(row),
    });
  }
  return out;
}

async function fetchRedFlagRows(): Promise<RedFlagRow[]> {
  const companies = await readCompanies();
  const supabase = createPublicReadClient();
  const { data, error } = await supabase.from("company_quality").select("company_code, payload");
  if (error) throw error;
  const rows: RedFlagRow[] = [];
  for (const raw of (data ?? []) as Array<{ company_code: string | null; payload?: unknown }>) {
    const company = companies.get(upper(raw.company_code));
    const payload = parseCompanyQualityPayload(raw.payload);
    if (!company || !payload) continue;
    const row = buildRedFlagRow(company, payload);
    if (row) rows.push(row);
  }
  return rows;
}

async function fetchPegRows(): Promise<PegRow[]> {
  const companies = await readCompanies();
  const supabase = createPublicReadClient();
  const { data, error } = await supabase
    .from("valuation_check")
    .select(VALUATION_SELECT)
    .eq("valuation_published", true);
  if (error) throw error;
  const rows: PegRow[] = [];
  for (const raw of (data ?? []) as unknown as ValuationPegRow[]) {
    const company = companies.get(upper(raw.company_code));
    if (!company) continue;
    const peg = derivePeg({
      relative_valuation: raw.pe ? ({ pe: raw.pe } as ValuationCheckRow["relative_valuation"]) : null,
      reverse_dcf: {
        phase5_scenarios: raw.phase5_scenarios ?? undefined,
        ladder_basis: raw.ladder_basis ?? undefined,
      } as unknown as ValuationCheckRow["reverse_dcf"],
      market_data: { eps_summary: raw.eps_summary ?? null },
    });
    if (!peg || (!peg.forward && !peg.trailing)) continue;
    rows.push({
      ...company,
      pe: peg.pe,
      forward: peg.forward,
      trailing: peg.trailing,
      trailingWithheldGrowthPct: peg.trailingWithheld?.growthPct ?? null,
      pricedAsOf: raw.priced_as_of,
      priceAtRun: typeof raw.price_at_run === "number" ? raw.price_at_run : null,
    });
  }
  return rows;
}

// A failed read is never cached (see the header), so without this every
// request would re-run it while the database is struggling — the 2026-10-06
// timeout did exactly that. After a failure, this server instance serves
// "unavailable" for BACKOFF_MS before it asks again.
const BACKOFF_MS = 60_000;

function withBackoff<T>(label: string, read: () => Promise<T>): () => Promise<T> {
  let failedAt = 0;
  return async () => {
    if (Date.now() - failedAt < BACKOFF_MS) {
      throw new Error(`scanners: ${label} backing off after a failed read`);
    }
    try {
      return await read();
    } catch (error) {
      failedAt = Date.now();
      throw error;
    }
  };
}

/** Every company with a forensic read (assessed > 0). Throws on a failed read. */
export const getRedFlagRows = withBackoff(
  "red flags",
  unstable_cache(fetchRedFlagRows, ["scanners-red-flags-v2"], { revalidate: 600 }),
);

/** Every company with at least one PEG leg, fresh or stale. Throws on a failed read. */
export const getPegRows = withBackoff("peg", unstable_cache(fetchPegRows, ["scanners-peg-v2"], { revalidate: 600 }));

// Same item source, quarter anchor and stored verdict as the company page's
// Guidance section and the watchlist signals (lib/watchlist-signals.ts): the
// latest snapshot's items when one exists, else the legacy guidance_tracking rows.
//
// Sized for the whole fleet (2026-10-06 prod incident): one read of every
// snapshot WITH `details` was 17.8MB / ~13s and hit Postgres' statement
// timeout on every request. `details` (forward strength, strategy narrative —
// ~13MB of it) is never read here, so it is not selected, and both tables are
// read in batches of BATCH companies so each statement stays short.
const SNAPSHOT_COLUMNS = "company_code, generated_at, credibility_verdict, guidance_items";
const TRACKING_COLUMNS =
  "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details";

type SnapshotRow = GuidanceSnapshotRow & { credibility_verdict?: unknown };

export type GuidanceUpgradeData = {
  rows: GuidanceUpgradeRow[];
  /** Companies with any guidance on record — what the scan could read. */
  readable: ScanCompany[];
};

const BATCH = 12;

const chunk = <T>(xs: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, (i + 1) * size));

async function fetchGuidanceUpgradeRows(): Promise<GuidanceUpgradeData> {
  const companies = await readCompanies();
  const codes = [...companies.keys()];
  const supabase = createPublicReadClient();
  const snapshotBatches = await Promise.all(
    chunk(codes, BATCH).map(async (batch) => {
      const { data, error } = await supabase
        .from("guidance_snapshot")
        .select(SNAPSHOT_COLUMNS)
        .in("company_code", batch)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SnapshotRow[];
    }),
  );

  const latestSnapshot = new Map<string, SnapshotRow>();
  for (const row of snapshotBatches.flat()) {
    const code = upper(row.company_code);
    const seen = latestSnapshot.get(code);
    if (code && (!seen || String(row.generated_at ?? "") > String(seen.generated_at ?? ""))) {
      latestSnapshot.set(code, row);
    }
  }

  const legacyCodes = codes.filter((code) => !latestSnapshot.has(code));
  const legacyRows = new Map<string, GuidanceTrackingRow[]>();
  const trackingBatches = await Promise.all(
    chunk(legacyCodes, BATCH).map(async (batch) => {
      const { data, error } = await supabase
        .from("guidance_tracking")
        .select(TRACKING_COLUMNS)
        .in("company_code", batch)
        .order("generated_at", { ascending: false })
        .order("id", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GuidanceTrackingRow[];
    }),
  );
  for (const row of trackingBatches.flat()) {
    const code = upper(row.company_code);
    if (!code) continue;
    const bucket = legacyRows.get(code);
    if (bucket) bucket.push(row);
    else legacyRows.set(code, [row]);
  }

  const current = currentReportingQuarter();
  const rows: GuidanceUpgradeRow[] = [];
  const readable: ScanCompany[] = [];
  for (const [code, company] of companies) {
    const snapshot = latestSnapshot.get(code);
    const items = snapshot
      ? (normalizeGuidanceSnapshot(snapshot)?.guidanceItems ?? [])
      : normalizeGuidanceTrackingRows(legacyRows.get(code) ?? []);
    if (items.length === 0) continue;
    readable.push(company);
    const row = buildGuidanceUpgradeRow(company, items, current, snapshot?.credibility_verdict);
    if (row) rows.push(row);
  }
  return { rows, readable };
}

/** Every company with a raised live commitment, plus every company with guidance on record. Throws on a failed read. */
export const getGuidanceUpgradeRows = withBackoff(
  "guidance upgrades",
  unstable_cache(fetchGuidanceUpgradeRows, ["scanners-guidance-upgrades-v3"], { revalidate: 600 }),
);
