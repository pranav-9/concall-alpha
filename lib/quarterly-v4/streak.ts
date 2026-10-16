// Lean-streak caption for a category card's chip: how many consecutive,
// contiguous quarters (ending at the selected one) the category leaned the same
// WAY. Sign-based, not exact-integer (+1 then +2 is still "positive"). null
// below 2, so a one-off lean carries no caption. The chip already names the
// direction ("In line", "Positive +1"), so the caption only counts: "In line ·
// 3rd quarter running". The count itself is computed in ConcallScoreSection
// from each quarter's score_breakdown; this only words it.
const ORDINALS = ["", "1st", "2nd", "3rd"];

function ordinal(n: number): string {
  return ORDINALS[n] ?? `${n}th`;
}

export function streakLabel(
  lean: number | null,
  streak: number | null | undefined,
): string | null {
  if (lean === null || !streak || streak < 2) return null;
  return `${ordinal(streak)} quarter running`;
}
