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
  businessSnapshot: SECTIONS[2],
  keyVariables: SECTIONS[3],
  quarterlyScore: SECTIONS[4],
  futureGrowth: SECTIONS[5],
  guidanceHistory: SECTIONS[6],
  moatAnalysis: SECTIONS[7],
  community: SECTIONS[8],
  topBusinessStrategies: SECTIONS[9],
} as const;
