import "server-only";

// The server side of watchlist analytics: every read the four blocks need, for
// just the list's codes, through the SAME normalizer the section behind it
// uses — so a line here can never say something the company page doesn't.
//
// Shape of the fetch, and why:
//   - One statement per table, `.in(codes)`, in batches of BATCH companies. The
//     Overview's per-company getter (lib/overview-signal-board.ts) runs ten
//     reads per company; on a twenty-name list that is two hundred statements,
//     and the 2026-10-06 scanners incident showed what one slow fleet read
//     does to the database. Batched by table, a twenty-name list is ~30 short
//     statements, all in parallel.
//   - Narrow selects. guidance_snapshot.details is ~100KB a company and is
//     needed (forward strength lives there); moat's 600KB assessment_payload is
//     not — only its headline is, read as a scalar JSON path. valuation_check
//     drops the Screener dump and the narrative; growth_outlook drops `details`
//     (the summary reads the scenario columns).
//   - Every leg degrades on its own: a failed read logs and blanks that input
//     for every company (the block says so), never the page.
//
// Nothing here is cached: a watchlist is one reader's page and the inputs
// change on the pipeline's cadence, not on page views.

import { formatRelativeActivityTime } from "@/lib/activity-feed";
import { parseStoryReads } from "@/lib/announcement-story-read/select";
import type { AnnouncementStoryRead, AnnouncementStoryReadRow } from "@/lib/announcement-story-read/types";
import { buildSubSectorEntries } from "@/lib/company-industry-analysis/view";
import { normalizeCompanyIndustryAnalysis } from "@/lib/company-industry-analysis/normalize";
import type { CompanyIndustryAnalysisRow } from "@/lib/company-industry-analysis/types";
import { normalizeCompanyQuality } from "@/lib/company-quality/normalize";
import type { CompanyQualityRow, NormalizedCompanyQuality } from "@/lib/company-quality/types";
import { COVERAGE_SELECT, isDiscoveryListed, type CoverageFields } from "@/lib/coverage-policy";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { safeFilingHref } from "@/lib/exchange-desk/filing-href";
import {
  categoryLabel,
  coerceImpact,
  isKnownCategory,
  parseOrderSize,
  type ExchangeCategory,
  type ExchangeUpdate,
  type RecencyBucketKey,
} from "@/lib/exchange-desk/types";
import { normalizeGrowthOutlook } from "@/lib/growth-outlook/normalize";
import { buildGrowthSummary, type GrowthSummary } from "@/lib/growth-outlook/summary";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import { parseForwardStrength, type ForwardStrength, type GuidanceSnapshotRow } from "@/lib/guidance-snapshot/types";
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import type { GuidanceTrackingRow } from "@/lib/guidance-tracking/types";
import { buildGuidanceVerdict, type GuidanceVerdict } from "@/lib/guidance-tracking/verdict";
import { logger } from "@/lib/logger";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { MoatRatingKey, MoatTier } from "@/lib/moat-analysis/types";
import { scoreWrittenAt } from "@/lib/score-freshness";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import { buildValuationHeadline } from "@/lib/valuation-check/headline";
import { buildValuationScoreHistory, type ValuationScoreHistoryRow } from "@/lib/valuation-check/history";
import { assessStaleness, normalizeValuationCheck } from "@/lib/valuation-check/normalize";
import type { NormalizedValuationCheck, ValuationCheckRow } from "@/lib/valuation-check/types";
import { toValuationScale } from "@/lib/valuation-band";
import { normalizeWalkTheTalk } from "@/lib/walk-the-talk/normalize";
import type { NormalizedWalkTheTalk } from "@/lib/walk-the-talk/types";

import { FILINGS_WINDOW_DAYS } from "./announcements";
import type { ThemeInput, ThemeMembershipInput } from "./distribution";
import type { WatchlistCompany } from "./types";

const BATCH = 12;

const upper = (value: string | null | undefined) => (value ?? "").trim().toUpperCase();
const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const num = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const chunk = <T>(xs: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, (i + 1) * size));

