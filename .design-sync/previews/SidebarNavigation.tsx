import { SidebarNavigation } from "concall-alpha";

// The company page's "On this page" rail: a sticky 15–16rem column of section
// links with a live "Currently reading" header. Unlike TopSectionTabs it is
// UNCONTROLLED — it takes only `sections` and owns its own active state, driven
// by a scroll-spy (IntersectionObserver + a 120px anchor line) over the real
// section elements' ids.
//
// Two consequences for anything composing with it:
//   · every `sections[].id` must match an element id on the page, or the spy
//     finds nothing, bails, and the rail freezes on the first section. That is
//     what the static renders below show — the default selection.
//   · it is DESKTOP-ONLY: the root <aside> is `hidden lg:block`, so below
//     1024px it renders nothing at all and TopSectionTabs carries navigation
//     instead. These cards force it visible at the card's own width (see the
//     scoped style) — nothing else about the render is altered.
//
// Meta pills mirror TopSectionTabs': a score circle, a count chip, or a text
// chip, and they render on EVERY row here rather than only the active one.

const FORCE_DESKTOP = `.ds-rail > aside { display: block !important; }`;

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

const FULL_SECTIONS = [
  { id: "overview", label: "Overview", meta: { kind: "text" as const, text: "Auto Components" } },
  { id: "industry-context", label: "Industry Context", meta: { kind: "text" as const, text: "Live" } },
  { id: "sub-sector", label: "Sub-sectors", meta: { kind: "count" as const, count: 3, suffix: "cards" } },
  { id: "business-overview", label: "Business Snapshot", meta: { kind: "text" as const, text: "Live" } },
  { id: "key-variables", label: "Key Variables", meta: { kind: "count" as const, count: 5, suffix: "vars" } },
  { id: "sentiment-score", label: "ConcallScore", meta: { kind: "score" as const, score: 7.4 } },
  { id: "future-growth", label: "Future Growth Prospects", meta: { kind: "score" as const, score: 7.6 } },
  { id: "guidance-history", label: "Guidance History", meta: { kind: "count" as const, count: 9, suffix: "items" } },
  { id: "moat-analysis", label: "Moat Analysis", meta: { kind: "text" as const, text: "Narrow moat" } },
  { id: "competitive-strategy", label: "Top Business Strategies", meta: { kind: "count" as const, count: 4, suffix: "plays" } },
  { id: "walk-the-talk", label: "Walk the Talk", meta: { kind: "text" as const, text: "Live" } },
  { id: "valuation-check", label: "Valuation Check", meta: { kind: "text" as const, text: "Live" } },
];

const THIN_SECTIONS = [
  { id: "overview", label: "Overview", meta: { kind: "text" as const, text: "Consumer Durables" } },
  { id: "business-overview", label: "Business Snapshot", meta: { kind: "text" as const, text: "Live" } },
  { id: "sentiment-score", label: "ConcallScore", meta: { kind: "score" as const, score: null } },
  { id: "key-variables", label: "Key Variables", meta: { kind: "text" as const, text: "Soon" } },
  { id: "valuation-check", label: "Valuation Check", meta: { kind: "text" as const, text: "Soon" } },
];

/**
 * Canonical: the rail beside the page body, as a desktop reader sees it. The
 * first row is active because no matching section elements exist to spy on —
 * on the real page the highlight follows the scroll.
 */
export const CompanyPageRail = () => (
  <div className="flex gap-6">
    <style>{FORCE_DESKTOP}</style>
    <div className="ds-rail">
      <SidebarNavigation sections={SECTIONS} />
    </div>
    <div className="min-w-0 flex-1 space-y-4">
      <div className="rounded-xl border border-border/60 bg-background/70 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Neuland Laboratories · NEULANDLAB
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The page body scrolls beside the rail. Each row links to its section anchor and the rail
          re-highlights as sections cross a line 120px below the top of the viewport — so the
          highlighted row is the one being read, not the one nearest the top.
        </p>
      </div>
      <div className="rounded-xl border border-border/40 bg-background/50 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          The rail is sticky and caps its own height against the viewport, with the list scrolling
          inside it — a company with a dozen sections never pushes it past the fold.
        </p>
      </div>
    </div>
  </div>
);

/**
 * A twelve-section company: the list outgrows the rail's height cap, scrolls
 * inside it, and the bottom gradient marks that there is more below.
 */
export const LongSectionList = () => (
  <div className="flex gap-6">
    <style>{FORCE_DESKTOP}</style>
    <div className="ds-rail">
      <SidebarNavigation sections={FULL_SECTIONS} />
    </div>
    <div className="min-w-0 flex-1 rounded-xl border border-border/40 bg-background/50 p-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Pricol · PRICOLLTD — every analysis section built, including the two that are usually
        absent (Industry Context, Top Business Strategies). The count chip in the rail&apos;s header
        is the section total, not a progress figure.
      </p>
    </div>
  </div>
);

/**
 * A thinly-covered company: five sections, two of them not built yet, and no
 * ConcallScore. The score meta degrades to an em-dash chip rather than a zero.
 */
export const ThinlyCoveredCompany = () => (
  <div className="flex gap-6">
    <style>{FORCE_DESKTOP}</style>
    <div className="ds-rail">
      <SidebarNavigation sections={THIN_SECTIONS} />
    </div>
    <div className="min-w-0 flex-1 rounded-xl border border-border/40 bg-background/50 p-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Timex Group India · TIMEX — admitted to coverage but below the composite cut, so its page
        stays reachable while it drops off the discovery surfaces.
      </p>
    </div>
  </div>
);
