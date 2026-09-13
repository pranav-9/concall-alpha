import type { Metadata } from "next";

import { getExchangeDeskData } from "@/lib/exchange-desk";
import DeskExchangeUpdates from "@/app/desk/desk-exchange-updates";
import { BelowSm, FromSm } from "@/components/viewport-gate";
import { LiveDot, MOBILE_DEK, MobileMasthead } from "@/components/mobile-card";

export const metadata: Metadata = {
  title: "Company announcements — every material filing, read into plain English",
  description:
    "The full exchange tape: material BSE filings across India's covered mid- & small-caps — order wins, capex, deals, fundraises, approvals — read into plain English, plus material filings from names just below the coverage cut.",
  alternates: { canonical: "/announcements" },
};

export default async function AnnouncementsPage() {
  const data = await getExchangeDeskData();
  const isEmpty = data.total === 0 && data.belowCut.length === 0;

  return (
    <main className="house relative min-h-screen">
      {/* Phone (handoff 2026-09-13, "Filings — mobile"): compact masthead, then
          the feed paints its own phone card. From sm the page keeps its
          editorial header + padded shell. */}
      <div className="mx-auto w-full max-w-6xl pb-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <BelowSm>
          <MobileMasthead
            eyebrow={
              <>
                <LiveDot />
                <span className="whitespace-nowrap">Exchange desk · last {data.windowDays} days</span>
              </>
            }
            title="Company announcements"
            titleSize="md"
          >
            <p className={MOBILE_DEK}>
              Every material BSE filing across the covered universe, read into plain English —
              order wins, capex, deals, fundraises, approvals. The procedural noise is left out.
            </p>
          </MobileMasthead>
        </BelowSm>
        <FromSm>
          <header className="border-b border-[var(--rule)] pb-6">
            <p className="house-data house-micro flex flex-wrap items-center gap-x-2 text-[var(--ink-soft)]">
              <span aria-hidden className="text-[var(--signal)]">
                ●
              </span>
              <span>Exchange desk</span>
              <span aria-hidden>·</span>
              <span>last {data.windowDays} days</span>
            </p>
            <h1 className="house-display mt-3 max-w-2xl text-3xl leading-[1.05] sm:text-4xl">
              Company announcements
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[var(--ink-soft)]">
              Every material BSE filing across the covered universe, read into plain English —
              order wins, capex, deals, fundraises, approvals. The procedural noise is left out.
              Below the covered feed sit material filings from names just outside the ranked
              hundred.
            </p>
          </header>
        </FromSm>

        <div className="sm:mt-10">
          {isEmpty ? (
            <p className="house-data house-micro px-4 pt-4 text-[var(--ink-soft)] sm:px-0 sm:pt-0">
              No material filings in the last {data.windowDays} days.
            </p>
          ) : (
            <DeskExchangeUpdates data={data} variant="full" />
          )}
        </div>
      </div>
    </main>
  );
}
