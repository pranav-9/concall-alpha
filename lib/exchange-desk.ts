import "server-only";
import { safeFilingHref } from "@/lib/exchange-desk/filing-href";

import { createClient } from "@/lib/supabase/server";
import { COVERAGE_SELECT, isAdmittedLargeCap } from "@/lib/coverage-policy";
import { formatRelativeActivityTime } from "@/lib/activity-feed";
import {
  buildImpactFacet,
  categoryLabel,
  coerceImpact,
  isKnownCategory,
  parseOrderSize,
  type ExchangeCategory,
  type ExchangeDeskData,
  type ExchangeUpdate,
  type RecencyBucketKey,
} from "@/lib/exchange-desk/types";

// How far back the Exchange Desk looks. Announcements are a fast-moving feed, so
// a tighter window than the leaderboard keeps it a "what's happening" surface.
const WINDOW_DAYS = 45;
// Cap the rows we pull; the desk shows a live tape, not an archive.
const ROW_LIMIT = 300;
// A single company's Announcements tab is a filing archive, not a recent-
// event surface — unlike the desk-wide feed, it does not apply WINDOW_DAYS.
const COMPANY_ROW_LIMIT = 120;

const upper = (v: string | null | undefined) => (v ?? "").toUpperCase();

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
// One IST calendar day (matches desk-recency-ledger), so "Today" tracks the
// date the reader is looking at rather than a rolling 24h window.
const istDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

function bucketFor(filedRaw: string, now: Date): RecencyBucketKey {
  const at = new Date(filedRaw);
  if (Number.isNaN(at.getTime())) return "earlier";
  if (istDay(at) === istDay(now)) return "today";
  if (now.getTime() - at.getTime() < MS_WEEK) return "week";
  return "earlier";
}

type CoverageRow = {
  code: string | null;
  name: string | null;
  market_cap_band_at_admission: string | null;
};

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

/**
 * Company names keyed by uppercased code, split by the admission gate so the
 * loader can route each announcement:
 *  - `nameByCode`   — discovery-listed (every covered mid/small company) → feed.
 *  - `largeCapKeys` — large-cap admissions: a different universe, dropped from
 *    the Desk entirely (code AND name, defensively).
 */
async function fetchCoverage(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase
    .from("company")
    .select(`code, name, ${COVERAGE_SELECT}`);
  if (error) throw error;

  const nameByCode = new Map<string, string>();
  const largeCapKeys = new Set<string>();
  (data ?? []).forEach((raw) => {
    const row = raw as CoverageRow;
    if (isAdmittedLargeCap(row)) {
      if (row.code) largeCapKeys.add(upper(row.code));
      if (row.name) largeCapKeys.add(upper(row.name));
      return;
    }
    if (row.code) nameByCode.set(upper(row.code), row.name ?? row.code);
  });
  return { nameByCode, largeCapKeys };
}

const EMPTY: ExchangeDeskData = {
  updates: [],
  impacts: [],
  total: 0,
  windowDays: WINDOW_DAYS,
};

/**
 * The classified, material BSE announcement feed for the covered universe.
 *
 * Returns an empty payload (never throws) when the bse_announcements table is
 * absent or a query fails — the DDL is applied manually, so the Desk section
 * degrades to nothing until it lands rather than 500-ing the page.
 */
