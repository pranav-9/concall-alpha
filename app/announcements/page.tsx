import type { Metadata } from "next";

import { getExchangeDeskData } from "@/lib/exchange-desk";
import { getRecentStoryReads } from "@/lib/announcement-story-read";
import { selectTopStoryReads } from "@/lib/announcement-story-read/select";
import DeskExchangeUpdates from "@/app/desk/desk-exchange-updates";
import { TopOfWeek } from "./top-of-week";
import { BelowSm, FromSm } from "@/components/viewport-gate";
import { MobileMasthead } from "@/components/mobile-card";

export const metadata: Metadata = {
  title: "Company announcements — every material filing, read into plain English",
  description:
    "The full exchange tape: material BSE filings across India's covered mid- & small-caps — order wins, capex, deals, fundraises, approvals — read into plain English, plus material filings from names just below the coverage cut.",
  alternates: { canonical: "/announcements" },
};

export default async function AnnouncementsPage() {
  const now = new Date();
  const [data, storyReads] = await Promise.all([getExchangeDeskData(), getRecentStoryReads(now)]);
  const isEmpty = data.total === 0 && data.belowCut.length === 0;
  // "Top 5 this week": the last seven days of story reads, joined to the tape
  // rows above and ranked here, at load time. Empty (strip absent) until the
  // reads table exists and at least three filings qualify.
  const picks = selectTopStoryReads(storyReads, data.updates, data.belowCut, now);

  return (
    <main className="house relative min-h-screen">
      {/* Phone (handoff 2026-09-13, "Filings — mobile"): compact masthead, then
          the feed paints its own phone card. From sm the page keeps its
          editorial header + padded shell. The header is the title alone
          (2026-10-04): no eyebrow, no dek — the strip under it is the opening. */}
      <div className="mx-auto w-full max-w-6xl pb-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <BelowSm>
          <MobileMasthead title="Company announcements" titleSize="md" />
        </BelowSm>
        <FromSm>
          <header className="border-b border-[var(--rule)] pb-6">
            <h1 className="house-display max-w-2xl text-3xl leading-[1.05] sm:text-4xl">
              Company announcements
            </h1>
          </header>
        </FromSm>

        <TopOfWeek picks={picks} />

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
