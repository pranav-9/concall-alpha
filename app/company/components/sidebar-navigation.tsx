"use client";

import * as React from "react";
import ConcallScore from "@/components/concall-score";
import { cn } from "@/lib/utils";
import type {
  CompanySidebarSectionItem,
  CompanySidebarSectionMeta,
} from "../constants";

type SidebarNavigationProps = {
  sections: CompanySidebarSectionItem[];
};

const STICKY_TOP_CLASS = "top-20";
const VIEWPORT_RAIL_MAX_HEIGHT_CLASS =
  "max-h-[calc(100vh-5.5rem)] supports-[height:100dvh]:max-h-[calc(100dvh-5.5rem)]";
const VIEWPORT_LIST_MAX_HEIGHT_CLASS =
  "max-h-[calc(100vh-12rem)] supports-[height:100dvh]:max-h-[calc(100dvh-12rem)]";
const ACTIVE_ANCHOR_OFFSET_PX = 120;

const renderMeta = (meta: CompanySidebarSectionMeta, isActive: boolean) => {
  if (meta.kind === "score") {
    return typeof meta.score === "number" ? (
      <ConcallScore
        score={meta.score}
        size="sm"
        className={cn(
          "h-7 w-7 shrink-0 text-[11px] ring-2 shadow-sm transition-all",
          isActive
            ? "ring-foreground/25 shadow-black/10"
            : "ring-border/70 opacity-95 shadow-black/5",
        )}
      />
    ) : (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition-colors",
          isActive
            ? "border-foreground/15 bg-background/95 text-foreground"
            : "border-border/60 bg-background/80 text-muted-foreground",
        )}
      >
        —
      </span>
    );
  }

  if (meta.kind === "count") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition-colors",
          isActive
            ? "border-foreground/15 bg-background/95 text-foreground"
            : "border-border/60 bg-background/80 text-muted-foreground",
        )}
      >
        {meta.count}
        {meta.suffix ? ` ${meta.suffix}` : ""}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "max-w-[7rem] shrink-0 truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition-colors",
        isActive
          ? "border-foreground/15 bg-background/95 text-foreground"
          : "border-border/60 bg-background/80 text-muted-foreground",
      )}
    >
      {meta.text}
    </span>
  );
};

export function SidebarNavigation({ sections }: SidebarNavigationProps) {
  const [activeSectionId, setActiveSectionId] = React.useState<string>(
    sections[0]?.id ?? "",
  );
  const activeSectionLabel =
    sections.find((section) => section.id === activeSectionId)?.label ??
    sections[0]?.label ??
    "";

  React.useEffect(() => {
    if (sections.length === 0) return;

    const sectionElements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sectionElements.length === 0) return;

    let frameId: number | null = null;

    const updateActiveSection = () => {
      const anchor = ACTIVE_ANCHOR_OFFSET_PX;
      const visibleSections = sectionElements
        .map((element) => ({
          id: element.id,
          top: element.getBoundingClientRect().top,
          bottom: element.getBoundingClientRect().bottom,
        }))
        .filter((section) => section.bottom > 0 && section.top < window.innerHeight * 0.85);

      if (visibleSections.length === 0) {
        const allAbove = sectionElements.every(
          (element) => element.getBoundingClientRect().bottom <= 0,
        );
        setActiveSectionId(
          allAbove
            ? sectionElements[sectionElements.length - 1]?.id ?? sections[0]?.id ?? ""
            : sectionElements[0]?.id ?? sections[0]?.id ?? "",
        );
        return;
      }

      const passedAnchor = visibleSections
        .filter((section) => section.top <= anchor)
        .sort((a, b) => b.top - a.top)[0];

      const nextVisible =
        visibleSections.sort((a, b) => a.top - b.top)[0] ?? visibleSections[0];

      setActiveSectionId((passedAnchor ?? nextVisible)?.id ?? sections[0]?.id ?? "");
    };

    const scheduleUpdate = () => {
      if (frameId != null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateActiveSection();
      });
    };

    const observer = new IntersectionObserver(scheduleUpdate, {
      root: null,
      rootMargin: `-${ACTIVE_ANCHOR_OFFSET_PX}px 0px -55% 0px`,
      threshold: [0, 0.15, 0.35, 0.6, 1],
    });

    sectionElements.forEach((element) => observer.observe(element));

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frameId != null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [sections]);

  return (
    <aside
      className={cn(
        "hidden lg:block sticky self-start shrink-0 w-[15rem] xl:w-[16rem] z-20",
        STICKY_TOP_CLASS,
      )}
    >
      <nav
        className={cn(
          "rounded-2xl border border-border/70 bg-background p-3 shadow-lg shadow-black/10",
          VIEWPORT_RAIL_MAX_HEIGHT_CLASS,
        )}
      >
        <div className="rounded-xl border border-border/50 bg-background/65 px-3 py-2.5 shadow-sm shadow-black/5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                On this page
              </p>
              <p className="text-[11px] font-medium leading-none text-muted-foreground">
                Currently reading
              </p>
              <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                {activeSectionLabel}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
              {sections.length} sections
            </span>
          </div>
        </div>

        <div className="mt-3 h-px bg-border/40" />

        <div className="relative mt-2">
          <div
            className={cn(
              "space-y-1 overflow-y-auto overscroll-y-contain pr-1 [scrollbar-width:thin]",
              VIEWPORT_LIST_MAX_HEIGHT_CLASS,
            )}
          >
            {sections.map((section) => {
              const isActive = activeSectionId === section.id;

              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden rounded-xl border px-2.5 py-2.5 transition-all",
                    isActive
                      ? "border-border/60 bg-accent/90 text-foreground shadow-sm shadow-black/10"
                      : "border-transparent text-muted-foreground hover:border-border/40 hover:bg-accent/55 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-opacity",
                      isActive ? "bg-foreground/85 opacity-100" : "opacity-0",
                    )}
                  />
                  <span
                    className={cn(
                      "min-w-0 truncate pr-1 text-[12px] transition-colors",
                      isActive ? "font-semibold text-foreground" : "font-medium",
                    )}
                  >
                    {section.label}
                  </span>
                  {section.meta ? renderMeta(section.meta, isActive) : null}
                </a>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card via-card/90 to-transparent" />
        </div>
      </nav>
    </aside>
  );
}
