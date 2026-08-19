import { NextQuarterWatch } from "concall-alpha";
// The view is a SYNTHESIS with a gate (a swing variable alone never fires the
// block), so hand-writing a WatchView would teach a shape the selector cannot
// actually produce. lib/next-quarter-watch/select is pure — no React, no
// Supabase — so the previews drive the real builder.
import { buildNextQuarterWatch } from "@/lib/next-quarter-watch/select";
import type { WatchSwingVar } from "@/lib/next-quarter-watch/types";

// Trishul Speciality Chemicals (TRISHULCH) — a covered mid-cap: CDMO,
// performance intermediates and agro actives out of Dahej and Ankleshwar.
// The swing variables come from the same key_variables deep-treatment rows the
// Key Variables section renders, which is where the page threads them from.
const SWING_VARS: WatchSwingVar[] = [
  {
    variable: "CDMO commercial-molecule count",
    note: "two of the nine validation-stage molecules are contracted to cross into commercial supply in H2 FY27",
  },
  {
    variable: "Dahej Unit-4 utilisation",
    note: "the new multipurpose block ran at 41% in Q1; the margin guidance needs it near 70%",
  },
];

const caption = "text-[11px] leading-relaxed text-muted-foreground";

/**
 * Canonical Q1 FY27 state. A 7.6 print against a 7.8 forward outlook is no
 * divergence, and Climbing is not a falling trajectory, so the selector returns
 * zero items — the block collapses to one quiet line rather than manufacturing
 * comfort. This is the state most companies are in on most quarters.
 */
export const NothingFlagged = () => (
  <div className="space-y-2">
    <NextQuarterWatch
      view={buildNextQuarterWatch({
        latestScore: 7.6,
        growthScore: 7.8,
        trajectory: {
          key: "climbing",
          change: 0.5,
          label: "Climbing",
          description: "Climbed +1.0 over 4 qtrs: 6.6 → 7.0 → 7.2 → 7.6.",
        },
        swingVars: SWING_VARS,
      })}
      trajectoryLabel="Climbing"
    />
    <p className={caption}>
      Without a trajectoryLabel prop this same empty view returns null and the block
      disappears entirely — the page never renders an empty shell.
    </p>
  </div>
);

/**
 * The full three-item block: a soft print under a strong outlook (divergence),
 * a falling series (trajectory), and the highest-priority swing variable filling
 * the last of the three slots. Trishul as it looked in Q2 FY26, when the
 * Ankleshwar agro line was shut for a statutory revamp.
 */
export const ScoreVsOutlookGap = () => (
  <NextQuarterWatch
    view={buildNextQuarterWatch({
      latestScore: 5.9,
      growthScore: 7.8,
      trajectory: {
        key: "worsening",
        change: -1.1,
        label: "Worsening",
        description: "Slid -1.1 over two quarters as the agro-actives line stayed down.",
      },
      swingVars: SWING_VARS,
    })}
    trajectoryLabel="Worsening"
  />
);

/**
 * Trajectory-only: a 7.1 print is not weak enough to diverge from a 7.9 outlook,
 * but the series is choppy, which fires the block on its own and lets the two
 * swing variables ride along.
 */
export const FallingTrajectoryOnly = () => (
  <NextQuarterWatch
    view={buildNextQuarterWatch({
      latestScore: 7.1,
      growthScore: 7.9,
      trajectory: {
        key: "choppy",
        change: -0.4,
        label: "Choppy",
        description: "Alternating swings beyond ±0.5 — the score itself is unstable quarter to quarter.",
      },
      swingVars: SWING_VARS,
    })}
    trajectoryLabel="Choppy"
  />
);
