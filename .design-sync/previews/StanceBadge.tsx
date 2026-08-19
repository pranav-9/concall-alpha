import {
  StanceBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "concall-alpha";
// The vocabulary AND the classifier are pure TypeScript (no React, no Supabase).
// Hand-writing a stanceKey next to a score would let the two drift, so every
// badge below is classified from the same five inputs the watchlist feeds in.
import { STANCES, STANCE_ORDER, classifyStance } from "@/lib/portfolio-stance";

// StanceBadge is the watchlist's "Read" cell: one CONFIGURATION word standing in
// for the whole row. The row already shows ConcallScore, Trend, Forward and
// Moat — four signals the reader has to integrate by eye. This names the shape
// across them, especially where they diverge (soft print but strong outlook;
// top score but cooling forward; fine score but no moat underwrite).
//
// Descriptive, never prescriptive: it names the configuration, it does not emit
// a buy/sell call. The reasoning that fired rides in the title tooltip.
//
// These are NOT band words. "Compounding" / "Near peak" belong to
// lib/portfolio-stance and mean something different from score-band's
// Strongly Bullish → Strongly Bearish and growth-band's Exceptional → Weak.

type Holding = {
  code: string;
  name: string;
  latestConcallScore: number | null;
  trendChange: number | null;
  growthScore: number | null;
  trajectoryKey:
    | "climbing"
    | "recovering"
    | "strong_steady"
    | "steady"
    | "weak_stuck"
    | "cracking"
    | "worsening"
    | "no_read";
  moatTier: "strong" | "mid" | "weak" | null;
  moatLabel: string;
};

// A real watchlist: every one of these is a covered mid/small cap, and between
// them they exercise eight of the nine configurations.
const WATCHLIST: Holding[] = [
  {
    code: "NEULANDLAB",
    name: "Neuland Laboratories",
    latestConcallScore: 8.2,
    trendChange: 0.5,
    growthScore: 8.1,
    trajectoryKey: "climbing",
    moatTier: "strong",
    moatLabel: "Narrow · Strong",
  },
  {
    code: "PRICOLLTD",
    name: "Pricol",
    latestConcallScore: 6.9,
    trendChange: 0.6,
    growthScore: 7.6,
    trajectoryKey: "recovering",
    moatTier: "mid",
    moatLabel: "Narrow · Mid",
  },
  {
    code: "PRIVISCL",
    name: "Privi Speciality",
    latestConcallScore: 6.4,
    trendChange: -0.8,
    growthScore: 8.0,
    trajectoryKey: "cracking",
    moatTier: "mid",
    moatLabel: "Narrow · Mid",
  },
  {
    code: "MTARTECH",
    name: "MTAR Technologies",
    latestConcallScore: 8.1,
    trendChange: -0.1,
    growthScore: 6.8,
    trajectoryKey: "strong_steady",
    moatTier: "mid",
    moatLabel: "Narrow · Mid",
  },
  {
    code: "HFCL",
    name: "HFCL",
    latestConcallScore: 7.0,
    trendChange: 0.0,
    growthScore: 7.2,
    trajectoryKey: "steady",
    moatTier: null,
    moatLabel: "—",
  },
  {
    code: "FEDFINA",
    name: "Fedbank Financial",
    latestConcallScore: 6.6,
    trendChange: 0.1,
    growthScore: 7.2,
    trajectoryKey: "steady",
    moatTier: "weak",
    moatLabel: "Moat at risk",
  },
  {
    code: "SOLARA",
    name: "Solara Active Pharma",
    latestConcallScore: 4.8,
    trendChange: -0.2,
    growthScore: 5.9,
    trajectoryKey: "weak_stuck",
    moatTier: null,
    moatLabel: "—",
  },
  {
    code: "TIMEX",
    name: "Timex Group India",
    latestConcallScore: 5.2,
    trendChange: -0.9,
    growthScore: 6.1,
    trajectoryKey: "worsening",
    moatTier: null,
    moatLabel: "—",
  },
];

const HEAD_CLASS =
  "px-3 py-3 text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground";
const CELL_CLASS = "px-3 py-2.5 text-[12px]";

const num = (n: number | null) =>
  n == null ? <span className="text-muted-foreground">—</span> : n.toFixed(1);

function WatchlistTable({ rows }: { rows: Holding[] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-1">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-border/35">
            <TableHead className={HEAD_CLASS}>Company</TableHead>
            <TableHead className={HEAD_CLASS}>ConcallScore</TableHead>
            <TableHead className={HEAD_CLASS}>Forward</TableHead>
            <TableHead className={HEAD_CLASS}>Moat</TableHead>
            <TableHead className={HEAD_CLASS} style={{ color: "var(--warn)" }}>
              Read
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((holding) => {
            const stance = classifyStance(holding);
            return (
              <TableRow key={holding.code} className="border-b border-border/25 last:border-b-0">
                <TableCell className={`${CELL_CLASS} font-medium`}>{holding.name}</TableCell>
                <TableCell className={`${CELL_CLASS} tabular-nums`}>
                  {num(holding.latestConcallScore)}
                </TableCell>
                <TableCell className={`${CELL_CLASS} tabular-nums`}>
                  {num(holding.growthScore)}
                </TableCell>
                <TableCell className={`${CELL_CLASS} text-muted-foreground`}>
                  {holding.moatLabel}
                </TableCell>
                <TableCell className={CELL_CLASS}>
                  <StanceBadge stanceKey={stance.key} description={stance.description} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Canonical: the Read column of a real watchlist. Eight holdings, eight
 * classifications, every key derived by classifyStance from the row's own
 * numbers — teal for the aligned configurations, amber for the cautionary
 * divergences, orange/red for the breaks.
 */
export const WatchlistReadColumn = () => <WatchlistTable rows={WATCHLIST} />;

/**
 * The two divergence configurations side by side — the reason the column exists.
 * Privi's print is genuinely cracking but the forward is 8.0 against an intact
 * moat (Outlook-led); MTAR carries the higher score with a cooler forward and
 * flat momentum (Near peak). Neither reads off any single column.
 */
export const TheDivergences = () => (
  <WatchlistTable rows={[WATCHLIST[2], WATCHLIST[3], WATCHLIST[0]]} />
);

/**
 * No read: fewer than three scored quarters, or no ConcallScore at all. The
 * badge renders an em dash rather than nothing, so the column keeps its
 * baseline — the gloss is in the title attribute.
 */
export const NoReadYet = () => (
  <div className="space-y-2">
    <WatchlistTable
      rows={[
        {
          code: "KMEW",
          name: "Kaynes Micro Electronics",
          latestConcallScore: 7.1,
          trendChange: null,
          growthScore: null,
          trajectoryKey: "no_read",
          moatTier: null,
          moatLabel: "—",
        },
        WATCHLIST[5],
      ]}
    />
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      Kaynes has a ConcallScore but only one scored quarter, so there is no trajectory and nothing
      to synthesise — the Read is an em dash, not a low grade. Fedbank has the full set and reads
      Steady.
    </p>
  </div>
);

/**
 * The full vocabulary in rank order, most-aligned first — the legend the
 * watchlist and /how-scores-work both print. no_read is pinned last because it
 * is "no signal", not "worst signal".
 */
export const AllConfigurations = () => (
  <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      Read — the nine configurations
    </p>
    <ul className="space-y-2">
      {STANCE_ORDER.map((key) => (
        <li key={key} className="flex items-start gap-3">
          <span className="w-32 shrink-0">
            <StanceBadge stanceKey={key} description={STANCES[key].gloss} />
          </span>
          <span className="min-w-0 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{STANCES[key].label}</span>
            {" — "}
            {STANCES[key].gloss}
          </span>
        </li>
      ))}
    </ul>
  </div>
);
