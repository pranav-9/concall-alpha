import type { BuildWatchInput, WatchItem, WatchView } from "./types";

// Quarter score (score-band) and forward score (growth-band) live on DIFFERENT
// distributions (growth clusters ~6.6-8.7), so we flag divergence by band
// position, not raw subtraction — plus a raw-gap guard so band-edge wobble
// inside the ±0.5 re-score noise floor never trips it.
const QTR_WEAK_CEIL = 7.0; // quarter below "Bullish" => the print is genuinely soft
const FWD_STRONG_FLOOR = 7.5; // forward "Solid"+ => a genuinely strong outlook
const FWD_WEAK_CEIL = 7.0; // forward below "Moderate" => a soft outlook
const MIN_GAP = 1.0; // raw guard against band-edge noise

// Falling/unstable trajectories are the ones worth flagging forward. A steady or
// climbing series is not "something to watch".
const TRAJECTORY_FALLING: ReadonlySet<string> = new Set(["cracking", "worsening", "choppy"]);
const MAX_ITEMS = 3;

const finite = (n: number | null | undefined): number | null =>
  typeof n === "number" && Number.isFinite(n) ? n : null;
const fmt = (n: number) => n.toFixed(1);

export function buildNextQuarterWatch(input: BuildWatchInput): WatchView {
  const { trajectory, swingVars } = input;
  const ls = finite(input.latestScore);
  const gs = finite(input.growthScore);

  // Divergence (signal 3): score and forward outlook point opposite ways.
  let divergence: WatchItem | null = null;
  if (ls != null && gs != null) {
    if (ls < QTR_WEAK_CEIL && gs >= FWD_STRONG_FLOOR && gs - ls >= MIN_GAP) {
      divergence = {
        kind: "divergence",
        heading: "Score vs outlook gap",
        detail: `This quarter scored ${fmt(ls)} but the forward outlook is ${fmt(gs)} — watch whether the near-term weakness is temporary.`,
        tone: "caution",
      };
    } else if (ls >= QTR_WEAK_CEIL && gs < FWD_WEAK_CEIL && ls - gs >= MIN_GAP) {
      divergence = {
        kind: "divergence",
        heading: "Outlook below the print",
        detail: `This quarter scored ${fmt(ls)} but the forward outlook is only ${fmt(gs)} — the outlook isn't keeping pace.`,
        tone: "caution",
      };
    }
  }

  // Trajectory (signal 2): the score is falling/unstable even if the latest
  // quarter's leans look clean (the TIMETECHNO/SHILPAMED case).
  const trajectoryFalling = trajectory != null && TRAJECTORY_FALLING.has(trajectory.key);

  // Gate: a real concern must fire. Swing variables only enrich a concern.
  if (!divergence && !trajectoryFalling) {
    return { items: [], lean: null };
  }

  const items: WatchItem[] = [];
  if (divergence) items.push(divergence);
  if (trajectoryFalling && trajectory) {
    items.push({
      kind: "trajectory",
      heading: trajectory.label,
      detail: trajectory.description,
      tone: "caution",
    });
  }
  // Fill remaining slots with the swing variables to monitor (signal 1).
  for (const sv of swingVars) {
    if (items.length >= MAX_ITEMS) break;
    if (!sv.variable) continue;
    items.push({ kind: "swing", heading: sv.variable, detail: sv.note ?? "", tone: "neutral" });
  }

  return { items: items.slice(0, MAX_ITEMS), lean: "cautious" };
}
