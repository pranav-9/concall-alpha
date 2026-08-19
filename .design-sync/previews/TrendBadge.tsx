import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TrendBadge,
} from "concall-alpha";
// The taxonomy and the classifier are pure TypeScript. Every trajectoryKey,
// every Δ and every tooltip sentence below comes out of classifyTrajectory on a
// real score series — writing them by hand would let the preview teach a label
// the rules would never produce for that path.
import {
  TRAJECTORIES,
  TRAJECTORY_ORDER,
  classifyTrajectory,
} from "@/lib/score-trajectory";
import type { ScorePoint } from "@/lib/score-path";

// TrendBadge is the shared Trend cell: WHERE THE SCORE IS HEADING, next to the
// ConcallScore column that says where it sits. Two orthogonal axes — "a 7 on the
// way up is a different stock from a 7 on the way down".
//
// Two call sites, one component: the leaderboard passes no scorePath and gets a
// text-only cell; the watchlist passes the path and gets an inline sparkline of
// the SHAPE the label compresses away (staircase vs spike). It also labels the
// score chart's header in the ConcallScore section.
//
// Every threshold sits at or above the measured ±0.5 Phase-1 re-score drift
// band, so a move drift can explain never earns a directional label. Δ is
// latest − 4Q average (the average includes the latest, deliberately damped), so
// the row reconciles for the reader: Latest − 4Q Avg = Trend.

type Company = {
  code: string;
  name: string;
  /** ConcallScores NEWEST FIRST — the order classifyTrajectory expects. */
  scores: number[];
  /** Oldest → newest, for the inline sparkline. */
  path: ScorePoint[];
};

const q = (labels: string[], values: (number | null)[]): ScorePoint[] =>
  labels.map((period, i) => ({ period, value: values[i] }));

const QUARTERS = ["Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27"];
const FIVE_QUARTERS = ["Q1 FY26", "Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27"];

const BOARD: Company[] = [
  {
    code: "NEULANDLAB",
    name: "Neuland Laboratories",
    scores: [8.2, 7.9, 7.4, 7.0],
    path: q(QUARTERS, [7.0, 7.4, 7.9, 8.2]),
  },
  {
    code: "MTARTECH",
    name: "MTAR Technologies",
    scores: [7.8, 7.6, 7.9, 7.5, 7.4],
    path: q(FIVE_QUARTERS, [7.4, 7.5, 7.9, 7.6, 7.8]),
  },
  {
    code: "HFCL",
    name: "HFCL",
    scores: [7.4, 6.8, 6.9, 7.0, 6.9],
    path: q(FIVE_QUARTERS, [6.9, 7.0, 6.9, 6.8, 7.4]),
  },
  {
    code: "PRICOLLTD",
    name: "Pricol",
    scores: [6.2, 5.5, 6.2, 7.2, 7.4],
    path: q(FIVE_QUARTERS, [7.4, 7.2, 6.2, 5.5, 6.2]),
  },
  {
    code: "FEDFINA",
    name: "Fedbank Financial",
    scores: [6.8, 6.6, 6.9, 6.5],
    path: q(QUARTERS, [6.5, 6.9, 6.6, 6.8]),
  },
  {
    code: "PRIVISCL",
    name: "Privi Speciality",
    scores: [6.2, 6.9, 6.8, 6.9, 6.8],
    path: q(FIVE_QUARTERS, [6.8, 6.9, 6.8, 6.9, 6.2]),
  },
  {
    code: "TIMEX",
    name: "Timex Group India",
    scores: [5.6, 6.2, 6.8, 7.1, 7.2],
    path: q(FIVE_QUARTERS, [7.2, 7.1, 6.8, 6.2, 5.6]),
  },
  {
    code: "SOLARA",
    name: "Solara Active Pharma",
    scores: [5.1, 5.3, 5.4, 5.2],
    path: q(QUARTERS, [5.2, 5.4, 5.3, 5.1]),
  },
];

const HEAD_CLASS =
  "px-3 py-3 text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground";
const CELL_CLASS = "px-3 py-2.5 text-[12px]";

/**
 * Canonical: the leaderboard's Trend column, text-only. Icon + one-word label +
 * Δ against the 4-quarter average. Colour comes from the taxonomy's own teal ↔
 * red ramp, so Trend and ConcallScore never disagree about what teal means.
 */
