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
  activeSectionId: string;
  onSectionChange: (sectionId: string) => void;
};

const SHORT_LABELS: Record<string, string> = {
  overview: "Overview",
  "industry-context": "Industry",
  "sub-sector": "Sub-sector Analysis",
  "business-overview": "Business",
  "sentiment-score": "Quarterly",
  "key-variables": "Variables",
  "future-growth": "Growth",
  "guidance-history": "Guidance",
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

export function TopSectionTabs({
  sections,
  activeSectionId,
  onSectionChange,
}: TopSectionTabsProps) {
  const placeholderRef = React.useRef<HTMLDivElement | null>(null);
  const floatingRef = React.useRef<HTMLDivElement | null>(null);
  const [floatingFrame, setFloatingFrame] = React.useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  React.useEffect(() => {
    const placeholderElement = placeholderRef.current;
    const floatingElement = floatingRef.current;
    const navElement = document.getElementById("global-navbar");
    if (!placeholderElement || !floatingElement) return;

    const syncLayout = () => {
      const rect = placeholderElement.getBoundingClientRect();
      const tabsHeight = floatingElement.offsetHeight;

      document.documentElement.style.setProperty("--company-tabs-height", `${tabsHeight}px`);
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
        <div className="relative rounded-[1.4rem] border border-border/70 bg-background/88 px-2 py-2 shadow-[0_18px_45px_-36px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:bg-slate-950/84 sm:px-3">
          <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav className="flex min-w-full items-center gap-2 whitespace-nowrap pr-2">
              {sections.map((section) => {
                const isActive = activeSectionId === section.id;
                const shortLabel = SHORT_LABELS[section.id] ?? section.label;

                return (
                  <button
                    key={section.id}
                    ref={(element) => {
                      tabRefs.current[section.id] = element;
                    }}
                    type="button"
                  aria-pressed={isActive}
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium tracking-[0.01em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    isActive
                      ? "border-white/70 bg-white text-slate-950 shadow-[0_10px_28px_-16px_rgba(255,255,255,0.75)] dark:border-white/20 dark:bg-white dark:text-slate-950"
                      : "border-transparent bg-background/30 text-zinc-500 hover:border-white/10 hover:bg-white/[0.08] hover:text-zinc-100 dark:text-zinc-300 dark:hover:border-white/10 dark:hover:bg-white/10 dark:hover:text-white",
                  )}
                >
                  <span>{shortLabel}</span>
                    {isActive && section.meta ? (
                      <span className="hidden lg:inline-flex">{renderMeta(section.meta)}</span>
                    ) : null}
                  </button>
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
