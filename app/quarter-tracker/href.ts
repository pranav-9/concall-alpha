import type { SortDir, SortKey } from "./season";

export type TrackerQuery = {
  sort: SortKey;
  dir: SortDir;
  /** Only companies whose score rose on the prior quarter. */
  improvers: boolean;
  /** Only the reader's watchlist companies (`?mine=1`, as on /scanners). */
  mine: boolean;
};

/**
 * `/quarter-tracker?sort=delta&filter=improvers&mine=1`. The defaults (score,
 * descending, no filter) carry no parameter, so the canonical URL stays bare
 * and every view is a shareable link — the page needs no client state.
 */
export function trackerHref(q: TrackerQuery): string {
  const qs = new URLSearchParams();
  if (q.sort !== "score") qs.set("sort", q.sort);
  if (q.dir !== "desc") qs.set("dir", q.dir);
  if (q.improvers) qs.set("filter", "improvers");
  if (q.mine) qs.set("mine", "1");
  const query = qs.toString();
  return query ? `/quarter-tracker?${query}` : "/quarter-tracker";
}
