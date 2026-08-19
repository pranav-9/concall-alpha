import { SectionCard } from "concall-alpha";

// SectionCard is the company page's one section container. Every analysis
// section (moat, growth, key variables, valuation) is wrapped in one, so the
// header vocabulary — title, description, pills, rank pills — is the page's
// main navigational surface.

export const Default = () => (
  <SectionCard
    id="business-overview"
    title="Business Snapshot"
    headerDescription="What the company sells, to whom, and how the mix has moved."
  >
    <p className="text-sm leading-relaxed text-muted-foreground">
      Revenue is split across three reportable segments, with the specialty
      chemicals block now carrying the majority of contribution margin. The
      management commentary in the Q1 FY27 call framed the CDMO ramp as the
      swing factor for the next four quarters rather than volume growth in the
      base business.
    </p>
  </SectionCard>
);

export const WithPills = () => (
  <SectionCard
    id="moat-analysis"
    title="Moat Analysis"
    tone="violet"
    headerDescription="Durability of the earnings stream, assessed against the v14 framework."
    headerPills={["NARROW", "v14", "Q1 FY27"]}
  >
    <p className="text-sm leading-relaxed text-muted-foreground">
      Switching costs are real but shallow: qualification cycles run 18–24
      months, which deters casual entry without locking the customer in past a
      price shock. Scale economics remain the stronger of the two sources.
    </p>
  </SectionCard>
);

export const WithRankPills = () => (
  <SectionCard
    id="concall-score"
    title="ConcallScore"
    tone="sky"
    headerDescription="The quarter's read, scored from the transcript and the deck."
    headerRankPills={[
      { label: "Top 8%", tone: "emerald" },
      { label: "#2 in sector", tone: "sky" },
      { label: "Median growth", tone: "amber" },
    ]}
  >
    <div className="flex items-baseline gap-3">
      <span className="text-3xl font-semibold tabular-nums">8.2</span>
      <span className="text-sm text-muted-foreground">
        Strongly bullish · up 0.6 from Q4 FY26
      </span>
    </div>
  </SectionCard>
);

export const Collapsible = () => (
  <SectionCard
    id="historical-economics"
    title="Historical Economics"
    tone="amber"
    collapsible
    defaultOpen={false}
    headerDescription="Ten-year revenue, margin and return series. Collapsed by default."
  >
    <p className="text-sm text-muted-foreground">
      Expanded content sits here — the long data pack that most readers skip.
    </p>
  </SectionCard>
);

export const Tones = () => (
  <div className="flex flex-col gap-4">
    {(
      [
        ["sky", "Industry Context"],
        ["emerald", "Business Snapshot"],
        ["violet", "Moat Analysis"],
        ["amber", "Key Variables"],
        ["rose", "Valuation Check"],
      ] as const
    ).map(([tone, title]) => (
      <SectionCard key={tone} id={`tone-${tone}`} title={title} tone={tone}>
        <p className="text-sm text-muted-foreground">
          Section body for the <code>{tone}</code> tone.
        </p>
      </SectionCard>
    ))}
  </div>
);
