import type { Metadata } from "next";

import { ChangelogMarkSeen } from "@/components/changelog-mark-seen";
import { cn } from "@/lib/utils";

import {
  changelogEntries,
  latestChangelogEntry,
  type ChangelogCategory,
} from "./changelog-data";

export const metadata: Metadata = {
  title: "Changelog – Story of a Stock",
  description: "What we shipped, and when.",
};

const CATEGORY_PILL_CLASSES: Record<ChangelogCategory, string> = {
  "Company analysis":
    "border-violet-200/70 bg-violet-50 text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-300",
  "Score framework":
    "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  Portal:
    "border-sky-200/70 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-300",
};

const NEW_PILL_CLASS =
  "border-green-200/70 bg-green-50 text-green-700 dark:border-green-800/50 dark:bg-green-950/40 dark:text-green-300";

const PILL_CLASS =
  "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium";

export default function ChangelogPage() {
  return (
    <main>
      <ChangelogMarkSeen latestKey={latestChangelogEntry.date} />
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Changelog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What we shipped, and when.
          </p>
        </header>

        <ol className="divide-y divide-border border-y border-border">
          {changelogEntries.map((entry, index) => (
            <li
              key={`${entry.date}-${index}`}
              className="grid grid-cols-[7rem_1fr] items-baseline gap-4 py-3 sm:gap-6"
            >
              <time
                dateTime={entry.date}
                className="text-xs text-muted-foreground sm:text-sm"
              >
                {entry.dateLabel}
              </time>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
                <span className="text-sm text-foreground sm:text-[15px]">
                  {entry.title}
                </span>
                <span
                  className={cn(PILL_CLASS, CATEGORY_PILL_CLASSES[entry.category])}
                >
                  {entry.category}
                </span>
                {entry.status === "new" ? (
                  <span className={cn(PILL_CLASS, NEW_PILL_CLASS)}>New</span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
