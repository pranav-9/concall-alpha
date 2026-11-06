// Backoff for cached fleet reads (/scanners, the quarter tracker's reading
// columns). unstable_cache never stores a failed read, so without this every
// request would re-run it while the database is struggling — the 2026-10-06
// statement timeout did exactly that. After a failure, this server instance
// throws "backing off" for BACKOFF_MS before it asks again; callers catch it
// and render that read as unavailable.

export const BACKOFF_MS = 60_000;

export function withBackoff<A extends unknown[], T>(
  label: string,
  read: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  let failedAt = 0;
  return async (...args: A) => {
    if (Date.now() - failedAt < BACKOFF_MS) {
      throw new Error(`${label}: backing off after a failed read`);
    }
    try {
      return await read(...args);
    } catch (error) {
      failedAt = Date.now();
      throw error;
    }
  };
}
