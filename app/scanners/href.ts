export const SCANS = ["red-flags", "peg", "garp", "guidance", "trend", "order-book"] as const;
export type ScanId = (typeof SCANS)[number];

/** A path segment → a scan, or null (the page 404s). */
export const toScanId = (raw: string | undefined): ScanId | null =>
  (SCANS as readonly string[]).includes(raw ?? "") ? (raw as ScanId) : null;

/** Legacy `?scan=` value → its scan; anything else was the old default, Red flags. */
export const parseScan = (raw: string | undefined): ScanId => toScanId(raw) ?? "red-flags";

/** `/scanners/<scan>?mine=1` — every scan is its own page; the default filter carries no `mine`. */
export function scannersHref(scan: ScanId, mine: boolean, extra?: Record<string, string>): string {
  const qs = new URLSearchParams();
  if (mine) qs.set("mine", "1");
  for (const [k, v] of Object.entries(extra ?? {})) qs.set(k, v);
  const query = qs.toString();
  return query ? `/scanners/${scan}?${query}` : `/scanners/${scan}`;
}

/**
 * Where a pre-2026-10-14 link (`/scanners?scan=…&mine=…&sort=…`, when every scan
 * was a tab on one page) now lives, or null for the bare index. A bare `?mine=1`
 * was the old default tab — Red flags — with the filter on.
 */
export function legacyScannersHref(params: { scan?: string; mine?: string; sort?: string }): string | null {
  if (params.scan == null && params.mine == null && params.sort == null) return null;
  const scan = parseScan(params.scan);
  return scannersHref(scan, params.mine === "1", scan === "peg" && params.sort === "trailing" ? { sort: "trailing" } : undefined);
}
