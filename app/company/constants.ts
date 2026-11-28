export type CompanySidebarSectionMeta =
  | { kind: "score"; score: number | null; scoreKind?: "quarterly" | "growth" | "valuation" }
  | { kind: "text"; text: string }
  | { kind: "count"; count: number; suffix?: string };

export type CompanySidebarSectionItem = {
  id: string;
  label: string;
  meta?: CompanySidebarSectionMeta;
};

export const SECTIONS = [
  {
    id: "overview",
    label: "Overview",
  },
  {
    id: "company-announcements",
    label: "Announcements",
  },
  {
    id: "industry-context",
    label: "Industry Context",
  },
  {
    id: "sub-sector",
    label: "Sub-sectors",
  },
  {
    id: "business-overview",
    label: "Business Snapshot",
  },
  {
    id: "key-variables",
    label: "Key Variables",
  },
  {
    id: "sentiment-score",
    label: "ConcallScore",
  },
  {
    id: "future-growth",
    label: "Future Growth Prospects",
  },
  {
    id: "guidance-history",
    label: "Guidance",
  },
  {
    // Was "moat-analysis" (Moat tab) until 2026-09-23; #moat-analysis links still
    // resolve here via LEGACY_SECTION_IDS in lib/section-hash.ts.
    id: "quality",
    label: "Quality",
  },
  {
    id: "community",
    label: "Community",
  },
  {
    id: "competitive-strategy",
    label: "Top Business Strategies",
  },
  {
    id: "walk-the-talk",
    label: "Walk the Talk",
  },
  {
    id: "valuation-check",
    label: "Valuation Check",
  },
  {
    // Not "journal": that section_id already tags the Journal post-gate events.
    id: "company-journal",
    label: "Journal",
  },
  {
    // Appended, not inserted: SECTION_MAP below is positional. Tab order comes from
    // buildCompanySections, which places it after Valuation Check.
    id: "broker-notes",
    label: "Broker Notes",
  },
] as const;

export const SECTION_MAP = {
  overview: SECTIONS[0],
  companyAnnouncements: SECTIONS[1],
  industryContext: SECTIONS[2],
  subSector: SECTIONS[3],
  businessSnapshot: SECTIONS[4],
  keyVariables: SECTIONS[5],
  concallScore: SECTIONS[6],
  futureGrowth: SECTIONS[7],
  guidanceHistory: SECTIONS[8],
  quality: SECTIONS[9],
  community: SECTIONS[10],
  topBusinessStrategies: SECTIONS[11],
  walkTheTalk: SECTIONS[12],
  valuationCheck: SECTIONS[13],
  companyJournal: SECTIONS[14],
  brokerNotes: SECTIONS[15],
} as const;

export type CompanySectionsInput = {
  hasJournal: boolean;
  /** BROKER_NOTES_ENABLED (lib/broker-notes/flag.ts). Off = today's list exactly. */
  brokerNotesEnabled: boolean;
  latestScore: number | null;
  growthScore: number | null;
  valuationScore: number | null;
  valuationStale: boolean;
};

/** The company page's tab list, in order, with each tab's badge. */
export function buildCompanySections({
  hasJournal,
  brokerNotesEnabled,
  latestScore,
  growthScore,
  valuationScore,
  valuationStale,
}: CompanySectionsInput): CompanySidebarSectionItem[] {
  // Only three tabs carry a badge, and each carries a score circle — nothing
  // else (decision 2026-08-26). The tab bar reads as a three-number scorecard:
  // ConcallScore (quarterly), Future Growth, and Valuation, each in its own band
  // scheme. A score that isn't available yet (null, or a stale/withheld
  // valuation) simply shows no badge rather than a placeholder. Every other tab
  // is label-only (Broker Notes included: no count pill, decision 2026-11-28).
  return [
    SECTION_MAP.overview,
    SECTION_MAP.businessSnapshot,
    SECTION_MAP.industryContext,
    SECTION_MAP.quality,
    {
      ...SECTION_MAP.concallScore,
      meta:
        latestScore != null
          ? { kind: "score" as const, score: latestScore, scoreKind: "quarterly" as const }
          : undefined,
    },
    SECTION_MAP.keyVariables,
    {
      ...SECTION_MAP.futureGrowth,
      meta:
        growthScore != null
          ? { kind: "score" as const, score: growthScore, scoreKind: "growth" as const }
          : undefined,
    },
    // Walk the Talk tab hidden for now — verdict-style synthesis surface;
    // re-enable when ready. Component code is kept intact.
    // { ...SECTION_MAP.walkTheTalk },
    {
      ...SECTION_MAP.valuationCheck,
      // Withhold the badge when the valuation is stale — the portal already
      // withholds a valuation priced more than 10 days ago, so the tab must not
      // flash a score the section itself won't stand behind.
      meta:
        valuationScore != null && !valuationStale
          ? { kind: "score" as const, score: valuationScore, scoreKind: "valuation" as const }
          : undefined,
    },
    // Broker Notes sits right after Valuation (the street view beside ours), behind
    // the server flag.
    ...(brokerNotesEnabled ? [SECTION_MAP.brokerNotes] : []),
    SECTION_MAP.guidanceHistory,
    // Community tab retired for now — no engagement (1 comment total as of 2026-07).
    // Component + API routes + Supabase tables kept intact; re-enable when ready.
    // { ...SECTION_MAP.community },
    // Only when the Journal has a post on this company — an empty tab
    // on the ~75% of pages without one would be a dead click.
    ...(hasJournal ? [SECTION_MAP.companyJournal] : []),
    // Announcements is the last tab (decision 2026-10-03; it was second).
    SECTION_MAP.companyAnnouncements,
  ];
}
