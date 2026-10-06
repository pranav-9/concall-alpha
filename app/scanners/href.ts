export const SCANS = ["red-flags", "peg", "guidance"] as const;
export type ScanId = (typeof SCANS)[number];

export const parseScan = (raw: string | undefined): ScanId =>
  raw === "peg" || raw === "guidance" ? raw : "red-flags";

/** `/scanners?scan=…&mine=1` — the default scan carries no `scan`, the default filter no `mine`. */
export function scannersHref(scan: ScanId, mine: boolean, extra?: Record<string, string>): string {
  const qs = new URLSearchParams();
  if (scan !== "red-flags") qs.set("scan", scan);
  if (mine) qs.set("mine", "1");
  for (const [k, v] of Object.entries(extra ?? {})) qs.set(k, v);
  const query = qs.toString();
  return query ? `/scanners?${query}` : "/scanners";
}
