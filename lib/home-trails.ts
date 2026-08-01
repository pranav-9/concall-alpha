// Score trails for the homepage: one deep exhibit (the hero plate) plus the
// full covered universe as small multiples (the wall).
//
// Both surfaces read the SAME substrate — every scored quarter of every
// discovery-listed company — so the hero can never disagree with the wall.
// Trajectory labels come from lib/score-trajectory (the platform-wide
// classifier the leaderboard's Trend column uses), never from a local rule.
//
// Coverage: filtered through isDiscoveryListed, and the scoring_meta filter is
// carried as required for every concall_analysis query.

import { unstable_cache } from "next/cache";

import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";
import {
  classifyTrajectory,
  quarterIndex,
  TRAJECTORIES,
  type TrajectoryKey,
} from "@/lib/score-trajectory";
import { createPublicReadClient } from "@/lib/supabase/public-read";

const PAGE_SIZE = 1000;
const MAX_ROWS = 20000;

/** Quarters of history the exhibit needs before it can carry the hero. */
const EXHIBIT_MIN_QUARTERS = 16;
/** Trajectory rules look back 6 quarters; gaps inside that window matter. */
const GAP_WINDOW = 6;

export type TrailPoint = {
  label: string;
  fy: number;
  qtr: number;
  score: number;
};

export type CompanyTrail = {
  code: string;
  name: string;
  sector: string | null;
  /** Oldest → newest, the way a chart reads. */
  points: TrailPoint[];
  latest: number;
  low: TrailPoint;
  high: TrailPoint;
  /** Positions of low/high in `points`. Indices, not references: this payload
   * round-trips through unstable_cache's JSON serialization, so object identity
   * is gone by the time a component reads it. */
  lowIndex: number;
  highIndex: number;
  trajectory: TrajectoryKey;
  trajectoryLabel: string;
  trajectoryCellLabel: string;
  trajectoryDescription: string;
};

export type HomeTrails = {
  /** The company whose read has travelled furthest — the hero plate's subject. */
  exhibit: CompanyTrail | null;
  /** Every covered company with at least one scored quarter. */
  wall: CompanyTrail[];
  companyCount: number;
  sectorCount: number;
  quarterCount: number;
};

type CompanyRow = {
  code: string | null;
  name: string | null;
  sector: string | null;
  market_cap_band_at_admission: string | null;
  excluded_from_discovery: boolean | null;
};

type ScoreRow = {
  company_code: string | null;
  score: number | string | null;
  fy: number | null;
  qtr: number | null;
  quarter_label: string | null;
};

function toTrail(
  company: CompanyRow,
  rows: ScoreRow[],
): CompanyTrail | null {
  // Newest-first is what classifyTrajectory expects; points ship oldest-first.
  const newestFirst = [...rows]
    .map((r) => ({
      label: r.quarter_label?.trim() || `Q${r.qtr} FY${r.fy}`,
      fy: Number(r.fy),
      qtr: Number(r.qtr),
      score: Number(r.score),
    }))
    .filter(
      (p) =>
        Number.isFinite(p.score) && Number.isFinite(p.fy) && Number.isFinite(p.qtr),
    )
    .sort((a, b) => b.fy - a.fy || b.qtr - a.qtr);

  if (newestFirst.length === 0) return null;

  // A gap inside the rules' look-back window suppresses sharp-move labels.
  const window = newestFirst.slice(0, GAP_WINDOW);
  const hasGapInWindow = window.some(
    (p, i) =>
      i > 0 &&
      quarterIndex(window[i - 1].fy, window[i - 1].qtr) -
        quarterIndex(p.fy, p.qtr) !==
        1,
  );

  const result = classifyTrajectory(
    newestFirst.map((p) => p.score),
    { hasGapInWindow },
  );

  const points = [...newestFirst].reverse();
  let lowIndex = 0;
  let highIndex = 0;
  points.forEach((point, index) => {
    if (point.score < points[lowIndex].score) lowIndex = index;
    if (point.score > points[highIndex].score) highIndex = index;
  });

  return {
    code: company.code as string,
    name: company.name?.trim() || (company.code as string),
    sector: company.sector?.trim() || null,
    points,
    latest: newestFirst[0].score,
    low: points[lowIndex],
    high: points[highIndex],
    lowIndex,
    highIndex,
    trajectory: result.key,
    trajectoryLabel: TRAJECTORIES[result.key].label,
    trajectoryCellLabel: TRAJECTORIES[result.key].cellLabel,
    trajectoryDescription: result.description,
  };
}

/**
 * The exhibit is the widest-travelled read: among companies with a long enough
 * history to show a shape, the one whose score has covered the most ground.
 * Derived, not curated — a flat trail can't win, and no company is pinned.
 */
function pickExhibit(trails: CompanyTrail[]): CompanyTrail | null {
  const eligible = trails.filter((t) => t.points.length >= EXHIBIT_MIN_QUARTERS);
  const pool = eligible.length > 0 ? eligible : trails;
  if (pool.length === 0) return null;

  return [...pool].sort((a, b) => {
    const rangeA = a.high.score - a.low.score;
    const rangeB = b.high.score - b.low.score;
    if (rangeB !== rangeA) return rangeB - rangeA;
    if (b.points.length !== a.points.length) return b.points.length - a.points.length;
    return a.code.localeCompare(b.code);
  })[0];
}

async function fetchHomeTrails(): Promise<HomeTrails> {
  const supabase = createPublicReadClient();

  const { data: companyData, error: companyError } = await supabase
    .from("company")
    .select(`code, name, sector, ${COVERAGE_SELECT}`);
  if (companyError) throw companyError;

  const covered = new Map<string, CompanyRow>();
  ((companyData ?? []) as CompanyRow[]).forEach((row) => {
    if (!row.code) return;
    if (!isDiscoveryListed(row)) return;
    covered.set(row.code.toUpperCase(), row);
  });

  const scoreRows: ScoreRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("concall_analysis")
      .select("company_code, score, fy, qtr, quarter_label")
      // legacy-logic scores (no details.scoring_meta) are hidden portal-wide
      .not("details->scoring_meta", "is", null)
      .order("fy", { ascending: false })
      .order("qtr", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data ?? []) as ScoreRow[];
    scoreRows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const byCompany = new Map<string, ScoreRow[]>();
  scoreRows.forEach((row) => {
    const key = row.company_code?.toUpperCase();
    if (!key || !covered.has(key)) return;
    const bucket = byCompany.get(key);
    if (bucket) bucket.push(row);
    else byCompany.set(key, [row]);
  });

  const wall: CompanyTrail[] = [];
  byCompany.forEach((rows, key) => {
    const trail = toTrail(covered.get(key) as CompanyRow, rows);
    if (trail) wall.push(trail);
  });

  wall.sort(
    (a, b) =>
      TRAJECTORIES[a.trajectory].rank - TRAJECTORIES[b.trajectory].rank ||
      b.latest - a.latest ||
      a.code.localeCompare(b.code),
  );

  const sectors = new Set<string>();
  covered.forEach((c) => {
    const sector = c.sector?.trim();
    if (sector) sectors.add(sector);
  });

  return {
    exhibit: pickExhibit(wall),
    wall,
    companyCount: covered.size,
    sectorCount: sectors.size,
    quarterCount: wall.reduce((sum, t) => sum + t.points.length, 0),
  };
}

export const getCachedHomeTrails = unstable_cache(
  fetchHomeTrails,
  // Bump the version whenever CompanyTrail's shape changes — the cached payload
  // is JSON on disk, and a stale entry would arrive missing the new fields.
  ["home-score-trails-v2"],
  { revalidate: 600 },
);
