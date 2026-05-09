import { cn } from "@/lib/utils";

export type ChipTone = "emerald" | "sky" | "amber" | "rose" | "violet" | "slate";

export const chipBaseClass =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none";

export const chipToneClasses: Record<ChipTone, string> = {
  emerald:
    "border-emerald-200/80 bg-emerald-100 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
  sky: "border-sky-200/80 bg-sky-100 text-sky-800 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200",
  amber:
    "border-amber-200/80 bg-amber-100 text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
  rose: "border-rose-200/80 bg-rose-100 text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-200",
  violet:
    "border-violet-200/80 bg-violet-100 text-violet-800 dark:border-violet-700/40 dark:bg-violet-900/30 dark:text-violet-200",
  slate: "border-border/60 bg-muted/60 text-foreground",
};

export const chipClass = (tone: ChipTone) => cn(chipBaseClass, chipToneClasses[tone]);
