import { getIsAuthenticated } from "@/lib/supabase/auth-state";
import {
  buildGateNext,
  gatedSectionCopy,
  isGatedSection,
  isSignupGateEnabled,
  shouldGateSection,
} from "@/lib/signup-gate";

import { SectionDepthGate } from "./section-depth-gate";

/**
 * Server half of the sign-up gate. Sits inside a panel's Suspense boundary, so
 * the auth check never holds the page shell. Signed-in readers (and everyone,
 * while `SIGNUP_GATE` is off) get the children untouched — no wrapper, no
 * client code, no flash.
 */
export async function GatedPanel({
  sectionId,
  companyCode,
  children,
}: {
  sectionId: string;
  companyCode: string;
  children: React.ReactNode;
}) {
  const enabled = isSignupGateEnabled();
  if (!enabled || !isGatedSection(sectionId)) return <>{children}</>;

  const isAuthenticated = await getIsAuthenticated();
  if (!shouldGateSection({ enabled, isAuthenticated, sectionId })) return <>{children}</>;

  const copy = gatedSectionCopy(sectionId);
  return (
    <SectionDepthGate
      companyCode={companyCode}
      sectionId={sectionId}
      below={copy.below}
      nextPath={buildGateNext(companyCode, sectionId)}
    >
      {children}
    </SectionDepthGate>
  );
}
