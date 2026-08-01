// The hero exhibit: three covered companies' scored histories side by side,
// each drawn as the step function it actually is. Subjects come from
// lib/home-trails (widest-travelled example of three different trajectories),
// so this is a live plate — nothing here is illustration.
//
// Three panels rather than one because the page's claim is that SHAPE matters:
// a climb, a flat band and a V read as different stories at a glance, which is
// an argument a single trail can only assert.

import Link from "next/link";

import type { CompanyTrail } from "@/lib/home-trails";
import { INK, trajectoryInk } from "@/lib/trajectory-ink";
import { buildSteps, gridValues, scoreDomain } from "./step-geometry";

type ChartSize = {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  axisType: number;
  annotationType: number;
};

// Panels are narrow, so the right-hand score axis is dropped: the annotated
// low, high and latest carry every number a reader needs, and the gridlines
// still give the level. Fewer marks, same information.
const PANEL: ChartSize = {
  width: 320,
  height: 330,
  padLeft: 6,
  padRight: 30,
  padTop: 24,
  padBottom: 28,
  axisType: 11,
  annotationType: 12,
};

const PANEL_COMPACT: ChartSize = {
  width: 420,
  height: 190,
  padLeft: 4,
  padRight: 38,
  padTop: 22,
  padBottom: 26,
  axisType: 12,
  annotationType: 13,
};

