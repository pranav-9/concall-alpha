import { ConcallScore, ScoreDelta } from "concall-alpha";

// Quarter-on-quarter movement of a ConcallScore. Up is emerald, down is rose,
// anything inside +/-0.05 reads "no change" in muted ink, and a first-ever
// quarter (priorScore null) renders only if the caller supplies a missingLabel.

/** The three movement states, as they read on the activity feed. */
export const Movement = () => (
  <div className="flex flex-col gap-2">
    {[
      { company: "Neuland Laboratories", score: 8.4, prior: 7.6 },
      { company: "Pricol", score: 5.6, prior: 6.9 },
      { company: "Privi Speciality", score: 6.7, prior: 6.7 },
    ].map((row) => (
      <div key={row.company} className="flex items-baseline gap-3">
        <span className="w-44 text-[12px] text-muted-foreground">{row.company}</span>
        <span className="w-8 tabular-nums text-sm font-semibold text-foreground">
          {row.score.toFixed(1)}
        </span>
        <ScoreDelta score={row.score} priorScore={row.prior} priorLabel="Q4 FY26" />
      </div>
    ))}
  </div>
);

/** No prior quarter: the fallback text is opt-in, so the caller names it. */
export const FirstScoredQuarter = () => (
  <div className="flex flex-col gap-2">
    <div className="flex items-baseline gap-3">
      <span className="w-44 text-[12px] text-muted-foreground">Zaggle Prepaid</span>
      <span className="w-8 tabular-nums text-sm font-semibold text-foreground">7.1</span>
      <ScoreDelta score={7.1} priorScore={null} missingLabel="no prior qtr" />
    </div>
    <div className="flex items-baseline gap-3">
      <span className="w-44 text-[12px] text-muted-foreground">Fedbank Financial</span>
      <span className="w-8 tabular-nums text-sm font-semibold text-foreground">6.2</span>
      <ScoreDelta score={6.2} priorScore={null} missingLabel="no prior score" />
    </div>
    <p className="pt-1 text-[11px] text-muted-foreground">
      Without a <code className="font-mono">missingLabel</code> the component renders nothing —
      a board column that must stay empty on a first quarter simply omits it.
    </p>
  </div>
);

/** Canonical: stacked under the score circle on the activity feed. */
export const UnderTheScoreCircle = () => (
  <div className="flex flex-col divide-y divide-border">
    {[
      {
        company: "Neuland Laboratories",
        detail: "Q1 FY27 concall scored from the official transcript",
        score: 8.4,
        prior: 7.6 as number | null,
        missing: "no prior qtr",
      },
      {
        company: "MTAR Technologies",
        detail: "Q1 FY27 concall re-scored after the issuer filed",
        score: 6.9,
        prior: 8.0 as number | null,
        missing: "no prior qtr",
      },
      {
        company: "Zaggle Prepaid",
        detail: "First quarter in coverage",
        score: 7.1,
        prior: null as number | null,
        missing: "no prior qtr",
      },
    ].map((item) => (
      <div key={item.company} className="flex items-start justify-between gap-6 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{item.company}</span>
          <span className="text-[12px] text-muted-foreground">{item.detail}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ConcallScore score={item.score} size="sm" />
          <ScoreDelta
            score={item.score}
            priorScore={item.prior}
            priorLabel="Q4 FY26"
            missingLabel={item.missing}
          />
        </div>
      </div>
    ))}
  </div>
);

/** Tight board cell: drop the inline "vs Q4 FY26" suffix, keep it in the title. */
export const WithoutInlineSuffix = () => (
  <div className="flex flex-col gap-2">
    {[
      { company: "HFCL", score: 4.2, prior: 3.5 },
      { company: "Solara Active Pharma", score: 2.4, prior: 3.9 },
    ].map((row) => (
      <div key={row.company} className="flex items-baseline gap-3">
        <span className="w-44 text-[12px] text-muted-foreground">{row.company}</span>
        <span className="w-8 tabular-nums text-sm font-semibold text-foreground">
          {row.score.toFixed(1)}
        </span>
        <ScoreDelta
          score={row.score}
          priorScore={row.prior}
          priorLabel="Q4 FY26"
          inlineSuffix={false}
          className="text-[12px]"
        />
      </div>
    ))}
  </div>
);
