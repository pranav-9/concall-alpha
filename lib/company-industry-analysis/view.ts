import type { CompanyQualityV1 } from "@/lib/company-quality/types";
import type {
  NormalizedCompanyIndustryAnalysis,
  NormalizedIndustryCapitalCycle,
  NormalizedIndustryMarketShareSnapshot,
  NormalizedIndustryPlayerTypeDimension,
  NormalizedIndustrySupplySideEvidencePack,
  NormalizedIndustryTheme,
  NormalizedIndustryValueChainLayer,
} from "./types";

// Pure view logic for the Industry Context tab (redesign 2026-10-01). Every
// read here is derived from the stored analysis row (plus the company's own
// EBITDA margin from company_quality) — the portal never writes industry prose
// of its own beyond the templated one-liners at the bottom of this file.

// ---- Company ↔ player name matching ----------------------------------------
// Deterministic and conservative: attribute a player to the company only when
// its name shares the ticker or a distinctive word. Keeps the parenthetical
// owner ("CarWale (CarTrade Tech)"), which is the token we actually match on.
const NAME_STOPWORDS = new Set([
  "ltd",
  "limited",
  "inc",
  "plc",
  "tech",
  "technologies",
  "products",
  "industries",
  "india",
  "the",
  "group",
  "company",
  "co",
  "holdings",
  "corporation",
  "corp",
  "enterprises",
  "global",
]);

const normId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const coreTokens = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !NAME_STOPWORDS.has(token));

// Lead words too common to identify a company on their own ("Tata", "Multi",
// "Power"…): those names match only on their first two words together.
const GENERIC_LEAD_TOKENS = new Set([
  "tata",
  "adani",
  "reliance",
  "bharat",
  "hindustan",
  "indian",
  "national",
  "multi",
  "new",
  "general",
  "united",
  "standard",
  "power",
  "steel",
  "life",
  "green",
  "first",
  "asian",
  "super",
  "shree",
  "shri",
]);

// The ticker, the first two name words run together, and the first word alone
// when it is distinctive. Never a later word on its own — "Sai Life Sciences"
// must not match "Aragen Life Sciences", nor "Multi Commodity Exchange" match
// "London Metal Exchange".
const companyKeys = (companyName: string | null, companyCode: string): string[] => {
  const keys = new Set<string>();
  const code = normId(companyCode);
  if (code.length >= 3) keys.add(code);
  const tokens = coreTokens(companyName ?? "");
  if (tokens.length >= 2) keys.add(`${tokens[0]}${tokens[1]}`);
  if (tokens.length === 1 || (tokens[0]?.length >= 4 && !GENERIC_LEAD_TOKENS.has(tokens[0]))) keys.add(tokens[0]);
  return Array.from(keys);
};

export const matchesCompany = (
  name: string,
  companyName: string | null,
  companyCode: string,
): boolean => {
  const player = normId(name);
  if (player.length < 3) return false;
  return companyKeys(companyName, companyCode).some((key) => player.includes(key));
};

/** "Original Equipment Manufacturers (OEMs)" → "Original Equipment Manufacturers". */
export const shortName = (value: string) =>
  value.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim() || value.trim();

// ---- Market share -----------------------------------------------------------
const isInformativeShare = (value: string | null): value is string =>
  Boolean(value) && !/^(not disclosed|n\/a|n\/d|undisclosed|unknown|—|-)$/i.test(value!.trim());