function StepChart({
  trail,
  size,
  drawDelay,
  domain,
  slots,
}: {
  trail: CompanyTrail;
  size: ChartSize;
  drawDelay: number;
  domain: [number, number];
  slots: number;
}) {
  const scores = trail.points.map((p) => p.score);
  const geo = buildSteps({ scores, ...size, domain, slots });
  const ink = INK[trajectoryInk(trail.trajectory)];
  const last = geo.treads[geo.treads.length - 1];

  const lowTread = geo.treads[trail.lowIndex] ?? geo.treads[0];
  const highTread = geo.treads[trail.highIndex] ?? geo.treads[geo.treads.length - 1];
  const centre = (tread: (typeof geo.treads)[number]) => (tread.x0 + tread.x1) / 2;
  // Keep edge annotations off the panel's margins.
  const clampX = (x: number) =>
    Math.min(Math.max(x, size.padLeft + 14), size.width - size.padRight - 14);

  const first = trail.points[0];
  const latest = trail.points[trail.points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${size.width} ${size.height}`}
      className="h-auto w-full overflow-visible"
      style={{ ["--draw-delay" as string]: `${drawDelay}ms` }}
      role="img"
      aria-label={`${trail.name} quarterly score, ${first.label} to ${latest.label}. ${trail.trajectoryDescription}`}
    >
      {gridValues(geo.domain).map((value) => (
        <line
          key={value}
          x1={geo.treads[0]?.x0 ?? size.padLeft}
          x2={size.width - size.padRight}
          y1={geo.y(value)}
          y2={geo.y(value)}
          stroke="var(--rule)"
          strokeWidth={1}
        />
      ))}

      <path d={geo.area} fill={ink} className="house-wash" />
      <path
        d={geo.path}
        fill="none"
        stroke={ink}
        strokeWidth={2}
        strokeLinejoin="miter"
        className="house-draw"
        style={{ ["--draw-length" as string]: geo.length.toFixed(0) }}
      />

      <g className="house-annotate">
        <line
          x1={last.x0}
          x2={size.width - size.padRight}
          y1={last.y}
          y2={last.y}
          stroke={ink}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        <text
          x={size.width - size.padRight + 6}
          y={last.y}
          dominantBaseline="middle"
          fontSize={size.annotationType}
          fontWeight={600}
          fill={ink}
          className="house-data"
        >
          {trail.latest.toFixed(1)}
        </text>

        <text
          x={clampX(centre(highTread))}
          y={highTread.y - 8}
          textAnchor="middle"
          fontSize={size.annotationType}
          fill="var(--ink)"
          className="house-data"
        >
          {trail.high.score.toFixed(1)}
        </text>
        <text
          x={clampX(centre(lowTread))}
          y={lowTread.y + 16}
          textAnchor="middle"
          fontSize={size.annotationType}
          fill="var(--ink)"
          className="house-data"
        >
          {trail.low.score.toFixed(1)}
        </text>
      </g>

      <line
        x1={geo.treads[0].x0}
        x2={size.width - size.padRight}
        y1={geo.baseline}
        y2={geo.baseline}
        stroke="var(--rule)"
        strokeWidth={1}
      />
      <g className="house-annotate">
        <text
          x={geo.treads[0].x0}
          y={geo.baseline + size.axisType + 7}
          fontSize={size.axisType}
          fill="var(--ink-soft)"
          className="house-data"
        >
          {first.label}
        </text>
        <text
          x={size.width - size.padRight}
          y={geo.baseline + size.axisType + 7}
          textAnchor="end"
          fontSize={size.axisType}
          fill="var(--ink-soft)"
          className="house-data"
        >
          {latest.label}
        </text>
      </g>
    </svg>
  );
}

function Panel({
  trail,
  index,
  domain,
  slots,
}: {
  trail: CompanyTrail;
  index: number;
  domain: [number, number];
  slots: number;
}) {
  const ink = INK[trajectoryInk(trail.trajectory)];
  const drawDelay = 100 + index * 220;

  return (
    <figure className="house-panel">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <Link
          href={`/company/${trail.code}`}
          prefetch={false}
          className="house-data house-micro min-w-0 truncate text-[var(--ink)] underline-offset-4 hover:underline"
          title={trail.name}
        >
          {trail.code}
        </Link>
        <span className="house-data house-micro whitespace-nowrap" style={{ color: ink }}>
          {trail.trajectoryLabel}
        </span>
      </figcaption>

      <div className="hidden lg:block">
        <StepChart trail={trail} size={PANEL} drawDelay={drawDelay} domain={domain} slots={slots} />
      </div>
      <div className="lg:hidden">
        <StepChart
          trail={trail}
          size={PANEL_COMPACT}
          drawDelay={drawDelay}
          domain={domain}
          slots={slots}
        />
      </div>

      <p className="house-data house-micro mt-2 text-[var(--ink-soft)]">
        {trail.points.length} qtrs · low {trail.low.score.toFixed(1)} · high{" "}
        {trail.high.score.toFixed(1)}
      </p>
    </figure>
  );
}

export default function ScorePlate({
  trails,
  children,
}: {
  trails: CompanyTrail[];
  children: React.ReactNode;
}) {
  const quarters = trails.reduce((sum, trail) => sum + trail.points.length, 0);
  // One domain across all three panels. Per-panel scales would let a shallow
  // wobble draw like a collapse, which is exactly the misreading this section
  // is arguing against.
  const domain = scoreDomain(trails.flatMap((trail) => trail.points.map((p) => p.score)));
  // ...and one quarter width, so a shorter history draws shorter rather than
  // being stretched across the same span as a longer one.
  const slots = Math.max(...trails.map((trail) => trail.points.length));

  return (
    <figure className="house-plate">
      <figcaption className="house-plate-bar">
        <span className="house-data house-micro whitespace-nowrap">
          Plate 01 — Quarterly read
        </span>
        <span className="house-data house-micro truncate text-[var(--ink)]">
          {trails.length} shapes
        </span>
      </figcaption>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <div className="house-plate-cell border-b border-[var(--rule)] lg:border-b-0 lg:border-r">
          {children}
        </div>
        <div className="house-panels">
          {trails.map((trail, index) => (
            <Panel
              key={trail.code}
              trail={trail}
              index={index}
              domain={domain}
              slots={slots}
            />
          ))}
        </div>
      </div>

      {/* The figure's caption, which is where this line belongs: it reads the
       * three shapes above it instead of asking a stranger to decode "a 7"
       * before they know a score exists. */}
      <div className="house-plate-foot house-data house-micro">
        <span className="text-[var(--ink)]">
          A 7 on the way up is a different stock from a 7 on the way down
        </span>
        <span aria-hidden className="hidden text-[var(--rule)] sm:inline">|</span>
        <span>{quarters} quarters, one scale</span>
      </div>
    </figure>
  );
}
