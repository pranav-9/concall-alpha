import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getConcallData } from "@/app/company/get-concall-data";
import { buildWatchlistBoard, type CompanyNameRow, type GrowthRankRow } from "./build-board";
import { WatchlistManageMenu } from "./watchlist-manage-menu";
import { WatchlistTabs } from "./watchlist-tabs";
import {
  ReadDistributionCurve,
  ReadDistributionHeadline,
  ReadDistributionLegend,
} from "@/components/read-distribution-curve";
import { ScoreBoardTable } from "@/components/score-board-table";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { COVERAGE_SELECT } from "@/lib/coverage-policy";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SHELL } from "@/lib/design/shell";

type WatchlistItemRow = {
  company_code?: string | null;
};

type WatchlistDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: WatchlistDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Watchlist ${id} – Story of a Stock`,
    description: "Track the companies in this watchlist.",
  };
}

// House skin (2026-09-29 redesign): the watchlist is the reader's own desk,
// so it takes the house paper, ink and rule the Desk and the leaderboard's
// Overall frame already use — one masthead (count · latest quarter over the
// list's name), the board in a house frame, nothing atmospheric.
const PANEL_CLASS = "rounded-[1.45rem] border p-4";
const PANEL_STYLE = { borderColor: "var(--rule)", background: "var(--paper-2)" } as const;

function WatchlistShell({
  tabs,
  title,
  description,
  eyebrow,
  aside,
  actions,
  children,
}: {
  tabs?: ReactNode;
  title: string;
  description?: string;
  /** The line over the title: "8 companies · latest quarter Q1 FY27". */
  eyebrow?: ReactNode;
  /** Right of the title, on the baseline: what the board is ranked by. */
  aside?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="house relative min-h-screen">
      {tabs}
      <div className={`${PAGE_SHELL} gap-4 pt-6 sm:pt-8`}>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            {eyebrow ? (
              <p className="house-data text-[12px]" style={{ color: "var(--ink-soft)" }}>
                {eyebrow}
              </p>
            ) : null}
            <div className="flex items-center gap-3">
              <h1 className="house-display text-3xl sm:text-[2.6rem]">{title}</h1>
              {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
            {description ? (
              <p className="max-w-3xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                {description}
              </p>
            ) : null}
          </div>
          {aside ? (
            <p className="shrink-0 text-[12px] sm:pb-1.5" style={{ color: "var(--ink-soft)" }}>
              {aside}
            </p>
          ) : null}
        </header>

        {children}
      </div>
    </main>
  );
}

export default async function WatchlistDetailPage({ params }: WatchlistDetailPageProps) {
  const { id: rawId } = await params;
  const watchlistId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(watchlistId) || watchlistId <= 0) notFound();

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId =
    !claimsError && typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  if (!userId) {
    redirect(`/auth/login?next=/watchlists/${watchlistId}`);
  }

  // One parallel batch instead of a query waterfall: this page previously ran
  // watchlists -> items -> (universe fetches) as three sequential Supabase
  // round trips, which is what made the nav click feel dead. The items query
  // can key on the URL id before ownership is verified because nothing renders
  // until the ownership check below passes (a foreign id hits notFound first),
  // and the universe fetches aren't user-scoped at all.
  const [
    { data: allWatchlistRows, error: watchlistError },
    { data: watchlistItemsData, error: watchlistItemsError },
    { rows, latestLabel },
    { data: companyNameRows },
    { data: growthRows },
  ] = await Promise.all([
    supabase
      .from("watchlists")
      .select("id, name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("watchlist_items")
      .select("company_code")
      .eq("watchlist_id", watchlistId)
      .order("created_at", { ascending: true }),
    // getConcallData() with no options on purpose: the coverage gates are a
    // discovery-surface policy, and a watchlist is user-owned. A holding that's a
    // large cap or below the composite cut still renders in full, ungreyed.
    getConcallData(),
    // Coverage columns ride along on a select this page already makes: the
    // board itself is unfiltered (user-owned), but the distribution behind it
    // needs to know which companies form the covered reference population.
    supabase.from("company").select(`code, name, ${COVERAGE_SELECT}`),
    supabase
      .from("growth_outlook")
      .select("company, growth_score, run_timestamp")
      .order("run_timestamp", { ascending: false }),
  ]);

  if (watchlistError) {
    return (
      <WatchlistShell title="Watchlist" description="Unable to load this watchlist right now.">
        <div className={PANEL_CLASS} style={PANEL_STYLE}>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Please refresh the page or try again in a moment.
          </p>
        </div>
      </WatchlistShell>
    );
  }

  const allWatchlists = (allWatchlistRows ?? []) as Array<{
    id: number;
    name: string;
    created_at?: string | null;
  }>;
  const watchlist = allWatchlists.find((row) => row.id === watchlistId);

  if (!watchlist) notFound();

  const tabsNode = <WatchlistTabs watchlists={allWatchlists} activeId={watchlist.id} />;

  if (watchlistItemsError) {
    return (
      <WatchlistShell
        tabs={tabsNode}
        title={watchlist.name}
        description="Unable to load your watchlist companies right now."
        actions={<WatchlistManageMenu watchlistId={watchlist.id} currentName={watchlist.name} />}
      >
        <div className={PANEL_CLASS} style={PANEL_STYLE}>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Please refresh the page or try again in a moment.
          </p>
        </div>
      </WatchlistShell>
    );
  }

  const watchlistCodes = ((watchlistItemsData ?? []) as WatchlistItemRow[])
    .map((row) => (row.company_code ?? "").trim().toUpperCase())
    .filter(Boolean);

  if (watchlistCodes.length === 0) {
    return (
      <WatchlistShell
        tabs={tabsNode}
        title={watchlist.name}
        eyebrow="0 companies"
        description="No companies added yet. Add a company from its detail page."
        actions={<WatchlistManageMenu watchlistId={watchlist.id} currentName={watchlist.name} />}
      >
        <div className={`${PANEL_CLASS} space-y-3`} style={PANEL_STYLE}>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Open a company detail page and use the watchlist button to start populating this list.
          </p>
          <Link
            href="/leaderboards"
            prefetch={false}
            className="house-link inline-flex items-center text-xs font-medium"
          >
            Browse the leaderboards
          </Link>
        </div>
      </WatchlistShell>
    );
  }

  const { tableRows, overallRankByCode, readDistribution } = await buildWatchlistBoard({
    watchlistCodes,
    rows,
    latestLabel: latestLabel ?? null,
    companyNameRows: (companyNameRows ?? []) as CompanyNameRow[],
    growthRows: (growthRows ?? []) as GrowthRankRow[],
  });
  const latestQuarterLabel = latestLabel ?? null;

  const companyCount = `${tableRows.length} ${tableRows.length === 1 ? "company" : "companies"}`;

  return (
    <WatchlistShell
      tabs={tabsNode}
      title={watchlist.name}
      eyebrow={
        latestQuarterLabel ? `${companyCount} · latest quarter ${latestQuarterLabel}` : companyCount
      }
      // Same caption as the leaderboard's Overall board: the SOAS column shows
      // the very number the # column ranks on, so this line only has to say
      // which way the weighting leans.
      aside="Ranked by SOAS score · quality weighted 2:1 over price"
      actions={<WatchlistManageMenu watchlistId={watchlist.id} currentName={watchlist.name} />}
    >
      <div className="space-y-3">
        <AnalyticsBeacon event="watchlist_view" count={tableRows.length} />
        {/* The board in the house frame the leaderboard's Overall board uses. The
            "signals" layout leads with the SOAS score and adds the four
            categorical columns — see components/score-board-table.tsx. */}
        <div
          className="overflow-hidden rounded-[1.45rem] border shadow-[0_18px_38px_-32px_rgba(15,23,42,0.24)]"
          style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}
        >
          <ScoreBoardTable
            rows={tableRows}
            watchlistId={watchlist.id}
            overallRankByCode={overallRankByCode}
            layout="signals"
          />
        </div>
        {/* Collapsed by default. The curve is supporting evidence for the board,
            not a headline, and open it cost more vertical space than the thing
            it supports. The summary keeps the one number worth reading at a
            glance, so the closed state is still informative. */}
        {readDistribution && (
          <details className={`${PANEL_CLASS} group`} style={PANEL_STYLE}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2.5 gap-y-1">
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              <h2 className="house-micro font-semibold" style={{ color: "var(--ink-soft)" }}>
                Where this list sits
              </h2>
              <ReadDistributionHeadline distribution={readDistribution} />
            </summary>
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <ReadDistributionLegend
                  distribution={readDistribution}
                  subjectLabel="this watchlist"
                />
                <p className="text-[11px] text-muted-foreground">
                  SOAS score, 0–10 — the composite the board above ranks on
                </p>
              </div>
              <ReadDistributionCurve
                distribution={readDistribution}
                subjectLabel="this watchlist"
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                The shape is every covered company with a read; each tick under the axis is one of
                them. Your companies are the sky needles — hover one for its read and where it
                lands against the field. Names are printed for the ones furthest from the median.
              </p>
            </div>
          </details>
        )}
      </div>
    </WatchlistShell>
  );
}
