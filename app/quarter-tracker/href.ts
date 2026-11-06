import type { BoardFilter, SortDir, SortKey } from "./season";

export type TrackerQuery = {
  sort: SortKey;
  dir: SortDir;
  /** One board filter at a time: improvers, raised guidance or lowered guidance. */
  filter: BoardFilter | null;
  /** Only the board's companies in this sector (`?sector=Chemicals`). */
  sector: string | null;
  /** Only the reader's watchlist companies (`?mine=1`, as on /scanners). */
  mine: boolean;
};

/**
 * `/quarter-tracker?sort=delta&filter=raised&sector=Chemicals&mine=1`. The
 * defaults (score, descending, no filter) carry no parameter, so the
 * canonical URL stays bare and every view is a shareable link.
 */
export function trackerHref(q: TrackerQuery): string {
  const qs = new URLSearchParams();
  if (q.sort !== "score") qs.set("sort", q.sort);
  if (q.dir !== "desc") qs.set("dir", q.dir);
  if (q.filter) qs.set("filter", q.filter);
  if (q.sector) qs.set("sector", q.sector);
  if (q.mine) qs.set("mine", "1");
  const query = qs.toString();
  return query ? `/quarter-tracker?${query}` : "/quarter-tracker";
}
