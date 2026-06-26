import assert from "node:assert/strict";

import { buildNextQuarterWatch } from "../lib/next-quarter-watch/select";
import type { WatchSwingVar, WatchTrajectory } from "../lib/next-quarter-watch/types";

const traj = (key: string, change: number, label: string, description: string): WatchTrajectory =>
  ({ key: key as WatchTrajectory["key"], change, label, description });
const sv = (variable: string, note: string | null = null): WatchSwingVar => ({ variable, note });

// GRAVITA — down-divergence (5.2 vs 8.2) + Worsening + swing vars → full block.
{
  const v = buildNextQuarterWatch({
    latestScore: 5.2,
    growthScore: 8.2,
    trajectory: traj("worsening", -1.0, "Worsening", "Slid -1.0 over 2 qtrs."),
    swingVars: [sv("Middle East exposure", "logistics + margins"), sv("Copper sourcing", "import reliance")],
  });
  assert.equal(v.lean, "cautious");
  assert.equal(v.items.length, 3, "cap 3");
  assert.equal(v.items[0].kind, "divergence");
  assert.equal(v.items[1].kind, "trajectory");
  assert.equal(v.items[2].kind, "swing");
}

// TIMETECHNO — Cracking but NO divergence (7.1 ≥ 7.0), clean quarter → trajectory + swing.
{
  const v = buildNextQuarterWatch({
    latestScore: 7.1,
    growthScore: 7.9,
    trajectory: traj("cracking", -0.5, "Cracking", "Cracked -0.5 in the latest quarter."),
    swingVars: [sv("Order book")],
  });
  assert.equal(v.items.length, 2);
  assert.equal(v.items[0].kind, "trajectory");
  assert.ok(!v.items.some((i) => i.kind === "divergence"), "no divergence at a bullish print");
  assert.equal(v.lean, "cautious");
}

// NH — down-divergence (5.7 vs 7.8), trajectory NOT falling (Steady) → divergence + 2 swing.
{
  const v = buildNextQuarterWatch({
    latestScore: 5.7,
    growthScore: 7.8,
    trajectory: traj("steady", -0.3, "Steady", "Range-bound."),
    swingVars: [sv("Overhead inflation"), sv("UK financials")],
  });
  assert.equal(v.items[0].kind, "divergence");
  assert.ok(!v.items.some((i) => i.kind === "trajectory"), "steady is not a falling trajectory");
  assert.equal(v.items.length, 3);
}

// SANSERA — clean: no divergence (8.2 vs 7.9), Climbing → SILENT (swing vars alone don't trigger).
{
  const v = buildNextQuarterWatch({
    latestScore: 8.2,
    growthScore: 7.9,
    trajectory: traj("climbing", 1.2, "Climbing", "Climbed +1.2."),
    swingVars: [sv("ADS ramp"), sv("Margins")],
  });
  assert.equal(v.items.length, 0, "silent when clean");
  assert.equal(v.lean, null);
}

// NUVAMA — a bullish print (7.2 ≥ 7.0) with a strong outlook (8.5) is NOT a divergence; Drifting isn't falling → silent.
{
  const v = buildNextQuarterWatch({
    latestScore: 7.2,
    growthScore: 8.5,
    trajectory: traj("drifting", 0.6, "Drifting", "Moving without a clear direction."),
    swingVars: [sv("Capital markets cycle")],
  });
  assert.equal(v.items.length, 0);
}

// No scores → no divergence, but a falling trajectory still triggers (trajectory-only).
{
  const v = buildNextQuarterWatch({
    latestScore: null,
    growthScore: null,
    trajectory: traj("worsening", -1.0, "Worsening", "Slid."),
    swingVars: [],
  });
  assert.equal(v.items.length, 1);
  assert.equal(v.items[0].kind, "trajectory");
}

// No concern at all (no scores, no trajectory) → silent even with swing vars.
{
  const v = buildNextQuarterWatch({
    latestScore: null,
    growthScore: null,
    trajectory: null,
    swingVars: [sv("X")],
  });
  assert.equal(v.items.length, 0);
}

console.log("next-quarter-watch: all assertions passed");
