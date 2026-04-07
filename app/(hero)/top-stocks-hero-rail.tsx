"use client";

import Link from "next/link";

import ConcallScore from "@/components/concall-score";
import { Badge } from "@/components/ui/badge";

type ListItem = {
  code: string;
  name: string;
  sector?: string | null;
  isNew?: boolean;
  latestScore: number;
  twistPct?: number | null;
};

type ListBlock = {
  title: string;
  subtitle?: string;
  scoreKey?: "latest" | "avg4";
  items: ListItem[];
  signal?: "sentiment" | "growth";
  showSectorPill?: boolean;
};

type GrowthItem = {
  company: string;
  displayName?: string;
  isNew?: boolean;
  growthScore?: number | null;
  rank?: number;
};

type HeroRailSlide =
  | {
      key: "quarter";
      railLabel: "Quarter Leaders";
      type: "list";
      list: ListBlock;
    }
  | {
      key: "growth";
      railLabel: "Growth Leaders";
      type: "growth";
      items: GrowthItem[];
      subtitle?: string;
    }
  | {
      key: "twist_positive";
      railLabel: "Positive Twist";
      type: "list";
      list: ListBlock;
    };

export default function TopStocksHeroRail({ slides }: { slides: HeroRailSlide[] }) {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {slides.map((slide) => (
          <div
            key={slide.key}
            className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94),rgba(255,255,255,0.98))] shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,24,39,0.96),rgba(15,23,42,0.98))]"
          >
            <div className="border-b border-border/60 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {slide.railLabel}
                </span>
                {slide.type === "growth" ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200/80 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200"
                  >
                    Forward
                  </Badge>
                ) : null}
              </div>
              <h3 className="mt-2 text-xl font-bold leading-tight text-foreground">
                {slide.type === "growth" ? "Top Growth Outlook" : slide.list.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {slide.type === "growth"
                  ? slide.subtitle ??
                    "Companies with the strongest forward growth outlook based on the latest available growth score."
                  : slide.list.subtitle ?? "Track the strongest live shifts across covered companies."}
              </p>
            </div>

            <div className="p-4">
              {slide.type === "growth" ? (
                <GrowthListCard items={slide.items} />
              ) : (
                <ListCard list={slide.list} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ListCard({ list }: { list: ListBlock }) {
  const formatSector = (sector?: string | null) => sector?.trim() || null;

  return (
    <div className="flex flex-col gap-3">
      {list.items.length === 0 && <p className="text-sm text-muted-foreground">Not enough data.</p>}
      {list.items.map((item, index) => {
        const sectorLabel = formatSector(item.sector);
        const showBadgeRow = item.isNew || (list.showSectorPill && sectorLabel);

        return (
          <Link key={`${item.code}-${index}`} href={`/company/${item.code}`} prefetch={false}>
            <div className="flex items-start gap-2 rounded-2xl border border-border/50 bg-background/70 p-3 transition-colors hover:bg-accent/60">
              <p className="p-1 text-xs leading-snug text-muted-foreground">{index + 1}.</p>
              <div className="flex w-full items-start gap-2">
                <div className="flex w-3/4 flex-col gap-1">
                  <p className="line-clamp-1 text-sm font-medium leading-tight text-foreground">
                    {item.name}
                  </p>
                  {showBadgeRow && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.isNew && (
                        <span className="w-fit shrink-0 rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                          New
                        </span>
                      )}
                      {list.showSectorPill && sectorLabel && (
                        <span className="w-fit max-w-full truncate rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
                          {sectorLabel}
                        </span>
                      )}
                    </div>
                  )}
                  {typeof item.twistPct === "number" && (
                    <p className="line-clamp-1 text-[11px] leading-tight text-muted-foreground">
                      {`${item.twistPct >= 0 ? "+" : ""}${item.twistPct.toFixed(1)}% vs prev 4Q avg`}
                    </p>
                  )}
                </div>
                <div className="flex min-w-[72px] flex-col items-end gap-0.5">
                  {list.scoreKey !== "avg4" && !Number.isNaN(item.latestScore) && (
                    <ConcallScore score={item.latestScore} />
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function GrowthListCard({ items }: { items: GrowthItem[] }) {
  const visible = items.slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      {visible.length === 0 && <p className="text-sm text-muted-foreground">No growth outlook data yet.</p>}
      {visible.map((item, index) => (
        <Link key={`${item.company}-${index}`} href={`/company/${item.company}`} prefetch={false}>
          <div className="flex items-start gap-2 rounded-2xl border border-border/50 bg-background/70 p-3 transition-colors hover:bg-accent/60">
            <p className="p-1 text-xs leading-snug text-muted-foreground">
              {typeof item.rank === "number" ? `${item.rank}.` : `${index + 1}.`}
            </p>
            <div className="flex w-full items-start gap-2">
              <div className="flex w-3/4 flex-col gap-1">
                <p className="line-clamp-1 text-sm font-medium leading-tight text-foreground">
                  {item.displayName || item.company}
                </p>
                {item.isNew && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="w-fit shrink-0 rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                      New
                    </span>
                  </div>
                )}
              </div>
              <div className="flex min-w-[72px] flex-col items-end gap-0.5">
                {typeof item.growthScore === "number" ? (
                  <ConcallScore score={item.growthScore} />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-sm text-muted-foreground">
                    -
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
