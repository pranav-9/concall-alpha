import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "concall-alpha";

// The leaderboard grammar (components/score-board-table.tsx): every score cell
// is a 0-10 number with the band it falls in printed underneath, so a cell can
// never contradict its own label. Bands come from lib/score-band.ts —
// >=8 Strongly Bullish, 7.0-7.9 Bullish, 6.5-6.9 Mildly Bullish,
// 4.5-6.4 Neutral, 3.0-4.4 Mildly Bearish, <3 Strongly Bearish.

type Row = {
  rank: number;
  code: string;
  name: string;
  sector: string;
  score: number;
  band: string;
  bullish: boolean;
  quarter: string;
  delta: number;
};

const ROWS: Row[] = [
  {
    rank: 1,
    code: "NEULANDLAB",
    name: "Neuland Laboratories",
    sector: "Pharmaceuticals",
    score: 8.2,
    band: "Strongly Bullish",
    bullish: true,
    quarter: "Q1 FY27",
    delta: 0.6,
  },
  {
    rank: 2,
    code: "MTARTECH",
    name: "MTAR Technologies",
    sector: "Capital Goods",
    score: 7.3,
    band: "Bullish",
    bullish: true,
    quarter: "Q1 FY27",
    delta: 0.5,
  },
  {
    rank: 3,
    code: "HFCL",
    name: "HFCL",
    sector: "Telecom Equipment",
    score: 6.9,
    band: "Mildly Bullish",
    bullish: true,
    quarter: "Q1 FY27",
    delta: -0.2,
  },
  {
    rank: 4,
    code: "FEDFINA",
    name: "Fedbank Financial Services",
    sector: "NBFC",
    score: 6.6,
    band: "Mildly Bullish",
    bullish: true,
    quarter: "Q1 FY27",
    delta: 0.1,
  },
  {
    rank: 5,
    code: "PRICOLLTD",
    name: "Pricol",
    sector: "Auto Components",
    score: 5.8,
    band: "Neutral",
    bullish: false,
    quarter: "Q4 FY26",
    delta: -0.4,
  },
  {
    rank: 6,
    code: "SOLARA",
    name: "Solara Active Pharma",
    sector: "Pharmaceuticals",
    score: 4.2,
    band: "Mildly Bearish",
    bullish: false,
    quarter: "Q4 FY26",
    delta: -0.9,
  },
];

const bandClass = (bullish: boolean) =>
  bullish ? "text-teal-700 dark:text-teal-300" : "text-amber-700 dark:text-amber-400";

const deltaClass = (delta: number) =>
  delta > 0
    ? "text-teal-700 dark:text-teal-300"
    : delta < 0
      ? "text-rose-700 dark:text-rose-400"
      : "text-muted-foreground";

export const Leaderboard = () => (
  <Table
    aria-label="Companies by overall rank, with ConcallScore, quarter and trend"
    className="text-sm"
  >
    <TableCaption>
      Ranked across the 100 discovery-listed mid and small caps. Updated after
      every scored transcript.
    </TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead className="w-10">#</TableHead>
        <TableHead>Company</TableHead>
        <TableHead>ConcallScore</TableHead>
        <TableHead>Quarter</TableHead>
        <TableHead className="text-right">Trend</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {ROWS.map((row) => (
        <TableRow key={row.code}>
          <TableCell className="tabular-nums text-muted-foreground">
            {row.rank}
          </TableCell>
          <TableCell>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {row.code} · {row.sector}
            </div>
          </TableCell>
          <TableCell>
            <div className="font-semibold tabular-nums text-foreground">
              {row.score.toFixed(1)}
            </div>
            <div className={`text-[11px] font-medium ${bandClass(row.bullish)}`}>
              {row.band}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">{row.quarter}</TableCell>
          <TableCell
            className={`text-right font-medium tabular-nums ${deltaClass(row.delta)}`}
          >
            {row.delta > 0 ? "+" : ""}
            {row.delta.toFixed(1)}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export const SectorAggregates = () => (
  <Table className="text-sm">
    <TableHeader>
      <TableRow>
        <TableHead>Pharmaceuticals</TableHead>
        <TableHead className="text-right">Latest</TableHead>
        <TableHead className="text-right">4Q avg</TableHead>
        <TableHead className="text-right">Growth</TableHead>
        <TableHead className="text-right">Valuation</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {[
        ["Neuland Laboratories", 8.2, 7.6, 7.4, 4.8],
        ["Solara Active Pharma", 4.2, 4.9, 5.1, 7.2],
        ["Suven Pharmaceuticals", 7.1, 6.8, 7.9, 3.6],
        ["Jubilant Pharmova", 6.4, 6.1, 5.7, 6.0],
      ].map(([name, latest, trailing, growth, valuation]) => (
        <TableRow key={String(name)}>
          <TableCell className="font-medium text-foreground">{name}</TableCell>
          <TableCell className="text-right tabular-nums">
            {Number(latest).toFixed(1)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {Number(trailing).toFixed(1)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {Number(growth).toFixed(1)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {Number(valuation).toFixed(1)}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
    <TableFooter>
      <TableRow>
        <TableCell>Sector median</TableCell>
        <TableCell className="text-right tabular-nums">6.8</TableCell>
        <TableCell className="text-right tabular-nums">6.5</TableCell>
        <TableCell className="text-right tabular-nums">6.6</TableCell>
        <TableCell className="text-right tabular-nums">5.4</TableCell>
      </TableRow>
    </TableFooter>
  </Table>
);

export const Empty = () => (
  <Table className="text-sm">
    <TableHeader>
      <TableRow>
        <TableHead className="w-10">#</TableHead>
        <TableHead>Company</TableHead>
        <TableHead>ConcallScore</TableHead>
        <TableHead>Quarter</TableHead>
        <TableHead className="text-right">Trend</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell
          colSpan={5}
          className="h-24 text-center text-muted-foreground"
        >
          No covered company has reported Q1 FY27 in this sector yet.
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
);
