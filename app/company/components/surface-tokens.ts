/**
 * Canonical card surface tokens for the company page.
 *
 * These are the only legal card backgrounds on the company page. See
 * docs/portal-design-system.md → "Unified Card Tokens" for the full rule set:
 *   L1 section shell   → SectionCard component
 *   L2 summary block   → elevatedBlockClass
 *   L2 dark variant    → elevatedMutedBlockClass (use only when the brief calls for a darker band)
 *   L3 nested mini-card → nestedDetailClass
 *   L4 quiet subsection → snapshotSubsectionClass
 *
 * Import from here. Do not redeclare these strings inline.
 */

export const elevatedBlockClass =
  "rounded-xl border border-border/35 bg-background/75 shadow-md shadow-black/20";

export const elevatedMutedBlockClass =
  "rounded-xl border border-border/35 bg-muted/35 shadow-md shadow-black/20";

/**
 * elevatedBlockClass from `sm` up, and NO box below it. For an L2 wrapper that
 * sits around other L2 blocks: on a phone its border + padding were one of six
 * nested paddings squeezing text to 216px of a 390px screen, so the box drops
 * out there and the children stand on their own. Keep in step with
 * elevatedBlockClass — same recipe, prefixed.
 */
export const elevatedBlockClassFromSm =
  "sm:rounded-xl sm:border sm:border-border/35 sm:bg-background/75 sm:shadow-md sm:shadow-black/20";

export const nestedDetailClass =
  "rounded-md border border-border/25 bg-background/45";

export const snapshotSubsectionClass =
  "rounded-xl border border-border/20 bg-background/25";
