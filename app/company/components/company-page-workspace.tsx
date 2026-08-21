"use client";

import * as React from "react";
import { resolveSectionId as resolveSectionHash } from "@/lib/section-hash";
import type { CompanySidebarSectionItem } from "../constants";
import { TopSectionTabs } from "./top-section-tabs";
import { analytics } from "@/lib/analytics";

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
  companyCode?: string;
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
  companyCode,
  children,
}: CompanyPageWorkspaceProps) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const validIds = React.useMemo(() => new Set(sections.map((section) => section.id)), [sections]);
  const fallbackSectionId =
    (defaultSectionId && validIds.has(defaultSectionId) ? defaultSectionId : null) ??
    sections[0]?.id ??
    "overview";

  const resolveSectionId = React.useCallback(
    (hash: string) => resolveSectionHash(hash, validIds, fallbackSectionId),
    [fallbackSectionId, validIds],
  );

  const [activeSectionId, setActiveSectionId] = React.useState<string>(fallbackSectionId);

  // One company_page_view per page load; company_code is the join key to our data.
  React.useEffect(() => {
    if (companyCode) analytics.companyPageView(companyCode);
  }, [companyCode]);

  // section_view + section_dwell. section_view fires whenever a different section
  // becomes active (initial + every tab navigation) — the real depth signal,
  // since the workspace shows one panel at a time. section_dwell fires for the
  // section being left, carrying how long it was open (turns navigation into
  // engagement). The final section's dwell is flushed on unmount below.
  const dwellRef = React.useRef<{ id: string; t: number } | null>(null);
  React.useEffect(() => {
    const prev = dwellRef.current;
    if (prev && prev.id !== activeSectionId) {
      analytics.sectionDwell(prev.id, performance.now() - prev.t, companyCode);
    }
    analytics.sectionView(activeSectionId, companyCode);
    dwellRef.current = { id: activeSectionId, t: performance.now() };
  }, [activeSectionId, companyCode]);

  React.useEffect(() => {
    return () => {
      const prev = dwellRef.current;
      if (prev) analytics.sectionDwell(prev.id, performance.now() - prev.t, companyCode);
    };
  }, [companyCode]);

  // Delegated click listener for evidence drawers and source links inside the
  // active panel. Several section components are server components, so their
  // Drawer triggers / source anchors can't call analytics inline — instead they
  // carry `data-drawer-type` / `data-source-type` attributes and this listener,
  // on the already-client workspace, fires with the active section + company code.
  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const drawer = target?.closest<HTMLElement>("[data-drawer-type]");
      if (drawer) {
        analytics.drawerOpen(
          activeSectionId,
          drawer.dataset.drawerType ?? "unknown",
          companyCode,
        );
        return;
      }
      const source = target?.closest<HTMLElement>("[data-source-type]");
      if (source && companyCode) {
        analytics.sourceLinkClick(activeSectionId, companyCode, source.dataset.sourceType);
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [activeSectionId, companyCode]);

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
        <div ref={contentRef} className="min-w-0">
          {activePanel}
        </div>
      </div>
    </CompanyPageNavigationContext.Provider>
  );
}
