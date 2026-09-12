// Frontend validation gate for the desk Featured Reads strip.
// Derived from /schemas/desk_featured_read_v1.json (the versioned, shared
// contract the concallyser producers write to) — NOT from a peer Supabase row.
// Accept exactly what the schema accepts; drop what it rejects.

export const FEATURED_SECTIONS = [
  "guidance",
  "growth",
  "quarter",
  "valuation",
  "business_snapshot",
  "key_variables",
  "moat",
] as const;
export type FeaturedSection = (typeof FEATURED_SECTIONS)[number];

export const CHANGE_KINDS = ["new_coverage", "upgraded", "refreshed"] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

// The raw shape as it comes back from Supabase (snake_case, loosely typed).
export type DeskFeaturedReadRow = {
  id: string | null;
  company_code: string | null;
  company_name: string | null;
  sector: string | null;
  section: string | null;
  tag_label: string | null;
  change_kind: string | null;
  headline: string | null;
  summary: string | null;
  section_href: string | null;
  feature_weight: number | null;
  published_at: string | null;
  status: string | null;
};

// The validated display shape the UI renders.
export type FeaturedRead = {
  id: string;
  companyCode: string;
  companyName: string;
  sector: string | null;
  section: FeaturedSection;
  tagLabel: string;
  changeKind: ChangeKind;
  headline: string;
  summary: string;
  href: string;
  weight: number;
  publishedAtRaw: string | null;
};

const isSection = (v: unknown): v is FeaturedSection =>
  typeof v === "string" && (FEATURED_SECTIONS as readonly string[]).includes(v);

const isChangeKind = (v: unknown): v is ChangeKind =>
  typeof v === "string" && (CHANGE_KINDS as readonly string[]).includes(v);

const clampWeight = (v: number | null): number => {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, Math.round(v)));
};

// The company name is the card's display heading, so producer-typed names must
// read as one style across the strip: "Suzlon Energy" beside "Physicswallah
// Limited" looks like two conventions. Drop a trailing legal suffix by rule —
// never per-company — so the heading is the trading name.
const LEGAL_SUFFIX = /\s+(limited|ltd\.?)$/i;
function stripLegalSuffix(raw: string | null | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const stripped = trimmed.replace(LEGAL_SUFFIX, "").trim();
  return stripped.length > 0 ? stripped : trimmed;
}

// Parse one raw row into the display shape, or null if it fails the schema's
// required-field / enum contract. A malformed row is dropped, never rendered
// broken — same discipline as the analysis-section normalizers.
export function parseFeaturedRead(row: DeskFeaturedReadRow): FeaturedRead | null {
  const id = row.id?.trim();
  const companyCode = row.company_code?.trim();
  const companyName = stripLegalSuffix(row.company_name);
  const headline = row.headline?.trim();
  const summary = row.summary?.trim();
  const href = row.section_href?.trim();

  if (!id || !companyCode || !companyName || !headline || !summary || !href) return null;
  if (!isSection(row.section)) return null;
  if (!isChangeKind(row.change_kind)) return null;

  const tagLabel = row.tag_label?.trim();
  if (!tagLabel) return null;

  const sector = row.sector?.trim();

  return {
    id,
    companyCode,
    companyName,
    sector: sector && sector.length > 0 ? sector : null,
    section: row.section,
    tagLabel,
    changeKind: row.change_kind,
    headline,
    summary,
    href,
    weight: clampWeight(row.feature_weight),
    publishedAtRaw: row.published_at ?? null,
  };
}

// The eyebrow's optional trailing segment. Only new_coverage earns a suffix, to
// match the reference design ("GUIDANCE RE-READ · NEW COVERAGE"); routine
// upgrades/refreshes keep a single clean tag.
export function changeKindSuffix(kind: ChangeKind): string | null {
  return kind === "new_coverage" ? "New coverage" : null;
}
