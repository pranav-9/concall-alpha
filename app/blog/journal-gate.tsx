"use client";

import * as React from "react";

import { SectionDepthGate } from "@/app/company/components/section-depth-gate";
import { buildJournalGateNext, JOURNAL_GATE_SECTION } from "@/lib/signup-gate";
import { createClient } from "@/lib/supabase/client";

/**
 * The sign-up gate on a Journal post (rendered only while `SIGNUP_GATE` is on).
 * Posts are statically built, so who is reading is asked here, on the client:
 * the session is read from the auth cookie (no network unless a token needs
 * refreshing). Until the answer lands the post renders open; a logged-out
 * reader is then clipped at the `<GateCut />` marker before the next paint.
 * Any failure reads as anonymous, as on the company page.
 */
export function JournalGate({
  slug,
  companyCode,
  below,
  children,
}: {
  slug: string;
  companyCode?: string;
  below: readonly string[];
  children: React.ReactNode;
}) {
  const [anonymous, setAnonymous] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => live && setAnonymous(!data.session))
      .catch(() => live && setAnonymous(true));
    return () => {
      live = false;
    };
  }, []);

  return (
    <SectionDepthGate
      active={anonymous}
      scope="post"
      companyCode={companyCode}
      sectionId={JOURNAL_GATE_SECTION}
      postSlug={slug}
      below={below}
      nextPath={buildJournalGateNext(slug)}
    >
      {children}
    </SectionDepthGate>
  );
}
