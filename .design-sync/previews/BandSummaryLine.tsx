import { BandSummaryLine } from "concall-alpha";

// The one-line distribution that sits directly above a board: how many rows
// carry a read, and how they split across THAT column's own vocabulary. Bands
// with a zero count are dropped by the component, so a caller can pass the whole
// ordered vocabulary and let the line show only what the board actually holds.

// lib/score-band.ts labels, best -> worst.
const QUARTER_BANDS = [
  { key: "strongly_bullish", label: "Strongly Bullish", count: 8 },
  { key: "bullish", label: "Bullish", count: 19 },
  { key: "mildly_bullish", label: "Mildly Bullish", count: 14 },
  { key: "neutral", label: "Neutral / Balanced", count: 17 },
  { key: "mildly_bearish", label: "Mildly Bearish", count: 3 },
  { key: "strongly_bearish", label: "Strongly Bearish", count: 1 },
];

// lib/growth-band.ts labels — a separate vocabulary, because the growth score is
// a forward outlook and not a sentiment read.
const GROWTH_BANDS = [
  { key: "exceptional", label: "Exceptional", count: 6 },
  { key: "strong", label: "Strong", count: 17 },
  { key: "solid", label: "Solid", count: 24 },
  { key: "moderate", label: "Moderate", count: 26 },
  { key: "soft", label: "Soft", count: 12 },
  { key: "weak", label: "Weak", count: 3 },
];

// lib/board-read.ts configurations. The Read column names a CONFIGURATION of
// quality and price, never a sentiment band — summarising it with "Bullish"
// would describe the column in words it never uses.
const READ_CONFIGURATIONS = [
  { key: "aligned_cheap", label: "Aligned & cheap", count: 2 },
  { key: "quality_fair", label: "Quality at a fair price", count: 4 },
  { key: "priced_for_it", label: "Priced for it", count: 3 },
  { key: "outlook_led", label: "Outlook-led", count: 1 },
  { key: "peaking", label: "Peaking", count: 1 },
  { key: "cheap_forming", label: "Cheap, quality forming", count: 0 },
  { key: "balanced", label: "Balanced", count: 2 },
  { key: "unpriced", label: "No price read", count: 0 },
  { key: "priced_ahead", label: "Priced ahead of it", count: 0 },
  { key: "cheap_weak", label: "Cheap & weak", count: 1 },
  { key: "weak_rich", label: "Weak & rich", count: 0 },
];

/** Canonical: the quarter board, where only part of the universe has reported. */
export const QuarterBoard = () => (
  <BandSummaryLine
    scored={62}
    total={100}
    scopeNote="scored this quarter"
    bandCounts={QUARTER_BANDS}
  />
);

/** scored === total collapses the fraction to a plain count. */
export const EveryCompanyCovered = () => (
  <BandSummaryLine
    scored={100}
    total={100}
    scopeNote="scored this quarter"
    bandCounts={[
      { key: "strongly_bullish", label: "Strongly Bullish", count: 11 },
      { key: "bullish", label: "Bullish", count: 28 },
      { key: "mildly_bullish", label: "Mildly Bullish", count: 21 },
      { key: "neutral", label: "Neutral / Balanced", count: 31 },
      { key: "mildly_bearish", label: "Mildly Bearish", count: 7 },
      { key: "strongly_bearish", label: "Strongly Bearish", count: 2 },
    ]}
  />
);

/** The watchlist board summarises the Read column in the Read's own words. */
export const WatchlistReadColumn = () => (
  <BandSummaryLine
    scored={14}
    total={19}
    scopeNote="with a read"
    bandCounts={READ_CONFIGURATIONS}
  />
);

/** Where it actually sits: directly above the board frame it describes. */
export const AboveTheBoard = () => (
  <div className="space-y-3">
    <BandSummaryLine
      scored={88}
      total={100}
      scopeNote="with a growth score"
      bandCounts={GROWTH_BANDS}
    />
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Growth Board · 100
        </h2>
        <p className="text-[11px] text-muted-foreground">Ranked by growth outlook</p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {[
            { code: "NEULANDLAB", name: "Neuland Laboratories", score: 8.7 },
            { code: "ZAGGLE", name: "Zaggle Prepaid", score: 8.1 },
            { code: "MTARTECH", name: "MTAR Technologies", score: 7.7 },
          ].map((row) => (
            <tr key={row.code} className="border-b border-border/40 last:border-0">
              <td className="px-4 py-2.5">{row.name}</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                {row.score.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
