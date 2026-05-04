import type { NormalizedCompanyIndustryAnalysis } from "@/lib/company-industry-analysis/types";
import { getCompanyIndustryAnalysis } from "@/lib/company-industry-analysis/get";
import { formatShortDate } from "../[code]/page-helpers";
import { SectionCard } from "./section-card";
import { MissingSectionState } from "./missing-section-state";
import { SubSectorTabs, type SubSectorTabEntry } from "./sub-sector-tabs";

function buildEntries(
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

type SubSectorSectionProps = {
  companyCode: string;
  companyName: string | null;
};

export async function SubSectorSection({
  companyCode,
  companyName,
}: SubSectorSectionProps) {
  const analysis = await getCompanyIndustryAnalysis(companyCode);
  const generatedAtShort = formatShortDate(analysis?.generatedAtRaw);
  const qualifying = analysis?.companyFit?.qualifyingSubSectors ?? [];
  const cards = analysis?.subSectorCards ?? [];
  const isEmpty = qualifying.length === 0 && cards.length === 0;
  const entries = isEmpty ? [] : buildEntries(analysis);

  return (
    <SectionCard
      id="sub-sector"
      title="Sub-sectors"
      feedbackEnabled={!isEmpty}
      feedbackCompanyCode={companyCode}
      feedbackCompanyName={companyName}
      headerAction={
        generatedAtShort ? (
          <span className="text-[11px] text-muted-foreground">
            {generatedAtShort}
          </span>
        ) : undefined
      }
    >
      {isEmpty ? (
        <MissingSectionState
          companyCode={companyCode}
          companyName={companyName}
          sectionId="sub-sector"
          sectionTitle="Sub-sectors"
          description="We have not generated sub-sector-specific cards for this company yet."
        />
      ) : (
        <SubSectorTabs entries={entries} />
      )}
    </SectionCard>
  );
}
