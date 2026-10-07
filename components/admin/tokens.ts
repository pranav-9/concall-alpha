// Class recipes for the admin panel (house skin). No React here so client
// components can import them without pulling the server shell into the graph.

import { cn } from "@/lib/utils";

export const EYEBROW = "house-data text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]";

export const HOUSE_BTN =
  "house-data inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] border border-[var(--rule)] bg-[var(--paper-2)] px-3 text-[11px] uppercase tracking-[0.08em] text-[var(--ink)] transition-colors hover:border-[var(--signal)] hover:text-[var(--signal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)] disabled:cursor-not-allowed disabled:opacity-50";

export const HOUSE_BTN_PRIMARY =
  "house-data inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] border border-[var(--signal)] bg-[var(--signal)] px-3 text-[11px] uppercase tracking-[0.08em] text-[var(--paper-2)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)] disabled:cursor-not-allowed disabled:opacity-50";

export const HOUSE_INPUT =
  "h-9 w-full rounded-[4px] border border-[var(--rule)] bg-[var(--paper)] px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus-visible:border-[var(--signal)] focus-visible:outline-none";

export const HOUSE_TEXTAREA = cn(HOUSE_INPUT, "h-auto min-h-[88px] py-2 leading-snug");

export const TABLE = "w-full border-collapse text-[13px] text-[var(--ink)]";
export const TH =
  "house-data whitespace-nowrap border-b border-[var(--rule)] px-3.5 py-2 text-left text-[10px] font-normal uppercase tracking-[0.12em] text-[var(--ink-soft)] first:pl-4 last:pr-4";
export const TH_NUM = cn(TH, "text-right");
export const TD =
  "border-b border-[var(--rule)] px-3.5 py-2 align-top first:pl-4 last:pr-4 [tr:last-child>&]:border-b-0";
export const TD_MUTED = cn(TD, "text-[var(--ink-soft)]");
export const TD_NUM = cn(TD, "house-data text-right tabular-nums");
export const TD_CODE = cn(TD, "house-data text-[12px] text-[var(--ink-soft)]");
export const TD_TIME = cn(TD, "house-data whitespace-nowrap text-[12px] text-[var(--ink-soft)]");
export const ROW_HOVER = "transition-colors hover:bg-[var(--paper)]";
