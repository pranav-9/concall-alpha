// Diagrammatic explanation of the Phase 1 quarterly score model, for /how-scores-work.
// Anchored to the real compute_score: six weighted categories, a -2..+2 lean each, a 5.5
// baseline, and a 6.0 downside cap when any CORE category (Financials / Guidance /
// Concentration) hits -2. See concallyser/app/phase1_sentiment/gemini_scorer.py.
//
// Div-based (not SVG) to match the existing DistributionHistogram idiom and stay theme-aware.
// Colours reuse the platform's diverging teal<->orange ramp (lib/score-band.ts): teal = a
// positive push off the 5.5 neutral midpoint, orange = a negative one.

import {
  type LucideIcon,
  BarChart3,
  Building2,
  Compass,
  Crosshair,
  MessagesSquare,
  Route,
} from "lucide-react";
import { bandForScore, BANDS, SCORE_BAND_ORDER } from "@/lib/score-band";

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
            <span className="min-w-0 truncate text-sm text-foreground" title={c.full}>
              {c.short}
            </span>
            <div className="relative h-2.5 rounded-full bg-muted/50">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-sky-500 dark:bg-sky-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
              {c.weight.toFixed(2)}
            </span>
          </div>
        );
      })}
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

// The conceptual model: what the six categories are, grouped into core (cap-bearing) and context.
type ModelCat = { short: string; gloss: string; Icon: LucideIcon };
const CORE_CATS: ModelCat[] = [
  { short: "Financials", gloss: "the numbers", Icon: BarChart3 },
  { short: "Guidance", gloss: "the outlook", Icon: Compass },
  { short: "Concentration", gloss: "the risks", Icon: Crosshair },
];
const CONTEXT_CATS: ModelCat[] = [
  { short: "Strategy", gloss: "capital moves", Icon: Route },
  { short: "Industry", gloss: "the backdrop", Icon: Building2 },
  { short: "Q&A", gloss: "tone & signals", Icon: MessagesSquare },
];

function CatTile({ short, gloss, Icon, core }: ModelCat & { core: boolean }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center ${
        core
          ? "border-sky-300/50 bg-sky-100/50 dark:border-sky-700/30 dark:bg-sky-900/20"
          : "border-border/60 bg-background/40"
      }`}
    >
      <Icon
        className={`h-4 w-4 ${core ? "text-sky-700 dark:text-sky-300" : "text-muted-foreground"}`}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="text-[11px] font-semibold leading-tight text-foreground">{short}</span>
      <span className="text-[10px] leading-tight text-muted-foreground">{gloss}</span>
    </div>
  );
}

export function QuarterlyCategoryModel() {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-sky-800 dark:text-sky-200">
          Core
          <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground">
            — a −2 here caps the quarter at 6.0
          </span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CORE_CATS.map((c) => (
            <CatTile key={c.short} {...c} core />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Context
          <span className="ml-1 font-normal normal-case tracking-normal">— refines the read</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CONTEXT_CATS.map((c) => (
            <CatTile key={c.short} {...c} core={false} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Compact band legend — doubles as the colour key for the distribution curve.
export function QuarterlyBandLegend() {
  const keys = SCORE_BAND_ORDER.filter((k) => k !== "upcoming");
  return (
    <div className="space-y-1.5">
      {keys.map((key) => {
        const b = BANDS[key];
        return (
          <div key={key} className="flex items-center gap-2.5">
            <span className={`h-3 w-3 shrink-0 rounded-sm ${b.barClass}`} aria-hidden />
            <span className="text-sm text-foreground">{b.label}</span>
            <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
              {b.description}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Distribution of latest-quarter scores as a smooth density curve, filled with the band colours.
const CURVE_REGIONS = [
  { key: "mildly_bearish", lo: 3, hi: 4.5 },
  { key: "neutral", lo: 4.5, hi: 6.5 },
  { key: "mildly_bullish", lo: 6.5, hi: 7 },
  { key: "bullish", lo: 7, hi: 8 },
  { key: "strongly_bullish", lo: 8, hi: 9.5 },
] as const;

export function QuarterlyDistributionCurve({
  scores,
}: {
  scores: Array<number | null | undefined>;
}) {
  const vals = scores.filter((s): s is number => typeof s === "number" && Number.isFinite(s));
  if (vals.length === 0) return null;

  const DMIN = 3;
  const DMAX = 9.5;
  const BIN = 0.5;
  const nBins = Math.round((DMAX - DMIN) / BIN);
  const counts = new Array(nBins).fill(0);
  for (const s of vals) {
    const c = Math.min(DMAX - 1e-9, Math.max(DMIN, s));
    counts[Math.min(nBins - 1, Math.floor((c - DMIN) / BIN))] += 1;
  }
  const maxCount = Math.max(...counts, 1);

  const W = 360;
  const H = 168;
  const padL = 6;
  const padR = 6;
  const padT = 16;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = padT + plotH;
  const xOf = (score: number) => padL + ((score - DMIN) / (DMAX - DMIN)) * plotW;
  const yOf = (count: number) => padT + plotH * (1 - count / maxCount);

  const pts: [number, number][] = counts.map((c, i) => [xOf(DMIN + BIN * (i + 0.5)), yOf(c)]);

  // Catmull-Rom -> cubic-bezier segments (no leading move), so we can reuse for stroke + area.
  const segs = (() => {
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  })();
  const first = pts[0];
  const strokeD = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)}${segs}`;
  const areaD = `M ${xOf(DMIN).toFixed(1)} ${baseY} L ${first[0].toFixed(1)} ${first[1].toFixed(1)}${segs} L ${xOf(DMAX).toFixed(1)} ${baseY} Z`;

  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)];
  const medX = xOf(Math.min(DMAX, Math.max(DMIN, median)));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Distribution of latest-quarter scores"
    >
      <defs>
        <clipPath id="qd-area">
          <path d={areaD} />
        </clipPath>
      </defs>
      <g clipPath="url(#qd-area)">
        {CURVE_REGIONS.map((r) => (
          <rect
            key={r.key}
            x={xOf(r.lo)}
            y={padT}
            width={xOf(r.hi) - xOf(r.lo)}
            height={plotH}
            fill={BANDS[r.key].chartHex}
            fillOpacity={0.78}
          />
        ))}
      </g>
      <path d={strokeD} fill="none" className="stroke-foreground/55" strokeWidth={1.5} />
      <line
        x1={medX}
        y1={padT}
        x2={medX}
        y2={baseY}
        className="stroke-foreground/40"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text x={medX} y={padT - 5} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>
        median {median.toFixed(1)}
      </text>
      <line x1={padL} y1={baseY} x2={W - padR} y2={baseY} className="stroke-border" strokeWidth={1} />
      {[3, 4, 5, 6, 7, 8, 9].map((v) => (
        <text
          key={v}
          x={xOf(v)}
          y={baseY + 13}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 9 }}
        >
          {v}
        </text>
      ))}
    </svg>
  );
}
