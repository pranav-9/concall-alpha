import "server-only";

// The watchlist board's four categorical columns — Moat, Forensic checks,
// Guidance strength, Management reliability — fetched for a handful of codes
// at once. Each column restates a verdict the company page already renders,
// through the SAME helper that page uses, so a watchlist cell can never say
// something the section behind it doesn't:
//   Moat       → moat_analysis rating + tier   (lib/moat-analysis/normalize)
//   Checks     → company_quality forensic tally (lib/company-quality/forensics)
//   Guidance   → guidance_snapshot forward_strength (lib/guidance-snapshot/types)
//   Management → buildGuidanceVerdict tier + met/counted (lib/guidance-tracking/verdict)
//
// What is deliberately NOT here: a moat trajectory ("widening" / "eroding").
// No moat history is stored, so the portal never claims one (see
// lib/moat-analysis/plain-language.ts) — the cell shows rating · tier instead.
//
// Every read is best-effort: a failed table read drops its column (nulls),
// never the board.

import { currentReportingQuarter } from "@/lib/current-quarter";
import { buildForensicChecks, tallyChecks } from "@/lib/company-quality/forensics";
import { parseCompanyQualityPayload } from "@/lib/company-quality/types";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import { parseForwardStrength, type GuidanceSnapshotRow } from "@/lib/guidance-snapshot/types";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import { buildGuidanceVerdict } from "@/lib/guidance-tracking/verdict";
import { logger } from "@/lib/logger";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import type {
  BoardSignals,
  ForensicSignal,
  GuidanceSignal,
  ManagementSignal,
  MoatSignal,
} from "@/lib/board-signals";

export type {
  BoardSignals as WatchlistSignals,
  ForensicSignal,
  GuidanceSignal,
  ManagementSignal,
  MoatSignal,
} from "@/lib/board-signals";

const SNAPSHOT_COLUMNS =
  "company_code, generated_at, credibility_verdict, guidance_items, details, updated_at";
const TRACKING_COLUMNS =
  "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details";

type SnapshotRow = GuidanceSnapshotRow & { credibility_verdict?: unknown };

const upper = (code: string | null | undefined) => (code ?? "").trim().toUpperCase();

async function readMoat(codes: string[]): Promise<Map<string, MoatSignal>> {
  const out = new Map<string, MoatSignal>();
  try {
    const supabase = createPublicReadClient();
    // rating + tier only — the v15 payload is ~600KB per row and the cell
    // doesn't read it. normalizeMoatAnalysis returns a row from these alone.
    const { data, error } = await supabase
      .from("moat_analysis")
      .select("company_code, rating, tier, updated_at, created_at")
      .in("company_code", codes)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    for (const row of (data ?? []) as MoatAnalysisRow[]) {
      const code = upper(row.company_code);
      if (!code || out.has(code)) continue;
      const normalized = normalizeMoatAnalysis(row);
      if (!normalized) continue;
      out.set(code, { rating: normalized.moatRating, tier: normalized.moatTier });
    }
  } catch (error) {
    logger.warn("watchlist-signals: moat read failed; column renders empty", { error });
  }
  return out;
}

async function readForensics(codes: string[]): Promise<Map<string, ForensicSignal>> {
  const out = new Map<string, ForensicSignal>();
  try {
    const supabase = createPublicReadClient();
    const { data, error } = await supabase
      .from("company_quality")
      .select("company_code, payload")
      .in("company_code", codes);
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ company_code: string; payload?: unknown }>) {
      const code = upper(row.company_code);
      const payload = parseCompanyQualityPayload(row.payload);
      if (!code || !payload) continue;
      const tally = tallyChecks(buildForensicChecks(payload));
      if (tally.assessed === 0) continue;
      out.set(code, tally);
    }
  } catch (error) {
    logger.warn("watchlist-signals: quality read failed; column renders empty", { error });
  }
  return out;
}

// Same item source, quarter anchor and stored verdict as the company page's
// Guidance section, the overview cache and the Desk's Featured Reads
// (lib/desk-featured/guidance-record-data.ts): the latest snapshot's items
// when one exists, else the legacy guidance_tracking rows. Forward strength
// only ever comes from a snapshot (it's a deep-track layer).
async function readGuidance(
  codes: string[],
): Promise<{ guidance: Map<string, GuidanceSignal>; management: Map<string, ManagementSignal> }> {
  const guidance = new Map<string, GuidanceSignal>();
  const management = new Map<string, ManagementSignal>();
  try {
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
    for (const code of codes) {
      const snapshot = latestSnapshot.get(code);
      const normalized = snapshot ? normalizeGuidanceSnapshot(snapshot) : null;
      const items = snapshot
        ? (normalized?.guidanceItems ?? [])
        : normalizeGuidanceTrackingRows(legacyRows.get(code) ?? []);

      const strength = parseForwardStrength(normalized?.details ?? null);
      if (strength) {
        guidance.set(code, {
          ambition: strength.ambition.label,
          evidence: strength.evidence.label,
        });
      }

      if (items.length === 0) continue;
      const verdict = buildGuidanceVerdict(items, current, snapshot?.credibility_verdict);
      management.set(code, {
        tier: verdict.tier,
        tierLabel: verdict.tierLabel,
        metCount: verdict.metCount,
        countedCount: verdict.countedCount,
        verdictSource: verdict.verdictSource,
      });
    }
  } catch (error) {
    logger.warn("watchlist-signals: guidance read failed; columns render empty", { error });
  }
  return { guidance, management };
}

/**
 * The four categorical signals for each code, keyed by UPPERCASE code. A plain
 * Record (it crosses into the client board). A code with nothing behind a
 * column gets null for that column; a code with nothing at all still gets an
 * entry of four nulls so the caller needn't special-case it.
 */
export async function fetchWatchlistSignals(
  rawCodes: string[],
): Promise<Record<string, BoardSignals>> {
  const codes = [...new Set(rawCodes.map(upper).filter(Boolean))].sort();
  if (codes.length === 0) return {};
  const [moat, forensics, { guidance, management }] = await Promise.all([
    readMoat(codes),
    readForensics(codes),
    readGuidance(codes),
  ]);
  return Object.fromEntries(
    codes.map((code) => [
      code,
      {
        moat: moat.get(code) ?? null,
        forensics: forensics.get(code) ?? null,
        guidance: guidance.get(code) ?? null,
        management: management.get(code) ?? null,
      },
    ]),
  );
}
