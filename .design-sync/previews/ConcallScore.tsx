import { ConcallScore } from "concall-alpha";

// The score circle. Colour is never chosen by the caller — it derives from
// lib/score-band.ts (quarterly, default) or lib/growth-band.ts (kind="growth"),
// so the circle, the charts and the bars always agree.
//
// Quarterly cuts: >=8 Strongly Bullish, >=7 Bullish, >=6.5 Mildly Bullish,
// >=4.5 Neutral, >=3 Mildly Bearish, else Strongly Bearish — a diverging
// teal <-> red ramp around a ~5.5 neutral midpoint.
const QUARTERLY_LADDER = [
  { score: 8.4, company: "Neuland Laboratories", quarter: "Q1 FY27" },
  { score: 7.3, company: "MTAR Technologies", quarter: "Q1 FY27" },
  { score: 6.7, company: "Privi Speciality", quarter: "Q1 FY27" },
  { score: 5.6, company: "Pricol", quarter: "Q1 FY27" },
  { score: 3.8, company: "HFCL", quarter: "Q4 FY26" },
  { score: 2.4, company: "Solara Active Pharma", quarter: "Q4 FY26" },
];

// Growth cuts are their own scale (lib/growth-band.ts): >=8.5 Exceptional,
// >=8 Strong, >=7.5 Solid, >=7 Moderate, >=6.5 Soft, else Weak. The observed
// growth distribution is far tighter than the quarterly one, which is why it
// cannot share the sentiment cuts.
const GROWTH_LADDER = [
  { score: 8.7, company: "Neuland Laboratories" },
  { score: 8.1, company: "Zaggle Prepaid" },
  { score: 7.7, company: "MTAR Technologies" },
  { score: 7.2, company: "Fedbank Financial" },
  { score: 6.7, company: "Pricol" },
  { score: 6.0, company: "Solara Active Pharma" },
];

/** The full quarterly band ladder, with the band word the circle names. */
export const BandLadder = () => (
  <div className="flex flex-col gap-3">
    {QUARTERLY_LADDER.map((row) => (
      <div key={row.company} className="flex items-center gap-3">
        <ConcallScore score={row.score} showLabel />
        <span className="text-[12px] text-muted-foreground">
          {row.company} · {row.quarter}
        </span>
      </div>
    ))}
  </div>
);

/** sm on dense boards, md as the default, lg on the company page header. */
export const Sizes = () => (
  <div className="flex flex-wrap items-end gap-6">
    {(["sm", "md", "lg"] as const).map((size) => (
      <div key={size} className="flex flex-col items-center gap-2">
        <ConcallScore score={7.6} size={size} />
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {size}
        </span>
      </div>
    ))}
  </div>
);

/** How the leaderboard actually uses it: size="sm", one circle per row. */
export const OnALeaderboardRow = () => (
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <th className="py-1.5 font-medium">#</th>
        <th className="py-1.5 font-medium">Company</th>
        <th className="py-1.5 font-medium">Q1 FY27</th>
        <th className="py-1.5 font-medium">Latest 4Q Avg</th>
      </tr>
    </thead>
    <tbody>
      {[
        { rank: 1, code: "NEULANDLAB", name: "Neuland Laboratories", latest: 8.4, avg4: 7.9 },
        { rank: 2, code: "MTARTECH", name: "MTAR Technologies", latest: 7.3, avg4: 7.1 },
        { rank: 3, code: "PRIVISCL", name: "Privi Speciality", latest: 6.7, avg4: 6.6 },
        { rank: 4, code: "FEDFINA", name: "Fedbank Financial", latest: 6.2, avg4: 6.4 },
        { rank: 5, code: "PRICOLLTD", name: "Pricol", latest: 5.6, avg4: 5.9 },
      ].map((row) => (
        <tr key={row.code} className="border-b last:border-0">
          <td className="py-2.5 tabular-nums text-muted-foreground">{row.rank}</td>
          <td className="py-2.5">
            <span className="font-medium text-foreground">{row.name}</span>{" "}
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              {row.code}
            </span>
          </td>
          <td className="py-2.5">
            <ConcallScore score={row.latest} size="sm" />
          </td>
          <td className="py-2.5">
            <ConcallScore score={row.avg4} size="sm" />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** kind="growth" swaps in the forward-outlook band scheme and its own cuts. */
export const GrowthOutlookBands = () => (
  <div className="flex flex-col gap-3">
    {GROWTH_LADDER.map((row) => (
      <div key={row.company} className="flex items-center gap-3">
        <ConcallScore score={row.score} kind="growth" showLabel />
        <span className="text-[12px] text-muted-foreground">{row.company}</span>
      </div>
    ))}
  </div>
);