// The share figure is the headline; keep only the leading number/range for the
// big display (producers sometimes append a vintage or qualifier inline, e.g.
// "10-11% (Jul 2026); estimates 6-13%"). The full string stays on `title`.
export const shareHead = (value: string): string => {
  const trimmed = value.trim();
  const num = trimmed.match(/^[~<>≈]?\s*\d[\d.,]*\s*%?(?:\s*[-–—]\s*\d[\d.,]*\s*%?)?/);
  if (num && num[0].trim().length >= 2) return num[0].trim();
  const idx = trimmed.search(/[(;]/);
  return idx > 0 ? trimmed.slice(0, idx).trim() : trimmed;
};

export type ShareTile = {
  subSector: string;
  shareValue: string;
  basis: string | null;
  estimated: boolean;
};

export const findCompanyShare = (
  snapshot: NormalizedIndustryMarketShareSnapshot | null,
  subSector: string,
  companyName: string | null,
  companyCode: string,
): ShareTile | null => {
  if (!snapshot) return null;
  const me = snapshot.players.find(
    (player) => matchesCompany(player.playerName, companyName, companyCode) && isInformativeShare(player.shareValue),
  );
  if (!me || !me.shareValue) return null;
  return {
    subSector,
    shareValue: me.shareValue,
    basis: snapshot.shareBasis,
    estimated: me.shareIsEstimated,
  };
};

export const parseMarketShareValue = (value: string | null) => {
  if (!value) return null;
  const normalizedValue = value.trim().replace(/,/g, "");
  const numericMatch = normalizedValue.match(/-?\d+(?:\.\d+)?/);
  if (!numericMatch) return null;
  const parsed = Number(numericMatch[0]);
  if (!Number.isFinite(parsed)) return null;
  if (normalizedValue.includes("%")) return Math.max(0, parsed);
  if (parsed >= 0 && parsed <= 1) return parsed * 100;
  return Math.max(0, parsed);
};

export const formatMarketShareValue = (value: string | null) => {
  if (!value) return null;
  const trimmedValue = value.trim();
  const normalizedValue = trimmedValue.replace(/,/g, "");
  const parsed = parseMarketShareValue(trimmedValue);
  if (parsed == null) return trimmedValue;
  if (normalizedValue.includes("%")) return trimmedValue;
  const formattedValue = Number.isInteger(parsed)
    ? `${Math.round(parsed)}`
    : `${parsed.toFixed(1).replace(/\.0$/, "")}`;
  return `${formattedValue}%`;
};

// ---- Sub-sector entries: merge company_fit context with the depth cards ------
// Qualifying order wins, cards enrich their match, card-only entries append.
export type SubSectorEntry = {
  subSector: string;
  description: string | null;
  relevanceRationale: string | null;
  capitalCycle: NormalizedIndustryCapitalCycle | null;
  marketShareSnapshot: NormalizedIndustryMarketShareSnapshot | null;
  supplySideEvidencePack: NormalizedIndustrySupplySideEvidencePack | null;
  tailwinds: NormalizedIndustryTheme[];
  headwinds: NormalizedIndustryTheme[];
};

export const buildSubSectorEntries = (analysis: NormalizedCompanyIndustryAnalysis): SubSectorEntry[] => {
  const normalizeKey = (value: string) => value.trim().toLowerCase();
  const order: string[] = [];
  const byKey = new Map<string, SubSectorEntry>();

  for (const item of analysis.companyFit?.qualifyingSubSectors ?? []) {
    const key = normalizeKey(item.subSector);
    if (!key || byKey.has(key)) continue;
    order.push(key);
    byKey.set(key, {
      subSector: item.subSector,
      description: item.description ?? null,
      relevanceRationale: item.relevanceRationale ?? null,
      capitalCycle: null,
      marketShareSnapshot: null,
      supplySideEvidencePack: null,
      tailwinds: [],
      headwinds: [],
    });
  }

  for (const card of analysis.subSectorCards) {
    const key = normalizeKey(card.subSector);
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        description: existing.description ?? card.subSectorDescription ?? null,
        relevanceRationale: existing.relevanceRationale ?? card.relevanceRationale ?? null,
        capitalCycle: card.capitalCycle,
        marketShareSnapshot: card.marketShareSnapshot,
        supplySideEvidencePack: card.supplySideEvidencePack,
        tailwinds: card.tailwinds,
        headwinds: card.headwinds,
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
        tailwinds: card.tailwinds,
        headwinds: card.headwinds,
      });
    }
  }

  return order
    .map((key) => byKey.get(key))
    .filter((entry): entry is SubSectorEntry => Boolean(entry));
};

// ---- Margin bands -------------------------------------------------------------
// Layer margins arrive as the analysis's own read ("Thin" / "Adequate" /
// "Rich", sometimes a span like "Thin to Adequate") or, for a minority of
// layers, a sourced figure in whatever metric the source used (EBITDA, gross,
// trade margin, IRR, ROE…). Mixed metrics can't share a % axis, so the chart is
// banded: the word reads place a layer directly, and only EBITDA-family figures
// (EBITDA / EBITA / EBIT / operating margin) are placed by number, at the cut
// points below. Any other metric stays unbanded — shown as text, not plotted.
export const MARGIN_TIER_LABELS = ["Thin", "Adequate", "Rich"] as const;
export type MarginTier = 0 | 1 | 2;

