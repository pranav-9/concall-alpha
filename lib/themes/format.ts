// Small display helpers for the Hot Themes cards, kept out of the component
// file so tests can import them without pulling next/link and the pips in.

/** "Theme 01", "Theme 12" — the card's eyebrow for its position in the featured order. */
export function themeIndexLabel(index: number): string {
  return `Theme ${String(index).padStart(2, "0")}`;
}

/** "E2E Networks Limited" → "E2E Networks": the riding-it line is a roll call, not a filing. */
export function shortCompanyName(name: string): string {
  return name.replace(/\s+(Limited|Ltd\.?|Pvt\.?\s+Ltd\.?)$/i, "").trim() || name;
}

/** The calendar/fiscal year in a sparkline period label ("CY25" → 2025, "FY2031" → 2031); null if unreadable. */
export function periodYear(period: string): number | null {
  const m = /^(?:CY|FY)(\d{2}|\d{4})$/.exec(period);
  if (!m) return null;
  const n = Number(m[1]);
  return m[1].length === 2 ? 2000 + n : n;
}
