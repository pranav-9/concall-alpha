"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useCompanyPageNavigation } from "./company-page-workspace";

/**
 * In-page drill-down to a company section. Inside the CompanyPageWorkspace it
 * switches the active panel (and pushes `#id`); outside it falls back to a
 * plain hash scroll. Rendered as a button so the whole card can be the target
 * without nesting anchors.
 */
export function SectionLink({
  sectionId,
  className,
  children,
}: {
  sectionId: string;
  className?: string;
  children: ReactNode;
}) {
  const navigation = useCompanyPageNavigation();
  const go = () => {
    if (navigation) {
      navigation.navigateToSection(sectionId);
      return;
    }
    if (typeof window === "undefined") return;
    window.location.hash = `#${sectionId}`;
  };
  return (
    <button
      type="button"
      onClick={go}
      className={cn(
        "text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className,
      )}
    >
      {children}
    </button>
  );
}
