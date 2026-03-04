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
    id: "sector-context",
    label: "Industry Overview",
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
    id: "competitive-strategy",
    label: "Top Business Strategies",
  },
  {
    id: "business-overview",
    label: "Business Snapshot",
  },
  {
    id: "community",
    label: "Community",
  },
] as const;

export const SECTION_MAP = {
  sectorContext: SECTIONS[0],
  quarterlyScore: SECTIONS[1],
  futureGrowth: SECTIONS[2],
  topBusinessStrategies: SECTIONS[3],
  businessSnapshot: SECTIONS[4],
  community: SECTIONS[5],
} as const;
