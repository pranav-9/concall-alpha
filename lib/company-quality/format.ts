const crFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const crFineFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
const pctFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

/** ₹ crore, whole numbers above 100, one decimal below. */
export const formatCr = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.abs(value) >= 100 ? crFormatter.format(value) : crFineFormatter.format(value);
};

export const formatPct = (value: number | null | undefined, digits = 1): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(value)}%`;
};

export const formatPlain = (value: number | null | undefined, digits = 1): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return pctFormatter.format(Number(value.toFixed(digits)));
};

/** Signed percentage-point change: "+3.5" / "−0.3" / "0.0". */
export const formatPp = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(1));
  if (rounded > 0) return `+${pctFormatter.format(rounded)}`;
  if (rounded < 0) return `−${pctFormatter.format(Math.abs(rounded))}`;
  return "0.0";
};

export const formatMultiple = (value: number | null | undefined, digits = 1): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(value)}×`;
};

/** "FY22–FY26" from the first and last labels. */
export const rangeLabel = (labels: readonly string[]): string => {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels[0]}–${labels[labels.length - 1]}`;
};

/** Compound annual growth between two positive endpoints over `years` years. */
export const cagrPct = (first: number | null, last: number | null, years: number): number | null => {
  if (first == null || last == null || years <= 0) return null;
  if (first <= 0 || last <= 0) return null;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
};

/** "grew 2.3×" / "nearly tripled" phrasing for a first→last ratio. */
export const growthPhrase = (first: number | null, last: number | null): string | null => {
  if (first == null || last == null || first <= 0) return null;
  const ratio = last / first;
  if (ratio >= 3.7 && ratio <= 4.3) return "roughly quadrupled";
  if (ratio >= 2.75 && ratio <= 3.25) return "roughly tripled";
  if (ratio >= 1.85 && ratio <= 2.15) return "roughly doubled";
  if (ratio > 1.05) return `grew ${pctFormatter.format(Number(ratio.toFixed(1)))}×`;
  if (ratio >= 0.95) return "was flat";
  return `fell ${formatPct((1 - ratio) * 100, 0)}`;
};
