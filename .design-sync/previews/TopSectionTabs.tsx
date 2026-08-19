import type { CSSProperties, ReactNode } from "react";
import { TopSectionTabs } from "concall-alpha";

// The company page's section switcher. The page renders ONE section at a time
// and this bar is how the reader moves between them, so it is not decoration —
// it is the page's primary navigation.
//
// Mechanics worth knowing before composing with it:
//   · it renders a flow PLACEHOLDER plus a position:fixed bar, and publishes its
//     own measured height as --company-tabs-height so every SectionCard's
//     scroll-margin can clear it. Nothing else on the page reserves that space.
//   · it parks itself under the global navbar, at
//     calc(var(--global-navbar-height, 84px) + 0.5rem). The previews below set
//     that variable to the mock header's height so the bar lands where it would
//     on the real page.
//   · labels are SHORTENED by an internal map (ConcallScore → "Quarterly",
//     Key Variables → "Variables"); an id the map doesn't know keeps its full
//     label, which is why "Moat Analysis" and "Valuation Check" run long.
//   · the meta pill renders for the ACTIVE tab only, and only from the lg
//     breakpoint up.
//
// It is controlled: activeSectionId in, onSectionChange out. The page owns the
// state (and the URL hash), not the bar.

const HEADER_HEIGHT = 52;

// The bar is position:fixed, so it needs a containing block (any transform makes
// one) whose left edge is the same as the page's — it derives its own left/width
// from the placeholder's viewport rect. The negative margin cancels the card's
// 24px gutter so the frame's box starts at x=0 and the bar lands where the
// placeholder is; the matching padding puts the visual gutter back for
// everything else in the frame.
const frameStyle = (navbarHeight: number) =>
  ({
    "--global-navbar-height": `${navbarHeight}px`,
    transform: "translateZ(0)",
    marginInline: "-24px",
    paddingInline: "24px",
  }) as CSSProperties;

const FRAME_STYLE = frameStyle(HEADER_HEIGHT);
// No mock header above the bar: park it at the top of its own frame instead.
const BARE_FRAME_STYLE = frameStyle(0);

// The eight sections the company page ships today, in page order, with the
// metas the page actually computes: the sector on Overview, the moat rating,
// the latest ConcallScore, variable and guidance counts, the forward score.
const SECTIONS = [
  { id: "overview", label: "Overview", meta: { kind: "text" as const, text: "Pharmaceuticals" } },
  { id: "business-overview", label: "Business Snapshot", meta: { kind: "text" as const, text: "Live" } },
  { id: "moat-analysis", label: "Moat Analysis", meta: { kind: "text" as const, text: "Narrow moat" } },
  { id: "sentiment-score", label: "ConcallScore", meta: { kind: "score" as const, score: 8.2 } },
  { id: "key-variables", label: "Key Variables", meta: { kind: "count" as const, count: 6, suffix: "vars" } },
  { id: "future-growth", label: "Future Growth Prospects", meta: { kind: "score" as const, score: 8.1 } },
  { id: "valuation-check", label: "Valuation Check", meta: { kind: "text" as const, text: "Live" } },
  { id: "guidance-history", label: "Guidance History", meta: { kind: "count" as const, count: 12, suffix: "items" } },
];

const THIN_COMPANY_SECTIONS = [
  { id: "overview", label: "Overview", meta: { kind: "text" as const, text: "Consumer Durables" } },
  { id: "business-overview", label: "Business Snapshot", meta: { kind: "text" as const, text: "Live" } },
  { id: "moat-analysis", label: "Moat Analysis", meta: { kind: "text" as const, text: "Soon" } },
  { id: "sentiment-score", label: "ConcallScore", meta: { kind: "score" as const, score: null } },
  { id: "key-variables", label: "Key Variables", meta: { kind: "text" as const, text: "Soon" } },
  { id: "valuation-check", label: "Valuation Check", meta: { kind: "text" as const, text: "Soon" } },
];

function PageFrame({
  companyName,
  ticker,
  children,
  body,
}: {
  companyName: string;
  ticker: string;
  children: ReactNode;
  body: ReactNode;
}) {
  return (
    <div style={FRAME_STYLE}>
      <div
        className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/90 px-4"
        style={{ height: HEADER_HEIGHT }}
      >
        <span className="text-[13px] font-semibold text-foreground">Story of a Stock</span>
        <span className="text-[11px] text-muted-foreground">
          {companyName} · {ticker}
        </span>
      </div>
      {children}
      <div className="rounded-xl border border-border/40 bg-background/50 p-4">{body}</div>
    </div>
  );
}

/**
 * Canonical: the switcher on a fully-covered company page, sitting under the
 * site header with the ConcallScore section selected. The active pill is the
 * inverted one; everything else is quiet until hovered.
 */
export const CompanySectionSwitcher = () => (
  <PageFrame
    companyName="Neuland Laboratories"
    ticker="NEULANDLAB"
    body={
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          ConcallScore · Q1 FY27
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The selected section renders here. Only one section is mounted at a time — the bar above
          is what swaps it, and it pushes the section id into the URL hash on the way.
        </p>
      </div>
    }
  >
    <TopSectionTabs
      sections={SECTIONS}
      activeSectionId="sentiment-score"
      onSectionChange={() => {}}
    />
  </PageFrame>
);

/**
 * A thinly-covered company: half its sections are still "Soon" and it has no
 * ConcallScore yet. The bar keeps every tab — the sections exist, the analysis
 * doesn't — so the reader can see what is coming rather than what is missing.
 */
export const ThinlyCoveredCompany = () => (
  <PageFrame
    companyName="Timex Group India"
    ticker="TIMEX"
    body={
      <p className="text-sm leading-relaxed text-muted-foreground">
        Overview is the fallback selection whenever the hash doesn&apos;t name a section this
        company has.
      </p>
    }
  >
    <TopSectionTabs
      sections={THIN_COMPANY_SECTIONS}
      activeSectionId="overview"
      onSectionChange={() => {}}
    />
  </PageFrame>
);

/**
 * The meta pill next to the active tab is `hidden lg:inline-flex`, so it only
 * exists from 1024px up — below that the tab is the label alone. This card
 * forces it visible at the card's width to show the three meta kinds the page
 * feeds in: a score circle, a count chip and a text chip.
 */
export const ActiveTabMeta = () => (
  <div className="space-y-3">
    <style>{`.ds-tabs-desktop nav button > span.hidden { display: inline-flex !important; }`}</style>
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      Desktop only (≥1024px): the active tab carries its section&apos;s meta — the latest
      ConcallScore as a score circle, a variable count, or a status word.
    </p>
    {[
      { active: "sentiment-score", note: "kind: score — the latest ConcallScore, 8.2" },
      { active: "key-variables", note: "kind: count — 6 vars" },
      { active: "moat-analysis", note: "kind: text — the moat rating" },
    ].map((variant) => (
      <div key={variant.active} className="ds-tabs-desktop space-y-1.5">
        <p className="text-[11px] text-muted-foreground">{variant.note}</p>
        <div style={BARE_FRAME_STYLE}>
          <TopSectionTabs
            sections={SECTIONS}
            activeSectionId={variant.active}
            onSectionChange={() => {}}
          />
        </div>
      </div>
    ))}
  </div>
);
