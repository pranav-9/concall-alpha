"use client";

import * as React from "react";
import { resolveSectionId as resolveSectionHash } from "@/lib/section-hash";
import type { CompanySidebarSectionItem } from "../constants";
import { TopSectionTabs } from "./top-section-tabs";
import {
  ensureSectionChunk,
  hasLazyChunk,
  preloadDeferredCompanySections,
} from "./deferred-company-sections";
import {
  DEFAULT_SWAP_HOLD_MS,
  createSwapController,
} from "@/lib/lazy-sections";
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
  // Keyed on the joined ids, not the array: `sections` is a fresh array on
  // every server render (router.refresh), and a new Set identity would re-run
  // the hash-resolve effects below and re-arm a hold for nothing.
  const sectionIdsKey = sections.map((section) => section.id).join("\u0000");
  const validIds = React.useMemo(() => new Set(sectionIdsKey.split("\u0000")), [sectionIdsKey]);
  const fallbackSectionId =
    (defaultSectionId && validIds.has(defaultSectionId) ? defaultSectionId : null) ??
    sections[0]?.id ??
    "overview";

  const resolveSectionId = React.useCallback(
    (hash: string) => resolveSectionHash(hash, validIds, fallbackSectionId),
    [fallbackSectionId, validIds],
  );

  // Two ids on purpose. `selectedSectionId` is what the tab bar highlights and
  // moves the instant a tab is tapped. `activeSectionId` is the panel actually
  // rendered; it follows once the section's lazy chunk is ready (or the hold
  // times out). Swapping the panel before the chunk arrives meant a placeholder
  // that changed height when the real section landed — the 0.5+ mobile CLS on
  // every Quarterly / Guidance tap (2026-09-05). Holding the old panel on
  // screen for a bounded wait instead means the swap lands once, complete.
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>(fallbackSectionId);
  const [activeSectionId, setActiveSectionId] = React.useState<string>(fallbackSectionId);
  const [, startTransition] = React.useTransition();
  // The hold itself (token ordering, bounded wait, dispose on unmount) is pure
  // logic in lib/lazy-sections.ts so it is unit-tested; this component only
  // wires it to state. Past DEFAULT_SWAP_HOLD_MS the viewport-tall placeholder
  // takes over (still shift-free for anything below the fold).
  const swapController = React.useMemo(
    () =>
      createSwapController({
        shouldHold: hasLazyChunk,
        ensure: ensureSectionChunk,
        holdMs: DEFAULT_SWAP_HOLD_MS,
        onRelease: (sectionId) => {
          // Non-urgent: swapping a large section tree as an urgent update
          // blocked the tap for ~800ms on data-rich tickers (INP). The tab
          // highlight is already synchronous, so the tap feels instant.
          startTransition(() => {
            setActiveSectionId(sectionId);
          });
        },
      }),
    [startTransition],
  );
  React.useEffect(() => () => swapController.dispose(), [swapController]);

  const commitSection = React.useCallback(
    (sectionId: string) => {
      setSelectedSectionId(sectionId);
      void swapController.commit(sectionId);
    },
    [swapController],
  );

  // One company_page_view per page load; company_code is the join key to our data.
  React.useEffect(() => {
    if (companyCode) analytics.companyPageView(companyCode);
  }, [companyCode]);

  // Warm the client-only section chunks (Quarterly, Guidance, business
  // momentum) once the page is idle, so the first tap on those tabs mounts the
  // real section instead of sitting on a placeholder while the chunk downloads.
  React.useEffect(() => {
    const preload = preloadDeferredCompanySections();
    return () => preload.cancel();
  }, []);

  // section_view + section_dwell. section_view fires whenever a different section
  // becomes active (initial + every tab navigation) — the real depth signal,
  // since the workspace shows one panel at a time. section_dwell fires for the
  // section being left, carrying how long it was open (turns navigation into
  // engagement). The final section's dwell is flushed on unmount below.
  // path is snapshotted at dwell START — dwell fires on leave, by which point the
  // URL may have changed, so pinning the start path keeps the event attributed
  // to the page it happened on (see analytics.sectionDwell).
  const dwellRef = React.useRef<{ id: string; t: number; path: string } | null>(null);

  const flushDwell = React.useCallback(() => {
    const prev = dwellRef.current;
    if (!prev) return;
    analytics.sectionDwell(prev.id, performance.now() - prev.t, companyCode, prev.path);
    // Reset the clock so a later flush (unmount, or a second tab-hide) measures
    // only the new interval instead of re-counting time already recorded.
    dwellRef.current = { ...prev, t: performance.now() };
  }, [companyCode]);

  // Keyed on the SELECTED section (the tap), not the rendered panel: the panel
  // can lag the tap by up to DEFAULT_SWAP_HOLD_MS, and a tap abandoned inside
  // that window would otherwise never emit its section_view.
  React.useEffect(() => {
    const prev = dwellRef.current;
    if (prev && prev.id !== selectedSectionId) flushDwell();
    analytics.sectionView(selectedSectionId, companyCode);
    dwellRef.current = {
      id: selectedSectionId,
      t: performance.now(),
      // pathname + search so $current_url keeps the query string (UTM/deep-link).
      path: window.location.pathname + window.location.search,
    };
  }, [selectedSectionId, companyCode, flushDwell]);

  // Final flush on unmount, plus a flush when the tab is hidden — otherwise a
  // dwell is silently lost whenever someone closes the tab mid-section (unmount
  // cleanup is unreliable on tab-close; visibilitychange→hidden is the last
  // reliable moment). On the way BACK to visible, restart the clock so the time
  // the tab spent hidden is NOT counted as reading time.
  React.useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushDwell();
      } else if (dwellRef.current) {
        dwellRef.current.t = performance.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flushDwell();
    };
  }, [flushDwell]);

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
    commitSection(resolveSectionId(window.location.hash));
  }, [commitSection, resolveSectionId]);

  React.useEffect(() => {
    const syncFromLocation = () => {
      commitSection(resolveSectionId(window.location.hash));
    };

    window.addEventListener("hashchange", syncFromLocation);
    window.addEventListener("popstate", syncFromLocation);

    return () => {
      window.removeEventListener("hashchange", syncFromLocation);
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [commitSection, resolveSectionId]);

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

      // URL + tab highlight + scroll are synchronous so navigation feels
      // instant; the panel itself lands via commitSection once its chunk is in.
      commitSection(sectionId);
      window.requestAnimationFrame(() => {
        scrollContentIntoView();
      });
    },
    [commitSection, scrollContentIntoView, validIds],
  );

  const pendingSectionId = selectedSectionId !== activeSectionId ? selectedSectionId : null;
  const pendingLabel = pendingSectionId
    ? sections.find((section) => section.id === pendingSectionId)?.label ?? null
    : null;

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
          activeSectionId={selectedSectionId}
          pendingSectionId={pendingSectionId}
          onSectionChange={handleSectionChange}
        />
        {/* aria-busy on a button is not voiced; this is what a screen reader
            hears during the hold. Empty (silent) once the panel is in. */}
        <span role="status" aria-live="polite" className="sr-only">
          {pendingLabel ? `Loading ${pendingLabel}…` : ""}
        </span>
        <div ref={contentRef} className="min-w-0">
          {activePanel}
        </div>
      </div>
    </CompanyPageNavigationContext.Provider>
  );
}
