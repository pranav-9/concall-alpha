/**
 * The qualitative-only fallback for a guidance item's target chip
 * ("double-digit", "mid-teens"). Used when there is no numeric target, no
 * absolute amount and no percent to show.
 *
 * Long phrases used to be sliced to 18 characters plus an ellipsis, which
 * produced chips like "growth is already …" — a fragment that carried nothing
 * the guidance text beside it did not. Past this length the chip is dropped;
 * the sentence already says it.
 */
export const QUALITATIVE_TARGET_CHIP_MAX = 24;

export function qualitativeTargetChip(valueText: string): string | null {
  const text = valueText.trim();
  if (!text) return null;
  return text.length > QUALITATIVE_TARGET_CHIP_MAX ? null : text;
}
