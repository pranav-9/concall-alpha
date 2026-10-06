import "server-only";

// Server fetch for /scanners: one cached read per scan, each over the
// discovery-listed companies only — a scanner is a discovery surface
// (lib/coverage-policy). A failed read THROWS, so unstable_cache never stores
// an empty scan from a Supabase blip; the page catches each scan on its own and
// shows that one as unavailable. Valuation freshness is judged at render time
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

async function readListedCompanies(): Promise<Map<string, ScanCompany>> {
  const out = new Map<string, ScanCompany>();
  const supabase = createPublicReadClient();
  const { data, error } = await supabase.from("company").select(`code, name, sector, ${COVERAGE_SELECT}`);
  if (error) throw error;
  for (const row of (data ?? []) as CompanyRow[]) {
    const code = upper(row.code);
    if (!code || !isDiscoveryListed(row)) continue;
    out.set(code, { code, name: row.name?.trim() || null, sector: row.sector ?? null });
  }
  return out;
}

async function fetchRedFlagRows(): Promise<RedFlagRow[]> {
  const companies = await readListedCompanies();
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
  const companies = await readListedCompanies();
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

/** Every discovery-listed company with a forensic read (assessed > 0). Throws on a failed read. */
export const getRedFlagRows = unstable_cache(fetchRedFlagRows, ["scanners-red-flags-v1"], { revalidate: 600 });

/** Every discovery-listed company with at least one PEG leg, fresh or stale. Throws on a failed read. */
export const getPegRows = unstable_cache(fetchPegRows, ["scanners-peg-v1"], { revalidate: 600 });

// Same item source, quarter anchor and stored verdict as the company page's
// Guidance section and the watchlist signals (lib/watchlist-signals.ts): the
// latest snapshot's items when one exists, else the legacy guidance_tracking rows.
const SNAPSHOT_COLUMNS = "company_code, generated_at, credibility_verdict, guidance_items, details, updated_at";
const TRACKING_COLUMNS =
  "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details";

type SnapshotRow = GuidanceSnapshotRow & { credibility_verdict?: unknown };

export type GuidanceUpgradeData = {
  rows: GuidanceUpgradeRow[];
  /** Listed companies with any guidance on record — what the scan could read. */
  scanned: number;
};

async function fetchGuidanceUpgradeRows(): Promise<GuidanceUpgradeData> {
  const companies = await readListedCompanies();
  const codes = [...companies.keys()];
  const supabase = createPublicReadClient();
  const { data: snapshotData, error: snapshotError } = await supabase
    .from("guidance_snapshot")
    .select(SNAPSHOT_COLUMNS)
    .in("company_code", codes)
    .order("generated_at", { ascending: false });
  if (snapshotError) throw snapshotError;

  const latestSnapshot = new Map<string, SnapshotRow>();
  for (const row of (snapshotData ?? []) as SnapshotRow[]) {
    const code = upper(row.company_code);
    if (code && !latestSnapshot.has(code)) latestSnapshot.set(code, row);
  }

  const legacyCodes = codes.filter((code) => !latestSnapshot.has(code));
  const legacyRows = new Map<string, GuidanceTrackingRow[]>();
  if (legacyCodes.length > 0) {
    const { data: trackingData, error: trackingError } = await supabase
      .from("guidance_tracking")
      .select(TRACKING_COLUMNS)
      .in("company_code", legacyCodes)
      .order("generated_at", { ascending: false })
      .order("id", { ascending: false });
    if (trackingError) throw trackingError;
    for (const row of (trackingData ?? []) as GuidanceTrackingRow[]) {
      const code = upper(row.company_code);
      if (!code) continue;
      const bucket = legacyRows.get(code);
      if (bucket) bucket.push(row);
      else legacyRows.set(code, [row]);
    }
  }

  const current = currentReportingQuarter();
  const rows: GuidanceUpgradeRow[] = [];
  let scanned = 0;
  for (const [code, company] of companies) {
    const snapshot = latestSnapshot.get(code);
    const items = snapshot
      ? (normalizeGuidanceSnapshot(snapshot)?.guidanceItems ?? [])
      : normalizeGuidanceTrackingRows(legacyRows.get(code) ?? []);
    if (items.length === 0) continue;
    scanned += 1;
    const row = buildGuidanceUpgradeRow(company, items, current, snapshot?.credibility_verdict);
    if (row) rows.push(row);
  }
  return { rows, scanned };
}

/** Every discovery-listed company with a raised live commitment. Throws on a failed read. */
export const getGuidanceUpgradeRows = unstable_cache(fetchGuidanceUpgradeRows, ["scanners-guidance-upgrades-v1"], {
  revalidate: 600,
});
