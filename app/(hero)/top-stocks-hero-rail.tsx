"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

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
};

type GrowthItem = {
  company: string;
  displayName?: string;
  isNew?: boolean;
  growthScore?: number | null;
  rank?: number;
};

type MoatItem = {
  code: string;
  name: string;
  moatLabel: string;
  moatScore: number | null;
  presentPillarCount: number;
  trajectoryLabel: string;
  trajectoryRank: number;
  updatedAtSort: number;
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
    }
  | {
      key: "moat";
      railLabel: "Moat Leaders";
      type: "moat";
      title: string;
      subtitle?: string;
      items: MoatItem[];
    };

export default function TopStocksHeroRail({ slides }: { slides: HeroRailSlide[] }) {
  const slideCount = slides.length;

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3 sm:hidden">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
          <span>Swipe to browse</span>
        </div>
        <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {slideCount} cards
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
        {slides.map((slide) => (
          <div
            key={slide.key}
            className="w-[82vw] min-w-[82vw] max-w-[26rem] shrink-0 snap-start overflow-hidden rounded-[1.5rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94),rgba(255,255,255,0.98))] shadow-[0_20px_60px_-42px_rgba(15,23,42,0.35)] sm:w-auto sm:min-w-0 sm:max-w-none dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,24,39,0.96),rgba(15,23,42,0.98))]"
          >
            <div className="border-b border-border/60 px-3 py-3 sm:px-4 sm:py-3.5">
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
              <h3 className="mt-2 text-lg font-bold leading-tight text-foreground sm:text-xl">
                {slide.type === "growth"
                  ? "Top Growth Outlook"
                  : slide.type === "moat"
                    ? slide.title
                    : slide.list.title}
              </h3>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground sm:text-[13px]">
                {slide.type === "growth"
                  ? slide.subtitle ??
                    "Companies with the strongest forward growth outlook based on the latest available growth score."
                  : slide.type === "moat"
                    ? slide.subtitle ?? "Label-ranked moat positions across covered companies."
                    : slide.list.subtitle ?? "Track the strongest live shifts across covered companies."}
              </p>
            </div>

            <div className="p-3">
              {slide.type === "growth" ? (
                <GrowthListCard items={slide.items} />
              ) : slide.type === "moat" ? (
                <MoatListCard items={slide.items} />
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
  return (
    <div className="flex flex-col gap-3">
      {list.items.length === 0 && <p className="text-sm text-muted-foreground">Not enough data.</p>}
      {list.items.map((item, index) => {
        const showBadgeRow = item.isNew;

        return (
          <Link key={`${item.code}-${index}`} href={`/company/${item.code}`} prefetch={false}>
            <div className="flex items-start gap-2 rounded-2xl border border-border/50 bg-background/70 p-2.5 transition-colors hover:bg-accent/60">
              <p className="p-1 text-[11px] leading-snug text-muted-foreground">{index + 1}.</p>
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="line-clamp-1 text-[12px] font-medium leading-tight text-foreground">
                    {item.name}
                  </p>
                  {showBadgeRow && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.isNew && (
                        <span className="w-fit shrink-0 rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                          New
                        </span>
                      )}
                    </div>
                  )}
                  {typeof item.twistPct === "number" && (
                    <p className="line-clamp-1 text-[10px] leading-tight text-muted-foreground">
                      {`${item.twistPct >= 0 ? "+" : ""}${item.twistPct.toFixed(1)}% vs prev 4Q avg`}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 min-w-[64px] flex-col items-end gap-0.5">
                  {list.scoreKey !== "avg4" && !Number.isNaN(item.latestScore) && (
                    <ConcallScore score={item.latestScore} size="sm" />
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
          <div className="flex items-start gap-2 rounded-2xl border border-border/50 bg-background/70 p-2.5 transition-colors hover:bg-accent/60">
            <p className="p-1 text-[11px] leading-snug text-muted-foreground">
              {typeof item.rank === "number" ? `${item.rank}.` : `${index + 1}.`}
            </p>
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="line-clamp-1 text-[12px] font-medium leading-tight text-foreground">
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
              <div className="flex shrink-0 min-w-[64px] flex-col items-end gap-0.5">
                {typeof item.growthScore === "number" ? (
                  <ConcallScore score={item.growthScore} size="sm" />
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

const moatBadgeClass = (label: string) => {
  const normalized = label.toLowerCase();
  if (normalized.includes("wide")) {
    return "border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200";
  }
  if (normalized.includes("narrow")) {
    return "border-sky-200 bg-sky-100 text-sky-900 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-200";
  }
  if (normalized.includes("risk")) {
    return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/30 dark:text-amber-200";
  }
  if (normalized.includes("no moat")) {
    return "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-600/40 dark:bg-rose-900/30 dark:text-rose-200";
  }
  return "border-border/60 bg-muted/60 text-foreground";
};

function MoatListCard({ items }: { items: MoatItem[] }) {
  const visible = items.slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      {visible.length === 0 && <p className="text-sm text-muted-foreground">No moat data yet.</p>}
      {visible.map((item, index) => (
        <Link key={`${item.code}-${index}`} href={`/company/${item.code}`} prefetch={false}>
          <div className="flex items-start gap-2 rounded-2xl border border-border/50 bg-background/70 p-2.5 transition-colors hover:bg-accent/60">
            <p className="p-1 text-[11px] leading-snug text-muted-foreground">
              {index + 1}.
            </p>
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="line-clamp-1 text-[12px] font-medium leading-tight text-foreground">
                  {item.name}
                </p>
                <p className="line-clamp-1 text-[10px] leading-tight text-muted-foreground">
                  {item.presentPillarCount} sources · {item.trajectoryLabel.toLowerCase()}
                </p>
              </div>
              <div className="flex shrink-0 min-w-[84px] flex-col items-end gap-0.5">
                {typeof item.moatScore === "number" ? (
                  <ConcallScore score={item.moatScore} size="sm" />
                ) : null}
                <span
                  className={`inline-flex max-w-[84px] items-center justify-center rounded-full border px-2.5 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] ${moatBadgeClass(
                    item.moatLabel,
                  )}`}
                >
                  {item.moatLabel}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
