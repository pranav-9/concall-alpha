"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompanySearch } from "@/components/company-search";
import { CoverageRequestButton } from "@/components/coverage-request-button";
import { stripExchangeDecoration } from "@/lib/company-search-match";
import { HERO_CARD, PAGE_BACKGROUND_ATMOSPHERIC, PAGE_SHELL } from "@/lib/design/shell";
import {
  findRemovedCompany,
  formatRemovedOn,
  removedReasonLine,
} from "@/lib/removed-from-coverage";

const LINK_CLASS =
  "font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300";

function codeFromPath(pathname: string): string {
  const segment = pathname.split("/")[2] ?? "";
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // malformed escape — show the raw segment
  }
  return stripExchangeDecoration(decoded).toUpperCase();
}

/**
 * `/company/<CODE>` for a company we don't have — never covered, or removed.
 * Client component because a not-found boundary gets no params; the code comes
 * off the path. Next adds noindex; the status stays 200 (the route streams).
 */
export default function CompanyNotFound() {
  const code = codeFromPath(usePathname() ?? "");
  const removed = findRemovedCompany(code);

  return (
    <main className="relative isolate overflow-hidden">
      <div className={`h-[24rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`} />
      <div className={PAGE_SHELL}>
        <section className={HERO_CARD}>
          <div className="max-w-2xl space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Not in coverage
            </p>
            {removed ? (
              <>
                <h1 className="text-2xl font-black tracking-[-0.03em] text-foreground sm:text-3xl">
                  We no longer cover {removed.name}
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {removed.name} ({removed.code}) left coverage on{" "}
                  {formatRemovedOn(removed.removedOn)}. {removedReasonLine(removed.reason)}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-black tracking-[-0.03em] text-foreground sm:text-3xl">
                  {code ? <>We don&apos;t cover {code} yet</> : <>We don&apos;t cover this company yet</>}
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Ask for it and we&apos;ll weigh it for the next coverage slot.
                </p>
                {code && <CoverageRequestButton subject={code} surface="company_not_found" />}
              </>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground">
              We cover about 100 handpicked mid and small caps, researched from their own
              filings: no large caps, banks or NBFCs.{" "}
              <Link href="/coverage" className={LINK_CLASS}>
                How we choose
              </Link>
            </p>

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Find a covered company
              </p>
              <CompanySearch instanceId="not-found-company-search" className="max-w-md" />
              <p className="text-xs text-muted-foreground">
                Or browse the{" "}
                <Link href="/leaderboards" className={LINK_CLASS}>
                  leaderboards
                </Link>{" "}
                and{" "}
                <Link href="/sectors" className={LINK_CLASS}>
                  sectors
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
