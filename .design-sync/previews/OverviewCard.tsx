import { OverviewCard } from "concall-alpha";

// The company page's identity hero and jump board. It is the one sanctioned
// hand-rolled L1 on the page - it deliberately does NOT go through SectionCard -
// and it carries the only use of the "Hero name" type tier in the design system.
//
// Everything below the name is `sectionGroups`: labelled groups of preview
// tiles, each tile a jump link into a section further down the page. A tile can
// carry, in this order of prominence:
//   * an indicator on the right - either a ConcallScore (0-10) or a pill;
//   * body pills (rank / percentile), toned via getPercentileTone;
//   * a segment-mix bar with a legend, when the section has a shape worth
//     showing rather than a number;
//   * a one-line takeaway, clamped to two lines.
// Tone is the `OverviewBodyPillTone` union - "emerald" | "sky" | "amber" |
// "rose" | "slate" - not a sentiment word.
//
// A tile whose indicator pill reads exactly "Soon" is the locked variant: it
// stops being a button, badges itself "Not ready", and shows the request
// control instead. That string is load-bearing.
//
// `watchlistSlot` is a ReactNode the page fills with a Suspense-wrapped server
// component, so the hero can render before the user's watchlist state resolves.
//
// Running example: Anvira Speciality Chemicals (ANVIRACHEM), a mid-cap CDMO and
// agrochemical-intermediates maker, as of Q1 FY27.

const COMPANY = {
  code: "ANVIRACHEM",
  name: "Anvira Speciality Chemicals",
  isNew: false,
  marketCapBand: "mid",
  sector: "Chemicals",
};

const WatchlistSlot = () => (
  <button
    type="button"
    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 text-[12px] font-medium text-foreground hover:bg-muted/60"
  >
    <span aria-hidden="true">+</span>
    Add to watchlist
  </button>
);

const SEGMENT_MIX = [
  { name: "CDMO & Custom Synthesis", sharePct: 41.2 },
  { name: "Agrochemical Intermediates", sharePct: 26.4 },
  { name: "Performance Additives", sharePct: 15.1 },
  { name: "Pigment Intermediates", sharePct: 8.3 },
  { name: "Pharma Intermediates", sharePct: 5.2 },
];

/**
 * Canonical: the full decision-ordered board. What the business is and how
 * durable, then how it is doing and where it is headed, then whether management
 * can be trusted and what drives the number. Business Snapshot leads with the
 * mix bar; the two score tiles lead with a ConcallScore; the rest lead with a
 * categorical pill.
 */
export const CompanyHero = () => (
  <OverviewCard
    companyInfo={COMPANY}
    watchlistSlot={<WatchlistSlot />}
    sectionGroups={[
      {
        key: "business",
        label: "Business & moat",
        previews: [
          {
            title: "Business Snapshot",
            href: "#business-overview",
            takeaway: "Revenue 13% 3-yr CAGR",
            media: { kind: "segment-bar", segments: SEGMENT_MIX },
          },
          {
            title: "Moat Analysis",
            href: "#moat-analysis",
            takeaway:
              "An 18-24 month regulatory re-filing keeps validated CDMO customers in place.",
            indicator: { kind: "pill", label: "Narrow Moat - Mid", tone: "sky" },
          },
        ],
      },
      {
        key: "performance",
        label: "Performance & outlook",
        previews: [
          {
            title: "Quarterly Score",
            href: "#sentiment-score",
            bodyPills: [
              { label: "Q Rank 14/100", tone: "sky" },
              { label: "Top 14%", tone: "sky" },
            ],
            indicator: { kind: "score", score: 7.4 },
          },
          {
            title: "Growth Prospects",
            href: "#future-growth",
            takeaway: "FY27 base-case growth 16-19%",
            bodyPills: [
              { label: "Growth Rank 9/100", tone: "emerald" },
              { label: "Top 9%", tone: "emerald" },
            ],
            indicator: { kind: "score", score: 7.9 },
          },
        ],
      },
      {
        key: "management",
        label: "Management & drivers",
        previews: [
          {
            title: "Guidance Tracker",
            href: "#guidance-history",
            bodyPills: [{ label: "Revenue guidance: 15-18%", tone: "sky" }],
            indicator: { kind: "pill", label: "Mostly Delivered", tone: "emerald" },
          },
          {
            title: "Key Variables",
            href: "#key-variables",
            takeaway: "Block 2 utilisation - improving for three quarters",
            indicator: { kind: "pill", label: "6 vars" },
          },
        ],
      },
    ]}
  />
);

/**
 * The locked variant. Two sections have not been generated for this company, so
 * their tiles carry the "Soon" indicator - which turns them from jump buttons
 * into "Not ready" cards with the request control. Nothing is hidden: the
 * reader still learns the section exists.
 */
export const SectionNotReady = () => (
  <OverviewCard
    companyInfo={{
      code: "TIMEX",
      name: "Timex Group India",
      isNew: true,
      marketCapBand: "small",
      sector: "Consumer Durables",
    }}
    watchlistSlot={<WatchlistSlot />}
    sectionGroups={[
      {
        key: "business",
        label: "Business & moat",
        previews: [
          {
            title: "Business Snapshot",
            href: "#business-overview",
            takeaway: "Watches and accessories, licensed and own-brand.",
            indicator: { kind: "pill", label: "Ready", tone: "emerald" },
          },
          {
            title: "Moat Analysis",
            href: "#moat-analysis",
            indicator: { kind: "pill", label: "Soon" },
          },
        ],
      },
      {
        key: "performance",
        label: "Performance & outlook",
        previews: [
          {
            title: "Quarterly Score",
            href: "#sentiment-score",
            indicator: { kind: "pill", label: "Soon" },
          },
          {
            title: "Growth Prospects",
            href: "#future-growth",
            indicator: { kind: "pill", label: "Soon" },
          },
        ],
      },
    ]}
  />
);

/**
 * The hero alone - no section groups. This is what the page paints first, and
 * what a company with nothing generated yet keeps: the identity chips, the
 * market-cap band with its sector, and the watchlist control.
 */
export const IdentityOnly = () => (
  <OverviewCard companyInfo={COMPANY} watchlistSlot={<WatchlistSlot />} />
);
