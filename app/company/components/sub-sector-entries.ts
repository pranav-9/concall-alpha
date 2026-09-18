import type { NormalizedCompanyIndustryAnalysis } from "@/lib/company-industry-analysis/types";
import type { SubSectorTabEntry } from "./sub-sector-tabs";

/**
 * Merge the two sub-sector substrates from a normalized industry analysis into
 * a single ordered list of tab entries:
 *   - company_fit.qualifyingSubSectors (context: description + why relevant)
 *   - subSectorCards (depth: capital cycle, market-share, supply-side evidence)
 * Keyed by a normalized sub-sector name so a card enriches its matching
 * qualifying entry rather than duplicating it. Qualifying order wins; cards
 * with no qualifying match are appended in card order.
 *
 * Extracted from the (now-retired) sub-sector-section.tsx so the merged
 * Industry Context section can build the same entries from its single fetch.
 */
export function buildEntries(
  analysis: NormalizedCompanyIndustryAnalysis | null,
): SubSectorTabEntry[] {
  const qualifying = analysis?.companyFit?.qualifyingSubSectors ?? [];
  const cards = analysis?.subSectorCards ?? [];

  const normalizeKey = (value: string) => value.trim().toLowerCase();
  const order: string[] = [];
  const byKey = new Map<string, SubSectorTabEntry>();

  qualifying.forEach((item) => {
    const key = normalizeKey(item.subSector);
    if (!key || byKey.has(key)) return;
    order.push(key);
    byKey.set(key, {
      subSector: item.subSector,
      description: item.description ?? null,
      relevanceRationale: item.relevanceRationale ?? null,
      capitalCycle: null,
      marketShareSnapshot: null,
      supplySideEvidencePack: null,
    });
  });

  cards.forEach((card) => {
    const key = normalizeKey(card.subSector);
    if (!key) return;
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        description: existing.description ?? card.subSectorDescription ?? null,
        relevanceRationale:
          existing.relevanceRationale ?? card.relevanceRationale ?? null,
        capitalCycle: card.capitalCycle,
        marketShareSnapshot: card.marketShareSnapshot,
        supplySideEvidencePack: card.supplySideEvidencePack,
      });
    } else {
      order.push(key);
      byKey.set(key, {
        subSector: card.subSector,
        description: card.subSectorDescription ?? null,
        relevanceRationale: card.relevanceRationale ?? null,
        capitalCycle: card.capitalCycle,
        marketShareSnapshot: card.marketShareSnapshot,
        supplySideEvidencePack: card.supplySideEvidencePack,
      });
    }
  });

  return order
    .map((key) => byKey.get(key))
    .filter((entry): entry is SubSectorTabEntry => Boolean(entry));
}
