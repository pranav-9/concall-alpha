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
const VIEWPORT_RAIL_HEIGHT_CLASS =
  "h-[calc(100vh-5.5rem)] supports-[height:100dvh]:h-[calc(100dvh-5.5rem)]";
const ACTIVE_ANCHOR_OFFSET_PX = 120;

const renderMeta = (meta: CompanySidebarSectionMeta, isActive: boolean) => {
  if (meta.kind === "score") {
    return typeof meta.score === "number" ? (
      <ConcallScore
        score={meta.score}
        size="sm"
        className={cn(
          "h-6 w-6 text-[10px] ring-2 transition-all",
          isActive ? "ring-foreground/20" : "ring-border/70 opacity-90",
        )}
      />
    ) : (
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
          isActive
            ? "border-foreground/15 bg-background text-foreground"
            : "border-border/70 bg-background/70 text-muted-foreground",
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
          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
          isActive
            ? "border-foreground/15 bg-background text-foreground"
            : "border-border/70 bg-background/70 text-muted-foreground",
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
        "max-w-[8rem] shrink-0 truncate rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
        isActive
          ? "border-foreground/15 bg-background text-foreground"
          : "border-border/70 bg-background/70 text-muted-foreground",
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
        VIEWPORT_RAIL_HEIGHT_CLASS,
        STICKY_TOP_CLASS,
      )}
    >
      <nav
        className={cn(
          "overflow-y-auto overscroll-y-contain rounded-2xl border border-border/70 bg-card/95 p-3 shadow-lg shadow-black/10",
          VIEWPORT_RAIL_HEIGHT_CLASS,
        )}
      >
        <div className="mb-3 space-y-1 px-1">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Page Guide
          </h3>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Follow the company page by section as you scroll.
          </p>
        </div>

        <div className="space-y-1.5">
          {sections.map((section) => {
            const isActive = activeSectionId === section.id;

            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "relative flex items-center justify-between gap-2 overflow-hidden rounded-xl px-3 py-2 transition-all",
                  isActive
                    ? "bg-accent/85 text-foreground shadow-sm shadow-black/5"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-opacity",
                    isActive ? "bg-foreground/80 opacity-100" : "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 truncate pr-1 text-xs transition-colors",
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
      </nav>
    </aside>
  );
}
