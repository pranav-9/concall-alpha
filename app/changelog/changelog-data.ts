export type ChangelogHighlightKind = "added" | "improved" | "fixed";

export type ChangelogHighlight = {
  kind: ChangelogHighlightKind;
  text: string;
};

export type ChangelogEntry = {
  version: string;
  releasedAt: string;
  releasedLabel: string;
  title: string;
  summary: string;
  scope: string;
  accent: "violet" | "sky" | "emerald" | "amber";
  highlights: ChangelogHighlight[];
};

export const changelogEntries: ChangelogEntry[] = [
  {
    version: "v0.9.0",
    releasedAt: "2026-04-20",
    releasedLabel: "20 Apr 2026",
    title: "Changelog now lives in the portal",
    summary:
      "Release notes are now visible inside the product so product updates can be scanned without leaving the research workflow.",
    scope: "Portal shell",
    accent: "violet",
    highlights: [
      {
        kind: "added",
        text: "A dedicated changelog page with version chips, date chips, and reverse-chronological release cards.",
      },
      {
        kind: "added",
        text: "A homepage teaser and footer entry so the latest update is reachable from the main portal surfaces.",
      },
      {
        kind: "improved",
        text: "The changelog follows the same layered surface grammar as the rest of the research portal.",
      },
    ],
  },
  {
    version: "v0.8.0",
    releasedAt: "2026-03-18",
    releasedLabel: "18 Mar 2026",
    title: "Requests became easier to scan",
    summary:
      "The request intake flow now shows recent demand and the latest request date alongside the submission form.",
    scope: "Requests",
    accent: "sky",
    highlights: [
      {
        kind: "added",
        text: "A demand visibility panel for the latest stock requests users have submitted.",
      },
      {
        kind: "improved",
        text: "Cleaner request labeling so feedback, stock additions, and bug reports read as distinct paths.",
      },
      {
        kind: "fixed",
        text: "The latest-request summary now carries a clearer date readout for fast triage.",
      },
    ],
  },
  {
    version: "v0.7.0",
    releasedAt: "2026-02-11",
    releasedLabel: "11 Feb 2026",
    title: "How Scores Work got a cleaner read order",
    summary:
      "The score explainer was reorganized so growth and quarterly lenses are easier to compare at a glance.",
    scope: "Score framework",
    accent: "amber",
    highlights: [
      {
        kind: "improved",
        text: "Tabbed growth and quarterly sections now carry the main scoring logic with less visual clutter.",
      },
      {
        kind: "added",
        text: "More compact metric cards and summary panels for the score framework overview.",
      },
      {
        kind: "fixed",
        text: "Excess explanatory text was trimmed so the page reads more like a research guide and less like a product essay.",
      },
    ],
  },
  {
    version: "v0.6.0",
    releasedAt: "2026-01-15",
    releasedLabel: "15 Jan 2026",
    title: "Homepage research rails were tightened",
    summary:
      "The homepage gained denser research context without sacrificing scan speed in the hero area.",
    scope: "Homepage",
    accent: "emerald",
    highlights: [
      {
        kind: "added",
        text: "A recent score updates rail for the latest company-level movements.",
      },
      {
        kind: "improved",
        text: "Coverage metrics and analysis cards now share the same airy portal rhythm.",
      },
      {
        kind: "fixed",
        text: "Spacing around the hero coverage summary was tightened for smaller desktop widths.",
      },
    ],
  },
];

export const latestChangelogEntry = changelogEntries[0];
