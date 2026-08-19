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

/** Full contrast on a covered row; dimmed on a below-cut row, where the whole
 *  line is de-emphasized and the chip must not be the one thing still shouting. */
export const FullAndDimmed = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <FreshScoreChip scoredAt="18 Aug 2026, 17:28 IST" />
      <span className="text-[12px] text-muted-foreground">
        default — a covered row
      </span>
    </div>
    <div className="flex items-center gap-3">
      <FreshScoreChip scoredAt="18 Aug 2026, 09:04 IST" dimmed />
      <span className="text-[12px] text-muted-foreground">
        dimmed — a row below the coverage cut
      </span>
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
          dimmed: false,
        },
        {
          code: "MTARTECH",
          name: "MTAR Technologies",
          score: 6.9,
          band: "Mildly Bullish",
          bandClass: "text-teal-700 dark:text-teal-300",
          scoredAt: null as string | null,
          dimmed: false,
        },
        {
          code: "SOLARA",
          name: "Solara Active Pharma",
          score: 4.8,
          band: "Neutral / Balanced",
          bandClass: "text-muted-foreground",
          scoredAt: "18 Aug 2026, 09:04 IST" as string | null,
          dimmed: true,
        },
      ].map((row) => (
        <tr key={row.code} className="border-b last:border-0">
          <td className={`py-2.5 align-top ${row.dimmed ? "text-muted-foreground" : ""}`}>
            <span className={row.dimmed ? "" : "font-medium text-foreground"}>{row.name}</span>{" "}
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {row.code}
            </span>
          </td>
          <td className="py-2.5 align-top">
            <div className="leading-tight">
              <div
                className={`tabular-nums font-semibold ${
                  row.dimmed ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {row.score.toFixed(1)}
              </div>
              <div
                className={`text-[10px] font-medium ${
                  row.dimmed ? "text-muted-foreground" : row.bandClass
                }`}
              >
                {row.band}
              </div>
              {row.scoredAt && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <FreshScoreChip scoredAt={row.scoredAt} dimmed={row.dimmed} />
                </div>
              )}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
