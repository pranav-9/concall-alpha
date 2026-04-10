"use client";

import * as React from "react";
import type { CompanySidebarSectionItem } from "../constants";
import { TopSectionTabs } from "./top-section-tabs";

type CompanyPageNavigationContextValue = {
  navigateToSection: (sectionId: string) => void;
};

const CompanyPageNavigationContext =
  React.createContext<CompanyPageNavigationContextValue | null>(null);

export const useCompanyPageNavigation = () =>
  React.useContext(CompanyPageNavigationContext);

type CompanyPageWorkspaceProps = {
  sections: CompanySidebarSectionItem[];
  defaultSectionId?: string;
  children: React.ReactNode;
};

type PanelElement = React.ReactElement<{
  "data-section-id"?: string;
}>;

const getCssVariablePx = (name: string, fallback: number) => {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parsed = Number.parseFloat(value.replace("px", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function CompanyPageWorkspace({
  sections,
  defaultSectionId,
  children,
}: CompanyPageWorkspaceProps) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const validIds = React.useMemo(() => new Set(sections.map((section) => section.id)), [sections]);
  const fallbackSectionId =
    (defaultSectionId && validIds.has(defaultSectionId) ? defaultSectionId : null) ??
    sections[0]?.id ??
    "overview";

  const resolveSectionId = React.useCallback(
    (hash: string) => {
      const sectionId = hash.replace(/^#/, "").trim();
      return validIds.has(sectionId) ? sectionId : fallbackSectionId;
    },
    [fallbackSectionId, validIds],
  );

  const [activeSectionId, setActiveSectionId] = React.useState<string>(fallbackSectionId);

  React.useEffect(() => {
    setActiveSectionId(resolveSectionId(window.location.hash));
  }, [resolveSectionId]);

  React.useEffect(() => {
    const syncFromLocation = () => {
      setActiveSectionId(resolveSectionId(window.location.hash));
    };

    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);

    return () => {
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [resolveSectionId]);

  const scrollContentIntoView = React.useCallback(() => {
    const element = contentRef.current;
    if (!element) return;

    const stickyOffset =
      getCssVariablePx("--global-navbar-height", 84) +
      getCssVariablePx("--company-tabs-height", 56) +
      16;
    const top = element.getBoundingClientRect().top + window.scrollY - stickyOffset;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: "auto",
    });
  }, []);

  const handleSectionChange = React.useCallback(
    (sectionId: string) => {
      if (!validIds.has(sectionId)) return;

      if (window.location.hash !== `#${sectionId}`) {
        window.history.pushState(null, "", `#${sectionId}`);
      }

      setActiveSectionId(sectionId);
      window.requestAnimationFrame(() => {
        scrollContentIntoView();
      });
    },
    [scrollContentIntoView, validIds],
  );

  const panels = React.Children.toArray(children).filter(React.isValidElement) as PanelElement[];
  const activePanel =
    panels.find((panel) => panel.props["data-section-id"] === activeSectionId) ??
    panels.find((panel) => panel.props["data-section-id"] === fallbackSectionId) ??
    null;

  return (
    <CompanyPageNavigationContext.Provider value={{ navigateToSection: handleSectionChange }}>
      <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
        <TopSectionTabs
          sections={sections}
          activeSectionId={activeSectionId}
          onSectionChange={handleSectionChange}
        />
        <div ref={contentRef}>{activePanel}</div>
      </div>
    </CompanyPageNavigationContext.Provider>
  );
}
