import { SectionCard, SectionLoading } from "concall-alpha";

// The company page streams: every analysis section is its own Suspense boundary
// and SectionLoading is the fallback for all of them. It RENDERS ITS OWN
// SectionCard — never wrap it in another one — so the skeleton occupies the same
// shell, the same id and the same tone as the section it stands in for, and the
// page does not reflow when the real content arrives.
//
// The two props are exactly the two the real section will use: `id` (which also
// picks the card's tone and is the scroll anchor the section tabs jump to) and
// `title`. Both must match the real section's, or the card changes colour and
// the anchor moves when it resolves.

/** Canonical: the Suspense fallback for Business Snapshot. */
export const BusinessSnapshotFallback = () => (
  <SectionLoading id="business-overview" title="Business Snapshot" />
);

/**
 * The id drives the tone, so the skeleton is already the right colour before the
 * content exists — violet here, against the emerald Business Snapshot above.
 * Pass the section's real id, never a placeholder one.
 */
export const ToneFollowsTheId = () => (
  <div className="space-y-3">
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      <span className="font-medium text-foreground">key-variables</span> and{" "}
      <span className="font-medium text-foreground">valuation-check</span> are violet;{" "}
      <span className="font-medium text-foreground">business-overview</span>,{" "}
      <span className="font-medium text-foreground">moat-analysis</span> and{" "}
      <span className="font-medium text-foreground">walk-the-talk</span> emerald;{" "}
      <span className="font-medium text-foreground">sentiment-score</span> and{" "}
      <span className="font-medium text-foreground">guidance-history</span> amber;{" "}
      <span className="font-medium text-foreground">industry-context</span>,{" "}
      <span className="font-medium text-foreground">sub-sector</span> and{" "}
      <span className="font-medium text-foreground">future-growth</span> sky. An unknown id falls
      back to slate.
    </p>
    <SectionLoading id="key-variables" title="Key Variables" />
  </div>
);

/**
 * Mid-stream: the top section has resolved, the one below it has not. The
 * skeleton carries the same shell, tone and header position as the real card,
 * so nothing above it jumps when the content lands.
 */
export const PageMidStream = () => (
  <div className="flex flex-col gap-4">
    <SectionCard
      id="business-overview"
      title="Business Snapshot"
      headerDescription="What the company sells, to whom, and how the mix has moved."
      headerPills={["Q1 FY27"]}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        Neuland runs two blocks: generic drug substances, and the CMS business that develops and
        manufactures under contract for innovators. CMS crossed half of revenue in FY26.
      </p>
    </SectionCard>
    <SectionLoading id="moat-analysis" title="Moat Analysis" />
  </div>
);
