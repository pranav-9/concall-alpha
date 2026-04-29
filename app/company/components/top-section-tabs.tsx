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
  "sub-sector": "Sub-sectors",
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
      <span className="inline-flex items-center rounded-full border border-border/60 bg-background/85 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
        —
      </span>
    );
  }

  if (meta.kind === "count") {
    return (
      <span className="inline-flex items-center rounded-full border border-border/60 bg-background/85 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
        {meta.count}
        {meta.suffix ? ` ${meta.suffix}` : ""}
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-[7rem] items-center truncate rounded-full border border-border/60 bg-background/85 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
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
        <div className="relative rounded-[1.5rem] border border-border/70 bg-background/88 px-2 py-2 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.42)] backdrop-blur-xl dark:bg-slate-950/82 sm:px-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[1.5rem] bg-gradient-to-r from-background/96 via-background/60 to-transparent dark:from-slate-950/96 dark:via-slate-950/50" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[1.5rem] bg-gradient-to-l from-background/96 via-background/60 to-transparent dark:from-slate-950/96 dark:via-slate-950/50" />

          <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav className="flex min-w-full items-center gap-2 whitespace-nowrap pr-2" aria-label="Company sections">
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
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => onSectionChange(section.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-medium tracking-[0.01em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      isActive
                        ? "border-border/60 bg-foreground text-background shadow-[0_12px_28px_-18px_rgba(15,23,42,0.55)] dark:bg-white dark:text-slate-950"
                        : "border-transparent bg-transparent text-muted-foreground hover:border-border/60 hover:bg-background/70 hover:text-foreground",
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
        </div>
      </div>
    </div>
  );
}
