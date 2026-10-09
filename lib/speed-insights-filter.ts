// Internal pages — the admin panel and the dev previews — are not reader
// experience, so they stay out of the Speed Insights score. Only the founder
// loads them, and their slow, query-heavy renders dragged a reader metric.
// Matched on the first path segment, so a lookalike route such as
// /administrator would still count.
const INTERNAL_SEGMENTS = new Set(["admin", "dev"]);

/** True when a Speed Insights sample's page URL is an internal page. */
export function isInternalPath(url: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(url, "https://placeholder.invalid").pathname;
  } catch {
    // Never drop a real sample over a URL we can't read.
    return false;
  }
  const first = pathname.split("/").find((segment) => segment !== "");
  return first !== undefined && INTERNAL_SEGMENTS.has(first);
}
