/**
 * Resolve a location hash to the company-page section that should be active.
 *
 * Exact section ids win. A sub-anchor inside a section follows the
 * `<sectionId>-<block>` convention (e.g. `#business-overview-about`), which
 * keeps that section mounted so the browser can scroll to the nested block.
 * When several section ids prefix-match, the longest wins so a section whose
 * id extends another's (`foo` vs `foo-bar`) is never shadowed.
 */
export function resolveSectionId(
  hash: string,
  validIds: ReadonlySet<string>,
  fallbackSectionId: string,
): string {
  const sectionId = hash.replace(/^#/, "").trim();
  if (!sectionId) return fallbackSectionId;
  if (validIds.has(sectionId)) return sectionId;

  let best: string | null = null;
  for (const id of validIds) {
    if (sectionId.startsWith(`${id}-`) && (best === null || id.length > best.length)) {
      best = id;
    }
  }
  return best ?? fallbackSectionId;
}
