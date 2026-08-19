import { ConcallScore, FreshScoreChip, UnofficialChip } from "concall-alpha";

// The other provenance marker: this score was read off a THIRD-PARTY transcript,
// published before the issuer filed its own. SEBI gives companies five working
// days, so during results season a score can exist days before the official
// transcript does — the chip carries the re-score obligation that comes with it.
//
// Neutral by construction, like FreshScoreChip: it qualifies the number, it does
// not re-rank the company. `scoredAt` is the formatted stamp from
// lib/score-freshness's formatScoredAt, fixed so server and client agree.

/** Canonical: under the Latest score on a board, naming where the number came from. */
export const UnderALatestScore = () => (
  <div className="leading-tight">
    <ConcallScore score={7.3} size="sm" />
    <div className="mt-1 flex items-baseline gap-1.5">
      <span className="text-[10px] font-medium text-teal-700 dark:text-teal-300">Bullish</span>
      <span className="whitespace-nowrap text-[10px] text-muted-foreground">Q1 FY27</span>
    </div>
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <UnofficialChip scoredAt="18 Aug 2026, 21:12 IST" />
    </div>
  </div>
);

/** Results season: a score that landed today AND came from a borrowed transcript
 *  carries both chips — recency and provenance are separate facts. */
export const BesideTheFreshChip = () => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-1.5">
      <UnofficialChip scoredAt="18 Aug 2026, 21:12 IST" />
      <FreshScoreChip scoredAt="18 Aug 2026, 21:12 IST" />
      <span className="ml-2 text-[12px] text-muted-foreground">
        Fedbank Financial · Q1 FY27, scored the evening of the call
      </span>
    </div>
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      Unofficial is a standing obligation, not a warning — the quarter is re-scored the moment
      the issuer files its own transcript, and the chip drops off.
    </p>
  </div>
);

/** On the board: the season mid-flight, some rows official, some not yet. */
export const OnTheBoard = () => (
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <th className="py-1.5 font-medium">Company</th>
        <th className="py-1.5 font-medium">Q1 FY27</th>
      </tr>
    </thead>
    <tbody>
      {[
        {
          code: "FEDFINA",
          name: "Fedbank Financial",
          score: 8.0,
          band: "Strongly Bullish",
          unofficial: true,
          fresh: true,
        },
        {
          code: "PRICOLLTD",
          name: "Pricol",
          score: 5.6,
          band: "Neutral / Balanced",
          unofficial: true,
          fresh: false,
        },
        {
          code: "NEULANDLAB",
          name: "Neuland Laboratories",
          score: 8.4,
          band: "Strongly Bullish",
          unofficial: false,
          fresh: false,
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
              <div
                className={`text-[10px] font-medium ${
                  row.score >= 4.5
                    ? row.score >= 6.5
                      ? "text-teal-700 dark:text-teal-300"
                      : "text-amber-700 dark:text-amber-300"
                    : "text-orange-700 dark:text-orange-300"
                }`}
              >
                {row.band}
              </div>
              {(row.unofficial || row.fresh) && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {row.unofficial && <UnofficialChip scoredAt="18 Aug 2026, 21:12 IST" />}
                  {row.fresh && <FreshScoreChip scoredAt="18 Aug 2026, 21:12 IST" />}
                </div>
              )}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
