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
    id: "placeholder",
    label: "Future Growth Prospects",
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
  community: SECTIONS[4],
  topBusinessStrategies: SECTIONS[5],
} as const;
