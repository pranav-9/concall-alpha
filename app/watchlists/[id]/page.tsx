import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getConcallData } from "@/app/company/get-concall-data";
import { WatchlistManageMenu } from "./watchlist-manage-menu";
import { WatchlistTabs } from "./watchlist-tabs";
import { BandSummaryLine } from "@/components/band-summary-line";
import {
  ReadDistributionCurve,
  ReadDistributionHeadline,
  ReadDistributionLegend,
} from "@/components/read-distribution-curve";
import { ScoreBoardTable, type ScoreBoardRow } from "@/components/score-board-table";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { BOARD_READS, classifyBoardRead } from "@/lib/board-read";
import { COVERAGE_SELECT, isAdmittedLargeCap } from "@/lib/coverage-policy";
import { computeBoardReadCounts } from "@/lib/leaderboard-distribution";
import { buildReadDistribution } from "@/lib/read-distribution";
import { buildScoreBoardRows } from "@/lib/score-board-rows";
import { createClient } from "@/lib/supabase/server";
import {
  CHIP_BASE,
  CHIP_NEUTRAL,
  CHIP_PRIMARY,
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_SKY,
  TABLE_CARD_SKY,
} from "@/lib/design/shell";

type WatchlistItemRow = {
  company_code?: string | null;
};

type CompanyNameRow = {
  code: string;
  name?: string | null;
  market_cap_band_at_admission?: string | null;
  excluded_from_discovery?: boolean | null;
};

type GrowthRankRow = {
  company?: string | null;
  growth_score?: string | number | null;
  run_timestamp?: string | null;
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

const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;
const PAGE_SHELL_CLASS = PAGE_SHELL;
const HERO_CARD_CLASS = HERO_CARD;
const PANEL_CARD_CLASS = PANEL_CARD_SKY;
const TABLE_CARD_CLASS = TABLE_CARD_SKY;
const CHIP_CLASS = CHIP_BASE;
const CHIP_PRIMARY_CLASS = CHIP_PRIMARY;
const CHIP_NEUTRAL_CLASS = CHIP_NEUTRAL;

function WatchlistShell({
  tabs,
  title,
  description,
  chips,
  actions,
  children,
}: {
  tabs?: ReactNode;
  title: string;
  description?: string;
  chips?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {tabs}
      <main className="relative isolate overflow-hidden">
        <div className={PAGE_BACKGROUND_CLASS} />
        <div className={PAGE_SHELL_CLASS}>
          <section className={HERO_CARD_CLASS}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                {chips ? <div className="flex flex-wrap items-center gap-2">{chips}</div> : null}
                <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {description}
                  </p>
                ) : null}
              </div>
              {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
            <p className="mt-4 text-xs">
              <Link
                href="/watchlists"
                prefetch={false}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                ← All watchlists
              </Link>
            </p>
          </section>

          {children}
        </div>
      </main>
    </>
  );
}