/** EBITDA-family % cut points between Thin | Adequate | Rich. */
export const EBITDA_TIER_CUTS = [10, 20] as const;
/** The Rich band spans 20% → this; anything above pins to the top. */
const RICH_BAND_TOP_PCT = 50;
/** Smallest extent a plotted box gets, in band units, so a point value stays visible. */
const MIN_BOX_EXTENT = 0.14;

/** A margin % as a position on the 0..3 band scale (band i spans [i, i+1)). */
export const marginBandPosition = (pct: number): number => {
  const [low, high] = EBITDA_TIER_CUTS;
  if (pct < low) return Math.max(0, pct) / low;
  if (pct < high) return 1 + (pct - low) / (high - low);
  return 2 + Math.min(1, (pct - high) / (RICH_BAND_TOP_PCT - high));
};

export const tierAt = (position: number): MarginTier =>
  Math.min(2, Math.max(0, Math.floor(position))) as MarginTier;

export type LayerMarginRead = {
  /** Band-scale extent, 0..3. */
  lo: number;
  hi: number;
  /** Lowest and highest band the layer touches. */
  loTier: MarginTier;
  hiTier: MarginTier;
  /** Band of the midpoint — what the layer "is" for ranking. */
  tier: MarginTier;
  /** The EBITDA-family % range when the layer was placed by number. */
  pct: { lo: number; hi: number } | null;
};

const EBITDA_KEY = /\b(ebitda|ebita|ebit|operating margin|op\. margin|operating)\b/i;
const PCT_RANGE =
  /(\d+(?:\.\d+)?)\s*%?\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%/;

const readEbitdaRange = (label: string): { lo: number; hi: number } | null => {
  const key = EBITDA_KEY.exec(label);
  if (!key) return null;
  let match: RegExpExecArray | null = null;
  // Keyword first ("EBITDA 8-17% (peers)", "Op. margin 10.4%"): the figure must
  // follow closely, inside the same clause.
  const after = label.slice(key.index + key[0].length).split(";")[0];
  const forward = PCT_RANGE.exec(after);
  if (forward && forward.index <= 20) match = forward;
  // Figure first ("8–18% EBITDA margin") — only when the label opens on it, so
  // relative figures ("+20-30% gross/EBITDA margin vs bulk") never place.
  if (!match && /^\d/.test(label.trim())) {
    const lead = PCT_RANGE.exec(label.trim());
    if (lead && lead.index === 0) match = lead;
  }
  if (!match) return null;
  const a = Number(match[1] ?? match[3]);
  const b = Number(match[2] ?? match[3]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > 100 || b > 100) return null;
  return { lo: Math.min(a, b), hi: Math.max(a, b) };
};

const TIER_WORDS: [RegExp, MarginTier][] = [
  [/\b(thin|thinnest|lowest)\b/i, 0],
  [/\b(adequate|moderate)\b/i, 1],
  [/\b(rich|richest)\b/i, 2],
];

const withExtent = (lo: number, hi: number, pct: LayerMarginRead["pct"]): LayerMarginRead => {
  let from = lo;
  let to = hi;
  if (to - from < MIN_BOX_EXTENT) {
    const mid = Math.min(3 - MIN_BOX_EXTENT / 2, Math.max(MIN_BOX_EXTENT / 2, (from + to) / 2));
    from = mid - MIN_BOX_EXTENT / 2;
    to = mid + MIN_BOX_EXTENT / 2;
  }
  return {
    lo: from,
    hi: to,
    loTier: tierAt(lo),
    hiTier: tierAt(Math.max(lo, hi - 1e-6)),
    tier: tierAt((lo + hi) / 2),
    pct,
  };
};

/** A layer's margin read placed on the band scale, or null when it can't be banded. */
export const readLayerMargin = (rangeOrLabel: string | null): LayerMarginRead | null => {
  const label = rangeOrLabel?.trim();
  if (!label) return null;

  const pct = readEbitdaRange(label);
  if (pct) return withExtent(marginBandPosition(pct.lo), marginBandPosition(pct.hi), pct);

  const tiers = TIER_WORDS.filter(([pattern]) => pattern.test(label)).map(([, tier]) => tier);
  if (tiers.length === 0) return null;
  const low = Math.min(...tiers);
  const high = Math.max(...tiers);
  return withExtent(low + 0.18, high + 0.82, null);
};

