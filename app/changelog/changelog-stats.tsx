import { cn } from "@/lib/utils";

import { changelogEntries, type ChangelogCategory } from "./changelog-data";

// Category render order + bar fill, kept in step with the pill hues in page.tsx
// (violet / emerald / sky). One source for both the breakdown bars, the monthly
// cadence segments, and the shared legend.
const CATEGORY_META: { key: ChangelogCategory; fill: string }[] = [
  { key: "Company analysis", fill: "bg-violet-400 dark:bg-violet-500" },
  { key: "Score framework", fill: "bg-emerald-400 dark:bg-emerald-500" },
  { key: "Portal", fill: "bg-sky-400 dark:bg-sky-500" },
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type MonthBucket = {
  key: string;
  label: string;
  total: number;
  byCategory: Record<ChangelogCategory, number>;
};

function buildStats() {
  const total = changelogEntries.length;
  const newCount = changelogEntries.filter((e) => e.status === "new").length;

  const byCategory = CATEGORY_META.map(({ key, fill }) => ({
    key,
    fill,
    count: changelogEntries.filter((e) => e.category === key).length,
  }));

  const monthMap = new Map<string, MonthBucket>();
  for (const entry of changelogEntries) {
    const key = entry.date.slice(0, 7); // YYYY-MM
    let bucket = monthMap.get(key);
    if (!bucket) {
      const [year, month] = key.split("-");
      bucket = {
        key,
        label: `${MONTH_NAMES[Number(month) - 1]} '${year.slice(2)}`,
        total: 0,
        byCategory: { "Company analysis": 0, "Score framework": 0, Portal: 0 },
      };
      monthMap.set(key, bucket);
    }
    bucket.total += 1;
    bucket.byCategory[entry.category] += 1;
  }
  // Oldest → newest so the cadence reads as a ramp.
  const months = [...monthMap.values()].sort((a, b) => a.key.localeCompare(b.key));

  const firstLabel = months[0]?.label ?? "";
  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);
  const maxMonth = Math.max(...months.map((m) => m.total), 1);

  return {
    total,
    newCount,
    updatedCount: total - newCount,
    byCategory,
    months,
    firstLabel,
    maxCategory,
    maxMonth,
  };
}

const SECTION_HEADING =
  "mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

export function ChangelogStats() {
  const stats = buildStats();

  return (
    <section aria-label="Shipping summary" className="mb-10 space-y-6">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{stats.total}</span>{" "}
        shipped · {stats.newCount} new · {stats.updatedCount} updated · since{" "}
        {stats.firstLabel}
      </p>

      {/* By area — count per category */}
      <div>
        <h2 className={SECTION_HEADING}>By area</h2>
        <div className="space-y-1.5">
          {stats.byCategory.map((c) => (
            <div
              key={c.key}
              className="grid grid-cols-[7.5rem_1fr_1.5rem] items-center gap-3"
            >
              <span className="text-xs text-foreground">{c.key}</span>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn("h-2 rounded-full", c.fill)}
                  style={{ width: `${(c.count / stats.maxCategory) * 100}%` }}
                />
              </div>
              <span className="text-right text-xs tabular-nums text-muted-foreground">
                {c.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly cadence — bar per month, segmented by category */}
      <div>
        <h2 className={SECTION_HEADING}>Monthly cadence</h2>
        <div className="space-y-1.5">
          {stats.months.map((m) => (
            <div
              key={m.key}
              className="grid grid-cols-[4rem_1fr_1.5rem] items-center gap-3"
            >
              <span className="text-xs tabular-nums text-muted-foreground">
                {m.label}
              </span>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="flex h-2 overflow-hidden rounded-full"
                  style={{ width: `${(m.total / stats.maxMonth) * 100}%` }}
                >
                  {CATEGORY_META.map(({ key, fill }) => {
                    const value = m.byCategory[key];
                    if (value === 0) return null;
                    return (
                      <div
                        key={key}
                        className={fill}
                        style={{ width: `${(value / m.total) * 100}%` }}
                      />
                    );
                  })}
                </div>
              </div>
              <span className="text-right text-xs tabular-nums text-muted-foreground">
                {m.total}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {stats.byCategory.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span className={cn("h-2 w-2 rounded-sm", c.fill)} />
              {c.key}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
