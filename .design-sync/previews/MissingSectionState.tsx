import { MissingSectionState, SectionCard } from "concall-alpha";

// The company page's honest empty state. Coverage is a curated ~100 mid- and
// small-caps and sections land per company, so a page routinely has a section
// the pipeline has not produced yet. Rather than hide the section, the portal
// renders it with this block inside — the reader learns the section exists, why
// it is blank, and gets a one-click way to ask for it.
//
// It is ALWAYS nested inside a SectionCard, never used bare on the page, so the
// dashed block reads as "this card is empty" rather than "this page is broken".
// The button is the real request control: one click per company+section, with a
// seven-day local dedupe, so it flips to "Requested" and disables itself.

/** Canonical: Sub-sectors not yet generated, inside the section card that owns it. */
export const InsideItsSection = () => (
  <SectionCard id="sub-sector" title="Sub-sectors">
    <MissingSectionState
      companyCode="TIMEX"
      companyName="Timex Group India"
      sectionId="sub-sector"
      sectionTitle="Sub-sectors"
      description="We have not generated sub-sector-specific cards for this company yet."
    />
  </SectionCard>
);

/** A second section on the same page — the tone changes, the empty state doesn't. */
export const MoatNotReady = () => (
  <SectionCard
    id="moat-analysis"
    title="Moat Analysis"
    headerDescription="Durability of the earnings stream, assessed against the v14 framework."
  >
    <MissingSectionState
      companyCode="HFCL"
      companyName="HFCL"
      sectionId="moat-analysis"
      sectionTitle="Moat Analysis"
      description="This company has not been through a moat extraction yet. It is in the queue."
    />
  </SectionCard>
);

/**
 * The block on its own, at the size it really occupies. On a narrow card the
 * button drops below the copy; from the sm breakpoint it sits on the right.
 */
export const Bare = () => (
  <MissingSectionState
    companyCode="SOLARA"
    companyName="Solara Active Pharma Sciences"
    sectionId="valuation-check"
    sectionTitle="Valuation Check"
    description="No published price read for this company. A verdict priced more than four days ago is withheld rather than shown stale."
  />
);

/**
 * Two empty sections stacked, as a thinly-covered company's page shows them.
 * Every dashed block on the page is the same block — that repetition is the
 * point: one shape means "not ready", so nothing else has to.
 */
export const StackedOnAThinPage = () => (
  <div className="flex flex-col gap-4">
    <SectionCard id="key-variables" title="Key Variables">
      <MissingSectionState
        companyCode="TIMEX"
        companyName="Timex Group India"
        sectionId="key-variables"
        sectionTitle="Key Variables"
        description="Not enough scored quarters yet to isolate the variables that move this business."
      />
    </SectionCard>
    <SectionCard id="guidance-history" title="Guidance History">
      <MissingSectionState
        companyCode="TIMEX"
        companyName="Timex Group India"
        sectionId="guidance-history"
        sectionTitle="Guidance History"
        description="Management has not put a quantified target on record in the calls we have transcripts for."
      />
    </SectionCard>
  </div>
);
