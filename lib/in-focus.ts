// Pure helpers for the "In Focus" attention meter (components/in-focus-pips.tsx).
// Kept in a plain .ts so they unit-test without a React/JSX load.

/** Clamp a raw hotness to an integer 1-5, or null when there is no rating. */
export function clampHotness(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(1, Math.min(5, Math.round(value)));
}

/** Short "Updated <date>" string for the tooltip; undefined when no date is known. */
export function formatInFocusUpdated(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
