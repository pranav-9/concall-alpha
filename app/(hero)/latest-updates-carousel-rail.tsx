"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import ConcallScore from "@/components/concall-score";
import { INNER_CARD } from "@/lib/design/shell";
import { cn } from "@/lib/utils";

export type CarouselUpdateItem = {
  id: string;
  companyName: string;
  companyIsNew: boolean;
  score: number | null;
  contextLabel: string | null;
  sourceLabel: string;
  chipClass: string;
  detail: string | null;
  timeLabel: string;
  atRaw: string | null;
  href: string | null;
};

const CARD_CLASS = cn(
  INNER_CARD,
  "flex w-60 shrink-0 snap-start flex-col gap-2 p-3 transition-colors hover:bg-accent/70",
);

const ARROW_CLASS =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground";

function UpdateCard({ item }: { item: CarouselUpdateItem }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-foreground">
          {item.companyName}
          {item.companyIsNew && (
            <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-medium leading-none text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
              New
            </span>
          )}
        </p>
        {typeof item.score === "number" ? (
          <ConcallScore score={item.score} size="sm" />
        ) : item.contextLabel ? (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${item.chipClass}`}
          >
            {item.contextLabel}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span
          className={`rounded-full border px-2 py-0.5 font-medium leading-none ${item.chipClass}`}
        >
          {item.sourceLabel}
        </span>
        {item.detail && (
          <span className="line-clamp-1 text-muted-foreground">{item.detail}</span>
        )}
      </div>
      <p
        className="mt-auto text-[10px] text-muted-foreground"
        title={item.atRaw ?? undefined}
      >
        {item.timeLabel}
      </p>
    </>
  );

  if (!item.href) return <div className={CARD_CLASS}>{body}</div>;
  return (
    <Link href={item.href} prefetch={false} className={CARD_CLASS}>
      {body}
    </Link>
  );
}

export default function LatestUpdatesCarouselRail({
  updates,
}: {
  updates: CarouselUpdateItem[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByCards = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scroller.scrollBy({
      left: direction * Math.round(scroller.clientWidth * 0.8),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <section className="w-full">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">
            Latest updates
          </h2>
          <p className="text-[11px] leading-tight text-muted-foreground">
            Recent activity across covered companies
          </p>
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label="Scroll updates back"
            className={ARROW_CLASS}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label="Scroll updates forward"
            className={ARROW_CLASS}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {updates.map((item) => (
          <UpdateCard key={item.id} item={item} />
        ))}
        <Link
          href="/activity"
          prefetch={false}
          className={cn(
            INNER_CARD,
            "flex w-40 shrink-0 snap-start items-center justify-center p-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground",
          )}
        >
          See all activity →
        </Link>
      </div>
    </section>
  );
}
