/**
 * Resolve a location hash to the company-page section that should be active.
 *
 * Exact section ids win. A sub-anchor inside a section follows the
 * `<sectionId>-<block>` convention (e.g. `#business-overview-about`), which
 * keeps that section mounted so the browser can scroll to the nested block.
 * When several section ids prefix-match, the longest wins so a section whose
 * id extends another's (`foo` vs `foo-bar`) is never shadowed.
 */
/**
 * Section ids that were renamed. Old deep links (Journal posts, X replies,
 * bookmarks) keep working: the legacy id — and any `<legacy>-<block>`
 * sub-anchor — resolves to the current section.
 */
export const LEGACY_SECTION_IDS: Readonly<Record<string, string>> = {
  "moat-analysis": "quality",
};

export function canonicalSectionId(sectionId: string): string {
  for (const [legacy, current] of Object.entries(LEGACY_SECTION_IDS)) {
    if (sectionId === legacy) return current;
    if (sectionId.startsWith(`${legacy}-`)) return `${current}${sectionId.slice(legacy.length)}`;
  }
  return sectionId;
}

export function resolveSectionId(
  hash: string,
  validIds: ReadonlySet<string>,
  fallbackSectionId: string,
): string {
  const sectionId = canonicalSectionId(hash.replace(/^#/, "").trim());
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