export async function getExchangeDeskData(): Promise<ExchangeDeskData> {
  try {
    const supabase = await createClient();
    const now = new Date();
    const cutoff = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [coverage, annResp] = await Promise.all([
      fetchCoverage(supabase),
      supabase
        .from("bse_announcements")
        .select(
          "announcement_id, company_code, filed_at, headline, subject, attachment_url, category, impact, summary, details",
        )
        .eq("is_material", true)
        .gte("filed_at", cutoff.toISOString())
        .order("filed_at", { ascending: false })
        .limit(ROW_LIMIT),
    ]);

    if (annResp.error) throw annResp.error;

    const updates: ExchangeUpdate[] = [];

    ((annResp.data ?? []) as AnnouncementRow[]).forEach((row) => {
      const key = upper(row.company_code);
      if (coverage.largeCapKeys.has(key)) return; // admission gate: off-positioning, never shown
      if (!isKnownCategory(row.category)) return; // procedural / unknown never stored, but guard
      const category = row.category as ExchangeCategory;
      const summary = (row.summary ?? "").trim() || (row.headline ?? "").trim();
      if (!summary) return;

      updates.push({
        id: row.announcement_id,
        companyCode: row.company_code,
        companyName: coverage.nameByCode.get(key) ?? row.company_code,
        category,
        categoryLabel: categoryLabel(category),
        impact: coerceImpact(row.impact),
        orderSize: parseOrderSize(row.category, row.details),
        summary,
        headline: (row.headline ?? "").trim(),
        // https + exchange-host allowlist (filing-href.ts): a poisoned row keeps its
        // headline but loses the link, on every paint that renders it.
        attachmentUrl: safeFilingHref(row.attachment_url),
        filedRaw: row.filed_at,
        filedLabel: formatRelativeActivityTime(row.filed_at),
        bucketKey: bucketFor(row.filed_at, now),
      });
    });

    return {
      updates,
      impacts: buildImpactFacet(updates),
      total: updates.length,
      windowDays: WINDOW_DAYS,
    };
  } catch (err) {
    // Table missing (pre-DDL) or transient read failure — degrade to empty.
    console.warn("[exchange-desk] feed unavailable:", (err as Error)?.message ?? err);
    return EMPTY;
  }
}

/**
 * Material filings for one company, in the same shape as the Exchange Desk.
 *
 * This deliberately skips the coverage gate used by the all-company desk: a
 * reader has already navigated to this company's page, so its own filings are
 * useful whether or not it is on discovery.
 * It also deliberately skips WINDOW_DAYS: unlike the desk-wide feed (a live
 * "what's happening" tape), a company's Announcements tab is its filing
 * history, so it returns everything on record up to COMPANY_ROW_LIMIT.
 * Query failures degrade to an empty tape so a missing announcement table
 * cannot take down the company page.
 */
export async function getCompanyExchangeDeskData(
  companyCode: string,
  companyName: string | null | undefined,
): Promise<ExchangeDeskData> {
  const normalizedCode = companyCode.trim().toUpperCase();
  if (!normalizedCode) return EMPTY;

  try {
    const supabase = await createClient();
    const now = new Date();
    const { data, error } = await supabase
      .from("bse_announcements")
      .select(
        "announcement_id, company_code, filed_at, headline, subject, attachment_url, category, impact, summary, details",
      )
      .eq("company_code", normalizedCode)
      .eq("is_material", true)
      // A future-dated parsed row must not become the latest filing card.
      .lte("filed_at", now.toISOString())
      .order("filed_at", { ascending: false })
      .limit(COMPANY_ROW_LIMIT);

    if (error) throw error;

    const updates = ((data ?? []) as AnnouncementRow[]).flatMap((row) => {
      if (!isKnownCategory(row.category)) return [];
      const summary = (row.summary ?? "").trim() || (row.headline ?? "").trim();
      if (!summary) return [];

      const category = row.category as ExchangeCategory;
      return [{
        id: row.announcement_id,
        companyCode: normalizedCode,
        companyName: companyName?.trim() || normalizedCode,
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
      } satisfies ExchangeUpdate];
    });

    return {
      updates,
      impacts: buildImpactFacet(updates),
      total: updates.length,
      // Vestigial for this path — the query above applies no date cutoff, so
      // nothing here should render it as a real window. Kept only because
      // ExchangeDeskData is shared with the windowed desk-wide feed.
      windowDays: WINDOW_DAYS,
    };
  } catch (err) {
    console.warn(
      "[exchange-desk] company feed unavailable:",
      (err as Error)?.message ?? err,
    );
    return EMPTY;
  }
}
