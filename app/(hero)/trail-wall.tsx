// Small multiples: every covered company's score trail at thumbnail size, in
// one field, sorted by trajectory. The hero plate argues that shape matters;
// this is the evidence that we hold a shape for all of them.

import Link from "next/link";

import type { CompanyTrail } from "@/lib/home-trails";
import { TRAJECTORIES } from "@/lib/score-trajectory";
import { buildSteps } from "./step-geometry";
import {
  FAMILY_LABEL,
  FAMILY_ORDER,
  INK,
  familyTrajectories,
  trajectoryInk,
  type InkFamily,
} from "@/lib/trajectory-ink";

const SPARK = {
  width: 74,
  height: 24,
  padLeft: 0,
  padRight: 0,
  padTop: 3,
  padBottom: 3,
};

function Spark({ trail, ink }: { trail: CompanyTrail; ink: string }) {
  const geo = buildSteps({ scores: trail.points.map((p) => p.score), ...SPARK, pad: 0.4 });
  if (geo.treads.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${SPARK.width} ${SPARK.height}`}
      className="h-6 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={geo.area} fill={ink} className="house-wash" />
      <path d={geo.path} fill="none" stroke={ink} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Tile({ trail }: { trail: CompanyTrail }) {
  const family = trajectoryInk(trail.trajectory);
  const ink = INK[family];

  return (
    <Link
      href={`/company/${trail.code}`}
      prefetch={false}
      className="house-tile"
      title={`${trail.name} — ${trail.trajectoryDescription}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="house-data house-micro truncate text-[var(--ink)]">{trail.code}</span>
        <span className="house-data text-[0.72rem] font-semibold tabular-nums" style={{ color: ink }}>
          {trail.latest.toFixed(1)}
        </span>
      </div>
      <Spark trail={trail} ink={ink} />
      <span className="house-data house-micro truncate text-[var(--ink-soft)]">
        {trail.trajectoryCellLabel === "—"
          ? `${trail.points.length}q`
          : trail.trajectoryCellLabel}
      </span>
    </Link>
  );
}

export default function TrailWall({ wall }: { wall: CompanyTrail[] }) {
  if (wall.length === 0) return null;

  const counts = new Map<InkFamily, number>();
  wall.forEach((trail) => {
    const family = trajectoryInk(trail.trajectory);
    counts.set(family, (counts.get(family) ?? 0) + 1);
  });

  return (
    <section aria-labelledby="wall-heading" className="house-block">
      <div className="house-block-head">
        <div className="max-w-2xl">
          <p className="house-data house-micro text-[var(--ink-soft)]">Plate 02 — The covered universe</p>
          <h2 id="wall-heading" className="house-display mt-2 text-2xl sm:text-3xl">
            {wall.length} companies. Every one has a shape.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
            Same step plot as the exhibit, one per company, sorted by where the read is
            heading. Pick any of them to open the quarters behind the line.
          </p>
        </div>

        <ul className="house-legend">
          {FAMILY_ORDER.map((family) => (
            <li key={family}>
              <span className="house-legend-swatch" style={{ background: INK[family] }} aria-hidden />
              <span className="house-data house-micro text-[var(--ink)]">{counts.get(family) ?? 0}</span>
              <span className="text-xs text-[var(--ink-soft)]">
                {FAMILY_LABEL[family]}
                <span className="sr-only">
                  {" "}
                  — {familyTrajectories(family).map((key) => TRAJECTORIES[key].label).join(", ")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="house-wall">
        {wall.map((trail) => (
          <Tile key={trail.code} trail={trail} />
        ))}
      </div>
    </section>
  );
}
