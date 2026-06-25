export type ChangelogCategory =
  | "Company analysis"
  | "Score framework"
  | "Portal";

export type ChangelogStatus = "new" | "updated";

export type ChangelogEntry = {
  date: string;
  dateLabel: string;
  title: string;
  category: ChangelogCategory;
  status: ChangelogStatus;
};

// Newest first. Dates are derived from git history of the user-visible Portal UI
// work, cross-referenced with the activity log. "new" = brand new capability,
// "updated" = significant enhancement to a capability that already existed.
export const changelogEntries: ChangelogEntry[] = [
  { date: "2026-06-25", dateLabel: "25 Jun 2026", title: "\"Recovering\" trend label", category: "Score framework", status: "updated" },
  { date: "2026-06-25", dateLabel: "25 Jun 2026", title: "Score trend label on company pages", category: "Score framework", status: "updated" },
  { date: "2026-06-25", dateLabel: "25 Jun 2026", title: "Decision signals on watchlists", category: "Portal", status: "updated" },
  { date: "2026-06-24", dateLabel: "24 Jun 2026", title: "Visual quarterly score breakdown", category: "Score framework", status: "updated" },
  { date: "2026-06-12", dateLabel: "12 Jun 2026", title: "Score trend labels on leaderboards", category: "Score framework", status: "updated" },
  { date: "2026-06-01", dateLabel: "1 Jun 2026", title: "Segment history on company pages", category: "Company analysis", status: "new" },
  { date: "2026-06-01", dateLabel: "1 Jun 2026", title: "Business snapshot redesigned", category: "Company analysis", status: "updated" },
  { date: "2026-05-28", dateLabel: "28 May 2026", title: "Guidance tracking redesigned", category: "Company analysis", status: "updated" },
  { date: "2026-05-25", dateLabel: "25 May 2026", title: "Quarterly score breakdown by category", category: "Score framework", status: "new" },
  { date: "2026-05-19", dateLabel: "19 May 2026", title: "Q4 FY26 results tracker", category: "Portal", status: "new" },
  { date: "2026-05-14", dateLabel: "14 May 2026", title: "Walk the talk (guidance vs delivery)", category: "Company analysis", status: "new" },
  { date: "2026-05-13", dateLabel: "13 May 2026", title: "In-portal feedback polls", category: "Portal", status: "new" },
  { date: "2026-04-29", dateLabel: "29 Apr 2026", title: "Sub-sector tabs on company pages", category: "Company analysis", status: "updated" },
  { date: "2026-04-29", dateLabel: "29 Apr 2026", title: "Filter sectors by sub-sector", category: "Portal", status: "new" },
  { date: "2026-04-28", dateLabel: "28 Apr 2026", title: "Moat leaderboard", category: "Score framework", status: "new" },
  { date: "2026-04-28", dateLabel: "28 Apr 2026", title: "Company overview redesigned", category: "Company analysis", status: "updated" },
  { date: "2026-04-27", dateLabel: "27 Apr 2026", title: "Score moves on the activity feed", category: "Portal", status: "new" },
  { date: "2026-04-24", dateLabel: "24 Apr 2026", title: "Value chain on company pages", category: "Company analysis", status: "new" },
  { date: "2026-04-24", dateLabel: "24 Apr 2026", title: "Changelog inside the portal", category: "Portal", status: "new" },
  { date: "2026-04-21", dateLabel: "21 Apr 2026", title: "Moat analysis on company pages", category: "Company analysis", status: "new" },
  { date: "2026-04-20", dateLabel: "20 Apr 2026", title: "Portal redesign", category: "Portal", status: "updated" },
  { date: "2026-04-16", dateLabel: "16 Apr 2026", title: "Deeper industry context on company pages", category: "Company analysis", status: "updated" },
  { date: "2026-04-07", dateLabel: "7 Apr 2026", title: "Key variables on company pages", category: "Company analysis", status: "new" },
  { date: "2026-03-11", dateLabel: "11 Mar 2026", title: "Guidance tracking", category: "Company analysis", status: "new" },
  { date: "2026-03-11", dateLabel: "11 Mar 2026", title: "Stock request intake", category: "Portal", status: "new" },
  { date: "2026-03-07", dateLabel: "7 Mar 2026", title: "Industry analysis on company pages", category: "Company analysis", status: "new" },
  { date: "2026-03-03", dateLabel: "3 Mar 2026", title: "Watchlists for authenticated users", category: "Portal", status: "new" },
  { date: "2026-03-03", dateLabel: "3 Mar 2026", title: "Business snapshot on company pages", category: "Company analysis", status: "new" },
  { date: "2026-02-26", dateLabel: "26 Feb 2026", title: "Sectors view", category: "Portal", status: "new" },
  { date: "2026-02-24", dateLabel: "24 Feb 2026", title: "Company comments", category: "Company analysis", status: "new" },
  { date: "2026-02-20", dateLabel: "20 Feb 2026", title: "Trend twist (momentum signal)", category: "Score framework", status: "new" },
  { date: "2026-02-10", dateLabel: "10 Feb 2026", title: "How Scores Work explainer", category: "Score framework", status: "new" },
  { date: "2026-01-19", dateLabel: "19 Jan 2026", title: "Growth score and growth leaderboard", category: "Score framework", status: "new" },
  { date: "2026-01-09", dateLabel: "9 Jan 2026", title: "Score reasoning", category: "Score framework", status: "updated" },
  { date: "2025-10-09", dateLabel: "9 Oct 2025", title: "Quarterly score on every company page", category: "Score framework", status: "new" },
  { date: "2025-10-06", dateLabel: "6 Oct 2025", title: "Portal launched", category: "Portal", status: "new" },
];

export const latestChangelogEntry = changelogEntries[0];
