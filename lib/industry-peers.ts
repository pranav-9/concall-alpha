// Which covered companies count as a company's peers on its Industry tab.
// Pure — no React, no Supabase — so tests/industry-peers.test.ts can pin it.
//
// A peer shares the company's `sub_sector` (inside the same `sector`) on the
// `company` table. `sector` alone is too wide to compare across (Capital Goods
// holds 57 companies, from cables to aerospace). The peer list is a discovery
// surface, so every OTHER company passes through isDiscoveryListed; the page's
// own company is always on its own board, covered or not.

import { isDiscoveryListed, type CoverageFields } from "@/lib/coverage-policy";

export type PeerCompanyRow = CoverageFields & {
  code: string;
  name?: string | null;
  sector?: string | null;
  sub_sector?: string | null;
};

export type IndustryPeerSet = {
  /** The shared sub-sector, as stored — the block's label. */
  subSector: string;
  sector: string | null;
  /** UPPERCASE codes: the company itself first, then its peers A–Z. */
  codes: string[];
};

const key = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

/** null when the company has no sub-sector, or no other covered company shares it. */
export function selectIndustryPeers(
  companyCode: string,
  companies: PeerCompanyRow[],
): IndustryPeerSet | null {
  const code = companyCode.trim().toUpperCase();
  const subject = companies.find((row) => row.code.trim().toUpperCase() === code);
  const subSector = subject?.sub_sector?.trim();
  if (!subject || !subSector) return null;

  const peers = companies
    .filter(
      (row) =>
        row.code.trim().toUpperCase() !== code &&
        key(row.sub_sector) === key(subSector) &&
        key(row.sector) === key(subject.sector) &&
        isDiscoveryListed(row),
    )
    .map((row) => row.code.trim().toUpperCase())
    .sort();
  if (peers.length === 0) return null;

  return { subSector, sector: subject.sector?.trim() || null, codes: [code, ...peers] };
}
