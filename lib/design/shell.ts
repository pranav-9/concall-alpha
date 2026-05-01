/**
 * Atmospheric surface tokens for landing, index, and marketing pages.
 *
 * These are the only legal atmospheric backgrounds. See
 * docs/portal-design-system.md → "Atmospheric Surfaces" for the full rule set:
 *   A1 page hero       → HERO_CARD
 *   A2 panel           → PANEL_CARD_SKY (default), PANEL_CARD_NEUTRAL
 *   A2 table shell     → TABLE_CARD_SKY
 *   A3 inner card      → INNER_CARD (the only legal way to nest inside A1/A2)
 *   Page container     → PAGE_SHELL
 *   Page background    → PAGE_BACKGROUND_ATMOSPHERIC
 *
 * Import from here. Do not redeclare these strings inline.
 */

export const PAGE_SHELL =
  "mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5 lg:px-8";

export const HERO_CARD =
  "rounded-[1.6rem] border border-sky-200/35 bg-gradient-to-br from-background/97 via-background/92 to-sky-50/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_18px_36px_-30px_rgba(15,23,42,0.26)] backdrop-blur-sm dark:border-sky-700/25 dark:from-background/90 dark:via-background/84 dark:to-sky-950/12";

export const PANEL_CARD_SKY =
  "rounded-[1.45rem] border border-sky-200/25 bg-gradient-to-br from-background/97 via-background/93 to-sky-50/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_28px_-26px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-sky-700/20 dark:from-background/90 dark:via-background/84 dark:to-sky-950/10";

export const PANEL_CARD_NEUTRAL =
  "rounded-[1.45rem] border border-border/25 bg-gradient-to-br from-background/97 via-background/93 to-muted/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_28px_-26px_rgba(15,23,42,0.18)] backdrop-blur-sm";

export const TABLE_CARD_SKY =
  "overflow-hidden rounded-[1.45rem] border border-sky-200/25 bg-gradient-to-br from-background/97 via-background/93 to-sky-50/10 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.24)] backdrop-blur-sm dark:border-sky-700/20 dark:from-background/90 dark:via-background/84 dark:to-sky-950/10";

// A3 — flat content card that lives inside an A1 or A2. No gradient, no
// inset highlight, no backdrop-blur (intentionally — that's what makes A3
// the only legal nesting layer). Same recipe as elevatedBlockClass on
// research surfaces; the visual job is the same.
export const INNER_CARD =
  "rounded-xl border border-border/35 bg-background/75 shadow-md shadow-black/20";

export const PAGE_BACKGROUND_ATMOSPHERIC =
  "pointer-events-none absolute inset-x-0 top-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.78),_transparent_62%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.34),_transparent_62%)]";

export const CHIP_BASE =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors";

export const CHIP_PRIMARY =
  "border-sky-200/60 bg-sky-100/70 text-sky-800 dark:border-sky-700/35 dark:bg-sky-900/30 dark:text-sky-200";

export const CHIP_NEUTRAL = "border-border/60 bg-background/80 text-foreground";