const formatPct = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, "")}`;

/** Short label for a read: "10–16%", "11.5%", "Thin–Adequate", "Rich". */
export const marginReadShort = (read: LayerMarginRead): string => {
  if (read.pct) {
    return read.pct.lo === read.pct.hi
      ? `${formatPct(read.pct.lo)}%`
      : `${formatPct(read.pct.lo)}–${formatPct(read.pct.hi)}%`;
  }
  return read.loTier === read.hiTier
    ? MARGIN_TIER_LABELS[read.tier]
    : `${MARGIN_TIER_LABELS[read.loTier]}–${MARGIN_TIER_LABELS[read.hiTier]}`;
};

/**
 * Indexes of the value-chain layers the company operates in: the layers that
 * name it as a participant. A per-layer `connectionToCompany` counts only when
 * it singles layers out — legacy rows carry `sub_sector_linkage` on every layer
 * (it describes each layer, not where the company sits).
 */
export const companyLayerIndexes = (
  layers: NormalizedIndustryValueChainLayer[],
  companyName: string | null,
  companyCode: string,
): number[] => {
  const named = layers.flatMap((layer, index) =>
    layer.topParticipants.some((participant) => matchesCompany(participant.name, companyName, companyCode))
      ? [index]
      : [],
  );
  if (named.length > 0) return named;
  const connected = layers.flatMap((layer, index) => (layer.connectionToCompany ? [index] : []));
  return connected.length < layers.length ? connected : [];
};

export type CompanyMargin = { pct: number; label: string };

/** The company's latest EBITDA margin (OPM fallback); none for bank/NBFC statements. */
export const latestCompanyMargin = (payload: CompanyQualityV1 | null): CompanyMargin | null => {
  if (!payload || payload.statement_model === "financial") return null;
  for (let index = payload.fiscal_years.length - 1; index >= 0; index -= 1) {
    const year = payload.fiscal_years[index];
    const pct = year.ebitda_margin_pct ?? year.opm_pct ?? null;
    if (pct != null && Number.isFinite(pct)) return { pct, label: year.label };
  }
  return null;
};

// ---- Policy shifts --------------------------------------------------------------
export type PolicyTone = "helps" | "mixed" | "hurts" | "unclear";

export const policyTone = (direction: string | null): PolicyTone => {
  switch (direction?.trim().toLowerCase()) {
    case "positive":
    case "favorable":
    case "favourable":
      return "helps";
    case "negative":
    case "adverse":
      return "hurts";
    case "mixed":
      return "mixed";
    default:
      return "unclear";
  }
};

/** Chronological sort key: "FY25" sits just before calendar 2025; unreadable sorts last. */
export const policySortKey = (period: string | null): number => {
  if (!period) return Number.POSITIVE_INFINITY;
  const fy = /FY\s*'?(\d{4}|\d{2})\b/i.exec(period);
  if (fy) {
    const year = fy[1].length === 2 ? 2000 + Number(fy[1]) : Number(fy[1]);
    return year - 0.75;
  }
  const calendar = /\b(19|20)\d{2}\b/.exec(period);
  return calendar ? Number(calendar[0]) : Number.POSITIVE_INFINITY;
};

const POLICY_COUNT_WORDS: Record<PolicyTone, [string, string]> = {
  helps: ["helps", "help"],
  mixed: ["mixed", "mixed"],
  hurts: ["hurts", "hurt"],
  unclear: ["unclear", "unclear"],
};

/** "2 help · 1 mixed" — tones in a fixed order, zero counts dropped. */
export const policyTally = (tones: PolicyTone[]): { tone: PolicyTone; text: string }[] =>
  (["helps", "mixed", "hurts", "unclear"] as const)
    .map((tone) => ({ tone, count: tones.filter((item) => item === tone).length }))
    .filter((item) => item.count > 0)
    .map(({ tone, count }) => ({ tone, text: `${count} ${POLICY_COUNT_WORDS[tone][count === 1 ? 0 : 1]}` }));

// ---- Types of players -----------------------------------------------------------
/** The lens to lead with: the first dimension where the company is a named example. */
export const pickPlayerLens = (
  dimensions: NormalizedIndustryPlayerTypeDimension[],
  companyName: string | null,
  companyCode: string,
): { index: number; matched: number[] } | null => {
  if (dimensions.length === 0) return null;
  for (let index = 0; index < dimensions.length; index += 1) {
    const matched = dimensions[index].categories.flatMap((category, categoryIndex) =>
      category.playerExamples.some((example) => matchesCompany(example, companyName, companyCode))
        ? [categoryIndex]
        : [],
    );
    if (matched.length > 0) return { index, matched };
  }
  return { index: 0, matched: [] };
};

// ---- Templated one-liners -------------------------------------------------------
const joinNames = (names: string[]): string => {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and others`;
};

