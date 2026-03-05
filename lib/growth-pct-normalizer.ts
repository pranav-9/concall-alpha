export type NormalizedGrowthPct = {
  rawText: string | null;
  sortValue: number | null;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseSortValue = (value: string): number | null => {
  const rangeMatch = value.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const low = Number.parseFloat(rangeMatch[1]);
    const high = Number.parseFloat(rangeMatch[2]);
    if (Number.isFinite(low) && Number.isFinite(high)) {
      return (low + high) / 2;
    }
  }

  const gtMatch = value.match(/(?:>=|>)\s*(-?\d+(?:\.\d+)?)/);
  if (gtMatch) {
    const parsed = Number.parseFloat(gtMatch[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const ltMatch = value.match(/(?:<=|<)\s*(-?\d+(?:\.\d+)?)/);
  if (ltMatch) {
    const parsed = Number.parseFloat(ltMatch[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const plusMatch = value.match(/(-?\d+(?:\.\d+)?)\s*\+/);
  if (plusMatch) {
    const parsed = Number.parseFloat(plusMatch[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const singleMatch = value.match(/-?\d+(?:\.\d+)?/);
  if (singleMatch) {
    const parsed = Number.parseFloat(singleMatch[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const normalizeGrowthPct = (value: unknown): NormalizedGrowthPct => {
  if (value == null) return { rawText: null, sortValue: null };

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { rawText: null, sortValue: null };
    return { rawText: `${value}%`, sortValue: value };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return { rawText: null, sortValue: null };
    const normalized = trimmed.replace(/\s+/g, " ");
    return {
      rawText: trimmed,
      sortValue: parseSortValue(normalized),
    };
  }

  return { rawText: null, sortValue: toFiniteNumber(value) };
};

export const toGrowthDisplay = (value: unknown) => normalizeGrowthPct(value).rawText;

export const toGrowthSortValue = (value: unknown) => normalizeGrowthPct(value).sortValue;
