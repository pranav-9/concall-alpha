"use client";

import * as React from "react";
import ConcallScore from "@/components/concall-score";
import { cn } from "@/lib/utils";
import type {
  CompanySidebarSectionItem,
  CompanySidebarSectionMeta,
} from "../constants";

type TopSectionTabsProps = {
  sections: CompanySidebarSectionItem[];
};

const DEFAULT_ACTIVE_ANCHOR_OFFSET_PX = 172;
const SHORT_LABELS: Record<string, string> = {
  overview: "Overview",
  "industry-context": "Industry",
  "business-overview": "Business",
  "sentiment-score": "Quarterly",
  "key-variables": "Variables",
  "future-growth": "Growth",
  "guidance-history": "Guidance",
  "moat-analysis": "Moat",
  community: "Community",
};

const renderMeta = (meta: CompanySidebarSectionMeta) => {
  if (meta.kind === "score") {
    return typeof meta.score === "number" ? (
      <ConcallScore score={meta.score} size="sm" className="h-7 w-7 text-[11px] ring-2" />
    ) : (
      <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
        —
      </span>
    );
  }

  if (meta.kind === "count") {
    return (
      <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
        {meta.count}
        {meta.suffix ? ` ${meta.suffix}` : ""}
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-[7rem] items-center truncate rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
      {meta.text}
    </span>
  );
};

export function TopSectionTabs({ sections }: TopSectionTabsProps) {
  const placeholderRef = React.useRef<HTMLDivElement | null>(null);
  const floatingRef = React.useRef<HTMLDivElement | null>(null);
  const [activeSectionId, setActiveSectionId] = React.useState<string>(
    sections[0]?.id ?? "",
  );
  const [anchorOffsetPx, setAnchorOffsetPx] = React.useState<number>(
    DEFAULT_ACTIVE_ANCHOR_OFFSET_PX,
  );
  const [floatingFrame, setFloatingFrame] = React.useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });
  const tabRefs = React.useRef<Record<string, HTMLAnchorElement | null>>({});

  React.useEffect(() => {
    const placeholderElement = placeholderRef.current;
    const floatingElement = floatingRef.current;
    const navElement = document.getElementById("global-navbar");
    if (!placeholderElement || !floatingElement) return;

    const syncLayout = () => {
      const navbarHeight = navElement?.offsetHeight ?? 0;
      const tabsHeight = floatingElement.offsetHeight;
      const rect = placeholderElement.getBoundingClientRect();

      document.documentElement.style.setProperty("--company-tabs-height", `${tabsHeight}px`);
      setAnchorOffsetPx(navbarHeight + tabsHeight + 16);
      setFloatingFrame((current) => {
        if (current.left === rect.left && current.width === rect.width) {
          return current;
        }
        return {
          left: rect.left,
          width: rect.width,
        };
      });
    };

    syncLayout();

    const observer = new ResizeObserver(() => {
      syncLayout();
    });

    observer.observe(placeholderElement);
    observer.observe(floatingElement);
    if (navElement) observer.observe(navElement);
    window.addEventListener("resize", syncLayout);
    window.addEventListener("scroll", syncLayout, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncLayout);
      window.removeEventListener("scroll", syncLayout);
    };
  }, []);

  React.useEffect(() => {
    if (sections.length === 0) return;

    const sectionElements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sectionElements.length === 0) return;

    let frameId: number | null = null;

    const updateActiveSection = () => {
      const anchor = anchorOffsetPx;
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

      const nextVisible = visibleSections.sort((a, b) => a.top - b.top)[0] ?? visibleSections[0];

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
      rootMargin: `-${anchorOffsetPx}px 0px -55% 0px`,
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
  }, [anchorOffsetPx, sections]);

  React.useEffect(() => {
    const activeTab = tabRefs.current[activeSectionId];
    activeTab?.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
  }, [activeSectionId]);

  return (
    <div
      ref={placeholderRef}
      className="-mx-1"
      style={{ height: "calc(var(--company-tabs-height, 56px) + 0.25rem)" }}
    >
      <div
        ref={floatingRef}
        className="fixed z-40"
        style={{
          top: "calc(var(--global-navbar-height, 84px) + 0.5rem)",
          left: floatingFrame.left,
          width: floatingFrame.width,
        }}
      >
        <div className="relative rounded-[1.4rem] border border-border/60 bg-background/78 px-2 py-2 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:px-3">
        <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex min-w-full items-center gap-2 whitespace-nowrap pr-2">
            {sections.map((section) => {
              const isActive = activeSectionId === section.id;
              const shortLabel = SHORT_LABELS[section.id] ?? section.label;

              return (
                <a
                  key={section.id}
                  ref={(element) => {
                    tabRefs.current[section.id] = element;
                  }}
                  href={`#${section.id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    isActive
                      ? "border-border/70 bg-foreground text-background shadow-sm"
                      : "border-transparent bg-background/35 text-muted-foreground hover:border-border/40 hover:bg-accent/65 hover:text-foreground",
                  )}
                >
                  <span>{shortLabel}</span>
                  {isActive && section.meta ? (
                    <span className="hidden lg:inline-flex">{renderMeta(section.meta)}</span>
                  ) : null}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[1.4rem] bg-gradient-to-r from-background/95 via-background/55 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[1.4rem] bg-gradient-to-l from-background/95 via-background/55 to-transparent" />
      </div>
      </div>
    </div>
  );
}
