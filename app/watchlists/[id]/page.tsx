import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getConcallData } from "@/app/company/get-concall-data";
import { WatchlistTable, type WatchlistTableRow } from "../watchlist-table";
import { WatchlistManageMenu } from "./watchlist-manage-menu";
import { WatchlistTabs } from "./watchlist-tabs";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import { buildScorePath, type ScorePoint } from "@/lib/score-path";
import type { TrajectoryKey } from "@/lib/score-trajectory";
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
};

type GrowthRankRow = {
  company?: string | null;
  growth_score?: string | number | null;
  run_timestamp?: string | null;
};

type MoatSummaryRow = Pick<WatchlistTableRow, "moatLabel" | "moatRating" | "moatTier">;

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

const computeAverageScore = (values: Array<number | null>) => {
  const validValues = values.filter((value): value is number => value != null);
  if (validValues.length === 0) return null;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
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

  const [
    { rows, latestLabel, quarterLabels },
    { data: companyNameRows },
    { data: growthRows },
    { data: moatRows },
  ] =
    await Promise.all([
      getConcallData(),
      supabase.from("company").select("code, name"),
      supabase
        .from("growth_outlook")
        .select("company, growth_score, run_timestamp")
        .order("run_timestamp", { ascending: false }),
      supabase
        .from("moat_analysis")
        .select(
          "id, company_code, company_name, industry, rating, tier, gatekeeper_answer, cycle_tested, assessment_payload, assessment_version, created_at, updated_at",
        )
        .in("company_code", watchlistCodes)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
    ]);

  const quarterDataByCode = new Map<
    string,
    {
      latestScore: number | null;
      avg4: number | null;
      trajectoryKey?: TrajectoryKey;
      trendChange?: number | null;
      trendDescription?: string | null;
      scorePath: ScorePoint[];
    }
  >();
  rows.forEach((row) => {
    quarterDataByCode.set(row.company.toUpperCase(), {
      latestScore: latestLabel ? toNumeric(row[latestLabel]) : null,
      avg4: toNumeric(row["Latest 4Q Avg"]),
      trajectoryKey: row.trajectoryKey,
      trendChange: row.trendChange,
      trendDescription: row.trendDescription,
      scorePath: buildScorePath(row, quarterLabels),
    });
  });

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

  const latestMoatByCompany = new Map<string, MoatSummaryRow>();
  ((moatRows ?? []) as MoatAnalysisRow[]).forEach((row) => {
    const normalized = normalizeMoatAnalysis(row);
    if (!normalized) return;
    const companyCode = normalized.companyCode.trim().toUpperCase();
    if (!companyCode || latestMoatByCompany.has(companyCode)) return;
    latestMoatByCompany.set(companyCode, {
      moatLabel: normalized.moatRatingLabel,
      moatRating: normalized.moatRating,
      moatTier: normalized.moatTier,
    });
  });

  const companyNameByCode = new Map<string, string>();
  ((companyNameRows ?? []) as CompanyNameRow[]).forEach((row) => {
    companyNameByCode.set(row.code.toUpperCase(), row.name?.trim() || row.code);
  });

  const tableRows: WatchlistTableRow[] = watchlistCodes
    .map((companyCode) => {
      const quarterData = quarterDataByCode.get(companyCode);
      const growthScore = growthScoreByCode.get(companyCode) ?? null;
      const moatData = latestMoatByCompany.get(companyCode) ?? null;

      return {
        companyCode,
        companyName: companyNameByCode.get(companyCode) ?? companyCode,
        latestQuarterScore: quarterData?.latestScore ?? null,
        avg4QuarterScore: quarterData?.avg4 ?? null,
        growthScore,
        trajectoryKey: quarterData?.trajectoryKey,
        trendChange: quarterData?.trendChange ?? null,
        trendDescription: quarterData?.trendDescription ?? null,
        scorePath: quarterData?.scorePath ?? [],
        moatLabel: moatData?.moatLabel ?? null,
        moatRating: moatData?.moatRating ?? null,
        moatTier: moatData?.moatTier ?? null,
      };
    })
    // Initial order = latest quarter score desc (unscored last); the table
    // component re-sorts client-side from its own DEFAULT_SORT.
    .sort((a, b) => {
      if (a.latestQuarterScore != null && b.latestQuarterScore != null) {
        if (b.latestQuarterScore !== a.latestQuarterScore) {
          return b.latestQuarterScore - a.latestQuarterScore;
        }
      } else if (a.latestQuarterScore != null) {
        return -1;
      } else if (b.latestQuarterScore != null) {
        return 1;
      }
      return a.companyName.localeCompare(b.companyName);
    });

  const latestQuarterLabel = latestLabel ?? null;
  const averageLatestQuarterScore = computeAverageScore(
    tableRows.map((row) => row.latestQuarterScore),
  );
  const averageGrowthScore = computeAverageScore(tableRows.map((row) => row.growthScore));

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
      <div className={TABLE_CARD_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ranked by latest quarter score
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
              Avg latest qtr: {averageLatestQuarterScore != null ? averageLatestQuarterScore.toFixed(1) : "—"}
            </span>
            <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
              Avg forward: {averageGrowthScore != null ? averageGrowthScore.toFixed(1) : "—"}
            </span>
          </div>
        </div>
        <WatchlistTable rows={tableRows} watchlistId={watchlist.id} />
      </div>
    </WatchlistShell>
  );
}
