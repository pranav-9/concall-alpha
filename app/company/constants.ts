export const SECTIONS = [
  {
    id: "overview",
    label: "Overview",
  },
  {
    id: "business-overview",
    label: "Business Overview",
  },
  {
    id: "competitive-strategy",
    label: "Competitive Strategy",
  },
  {
    id: "sentiment-score",
    label: "Sentiment Score",
  },
] as const;

export const SECTION_MAP = {
  overview: SECTIONS[0],
  businessOverview: SECTIONS[1],
  competitiveStrategy: SECTIONS[2],
  sentimentScore: SECTIONS[3],
} as const;
