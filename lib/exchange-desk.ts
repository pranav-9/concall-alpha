import "server-only";

import { createClient } from "@/lib/supabase/server";
import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";
import { formatRelativeActivityTime } from "@/lib/activity-feed";
import {
  CATEGORY_META,
  categoryLabel,
  coerceImpact,
  isKnownCategory,
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
  excluded_from_discovery: boolean | null;
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
};

/**
 * Discovery-listed company names keyed by uppercased code, plus the excluded set
 * (large-cap admissions and below-cut names), mirroring the desk leaderboard.
 */
async function fetchCoverage(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data, error } = await supabase
    .from("company")
    .select(`code, name, ${COVERAGE_SELECT}`);
  if (error) throw error;

  const nameByCode = new Map<string, string>();
  const excludedKeys = new Set<string>();
  (data ?? []).forEach((raw) => {
    const row = raw as CoverageRow;
    if (!isDiscoveryListed(row)) {
      if (row.code) excludedKeys.add(upper(row.code));
      if (row.name) excludedKeys.add(upper(row.name));
      return;
    }
    if (row.code) nameByCode.set(upper(row.code), row.name ?? row.code);
  });
  return { nameByCode, excludedKeys };
}

const EMPTY: ExchangeDeskData = {
  updates: [],
  categories: [],
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
          "announcement_id, company_code, filed_at, headline, subject, attachment_url, category, impact, summary",
        )
        .eq("is_material", true)
        .gte("filed_at", cutoff.toISOString())
        .order("filed_at", { ascending: false })
        .limit(ROW_LIMIT),
    ]);

    if (annResp.error) throw annResp.error;

    const counts = new Map<ExchangeCategory, number>();
    const updates: ExchangeUpdate[] = [];

    ((annResp.data ?? []) as AnnouncementRow[]).forEach((row) => {
      const key = upper(row.company_code);
      if (coverage.excludedKeys.has(key)) return; // off discovery
      if (!isKnownCategory(row.category)) return; // procedural / unknown never stored, but guard
      const category = row.category as ExchangeCategory;
      const summary = (row.summary ?? "").trim() || (row.headline ?? "").trim();
      if (!summary) return;

      counts.set(category, (counts.get(category) ?? 0) + 1);
      updates.push({
        id: row.announcement_id,
        companyCode: row.company_code,
        companyName: coverage.nameByCode.get(key) ?? row.company_code,
        category,
        categoryLabel: categoryLabel(category),
        impact: coerceImpact(row.impact),
        summary,
        headline: (row.headline ?? "").trim(),
        attachmentUrl: row.attachment_url,
        filedRaw: row.filed_at,
        filedLabel: formatRelativeActivityTime(row.filed_at),
        bucketKey: bucketFor(row.filed_at, now),
      });
    });

    const categories = CATEGORY_META.filter((c) => (counts.get(c.key) ?? 0) > 0).map(
      (c) => ({ key: c.key, label: c.label, count: counts.get(c.key) ?? 0 }),
    );

    return { updates, categories, total: updates.length, windowDays: WINDOW_DAYS };
  } catch (err) {
    // Table missing (pre-DDL) or transient read failure — degrade to empty.
    console.warn("[exchange-desk] feed unavailable:", (err as Error)?.message ?? err);
    return EMPTY;
  }
}