export const LeaderboardTrendColumn = () => (
  <div className="rounded-xl border border-border/60 bg-background/70 p-1">
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b border-border/35">
          <TableHead className={HEAD_CLASS}>Company</TableHead>
          <TableHead className={HEAD_CLASS}>Latest</TableHead>
          <TableHead className={HEAD_CLASS}>4Q Avg</TableHead>
          <TableHead className={HEAD_CLASS}>Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {BOARD.map((company) => {
          const trajectory = classifyTrajectory(company.scores, { hasGapInWindow: false });
          const last4 = company.scores.slice(0, 4);
          const avg4 = last4.reduce((a, b) => a + b, 0) / last4.length;
          return (
            <TableRow key={company.code} className="border-b border-border/25 last:border-b-0">
              <TableCell className={`${CELL_CLASS} font-medium`}>{company.name}</TableCell>
              <TableCell className={`${CELL_CLASS} font-semibold tabular-nums`}>
                {company.scores[0].toFixed(1)}
              </TableCell>
              <TableCell className={`${CELL_CLASS} tabular-nums text-muted-foreground`}>
                {avg4.toFixed(1)}
              </TableCell>
              <TableCell className={CELL_CLASS}>
                <TrendBadge
                  trajectoryKey={trajectory.key}
                  trendChange={trajectory.change}
                  trendDescription={trajectory.description}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

/**
 * The watchlist variant: the same cell plus an inline sparkline of the score
 * path, oldest → newest. Two labels can be identical while the shapes differ —
 * MTAR holds a flat 7.5+ band, Pricol's "Recovering" is a V off a real low.
 */
export const WatchlistWithSparkline = () => (
  <div className="rounded-xl border border-border/60 bg-background/70 p-1">
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b border-border/35">
          <TableHead className={HEAD_CLASS}>Company</TableHead>
          <TableHead className={HEAD_CLASS}>Latest</TableHead>
          <TableHead className={HEAD_CLASS}>Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {BOARD.slice(0, 6).map((company) => {
          const trajectory = classifyTrajectory(company.scores, { hasGapInWindow: false });
          return (
            <TableRow key={company.code} className="border-b border-border/25 last:border-b-0">
              <TableCell className={`${CELL_CLASS} font-medium`}>{company.name}</TableCell>
              <TableCell className={`${CELL_CLASS} font-semibold tabular-nums`}>
                {company.scores[0].toFixed(1)}
              </TableCell>
              <TableCell className={CELL_CLASS}>
                <TrendBadge
                  trajectoryKey={trajectory.key}
                  trendChange={trajectory.change}
                  trendDescription={trajectory.description}
                  scorePath={company.path}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

/**
 * The third call site: labelling the score chart's header in the ConcallScore
 * section. The badge describes the whole series as of the latest quarter, not
 * the selected point — which is why it sits on the header, not on the chart.
 */
export const ChartHeaderLabel = () => {
  const neuland = classifyTrajectory(BOARD[0].scores, { hasGapInWindow: false });
  const timex = classifyTrajectory(BOARD[6].scores, { hasGapInWindow: false });
  return (
    <div className="space-y-3">
      {[
        { company: BOARD[0], trajectory: neuland },
        { company: BOARD[6], trajectory: timex },
      ].map(({ company, trajectory }) => (
        <div
          key={company.code}
          className="rounded-md border border-border/25 bg-background/45 p-2.5"
        >
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Where it&apos;s heading · whole series
            </p>
            <TrendBadge
              trajectoryKey={trajectory.key}
              trendChange={trajectory.change}
              trendDescription={trajectory.description}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {company.name} · {company.scores.length} scored quarters
          </p>
        </div>
      ))}
    </div>
  );
};

/**
 * The full taxonomy in rank order, best first. "No read yet" is the fewer-than-
 * three-quarters state: the badge renders an em dash, keeping the column's
 * baseline instead of collapsing the cell.
 */
export const TrajectoryVocabulary = () => (
  <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      Trend — the eleven trajectories
    </p>
    <ul className="space-y-2">
      {TRAJECTORY_ORDER.map((key) => (
        <li key={key} className="flex items-start gap-3">
          <span className="w-32 shrink-0">
            <TrendBadge trajectoryKey={key} trendDescription={TRAJECTORIES[key].definition} />
          </span>
          <span className="min-w-0 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{TRAJECTORIES[key].label}</span>
            {" — "}
            {TRAJECTORIES[key].definition}
          </span>
        </li>
      ))}
    </ul>
  </div>
);
