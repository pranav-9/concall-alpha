export const SECTIONS = [
  {
    id: "overview",
    label: "Overview",
  },
  {
    id: "sentiment-score",
    label: "Sentiment Score",
  },
  {
    id: "placeholder",
    label: "Placeholder",
  },
  {
    id: "competitive-strategy",
    label: "Competitive Strategy",
  },
  {
    id: "business-overview",
    label: "Business Overview",
  },
] as const;

export const SECTION_MAP = {
  overview: SECTIONS[0],
  sentimentScore: SECTIONS[1],
  placeholder: SECTIONS[2],
  competitiveStrategy: SECTIONS[3],
  businessOverview: SECTIONS[4],
} as const;
