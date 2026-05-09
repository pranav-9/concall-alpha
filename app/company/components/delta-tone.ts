export const getDeltaToneClass = (value: number | null | undefined) => {
  if (value == null) return "text-muted-foreground";
  if (value > 0) return "text-emerald-700/80 dark:text-emerald-300/80";
  if (value < 0) return "text-rose-700/80 dark:text-rose-300/80";
  return "text-muted-foreground";
};
