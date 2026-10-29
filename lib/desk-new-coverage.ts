// "New to coverage" on the desk (2026-10-29 redesign): the companies that most
// recently entered coverage, newest first, by company.created_at. The first one
// gets the large card. Pure, so it is testable without the server reads; the
// caller passes the discovery-listed companies (lib/desk-leaderboard.ts), so a
// below-cut or large-cap admission never shows here.

export type NewCoverageCandidate = {
  code: string;
  name: string;
  sector: string | null;
  createdAt: string | null;
};

export const NEW_COVERAGE_LIMIT = 5;
/** Past this a company is no longer "new"; an empty window hides the block. */
export const NEW_COVERAGE_MAX_AGE_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The `limit` newest companies admitted within `maxAgeDays` of `nowMs`. A
 * missing, unreadable or future created_at is skipped rather than guessed.
 * Same-instant admissions (a batch onboard stamps one timestamp) fall back to
 * the name, so the order is stable.
 */
export function selectNewCoverage<T extends NewCoverageCandidate>(
  companies: readonly T[],
  nowMs: number,
  { limit = NEW_COVERAGE_LIMIT, maxAgeDays = NEW_COVERAGE_MAX_AGE_DAYS }: { limit?: number; maxAgeDays?: number } = {},
): T[] {
  const floor = nowMs - maxAgeDays * DAY_MS;
  return companies
    .map((c) => ({ c, at: c.createdAt ? Date.parse(c.createdAt) : NaN }))
    .filter(({ at }) => Number.isFinite(at) && at >= floor && at <= nowMs)
    .sort((a, b) => b.at - a.at || a.c.name.localeCompare(b.c.name))
    .slice(0, limit)
    .map(({ c }) => c);
}