type Supabase = ReturnType<typeof createPublicReadClient>;

/** Runs `read` over every batch of codes and concatenates; throws on the first failed batch. */
async function batched<T>(codes: string[], read: (batch: string[]) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const parts = await Promise.all(
    chunk(codes, BATCH).map(async (batch) => {
      const { data, error } = await read(batch);
      if (error) throw error;
      return (data ?? []) as T[];
    }),
  );
  return parts.flat();
}

/** A leg that fails logs once and resolves to null; the block it feeds says it could not be read. */
async function settle<T>(leg: string, read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    logger.warn(`watchlist-analytics: ${leg} read failed; that input renders empty`, {
      error: (error as Error)?.message ?? String(error),
    });
    return null;
  }
}

/** Newest row per code, by a string field compared as text (ISO timestamps sort correctly). */
function latestPerCode<T>(rows: T[], code: (row: T) => string, at: (row: T) => string | null | undefined): Map<string, T> {
  const out = new Map<string, T>();
  for (const row of rows) {
    const key = upper(code(row));
    if (!key) continue;
    const seen = out.get(key);
    if (!seen || String(at(row) ?? "") > String(at(seen) ?? "")) out.set(key, row);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Companies — the universe, so the list's rows AND which sectors have a page
// (a discovery-listed company somewhere in them) come from one read.
// ---------------------------------------------------------------------------

type CompanyRow = CoverageFields & {
  code: string | null;
  name: string | null;
  sector: string | null;
  sub_sector: string | null;
};

export type CompanyUniverse = {
  byCode: Map<string, WatchlistCompany>;
  /** Lowercase sector keys with at least one discovery-listed company (so /sector/<slug> exists). */
  sectorsWithPage: Set<string>;
};

export async function readCompanyUniverse(supabase: Supabase): Promise<CompanyUniverse> {
  const { data, error } = await supabase.from("company").select(`code, name, sector, sub_sector, ${COVERAGE_SELECT}`);
  if (error) throw error;
  const byCode = new Map<string, WatchlistCompany>();
  const sectorsWithPage = new Set<string>();
  for (const row of (data ?? []) as unknown as CompanyRow[]) {
    const code = upper(row.code);
    if (!code) continue;
    byCode.set(code, {
      code,
      name: row.name?.trim() || code,
      sector: str(row.sector),
      subSector: str(row.sub_sector),
    });
    if (row.sector && isDiscoveryListed(row)) sectorsWithPage.add(row.sector.trim().toLowerCase());
  }
  return { byCode, sectorsWithPage };
}

// ---------------------------------------------------------------------------
// Per-company facts
// ---------------------------------------------------------------------------

export type QuarterPrint = { label: string; score: number; scoredAt: string | null };

export type CompanyFacts = {
  code: string;
  name: string;
  quality: NormalizedCompanyQuality | null;
  qualityGeneratedAt: string | null;
  moat: { rating: MoatRatingKey; tier: MoatTier | null; headline: string | null; updatedAt: string | null } | null;
  /** Newest first. */
  quarterPrints: QuarterPrint[];
  growth: {
    score: number | null;
    summary: GrowthSummary | null;
    /** Newest first. */
    runs: { score: number | null; at: string | null }[];
  } | null;
  valuation: {
    normalized: NormalizedValuationCheck;
    /** The verdict the section shows, or null when it is withheld (stale / not rateable). */
    shownVerdict: { verdict: NonNullable<NormalizedValuationCheck["verdict"]>; headline: string | null } | null;
    /** 0–10 scale. */
    score: number | null;
    /** Oldest first, 0–10 scale. */
    history: { pricedAsOf: string; score: number }[];
  } | null;
  guidance: {
    generatedAt: string | null;
    verdict: GuidanceVerdict | null;
    forwardStrength: ForwardStrength | null;
    walkTheTalk: NormalizedWalkTheTalk | null;
  } | null;
  industry: { stage: string; market: string | null } | null;
  businessGeneratedAt: string | null;
  keyVariablesGeneratedAt: string | null;
};

type QualityRow = CompanyQualityRow & { company_code: string };
type MoatRow = { company_code: string; rating: string | null; tier: string | null; updated_at: string | null; created_at: string | null; headline: string | null };
type ConcallRow = { company_code: string; fy: number; qtr: number; quarter_label: string | null; score: unknown; scored_at: string | null; updated_at: string | null; created_at: string | null };
type GrowthRow = {
  company: string;
  growth_score: unknown;
  run_timestamp: string | null;
  horizon_years: unknown;
  base_growth_pct: unknown;
  upside_growth_pct: unknown;
  downside_growth_pct: unknown;
  scenarios: unknown;
};
type ValuationRow = ValuationCheckRow;
type ValuationHistoryRow = ValuationScoreHistoryRow & { company_code: string };
type SnapshotRow = GuidanceSnapshotRow & { credibility_verdict?: unknown };
type IndustryRow = Pick<CompanyIndustryAnalysisRow, "company" | "generated_at" | "sub_sector_cards" | "company_fit">;
type DatedRow = { company: string; generated_at: string | null };
type DatedCodeRow = { company_code: string; generated_at: string | null };

const SNAPSHOT_COLUMNS = "company_code, generated_at, credibility_verdict, guidance_items, details, updated_at";
const TRACKING_COLUMNS =
  "id, company_code, guidance_key, guidance_text, guidance_type, first_mentioned_in, target_period, source_mentions, trail, status, status_reason, latest_view, confidence, generated_at, details";
// What normalizeValuationCheck + buildValuationHeadline + assessStaleness read.
// Not selected: source, market_data (the Screener dump), overlay, peers, caveats,
// incomplete_reasons, the narrative columns.
const VALUATION_COLUMNS =
  "company_code, schema_version, priced_as_of, price_at_run, run_timestamp, verdict, score, rateable, unrated_reasons, primary_lens, lens_selection, relative_valuation, reverse_dcf, verdict_block";

async function readFacts(supabase: Supabase, companies: WatchlistCompany[], now: Date): Promise<Map<string, CompanyFacts>> {
  const codes = companies.map((c) => c.code);
  const names = companies.map((c) => c.name);

  const [quality, moat, concall, growth, valuation, valuationHistory, snapshots, industry, business, keyVariables] = await Promise.all([
    settle("quality", () =>
      batched<QualityRow>(codes, (batch) =>
        supabase.from("company_quality").select("company_code, schema_version, generated_at, source, payload, updated_at").in("company_code", batch),
      ),
    ),
    settle("moat", () =>
      batched<MoatRow>(codes, (batch) =>
        supabase
          .from("moat_analysis")
          .select("company_code, rating, tier, updated_at, created_at, headline:assessment_payload->>headline")
          .in("company_code", batch),
      ),
    ),
    settle("concall", () =>
      batched<ConcallRow>(codes, (batch) =>
        supabase
          .from("concall_analysis")
          .select("company_code, fy, qtr, quarter_label, score, scored_at:details->scoring_meta->>scored_at, updated_at, created_at")
          .in("company_code", batch)
          // legacy-logic scores (no details.scoring_meta) are hidden portal-wide
          .not("details->scoring_meta", "is", null)
          .order("fy", { ascending: false })
          .order("qtr", { ascending: false }),
      ),
    ),
    settle("growth", () =>
      // Older rows key `company` by name, newer by code (same as the Overview).
      batched<GrowthRow>([...codes, ...names], (batch) =>
        supabase
          .from("growth_outlook")
          .select("company, growth_score, run_timestamp, horizon_years, base_growth_pct, upside_growth_pct, downside_growth_pct, scenarios")
          .in("company", batch)
          .order("run_timestamp", { ascending: false }),
      ),
    ),
    settle("valuation", () =>
      batched<ValuationRow>(codes, (batch) =>
        supabase
          .from("valuation_check")
          .select(VALUATION_COLUMNS)
          .in("company_code", batch)
          .eq("valuation_published", true)
          .order("priced_as_of", { ascending: false }),
      ),
    ),
    settle("valuation-history", () =>
      batched<ValuationHistoryRow>(codes, (batch) =>
        supabase
          .from("valuation_check_history")
          .select("company_code, priced_as_of, recorded_at, score")
          .in("company_code", batch)
          // Same filter as the Valuation tab's sparkline: legacy rows predate the
          // `published` column (NULL); only an explicit --unpublish is excluded.
          .not("published", "is", false)
          .order("priced_as_of", { ascending: true }),
      ),
    ),
    settle("guidance", () => readGuidance(supabase, codes)),
    settle("industry", () =>
      batched<IndustryRow>(codes, (batch) =>
        supabase
          .from("company_industry_analysis")
          // Only what the lead-market cycle needs; the full row is the whole Industry tab.
          .select("company, generated_at, sub_sector_cards, company_fit")
          .in("company", batch)
          .order("generated_at", { ascending: false }),
      ),
    ),
    settle("business", () =>
      batched<DatedRow>(codes, (batch) =>
        supabase.from("business_snapshot").select("company, generated_at").in("company", batch).order("generated_at", { ascending: false }),
      ),
    ),
    settle("key-variables", () =>
      batched<DatedCodeRow>(codes, (batch) =>
        supabase.from("key_variables_snapshot").select("company_code, generated_at").in("company_code", batch).order("generated_at", { ascending: false }),
      ),
    ),
  ]);

  const qualityByCode = latestPerCode(quality ?? [], (r) => r.company_code, (r) => r.generated_at);
  const moatByCode = latestPerCode(moat ?? [], (r) => r.company_code, (r) => r.updated_at ?? r.created_at);
  const industryByCode = latestPerCode(industry ?? [], (r) => r.company, (r) => r.generated_at);
  const businessByCode = latestPerCode(business ?? [], (r) => r.company, (r) => r.generated_at);
  const keyVariablesByCode = latestPerCode(keyVariables ?? [], (r) => r.company_code, (r) => r.generated_at);
  const valuationByCode = latestPerCode(valuation ?? [], (r) => r.company_code, (r) => r.priced_as_of);

  const concallByCode = new Map<string, ConcallRow[]>();
  for (const row of concall ?? []) {
    const code = upper(row.company_code);
    const bucket = concallByCode.get(code);
    if (bucket) bucket.push(row);
    else concallByCode.set(code, [row]);
  }

  // growth_outlook rows keyed by code OR name → resolve to the code.
  const codeByName = new Map(companies.map((c) => [c.name.trim().toUpperCase(), c.code]));
  const growthByCode = new Map<string, GrowthRow[]>();
  for (const row of growth ?? []) {
    const raw = upper(row.company);
    const code = codeByName.get(raw) ?? raw;
    const bucket = growthByCode.get(code);
    if (bucket) bucket.push(row);
    else growthByCode.set(code, [row]);
  }
  for (const rows of growthByCode.values()) {
    rows.sort((a, b) => String(b.run_timestamp ?? "").localeCompare(String(a.run_timestamp ?? "")));
  }

  const historyByCode = new Map<string, ValuationHistoryRow[]>();
  for (const row of valuationHistory ?? []) {
    const code = upper(row.company_code);
    const bucket = historyByCode.get(code);
    if (bucket) bucket.push(row);
    else historyByCode.set(code, [row]);
  }

  const facts = new Map<string, CompanyFacts>();
  for (const company of companies) {
    const { code } = company;

    const qualityRow = qualityByCode.get(code) ?? null;
    const moatRow = moatByCode.get(code) ?? null;
    const moatNorm = moatRow ? normalizeMoatAnalysis({ company_code: code, rating: moatRow.rating, tier: moatRow.tier }) : null;

    const quarterPrints: QuarterPrint[] = (concallByCode.get(code) ?? []).flatMap((row) => {
      const score = num(row.score);
      if (score == null) return [];
      return [{ label: row.quarter_label?.trim() || `Q${row.qtr} FY${row.fy}`, score, scoredAt: scoreWrittenAt(row) }];
    });

    const growthRows = growthByCode.get(code) ?? [];
    const latestGrowth = growthRows[0];
    const growthNorm = latestGrowth
      ? normalizeGrowthOutlook({
          details: null,
          growthScore: latestGrowth.growth_score,
          runTimestamp: latestGrowth.run_timestamp,
          horizonYears: latestGrowth.horizon_years,
          baseGrowthPct: latestGrowth.base_growth_pct,
          upsideGrowthPct: latestGrowth.upside_growth_pct,
          downsideGrowthPct: latestGrowth.downside_growth_pct,
          scenarios: latestGrowth.scenarios,
        })
      : null;

    const valuationRow = valuationByCode.get(code) ?? null;
    const valuationNorm = normalizeValuationCheck(valuationRow);
    let valuationFacts: CompanyFacts["valuation"] = null;
    if (valuationNorm) {
      const staleness = assessStaleness(valuationNorm, now);
      const showVerdict = valuationNorm.rateable && Boolean(valuationNorm.verdict) && !staleness.stale;
      valuationFacts = {
        normalized: valuationNorm,
        shownVerdict:
          showVerdict && valuationNorm.verdict
            ? { verdict: valuationNorm.verdict, headline: buildValuationHeadline(valuationNorm) }
            : null,
        score: toValuationScale(valuationNorm.score),
        history: buildValuationScoreHistory(historyByCode.get(code) ?? null).map((p) => ({ pricedAsOf: p.period, score: p.value / 10 })),
      };
    }

    const guidanceFacts = snapshots?.get(code) ?? null;

    const industryRow = industryByCode.get(code) ?? null;
    const industryNorm = industryRow ? normalizeCompanyIndustryAnalysis({ ...industryRow, company: code }) : null;
    // Lead market's cycle — the same entry the Industry tab's "Where it sits"
    // reads: the first market, in qualifying order, that carries a cycle.
    const leadMarket = industryNorm
      ? (buildSubSectorEntries(industryNorm).find((entry) => str(entry.capitalCycle?.stage) || str(entry.capitalCycle?.direction)) ?? null)
      : null;
    const leadStage = str(leadMarket?.capitalCycle?.stage);

    facts.set(code, {
      code,
      name: company.name,
      quality: normalizeCompanyQuality(qualityRow),
      qualityGeneratedAt: qualityRow?.generated_at ?? null,
      moat: moatNorm
        ? { rating: moatNorm.moatRating, tier: moatNorm.moatTier, headline: str(moatRow?.headline), updatedAt: moatRow?.updated_at ?? moatRow?.created_at ?? null }
        : null,
      quarterPrints,
      growth: latestGrowth
        ? {
            score: growthNorm?.growthScore ?? num(latestGrowth.growth_score),
            summary: buildGrowthSummary(growthNorm),
            runs: growthRows.map((row) => ({ score: num(row.growth_score), at: row.run_timestamp })),
          }
        : null,
      valuation: valuationFacts,
      guidance: guidanceFacts,
      industry: leadStage ? { stage: leadStage, market: str(leadMarket?.subSector) } : null,
      businessGeneratedAt: businessByCode.get(code)?.generated_at ?? null,
      keyVariablesGeneratedAt: keyVariablesByCode.get(code)?.generated_at ?? null,
    });
  }
  return facts;
}

// Same item source, quarter anchor and stored verdict as the Guidance tab, the
// watchlist signals and the scanners: the latest snapshot's items when one
// exists, else the legacy guidance_tracking rows. Forward strength and the
// walk-the-talk live book only ever come from a snapshot.
async function readGuidance(supabase: Supabase, codes: string[]): Promise<Map<string, NonNullable<CompanyFacts["guidance"]>>> {
  const snapshotRows = await batched<SnapshotRow>(codes, (batch) =>
    supabase.from("guidance_snapshot").select(SNAPSHOT_COLUMNS).in("company_code", batch).order("generated_at", { ascending: false }),
  );
  const latestSnapshot = latestPerCode(snapshotRows, (r) => r.company_code, (r) => r.generated_at);

  const legacyCodes = codes.filter((code) => !latestSnapshot.has(code));
  const legacyRows = new Map<string, GuidanceTrackingRow[]>();
  if (legacyCodes.length > 0) {
    const trackingRows = await batched<GuidanceTrackingRow>(legacyCodes, (batch) =>
      supabase
        .from("guidance_tracking")
        .select(TRACKING_COLUMNS)
        .in("company_code", batch)
        .order("generated_at", { ascending: false })
        .order("id", { ascending: false }),
    );
    for (const row of trackingRows) {
      const code = upper(row.company_code);
      const bucket = legacyRows.get(code);
      if (bucket) bucket.push(row);
      else legacyRows.set(code, [row]);
    }
  }

  const current = currentReportingQuarter();
  const out = new Map<string, NonNullable<CompanyFacts["guidance"]>>();
  for (const code of codes) {
    const snapshot = latestSnapshot.get(code) ?? null;
    const normalized = snapshot ? normalizeGuidanceSnapshot(snapshot) : null;
    const items = snapshot ? (normalized?.guidanceItems ?? []) : normalizeGuidanceTrackingRows(legacyRows.get(code) ?? []);
    if (!snapshot && items.length === 0) continue;
    const walkTheTalk = normalized ? normalizeWalkTheTalk(normalized, code, current, snapshot?.credibility_verdict) : null;
    out.set(code, {
      generatedAt: snapshot?.generated_at ?? null,
      verdict: items.length > 0 ? buildGuidanceVerdict(items, current, snapshot?.credibility_verdict) : null,
      forwardStrength: parseForwardStrength(normalized?.details ?? null),
      walkTheTalk: walkTheTalk && walkTheTalk.schemaStatus === "present" ? walkTheTalk : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Filings — the list's material tape rows (no coverage gate: user-owned list)
// and the producer's story reads for them.
// ---------------------------------------------------------------------------

type AnnouncementRow = {
  announcement_id: string;
  company_code: string;
  filed_at: string;
  headline: string | null;
  subject: string | null;
  attachment_url: string | null;
  category: string;
  impact: string | null;
  summary: string | null;
  details: unknown;
};

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const istDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
function bucketFor(filedRaw: string, now: Date): RecencyBucketKey {
  const at = new Date(filedRaw);
  if (Number.isNaN(at.getTime())) return "earlier";
  if (istDay(at) === istDay(now)) return "today";
  if (now.getTime() - at.getTime() < MS_WEEK) return "week";
  return "earlier";
}

async function readFilings(
  supabase: Supabase,
  companies: WatchlistCompany[],
  now: Date,
): Promise<{ updates: ExchangeUpdate[]; reads: AnnouncementStoryRead[] }> {
  const codes = companies.map((c) => c.code);
  const nameByCode = new Map(companies.map((c) => [c.code, c.name]));
  const cutoff = new Date(now.getTime() - FILINGS_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const rows = await batched<AnnouncementRow>(codes, (batch) =>
    supabase
      .from("bse_announcements")
      .select("announcement_id, company_code, filed_at, headline, subject, attachment_url, category, impact, summary, details")
      .in("company_code", batch)
      .eq("is_material", true)
      .gte("filed_at", cutoff.toISOString())
      // A future-dated parsed row must not lead the list.
      .lte("filed_at", now.toISOString())
      .order("filed_at", { ascending: false })
      .limit(200),
  );

  const updates: ExchangeUpdate[] = rows.flatMap((row) => {
    if (!isKnownCategory(row.category)) return [];
    const summary = (row.summary ?? "").trim() || (row.headline ?? "").trim();
    if (!summary) return [];
    const code = upper(row.company_code);
    const category = row.category as ExchangeCategory;
    return [
      {
        id: row.announcement_id,
        companyCode: code,
        companyName: nameByCode.get(code) ?? code,
        category,
        categoryLabel: categoryLabel(category),
        impact: coerceImpact(row.impact),
        orderSize: parseOrderSize(row.category, row.details),
        summary,
        headline: (row.headline ?? "").trim(),
        attachmentUrl: safeFilingHref(row.attachment_url),
        filedRaw: row.filed_at,
        filedLabel: formatRelativeActivityTime(row.filed_at),
        bucketKey: bucketFor(row.filed_at, now),
      },
    ];
  });

  // Reads are joined by announcement_id (the tape is the authority for every
  // fact; the read only adds the headline and the story effect).
  const ids = updates.map((u) => u.id);
  const readRows =
    ids.length > 0
      ? await settle("story reads", () =>
          batched<AnnouncementStoryReadRow>(ids, (batch) =>
            supabase.from("announcement_story_read").select("announcement_id, score, payload").eq("status", "judged").in("announcement_id", batch),
          ),
        )
      : [];
  const { reads, invalid } = parseStoryReads(readRows ?? []);
  if (invalid.length > 0) {
    logger.warn("watchlist-analytics: story read payload(s) fail the v1 schema", { invalid });
  }
  return { updates, reads };
}

// ---------------------------------------------------------------------------
// Themes — featured editorial themes and the list's memberships.
// ---------------------------------------------------------------------------

async function readThemes(supabase: Supabase, codes: string[]): Promise<{ themes: ThemeInput[]; memberships: ThemeMembershipInput[] }> {
  const [{ data: themeRows, error: themeError }, memberRows] = await Promise.all([
    supabase.from("theme").select("slug, title, hotness").eq("is_featured", true),
    batched<{ theme_slug: string; company_code: string }>(codes, (batch) =>
      supabase.from("theme_membership").select("theme_slug, company_code").in("company_code", batch),
    ),
  ]);
  if (themeError) throw themeError;
  return {
    themes: ((themeRows ?? []) as { slug: string; title: string; hotness: number | null }[]).map((t) => ({
      slug: String(t.slug),
      title: String(t.title),
      hotness: typeof t.hotness === "number" ? t.hotness : null,
    })),
    memberships: memberRows.map((m) => ({ themeSlug: String(m.theme_slug), code: upper(m.company_code) })),
  };
}

// ---------------------------------------------------------------------------
// Everything, for one list
// ---------------------------------------------------------------------------

export type WatchlistAnalyticsData = {
  companies: WatchlistCompany[];
  sectorsWithPage: Set<string>;
  facts: Map<string, CompanyFacts>;
  filings: { updates: ExchangeUpdate[]; reads: AnnouncementStoryRead[] } | null;
  themes: { themes: ThemeInput[]; memberships: ThemeMembershipInput[] } | null;
};

/**
 * @param rawCodes the list's codes, in list order (deduped and upper-cased here)
 */
export async function fetchWatchlistAnalyticsData(rawCodes: string[], now: Date = new Date()): Promise<WatchlistAnalyticsData> {
  const supabase = createPublicReadClient();
  const codes = [...new Set(rawCodes.map(upper).filter(Boolean))];

  const universe = await settle("companies", () => readCompanyUniverse(supabase));
  // A company the universe read could not name still gets a row under its code.
  const companies: WatchlistCompany[] = codes.map(
    (code) => universe?.byCode.get(code) ?? { code, name: code, sector: null, subSector: null },
  );

  const [facts, filings, themes] = await Promise.all([
    readFacts(supabase, companies, now),
    settle("filings", () => readFilings(supabase, companies, now)),
    settle("themes", () => readThemes(supabase, codes)),
  ]);

  return { companies, sectorsWithPage: universe?.sectorsWithPage ?? new Set(), facts, filings, themes };
}
