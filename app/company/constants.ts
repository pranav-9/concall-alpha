export type CompanySidebarSectionMeta =
  | { kind: "score"; score: number | null }
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
    label: "Quarterly Score",
  },
  {
    id: "future-growth",
    label: "Future Growth Prospects",
  },
  {
    id: "guidance-history",
    label: "Guidance History",
  },
  {
    id: "moat-analysis",
    label: "Moat Analysis",
  },
  {
    id: "community",
    label: "Community",
  },
  {
    id: "competitive-strategy",
    label: "Top Business Strategies",
  },
] as const;

export const SECTION_MAP = {
  overview: SECTIONS[0],
  industryContext: SECTIONS[1],
  subSector: SECTIONS[2],
  businessSnapshot: SECTIONS[3],
  keyVariables: SECTIONS[4],
  quarterlyScore: SECTIONS[5],
  futureGrowth: SECTIONS[6],
  guidanceHistory: SECTIONS[7],
  moatAnalysis: SECTIONS[8],
  community: SECTIONS[9],
  topBusinessStrategies: SECTIONS[10],
} as const;
