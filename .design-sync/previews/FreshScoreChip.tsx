import { ConcallScore, FreshScoreChip } from "concall-alpha";

// Provenance marker, not a judgement: it says the score was written (or
// re-written) inside the last 24 hours. Deliberately neutral — colour on this
// portal is reserved for band tones and charts, and freshness is not a view on
// the company.
//
// `scoredAt` is the already-formatted stamp lib/score-freshness's formatScoredAt
// emits ("18 Aug 2026, 17:28 IST") — deterministic on purpose, because a
// Date.now() evaluated during hydration disagrees with the server render.

/** Canonical: on the leaderboard's Latest cell, under the score and its band. */
export const UnderALatestScore = () => (
  <div className="leading-tight">
    <ConcallScore score={8.4} size="sm" />
    <div className="mt-1 flex items-baseline gap-1.5">
      <span className="text-[10px] font-medium text-teal-700 dark:text-teal-300">
        Strongly Bullish
      </span>
      <span className="whitespace-nowrap text-[10px] text-muted-foreground">Q1 FY27</span>
    </div>
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <FreshScoreChip scoredAt="18 Aug 2026, 17:28 IST" />
    </div>
  </div>
);

/** In the board it was built for: only the rows scored today carry it. */
export const OnTheBoard = () => (
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <th className="py-1.5 font-medium">Company</th>
        <th className="py-1.5 font-medium">Latest</th>
      </tr>
    </thead>
    <tbody>
      {[
        {
          code: "NEULANDLAB",
          name: "Neuland Laboratories",
          score: 8.4,
          band: "Strongly Bullish",
          bandClass: "text-teal-700 dark:text-teal-300",
          scoredAt: "18 Aug 2026, 17:28 IST" as string | null,
        },
        {
          code: "MTARTECH",
          name: "MTAR Technologies",
          score: 6.9,
          band: "Mildly Bullish",
          bandClass: "text-teal-700 dark:text-teal-300",
          scoredAt: null as string | null,
        },
        {
          code: "SOLARA",
          name: "Solara Active Pharma",
          score: 4.8,
          band: "Neutral / Balanced",
          bandClass: "text-muted-foreground",
          scoredAt: "18 Aug 2026, 09:04 IST" as string | null,
        },
      ].map((row) => (
        <tr key={row.code} className="border-b last:border-0">
          <td className="py-2.5 align-top">
            <span className="font-medium text-foreground">{row.name}</span>{" "}
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {row.code}
            </span>
          </td>
          <td className="py-2.5 align-top">
            <div className="leading-tight">
              <div className="tabular-nums font-semibold text-foreground">
                {row.score.toFixed(1)}
              </div>
              <div className={`text-[10px] font-medium ${row.bandClass}`}>
                {row.band}
              </div>
              {row.scoredAt && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <FreshScoreChip scoredAt={row.scoredAt} />
                </div>
              )}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
