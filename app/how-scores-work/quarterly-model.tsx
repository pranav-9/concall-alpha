// Diagrammatic explanation of the Phase 1 quarterly score model, for /how-scores-work.
// Anchored to the real compute_score: six weighted categories, a -2..+2 lean each, a 5.5
// baseline, and a 6.0 downside cap when any CORE category (Financials / Guidance /
// Concentration) hits -2. See concallyser/app/phase1_sentiment/gemini_scorer.py.
//
// Div-based (not SVG) to match the existing DistributionHistogram idiom and stay theme-aware.
// Colours reuse the platform's diverging teal<->orange ramp (lib/score-band.ts): teal = a
// positive push off the 5.5 neutral midpoint, orange = a negative one.

import { bandForScore, BANDS } from "@/lib/score-band";

type Category = {
  short: string;
  full: string;
  weight: number;
  core: boolean;
  lean: number; // -2..+2, for the worked example only
};

// Weights are the real SCORE_WEIGHTS; sorted high -> low. Leans are an illustrative quarter.
const CATEGORIES: Category[] = [
  { short: "Financials", full: "Quantitative decomposition", weight: 0.25, core: true, lean: 1 },
  { short: "Guidance", full: "Forward guidance", weight: 0.25, core: true, lean: 1 },
  { short: "Concentration", full: "Concentration & dependencies", weight: 0.18, core: true, lean: 0 },
  { short: "Strategy", full: "Strategy & capital allocation", weight: 0.15, core: false, lean: 2 },
  { short: "Industry", full: "Industry context", weight: 0.12, core: false, lean: -1 },
  { short: "Q&A", full: "Q&A signals", weight: 0.05, core: false, lean: 1 },
];

const BASELINE = 5.5;
const SPAN = 4.5; // all leans +2 -> +4.5 -> 10; all -2 -> 1
const K = SPAN / 2; // contribution = weight * lean * 2.25

const contribution = (c: Category) => c.weight * c.lean * K;

const WEIGHT_ROW = "grid grid-cols-[8rem_minmax(0,1fr)_2.5rem] items-center gap-3";
const EXAMPLE_ROW = "grid grid-cols-[8rem_1.75rem_minmax(0,1fr)_3rem] items-center gap-2 sm:gap-3";

function CoreDot({ on }: { on: boolean }) {
  return on ? (
    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-600 dark:bg-sky-400" aria-hidden />
  ) : (
    <span className="h-1.5 w-1.5 shrink-0" aria-hidden />
  );
}

// The model: six weighted categories as a sorted bar chart.
export function QuarterlyWeightBars() {
  const maxWeight = Math.max(...CATEGORIES.map((c) => c.weight));
  return (
    <div className="space-y-2.5">
      {CATEGORIES.map((c) => {
        const pct = (c.weight / maxWeight) * 100;
        return (
          <div key={c.short} className={WEIGHT_ROW}>
            <div className="flex min-w-0 items-center gap-1.5">
              <CoreDot on={c.core} />
              <span className="truncate text-sm text-foreground" title={c.full}>
                {c.short}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-muted/50">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  c.core ? "bg-sky-600 dark:bg-sky-500" : "bg-sky-400/60 dark:bg-sky-700/70"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
              {c.weight.toFixed(2)}
            </span>
          </div>
        );
      })}
      <p className="pt-1 text-[11px] text-muted-foreground">
        <span className="mr-1 inline-block h-1.5 w-1.5 translate-y-[1px] rounded-full bg-sky-600 dark:bg-sky-400" />
        core — a −2 here caps the quarter at 6.0 &nbsp;·&nbsp; weights sum to 1.00
      </p>
    </div>
  );
}

// The worked example: each category's signed push off the 5.5 baseline, building to the score.
export function QuarterlyWorkedExample() {
  const dMax = 0.8; // half-track domain; Strategy's +0.68 is the largest push here
  const sumContrib = CATEGORIES.reduce((acc, c) => acc + contribution(c), 0);
  const rawScore = BASELINE + sumContrib;
  const capped = CATEGORIES.some((c) => c.core && c.lean <= -2);
  const score = Math.round((capped ? Math.min(rawScore, 6.0) : rawScore) * 10) / 10;
  const band = BANDS[bandForScore(score)];

  const signed = (n: number) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));

  return (
    <div className="space-y-3">
      <div className={`${EXAMPLE_ROW} text-[10px] uppercase tracking-[0.12em] text-muted-foreground`}>
        <span />
        <span className="text-right">Lean</span>
        <span className="text-center">weaker ← 5.5 → stronger</span>
        <span className="text-right">Push</span>
      </div>

      <div className="space-y-2">
        {CATEGORIES.map((c) => {
          const d = contribution(c);
          const w = (Math.abs(d) / dMax) * 50;
          const positive = d > 0;
          const isZero = Math.abs(d) < 1e-9;
          return (
            <div key={c.short} className={EXAMPLE_ROW}>
              <div className="flex min-w-0 items-center gap-1.5">
                <CoreDot on={c.core} />
                <span className="truncate text-sm text-foreground" title={c.full}>
                  {c.short}
                </span>
              </div>
              <span
                className={`text-right font-mono text-xs tabular-nums ${
                  c.lean > 0
                    ? "text-teal-700 dark:text-teal-300"
                    : c.lean < 0
                      ? "text-orange-700 dark:text-orange-300"
                      : "text-muted-foreground"
                }`}
              >
                {c.lean > 0 ? `+${c.lean}` : c.lean}
              </span>
              <div className="relative h-4">
                <div
                  className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/25"
                  aria-hidden
                />
                {isZero ? (
                  <div
                    className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/50"
                    aria-hidden
                  />
                ) : (
                  <div
                    className={`absolute inset-y-1 rounded-sm ${
                      positive ? "bg-teal-500 dark:bg-teal-400" : "bg-orange-500 dark:bg-orange-400"
                    }`}
                    style={positive ? { left: "50%", width: `${w}%` } : { left: `${50 - w}%`, width: `${w}%` }}
                  />
                )}
              </div>
              <span
                className={`text-right font-mono text-xs tabular-nums ${
                  d > 0
                    ? "text-teal-700 dark:text-teal-300"
                    : d < 0
                      ? "text-orange-700 dark:text-orange-300"
                      : "text-muted-foreground"
                }`}
              >
                {signed(d)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-3 text-sm">
        <span className="text-muted-foreground">Baseline 5.5</span>
        <span className="text-muted-foreground">
          + pushes <span className="font-mono tabular-nums">{signed(sumContrib)}</span>
        </span>
        <span className="text-muted-foreground">=</span>
        <span className={`font-mono text-base font-bold tabular-nums ${band.textClass}`}>
          {score.toFixed(1)}
        </span>
        <span className={`text-xs font-semibold ${band.textClass}`}>{band.label}</span>
      </div>
    </div>
  );
}
