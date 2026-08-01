// Step-plot geometry, shared by the hero plate and the wall's small multiples.
//
// A quarterly score is a discrete judgement about one call, not a reading on a
// continuous curve — so it is drawn as treads and risers. Joining the points
// with a smooth line would imply values between quarters that were never read.

export type Tread = {
  x0: number;
  x1: number;
  y: number;
  score: number;
  index: number;
};

export type StepGeometry = {
  treads: Tread[];
  /** Stroke path across the treads. */
  path: string;
  /** Same path closed to the baseline, for the wash under the steps. */
  area: string;
  /** Path length in user units — feeds the draw-on animation. */
  length: number;
  y: (score: number) => number;
  baseline: number;
  domain: [number, number];
};

type Options = {
  scores: readonly number[];
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  /** Extra headroom above/below the data, in score units. */
  pad?: number;
};

/** Domain snapped to whole scores so the gridlines land on readable values. */
export function scoreDomain(scores: readonly number[], pad = 0.6): [number, number] {
  if (scores.length === 0) return [0, 10];
  const lo = Math.max(0, Math.floor(Math.min(...scores) - pad));
  const hi = Math.min(10, Math.ceil(Math.max(...scores) + pad));
  return hi - lo < 2 ? [Math.max(0, hi - 2), hi] : [lo, hi];
}

export function buildSteps(options: Options): StepGeometry {
  const { scores, width, height, padLeft, padRight, padTop, padBottom } = options;
  const domain = scoreDomain(scores, options.pad ?? 0.6);
  const [lo, hi] = domain;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const span = hi - lo || 1;
  const y = (score: number) => padTop + plotH * (1 - (score - lo) / span);
  const baseline = padTop + plotH;

  if (scores.length === 0) {
    return { treads: [], path: "", area: "", length: 0, y, baseline, domain };
  }

  const w = plotW / scores.length;
  const treads: Tread[] = scores.map((score, index) => ({
    x0: padLeft + index * w,
    x1: padLeft + (index + 1) * w,
    y: y(score),
    score,
    index,
  }));

  let path = `M${treads[0].x0.toFixed(2)},${treads[0].y.toFixed(2)}`;
  let length = 0;
  treads.forEach((tread, index) => {
    if (index > 0) {
      path += `V${tread.y.toFixed(2)}`;
      length += Math.abs(tread.y - treads[index - 1].y);
    }
    path += `H${tread.x1.toFixed(2)}`;
    length += tread.x1 - tread.x0;
  });

  const area = `${path}V${baseline.toFixed(2)}H${treads[0].x0.toFixed(2)}Z`;

  return { treads, path, area, length, y, baseline, domain };
}

/** Whole-score gridline values inside the domain, ends excluded. */
export function gridValues([lo, hi]: [number, number]): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(lo); v <= Math.floor(hi); v += 1) out.push(v);
  return out;
}
