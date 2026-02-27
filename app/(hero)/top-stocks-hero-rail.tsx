"use client";

import React from "react";
import Link from "next/link";

import ConcallScore from "@/components/concall-score";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type ListItem = {
  code: string;
  name: string;
  sector?: string | null;
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
    }
  | {
      key: "twist_negative";
      railLabel: "Negative Twist";
      type: "list";
      list: ListBlock;
    };

export default function TopStocksHeroRail({ slides }: { slides: HeroRailSlide[] }) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const totalSlides = slides.length;

  return (
    <section className="w-full">
      <div className="flex overflow-hidden rounded-2xl border border-border bg-card">
        <nav className="flex w-20 shrink-0 flex-col border-r border-border bg-muted/30 p-2 sm:w-24 md:w-36 md:p-3 xl:w-44">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:text-[11px]">
            Sections
          </p>
          <div className="flex flex-col gap-2">
            {slides.map((slide, index) => {
              const active = index === selectedIndex;
              return (
                <button
                  key={slide.key}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => api?.scrollTo(index)}
                  className={[
                    "rounded-lg border px-2 py-2 text-left text-[10px] leading-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-xs",
                    active
                      ? "border-border bg-background text-foreground shadow-sm"
                      : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  ].join(" ")}
                >
                  {slide.railLabel}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 flex-1 p-3 md:p-4">
          <Carousel setApi={setApi} opts={{ align: "start" }} className="w-full">
            <CarouselContent>
              {slides.map((slide) => (
                <CarouselItem key={slide.key} className="basis-full">
                  {slide.type === "growth" ? (
                    <GrowthListCard
                      items={slide.items}
                      showTitle={false}
                      subtitle={slide.subtitle}
                    />
                  ) : (
                    <ListCard list={slide.list} showTitle={false} />
                  )}
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-3 flex items-center justify-end gap-2">
              <span className="hidden text-[11px] text-muted-foreground md:inline">
                Use rail or arrows
              </span>
              <span className="rounded-full border border-border bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground md:text-[11px]">
                Slide {Math.min(selectedIndex + 1, totalSlides)} / {totalSlides}
              </span>
              <CarouselPrevious className="static translate-x-0 translate-y-0" />
              <CarouselNext className="static translate-x-0 translate-y-0" />
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
}

function ListCard({ list, showTitle = true }: { list: ListBlock; showTitle?: boolean }) {
  const formatSector = (sector?: string | null) => sector?.trim() || null;

  return (
    <div className="flex flex-col">
      {showTitle && (
        <div className="border-b border-border/80 bg-transparent px-1 pb-3 pt-1 text-base font-bold text-foreground sm:text-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="leading-tight">{list.title}</span>
            {list.signal && (
              <Badge variant="outline" className="border-border px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                {list.signal === "sentiment" ? "Sentiment" : "Growth"}
              </Badge>
            )}
          </div>
        </div>
      )}
      <div className={`flex flex-col gap-3 px-1 pb-2 ${showTitle ? "pt-4" : "pt-1"}`}>
        {!showTitle && list.subtitle && (
          <p className="mb-1 text-xs leading-relaxed text-muted-foreground">
            {list.subtitle}
          </p>
        )}
        {list.items.length === 0 && <p className="text-sm text-muted-foreground">Not enough data.</p>}
        {list.items.map((s, index) => {
          const sectorLabel = formatSector(s.sector);
          return (
            <div key={index}>
              <Link href={"/company/" + s.code} prefetch={false}>
                <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-2 transition-colors hover:bg-muted/50">
                  <div className="flex w-full items-start gap-2">
                    <p className="p-1 text-xs leading-snug text-muted-foreground">{index + 1}.</p>
                    <div className="flex w-3/4 flex-col gap-1">
                      <p className="line-clamp-1 text-sm font-medium leading-tight text-foreground">{s.name}</p>
                      {list.showSectorPill && sectorLabel && (
                        <span className="w-fit max-w-full truncate rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
                          {sectorLabel}
                        </span>
                      )}
                      {typeof s.twistPct === "number" && (
                        <p className="line-clamp-1 text-[11px] leading-tight text-muted-foreground">
                          {`${s.twistPct >= 0 ? "+" : ""}${s.twistPct.toFixed(1)}% vs prev 4Q avg`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-[72px] flex-col items-end gap-0.5">
                    {list.scoreKey !== "avg4" && !Number.isNaN(s.latestScore) && <ConcallScore score={s.latestScore} />}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GrowthListCard({
  items,
  showTitle = true,
  subtitle,
}: {
  items: GrowthItem[];
  showTitle?: boolean;
  subtitle?: string;
}) {
  const visible = items.slice(0, 5);

  return (
    <div className="flex flex-col">
      {showTitle && (
        <div className="border-b border-border/80 bg-transparent px-1 pb-3 pt-1 text-base font-bold text-foreground sm:text-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="leading-tight">Top Growth Outlook</span>
            <Badge variant="outline" className="border-border px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
              Growth
            </Badge>
          </div>
        </div>
      )}
      <div className={`flex flex-col gap-3 px-1 pb-2 ${showTitle ? "pt-4" : "pt-1"}`}>
        {!showTitle && subtitle && (
          <p className="mb-1 text-xs leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
        {visible.length === 0 && <p className="text-sm text-muted-foreground">No growth outlook data yet.</p>}
        {visible.map((item, index) => (
          <Link key={item.company + index} href={"/company/" + item.company} prefetch={false}>
            <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-2 transition-colors hover:bg-muted/50">
              <p className="p-1 text-xs leading-snug text-muted-foreground">
                {typeof item.rank === "number" ? `${item.rank}.` : `${index + 1}.`}
              </p>
              <div className="flex w-full items-start gap-2">
                <div className="flex w-3/4 flex-col gap-1">
                  <p className="line-clamp-1 text-sm font-medium leading-tight text-foreground">
                    {item.displayName || item.company}
                  </p>
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
    </div>
  );
}
