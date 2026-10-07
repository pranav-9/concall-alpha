// Watchlist analytics (phase 1, 2026-10-07) — the view-model shapes for the
// `/watchlists/[id]?view=analytics` page: the list read as a list rather than
// one row per company. Four blocks, every one derived from promoted rows
// through the section's own normalizer, so nothing here can say something a
// company page does not:
//   1. Where the list sits   — sector / sub-sector / Hot Theme distribution
//   2. The good and the bad  — the Overview's pros-cons rules, aggregated by rule
//   3. Big filings           — the list's material filings, ranked as the
//                              Announcements page ranks its Top 5
//   4. Latest changes        — a dated ledger of what moved in the analysis
//
// The pure builders (distribution.ts, pros-cons.ts, announcements.ts,
// changes.ts) are pinned by tests/watchlist-analytics.test.ts; the server side
// (data.ts + build.ts) only gathers inputs and assembles.

import type { ProsConsSide, ProsConsSource } from "@/lib/overview-pros-cons";
import type { ExchangeUpdate } from "@/lib/exchange-desk/types";
import type { AnnouncementStoryRead } from "@/lib/announcement-story-read/types";

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export type WatchlistCompany = {
  /** UPPERCASE code. */
  code: string;
  name: string;
  sector: string | null;
  subSector: string | null;
};

// ---------------------------------------------------------------------------
// 1. Where the list sits
// ---------------------------------------------------------------------------

export type DistributionBucket = {
  /** The label as stored on the first company seen with it. */
  label: string;
  count: number;
  /** count / total, 0–1. */
  share: number;
  /** UPPERCASE codes, A–Z. */
  codes: string[];
  /** A page for the bucket (sectors only, and only when one exists), else null. */
  href: string | null;
};

export type ThemeBucket = {
  slug: string;
  title: string;
  hotness: number | null;
  count: number;
  codes: string[];
};

export type WatchlistDistribution = {
  total: number;
  /** Most names first, then A–Z. */
  sectors: DistributionBucket[];
  subSectors: DistributionBucket[];
  /** Featured Hot Themes with at least one member on the list; most members first. */
  themes: ThemeBucket[];
  /** Codes with no sector on record. */
  unclassified: string[];
  /** One templated line on concentration; null for a list under two names. */
  line: string | null;
};

// ---------------------------------------------------------------------------
// 2. The good and the bad, across the list
// ---------------------------------------------------------------------------

export type CrossProsConsCompany = {
  code: string;
  name: string;
  /** That company's own evidence line for the rule, as the Overview shows it. */
  evidence: string | null;
  weight: number;
};

export type CrossProsConsItem = {
  /** `<rule id>|<claim>` — one row per rule and wording. */
  key: string;
  ruleId: string;
  side: ProsConsSide;
  source: ProsConsSource;
  /** The rule's own claim, verbatim from lib/overview-pros-cons. */
  label: string;
  count: number;
  /** The heaviest weight any company carried for this rule. */
  weight: number;
  /** Heaviest first. */
  companies: CrossProsConsCompany[];
};

export type CrossProsCons = {
  good: CrossProsConsItem[];
  bad: CrossProsConsItem[];
  /** Companies on the list. */
  total: number;
  /** Companies for which at least one rule fired on either side. */
  readCount: number;
};

// ---------------------------------------------------------------------------
// 3. Big filings
// ---------------------------------------------------------------------------

export type WatchlistFiling = {
  rank: number;
  update: ExchangeUpdate;
  /** The producer's story read, when one exists for this filing. */
  read: AnnouncementStoryRead | null;
  /** The card's one line: the read's headline, else the tape's own summary. */
  headline: string;
};

export type WatchlistFilings = {
  picks: WatchlistFiling[];
  windowDays: number;
  /** Material filings in the window, all impacts. */
  total: number;
  good: number;
  adverse: number;
  routine: number;
  /** Non-routine filings that did not make the picks (cap or per-company limit). */
  hidden: number;
};

// ---------------------------------------------------------------------------
// 4. Latest changes
// ---------------------------------------------------------------------------

export type ChangeKind =
  | "quarter"
  | "growth"
  | "valuation"
  | "guidance"
  | "quality"
  | "moat"
  | "business"
  | "key_variables"
  /** Several sections of one company refreshed on the same day (a deep-track or quarter refresh), folded into one line. */
  | "sections";

export type ChangeTone = "good" | "bad" | "muted";

export type WatchlistChange = {
  id: string;
  kind: ChangeKind;
  code: string;
  name: string;
  /** ISO timestamp of the change. */
  at: string;
  atMs: number;
  /** "ConcallScore 7.4 · Q2 FY27" */
  title: string;
  /** "+0.6 vs Q1 FY27" */
  detail: string | null;
  tone: ChangeTone;
  /** Where the change can be read: the company page section. */
  href: string;
};

export type ChangeBucketKey = "today" | "week" | "earlier";

export type ChangeBucket = {
  key: ChangeBucketKey;
  label: string;
  items: WatchlistChange[];
};

export type WatchlistChanges = {
  buckets: ChangeBucket[];
  windowDays: number;
  /** Changes inside the window. */
  total: number;
  /** Changes rendered (newest first, capped). */
  shown: number;
};

// ---------------------------------------------------------------------------
// The whole view
// ---------------------------------------------------------------------------

export type WatchlistAnalyticsCoverage = {
  quality: number;
  moat: number;
  concall: number;
  growth: number;
  valuation: number;
  guidance: number;
};

export type WatchlistAnalytics = {
  companies: WatchlistCompany[];
  distribution: WatchlistDistribution;
  prosCons: CrossProsCons;
  filings: WatchlistFilings;
  changes: WatchlistChanges;
  /** How many of the list's companies carry each substrate — what the blocks could read. */
  coverage: WatchlistAnalyticsCoverage;
};
