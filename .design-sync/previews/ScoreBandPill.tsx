import { ScoreBandPill } from "concall-alpha";

// Cuts mirror lib/score-band.ts: >=8 strongly bullish, >=7 bullish,
// >=6.5 mildly bullish, >=4.5 neutral, >=3 mildly bearish, else strongly bearish.
const LADDER: { score: number; note: string }[] = [
  { score: 8.4, note: "Strongly bullish" },
  { score: 7.3, note: "Bullish" },
  { score: 6.7, note: "Mildly bullish" },
  { score: 5.5, note: "Neutral" },
  { score: 3.8, note: "Mildly bearish" },
  { score: 2.1, note: "Strongly bearish" },
];

export const AllBands = () => (
  <div className="flex flex-col gap-2">
    {LADDER.map((row) => (
      <div key={row.score} className="flex items-center gap-3">
        <span className="w-10 text-[12px] tabular-nums text-muted-foreground">
          {row.score.toFixed(1)}
        </span>
        <ScoreBandPill score={row.score} />
      </div>
    ))}
  </div>
);

export const InATableRow = () => (
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b text-left text-[12px] text-muted-foreground">
        <th className="py-1.5 font-medium">Company</th>
        <th className="py-1.5 font-medium">Read</th>
        <th className="py-1.5 font-medium">Band</th>
      </tr>
    </thead>
    <tbody>
      {[
        { name: "Neuland Labs", score: 8.2 },
        { name: "MTAR Technologies", score: 6.8 },
        { name: "Pricol", score: 5.4 },
      ].map((row) => (
        <tr key={row.name} className="border-b last:border-0">
          <td className="py-2">{row.name}</td>
          <td className="py-2 tabular-nums">{row.score.toFixed(1)}</td>
          <td className="py-2">
            <ScoreBandPill score={row.score} />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const NotRated = () => (
  <div className="flex items-center gap-3 text-sm">
    <span className="text-muted-foreground">No scored quarter yet:</span>
    <ScoreBandPill score={null} />
  </div>
);
