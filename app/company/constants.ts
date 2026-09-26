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
} as const;
