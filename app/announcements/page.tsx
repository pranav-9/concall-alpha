import type { Metadata } from "next";

import { getExchangeDeskData } from "@/lib/exchange-desk";
import DeskExchangeUpdates from "@/app/desk/desk-exchange-updates";

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
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
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
            Every material BSE filing across the covered universe, read into plain English — order
            wins, capex, deals, fundraises, approvals. The procedural noise is left out. Below the
            covered feed sit material filings from names just outside the ranked hundred.
          </p>
        </header>

        <div className="mt-10">
          {isEmpty ? (
            <p className="house-data house-micro text-[var(--ink-soft)]">
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
