// Browser-side dismiss/responded bookkeeping for the feedback poll banner.
//
// Lives apart from ./types on purpose: that module defines the zod schemas, and
// the banner client component used to import these three helpers from it —
// which pulled zod (~64KB) into the ROOT layout bundle on every page. Keep this
// file free of schema imports so the banner stays light.

export const DISMISS_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export const STORAGE_KEY_LAST_DISMISS = "feedback-poll:last-dismiss";
export const storageKeyResponded = (pollId: string) =>
  `feedback-poll:responded:${pollId}`;

// Pure function: returns true if a stored dismiss timestamp still falls within
// the snooze window. Used in tests and at banner mount.
export function isDismissActive(
  storedTimestampMs: number | null,
  nowMs: number,
): boolean {
  if (storedTimestampMs === null) return false;
  if (!Number.isFinite(storedTimestampMs)) return false;
  return nowMs - storedTimestampMs < DISMISS_SNOOZE_MS;
}
