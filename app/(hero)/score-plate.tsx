// The hero exhibit: one covered company's entire scored history, drawn as the
// step function it actually is. Subject is chosen by lib/home-trails (widest
// travelled read), so this is a live plate — nothing here is illustration.

import Link from "next/link";

import type { CompanyTrail } from "@/lib/home-trails";
import { buildSteps, gridValues } from "./step-geometry";
import { INK, trajectoryInk } from "@/lib/trajectory-ink";

type ChartSize = {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  axisType: number;
  annotationType: number;
  /** Show one x tick every N quarters. */
  tickEvery: number;
};

// Aspect ratios are chosen to fill the plate cell at each breakpoint — the SVG
// scales on width, so a mismatched viewBox would letterbox the chart inside its
// own frame.
const WIDE: ChartSize = {
  width: 900,
  height: 330,
  padLeft: 6,
  padRight: 52,
  padTop: 26,
  padBottom: 36,
  axisType: 11,
  annotationType: 12,
  tickEvery: 4,
};

const COMPACT: ChartSize = {
  width: 420,
  height: 250,
  padLeft: 4,
  padRight: 40,
  padTop: 22,
  padBottom: 30,
  axisType: 13,
  annotationType: 14,
  tickEvery: 8,
};

function StepChart({ trail, size }: { trail: CompanyTrail; size: ChartSize }) {
  const scores = trail.points.map((p) => p.score);
  const geo = buildSteps({ scores, ...size });
  const ink = INK[trajectoryInk(trail.trajectory)];
  const last = geo.treads[geo.treads.length - 1];
  const axisX = size.width - size.padRight + 8;

  const lowTread = geo.treads[trail.lowIndex] ?? geo.treads[0];
  const highTread = geo.treads[trail.highIndex] ?? geo.treads[geo.treads.length - 1];
  const centre = (tread: (typeof geo.treads)[number]) => (tread.x0 + tread.x1) / 2;
  // Keep edge annotations off the plate's margins.
  const clampX = (x: number) => Math.min(Math.max(x, size.padLeft + 18), size.width - size.padRight - 18);

  return (
    <svg
      viewBox={`0 0 ${size.width} ${size.height}`}
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label={`${trail.name} quarterly score, ${trail.points[0].label} to ${trail.points[trail.points.length - 1].label}. ${trail.trajectoryDescription}`}
    >
      {gridValues(geo.domain).map((value) => (
        <g key={value}>
          <line
            x1={size.padLeft}
            x2={size.width - size.padRight}
            y1={geo.y(value)}
            y2={geo.y(value)}
            stroke="var(--rule)"
            strokeWidth={1}
          />
          <text
            x={axisX}
            y={geo.y(value)}
            dominantBaseline="middle"
            fontSize={size.axisType}
            fill="var(--ink-soft)"
            className="house-data"
          >
            {value.toFixed(0)}
          </text>
        </g>
      ))}

      <path d={geo.area} fill={ink} className="house-wash" />
      <path
        d={geo.path}
        fill="none"
        stroke={ink}
        strokeWidth={2.25}
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
          x={axisX}
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
          y={highTread.y - 9}
          textAnchor="middle"
          fontSize={size.annotationType}
          fill="var(--ink)"
          className="house-data"
        >
          {trail.high.score.toFixed(1)}
        </text>
        <text
          x={clampX(centre(lowTread))}
          y={lowTread.y + 17}
          textAnchor="middle"
          fontSize={size.annotationType}
          fill="var(--ink)"
          className="house-data"
        >
          {trail.low.score.toFixed(1)}
        </text>
      </g>

      <line
        x1={size.padLeft}
        x2={size.width - size.padRight}
        y1={geo.baseline}
        y2={geo.baseline}
        stroke="var(--rule)"
        strokeWidth={1}
      />
      <g className="house-annotate">
        {geo.treads.map((tread, index) => {
          const isLast = index === geo.treads.length - 1;
          if (index % size.tickEvery !== 0 && !isLast) return null;
          return (
            <text
              key={tread.index}
              x={isLast ? tread.x1 : tread.x0}
              y={geo.baseline + size.axisType + 8}
              textAnchor={isLast ? "end" : "start"}
              fontSize={size.axisType}
              fill="var(--ink-soft)"
              className="house-data"
            >
              {trail.points[index].label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

export default function ScorePlate({
  trail,
  children,
}: {
  trail: CompanyTrail;
  children: React.ReactNode;
}) {
  const ink = INK[trajectoryInk(trail.trajectory)];
  const first = trail.points[0];
  const last = trail.points[trail.points.length - 1];

  return (
    <figure className="house-plate">
      <figcaption className="house-plate-bar">
        <span className="house-data house-micro whitespace-nowrap">Plate 01 — Quarterly read</span>
        <Link href={`/company/${trail.code}`} prefetch={false} className="house-plate-subject">
          <span className="house-data house-micro">{trail.code}</span>
          <span aria-hidden className="text-[var(--rule)]">/</span>
          <span className="truncate">{trail.name}</span>
        </Link>
      </figcaption>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
        <div className="house-plate-cell border-b border-[var(--rule)] lg:border-b-0 lg:border-r">
          {children}
        </div>
        <div className="house-plate-cell flex items-center">
          <div className="hidden w-full lg:block">
            <StepChart trail={trail} size={WIDE} />
          </div>
          <div className="w-full lg:hidden">
            <StepChart trail={trail} size={COMPACT} />
          </div>
        </div>
      </div>

      <div className="house-plate-foot house-data house-micro">
        <span>
          {trail.points.length} quarters read · {first.label}—{last.label}
        </span>
        <span aria-hidden className="hidden text-[var(--rule)] sm:inline">|</span>
        <span>
          Low {trail.low.score.toFixed(1)} {trail.low.label} · High {trail.high.score.toFixed(1)}{" "}
          {trail.high.label}
        </span>
        <span aria-hidden className="hidden text-[var(--rule)] sm:inline">|</span>
        <span style={{ color: ink }}>Now {trail.trajectoryLabel.toLowerCase()}</span>
      </div>
    </figure>
  );
}
