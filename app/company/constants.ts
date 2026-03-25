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
    id: "industry-context",
    label: "Industry Context",
  },
  {
    id: "business-overview",
    label: "Business Snapshot",
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
  industryContext: SECTIONS[0],
  businessSnapshot: SECTIONS[1],
  quarterlyScore: SECTIONS[2],
  futureGrowth: SECTIONS[3],
  guidanceHistory: SECTIONS[4],
  moatAnalysis: SECTIONS[5],
  community: SECTIONS[6],
  topBusinessStrategies: SECTIONS[7],
} as const;