/** Headline for the margin ladder: where money pools, where it's thinnest, where the company sits. */
export const moneyHeadline = (
  layers: { name: string; read: LayerMarginRead | null }[],
  companyCode: string,
  companyLayers: number[],
): string | null => {
  const rated = layers.filter((layer): layer is { name: string; read: LayerMarginRead } => Boolean(layer.read));
  if (rated.length < 2) return null;
  const top = Math.max(...rated.map((layer) => layer.read.tier));
  const bottom = Math.min(...rated.map((layer) => layer.read.tier));
  const company =
    companyLayers.length > 0
      ? ` ${companyCode} operates in ${joinNames(companyLayers.map((index) => shortName(layers[index].name)))}.`
      : "";
  if (top === bottom) {
    return `Margins sit in the same ${MARGIN_TIER_LABELS[top].toLowerCase()} band all along the chain.${company}`;
  }
  const rich = rated.filter((layer) => layer.read.tier === top).map((layer) => shortName(layer.name));
  const thin = rated.filter((layer) => layer.read.tier === bottom).map((layer) => shortName(layer.name));
  return `Money pools at ${joinNames(rich)}; margins are thinnest at ${joinNames(thin)}.${company}`;
};

/** "thin", or "thin-to-adequate" for a layer that spans bands. */
const tierSpanWord = (read: LayerMarginRead): string =>
  read.loTier === read.hiTier
    ? MARGIN_TIER_LABELS[read.tier].toLowerCase()
    : `${MARGIN_TIER_LABELS[read.loTier].toLowerCase()}-to-${MARGIN_TIER_LABELS[read.hiTier].toLowerCase()}`;

/** A company margin within this many points of a layer's sourced range counts as inside it. */
const RANGE_TOLERANCE_PP = 1;

const CYCLE_CLAUSE: Record<string, string> = {
  early_upcycle: "early in an upcycle",
  mid_upcycle: "mid-way through an upcycle",
  late_upcycle: "late in an upcycle",
  boom: "at a cyclical boom",
  mid_cycle: "mid-cycle",
  recovery: "recovering from a downcycle",
  downcycle: "in a downcycle",
  defensive_stable: "in a steady, defensive market",
  unclear: "with mixed cycle signals",
};

/** "Earns inside its layer's range, mid-way through an upcycle, tailwinds and headwinds evenly split." */
export const whereItSitsLine = ({
  layerRead,
  companyMargin,
  cycleStage,
  tailwinds,
  headwinds,
}: {
  layerRead: LayerMarginRead | null;
  companyMargin: number | null;
  cycleStage: string | null;
  tailwinds: number;
  headwinds: number;
}): string | null => {
  const clauses: string[] = [];

  if (layerRead && companyMargin != null) {
    if (layerRead.pct) {
      clauses.push(
        companyMargin > layerRead.pct.hi + RANGE_TOLERANCE_PP
          ? "out-earns its layer's range"
          : companyMargin < layerRead.pct.lo - RANGE_TOLERANCE_PP
            ? "earns below its layer's range"
            : "earns inside its layer's range",
      );
    } else {
      const own = tierAt(marginBandPosition(companyMargin));
      const layerWord = `${tierSpanWord(layerRead)}-margin layer`;
      clauses.push(
        own > layerRead.hiTier
          ? `out-earns its ${layerWord}`
          : own < layerRead.loTier
            ? `earns below its ${layerWord}`
            : `earns in line with its ${layerWord}`,
      );
    }
  } else if (layerRead) {
    clauses.push(`works a ${tierSpanWord(layerRead)}-margin layer`);
  } else if (companyMargin != null) {
    clauses.push(`${MARGIN_TIER_LABELS[tierAt(marginBandPosition(companyMargin))].toLowerCase()} margins`);
  }

  const stageKey = cycleStage?.trim().toLowerCase().replace(/\s+/g, "_");
  if (stageKey && CYCLE_CLAUSE[stageKey]) clauses.push(CYCLE_CLAUSE[stageKey]);

  if (tailwinds + headwinds > 0) {
    clauses.push(
      tailwinds > headwinds
        ? "more tailwinds than headwinds"
        : headwinds > tailwinds
          ? "more headwinds than tailwinds"
          : "tailwinds and headwinds evenly split",
    );
  }

  if (clauses.length === 0) return null;
  const sentence = clauses.join(", ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
};