const toNumeric = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};


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

  const { data: allWatchlistRows, error: watchlistError } = await supabase
    .from("watchlists")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (watchlistError) {
    return (
      <WatchlistShell
        title="Watchlist"
        description="Unable to load this watchlist right now."
        chips={<span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Watchlist</span>}
      >
        <div className={PANEL_CARD_CLASS}>
          <p className="text-sm text-muted-foreground">
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

  const { data: watchlistItemsData, error: watchlistItemsError } = await supabase
    .from("watchlist_items")
    .select("company_code")
    .eq("watchlist_id", watchlist.id)
    .order("created_at", { ascending: true });

  if (watchlistItemsError) {
    return (
      <WatchlistShell
        tabs={tabsNode}
        title={watchlist.name}
        description="Unable to load your watchlist companies right now."
        chips={<span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>Watchlist</span>}
        actions={<WatchlistManageMenu watchlistId={watchlist.id} currentName={watchlist.name} />}
      >
        <div className={PANEL_CARD_CLASS}>
          <p className="text-sm text-muted-foreground">
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
        description="No companies added yet. Add a company from its detail page."
        chips={
          <>
            <span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Watchlist</span>
            <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>0 companies</span>
          </>
        }
        actions={<WatchlistManageMenu watchlistId={watchlist.id} currentName={watchlist.name} />}
      >
        <div className={PANEL_CARD_CLASS + " space-y-3"}>
          <p className="text-sm text-muted-foreground">
            Open a company detail page and use the watchlist button to start populating this list.
          </p>
          <Link
            href="/sectors"
            prefetch={false}
            className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            Browse sectors
          </Link>
        </div>
      </WatchlistShell>
    );
  }

  // getConcallData() with no options on purpose: the coverage gates are a
  // discovery-surface policy, and a watchlist is user-owned. A holding that's a
  // large cap or below the composite cut still renders in full, ungreyed.
  const [{ rows, latestLabel }, { data: companyNameRows }, { data: growthRows }] =
    await Promise.all([
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

  const latestGrowthByCompany = new Map<string, GrowthRankRow>();
  ((growthRows ?? []) as GrowthRankRow[]).forEach((row) => {
    const key = (row.company ?? "").trim().toUpperCase();
    if (!key || latestGrowthByCompany.has(key)) return;
    latestGrowthByCompany.set(key, row);
  });

  const growthScoreByCode = new Map<string, number | null>();
  latestGrowthByCompany.forEach((row, companyCode) => {
    growthScoreByCode.set(companyCode, toNumeric(row.growth_score));
  });

  const companyNameByCode = new Map<string, string>();
  const coverageByCode = new Map<string, CompanyNameRow>();
  ((companyNameRows ?? []) as CompanyNameRow[]).forEach((row) => {
    const code = row.code.toUpperCase();
    companyNameByCode.set(code, row.name?.trim() || row.code);
    coverageByCode.set(code, row);
  });

  // Same builder the leaderboard's Overall tab uses, so the four columns mean
  // exactly the same thing on both surfaces — including the stale-quarter
  // fallback and the 0-100 -> 0-10 valuation rescale.
  const boardRowsByCode = new Map(
    buildScoreBoardRows(rows, latestLabel ?? null, growthScoreByCode, companyNameByCode).map(
      (row) => [row.companyCode, row],
    ),
  );

  // A watchlisted company with no scored quarter at all never reaches
  // getConcallData's output, so it needs a placeholder row rather than silently
  // disappearing from a list the user built by hand.
  const tableRows: ScoreBoardRow[] = watchlistCodes.map(
    (companyCode) =>
      boardRowsByCode.get(companyCode) ?? {
        companyCode,
        companyName: companyNameByCode.get(companyCode) ?? companyCode,
        concallScore: null,
        fourConcallScore: null,
        latestConcallScore: null,
        latestQuarterLabel: null,
        growthScore: growthScoreByCode.get(companyCode) ?? null,
        valuationScore: null,
        belowCut: false,
      },
  );

  const latestQuarterLabel = latestLabel ?? null;

  // Summarised in the Read column's own configuration vocabulary — the same line
  // the leaderboard runs above its Overall board.
  const reads = tableRows.map((row) =>
    classifyBoardRead({
      concallScore: row.concallScore,
      growthScore: row.growthScore,
      valuationScore: row.valuationScore,
    }),
  );
  const readBandCounts = computeBoardReadCounts(reads.map((r) => r.key));
  const readScored = reads.filter((r) => r.key !== "no_read").length;

  // The reference population for the curve. Only the ADMISSION gate applies:
  // large caps are outside the positioning entirely, but the below-the-cut tail
  // is still ours and belongs in a picture of the universe — the same population
  // the leaderboard's Overall board renders (excludeLargeCaps + includeBelowCut).
  // Note this is the covered universe, not the watchlist's own peers: a holding
  // that's a large cap still gets a needle, it just isn't in the shape.
  const universeReadScores: number[] = [];
  boardRowsByCode.forEach((row, code) => {
    if (isAdmittedLargeCap(coverageByCode.get(code))) return;
    const read = classifyBoardRead({
      concallScore: row.concallScore,
      growthScore: row.growthScore,
      valuationScore: row.valuationScore,
    });
    // "Has a read" is the same test the summary line above the board uses, so
    // the two counts on this page can't mean different things.
    if (read.key === "no_read" || read.score == null) return;
    universeReadScores.push(read.score);
  });

  const readDistribution = buildReadDistribution(
    universeReadScores,
    tableRows.map((row, i) => ({
      code: row.companyCode,
      name: row.companyName,
      score: reads[i].key === "no_read" ? null : reads[i].score,
      readLabel: BOARD_READS[reads[i].key].label,
    })),
  );

  return (
    <WatchlistShell
      tabs={tabsNode}
      title={watchlist.name}
      chips={
        <>
          <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
            {tableRows.length} {tableRows.length === 1 ? "company" : "companies"}
          </span>
          {latestQuarterLabel && (
            <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
              Latest quarter: {latestQuarterLabel}
            </span>
          )}
        </>
      }
      actions={<WatchlistManageMenu watchlistId={watchlist.id} currentName={watchlist.name} />}
    >
      <div className="space-y-3">
        {/* Collapsed by default. The curve is supporting evidence for the board,
            not a headline, and open it cost more vertical space than the thing
            it supports. The summary keeps the one number worth reading at a
            glance, so the closed state is still informative. */}
        {readDistribution && (
          <details className={`${PANEL_CARD_CLASS} group`}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2.5 gap-y-1">
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
                  Read, 0–10 — the composite the board below ranks on
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
        <AnalyticsBeacon event="watchlist_view" count={tableRows.length} />
        <BandSummaryLine
          scored={readScored}
          total={tableRows.length}
          scopeNote="with a read"
          bandCounts={readBandCounts}
        />
        <div className={TABLE_CARD_CLASS}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Watchlist board
            </h2>
            {/* Same caption as the leaderboard's Overall board: the Read column
                shows the very number the # column ranks on, so this line only
                has to say which way the weighting leans. */}
            <p className="text-[11px] text-muted-foreground">
              Ranked by Read · quality weighted 2:1 over price
            </p>
          </div>
          <ScoreBoardTable rows={tableRows} watchlistId={watchlist.id} />
        </div>
      </div>
    </WatchlistShell>
  );
}
