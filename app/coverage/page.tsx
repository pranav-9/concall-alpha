import type { Metadata } from "next";

import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";
import { formatRemovedOn, REMOVED_COMPANIES } from "@/lib/removed-from-coverage";
import {
  INNER_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_SKY,
} from "@/lib/design/shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Coverage Universe – Story of a Stock",
  description:
    "What Story of a Stock covers and why: a deliberately small universe of mid- and small-cap Indian companies, researched from their source documents.",
  alternates: { canonical: "/coverage" },
};

const PAGE_BACKGROUND_CLASS = `h-[30rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

const rules = [
  {
    title: "Mid and small caps only",
    body: "New companies join coverage only if they are mid or small cap under AMFI's semi-annual classification — large cap is the top 100 companies by average market capitalization, mid cap is 101–250, small cap is 251 and beyond.",
  },
  {
    title: "No banks or NBFCs",
    body: "Lenders aren't covered, whatever their size.",
  },
  {
    title: "Graduates stay",
    body: "A covered company that grows into the top 100 is not removed. Finding a business early and following it as it compounds is the point — graduation is the best outcome coverage can have.",
  },
  {
    title: "Bands refresh with AMFI",
    body: "Market-cap bands update after each AMFI publication (January–June and July–December), so classifications track the market rather than a stale snapshot.",
  },
];

const removedCount = (date: string) =>
  REMOVED_COMPANIES.filter((row) => row.removedOn === date).length;

export default async function CoveragePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company")
    .select(`code, market_cap_band, ${COVERAGE_SELECT}`);

  const companies = data ?? [];
  const covered = companies.filter((row) =>
    isDiscoveryListed(row as { market_cap_band_at_admission?: string | null }),
  );
  const bandCount = (band: string) =>
    covered.filter(
      (row) => (row as { market_cap_band?: string | null }).market_cap_band === band,
    ).length;
  const stats = [
    { label: "Companies covered", value: covered.length },
    { label: "Small cap", value: bandCount("small") },
    { label: "Mid cap", value: bandCount("mid") },
  ];

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL}>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
            Coverage universe
          </p>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
            What we cover, and why
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Story of a Stock covers a deliberately small universe of{" "}
            <span className="text-foreground">mid- and small-cap Indian companies</span>,
            researched from their own source documents — earnings-call transcripts,
            investor presentations, and annual reports.
          </p>
        </div>

        <section className={PANEL_CARD_SKY}>
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className={`${INNER_CARD} p-4`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-[1.75rem] font-black leading-none text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={PANEL_CARD_SKY}>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Why mid and small caps
            </p>
            <h2 className="text-xl font-bold text-foreground">
              We read where nobody else is reading
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              The top-100 companies are followed by dozens of analysts; another research
              layer there adds little. Below the top 100, analyst coverage thins out fast —
              for many mid and small caps, the quarterly concall is the only qualitative
              record of how the business is actually going, and almost nobody reads it
              systematically. That is exactly the work this platform does: every covered
              company&apos;s source documents, read and tracked quarter after quarter.
            </p>
          </div>
        </section>

        <section className={PANEL_CARD_SKY}>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Coverage rules
              </p>
              <h2 className="text-xl font-bold text-foreground">How the universe is kept</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {rules.map((rule) => (
                <div key={rule.title} className={`${INNER_CARD} p-4`}>
                  <h3 className="text-sm font-semibold text-foreground">{rule.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {rule.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={PANEL_CARD_SKY}>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Companies that left coverage
            </p>
            <h2 className="text-xl font-bold text-foreground">
              Removed, and we say so
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              The large caps and lenders covered before this policy took shape were removed on{" "}
              {formatRemovedOn("2026-11-06")} ({removedCount("2026-11-06")} companies), and{" "}
              {removedCount("2026-11-10")} more left on {formatRemovedOn("2026-11-10")}. Search
              for one, or open its old link, and we tell you when it left and why.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
