import { ExpandableText, SectionCard } from "concall-alpha";

// ExpandableText is the portal's inline "long prose, folded" primitive: a
// line-clamped paragraph plus a pill-shaped Show more / Show less toggle. It is
// the SUB-ELEMENT collapse the UI rules allow inside an already-expanded
// section — not a section-level collapse (that's SectionCard's `collapsible`)
// and not a drawer.
//
// Collapsed is the only state a static render can show; the toggle flips it in
// the browser. previewLines only understands 2 and 3 — any other value falls
// back to a 2-line clamp, so don't pass 4.

const MOAT_NARRATIVE =
  "Qualification cycles for a regulated intermediate run eighteen to twenty-four months and the " +
  "customer carries the filing risk, so a competitor undercutting on price still cannot move the " +
  "volume until the next filing window opens. That is a real switching cost, but a shallow one: it " +
  "delays entry rather than preventing it, and it resets every time the customer re-files. The " +
  "durable half of the moat sits in the scale of the CMS block instead, where four of the top ten " +
  "innovator relationships now run across more than one molecule.";

const MANAGEMENT_COMMENTARY =
  "Management framed the Q1 FY27 ramp as capacity-led rather than price-led, and was explicit that " +
  "the two new blocks commissioned in March will not contribute meaningfully until the second half. " +
  "Asked twice about the peptide order book, they declined to quantify it and repeated the earlier " +
  "language about \"a healthy pipeline\" — the same phrasing used in Q4 FY26, which is why the " +
  "guidance trail records no new number this quarter.";

/** Canonical: the default two-line fold on a piece of section prose. */
export const Collapsed = () => (
  <ExpandableText text={MOAT_NARRATIVE} />
);

/** Three-line preview — the deeper fold, for prose that needs more of a run-up. */
export const ThreeLinePreview = () => (
  <ExpandableText text={MANAGEMENT_COMMENTARY} previewLines={3} />
);

/**
 * In place: a sub-element fold inside an already-expanded section card. This is
 * the composition the company page actually uses — the section stays open, the
 * long paragraph inside it folds.
 */
export const InsideASection = () => (
  <SectionCard
    id="moat-analysis"
    title="Moat Analysis"
    headerDescription="Durability of the earnings stream, assessed against the v14 framework."
    headerPills={["NARROW", "Q1 FY27"]}
  >
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Switching costs
      </p>
      <ExpandableText text={MOAT_NARRATIVE} />
    </div>
  </SectionCard>
);

/**
 * Shorter than the clamp: the paragraph fits, so nothing is hidden — but the
 * toggle still renders. Worth knowing before wiring it to text of unknown length.
 */
export const ShorterThanTheClamp = () => (
  <ExpandableText text="Pricol's Q1 FY27 print was carried by the two-wheeler cluster, with no change to the FY27 revenue guidance." />
);
