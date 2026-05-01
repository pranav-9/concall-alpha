import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WatchlistCreateButton } from "@/components/watchlist-create-button";
import { getConcallData } from "@/app/company/get-concall-data";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
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
import { WatchlistTable, type WatchlistTableRow } from "./watchlist-table";

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

export const metadata: Metadata = {
  title: "Watchlists – Story of a Stock",
  description: "Track the companies in your watchlist.",
};

const PAGE_BACKGROUND_CLASS = `h-[28rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

const PAGE_SHELL_CLASS = PAGE_SHELL;

const HERO_CARD_CLASS = HERO_CARD;

const PANEL_CARD_CLASS = PANEL_CARD_SKY;

const TABLE_CARD_CLASS = TABLE_CARD_SKY;

const CHIP_CLASS = CHIP_BASE;

const CHIP_PRIMARY_CLASS = CHIP_PRIMARY;

const CHIP_NEUTRAL_CLASS = CHIP_NEUTRAL;

function WatchlistShell({
  title,
  description,
  chips,
  children,
}: {
  title: string;
  description: string;
  chips?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL_CLASS}>
        <section className={HERO_CARD_CLASS}>
          <div className="space-y-4">
            <div className="space-y-2">
              {chips ? <div className="flex flex-wrap items-center gap-2">{chips}</div> : null}
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {description}
              </p>
            </div>
          </div>
        </section>

        {children}
      </div>
    </main>
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

export default async function WatchlistsPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId =
    !claimsError && typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  if (!userId) {
    redirect("/auth/login?next=/watchlists");
  }

  const { data: watchlistRows, error: watchlistError } = await supabase
    .from("watchlists")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (watchlistError) {
    return (
      <WatchlistShell
        title="Watchlists"
        description="Unable to load your watchlists right now."
        chips={<span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Watchlists</span>}
      >
        <div className={PANEL_CARD_CLASS}>
          <p className="text-sm text-muted-foreground">
            Please refresh the page or try again in a moment.
          </p>
        </div>
      </WatchlistShell>
    );
  }

  const firstWatchlist = watchlistRows?.[0] as
    | { id: number; name: string; created_at?: string | null }
    | undefined;

  if (!firstWatchlist) {
    return (
      <WatchlistShell
        title="Your watchlist"
        description="You haven't created a watchlist yet."
        chips={<span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Private list</span>}
      >
        <div className={PANEL_CARD_CLASS + " space-y-4"}>
          <p className="text-sm text-muted-foreground">
            Create one watchlist to start saving companies and tracking blended scores.
          </p>
          <WatchlistCreateButton />
        </div>
      </WatchlistShell>
    );
  }

  const { data: watchlistItemsData, error: watchlistItemsError } = await supabase
    .from("watchlist_items")
    .select("company_code")
    .eq("watchlist_id", firstWatchlist.id)
    .order("created_at", { ascending: true });

  if (watchlistItemsError) {
    return (
      <WatchlistShell
        title={firstWatchlist.name}
        description="Unable to load your watchlist companies right now."
        chips={<span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>Watchlist</span>}
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
        title={firstWatchlist.name}
        description="No companies added yet. Add a company from its detail page."
        chips={
          <>
            <span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Watchlist</span>
            <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>0 companies</span>
          </>
        }
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

  const [{ rows, latestLabel }, { data: companyNameRows }, { data: growthRows }, { data: moatRows }] =
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

  const quarterScoreByCode = new Map<string, { latestScore: number | null; avg4: number | null }>();
  rows.forEach((row) => {
    quarterScoreByCode.set(row.company.toUpperCase(), {
      latestScore: latestLabel ? toNumeric(row[latestLabel]) : null,
      avg4: toNumeric(row["Latest 4Q Avg"]),
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
      const quarterData = quarterScoreByCode.get(companyCode);
      const growthScore = growthScoreByCode.get(companyCode) ?? null;
      const moatData = latestMoatByCompany.get(companyCode) ?? null;
      const latestQuarterScore = quarterData?.latestScore ?? null;
      const avg4QuarterScore = quarterData?.avg4 ?? null;
      const blendedScore = computeAverageScore([
        latestQuarterScore,
        growthScore,
        avg4QuarterScore,
      ]);

      return {
        companyCode,
        companyName: companyNameByCode.get(companyCode) ?? companyCode,
        latestQuarterScore,
        growthScore,
        avg4QuarterScore,
        blendedScore,
        moatLabel: moatData?.moatLabel ?? null,
        moatRating: moatData?.moatRating ?? null,
        moatTier: moatData?.moatTier ?? null,
      };
    })
    .sort((a, b) => {
      if (a.blendedScore != null && b.blendedScore != null) {
        if (b.blendedScore !== a.blendedScore) return b.blendedScore - a.blendedScore;
      } else if (a.blendedScore != null) {
        return -1;
      } else if (b.blendedScore != null) {
        return 1;
      }

      if (a.latestQuarterScore != null && b.latestQuarterScore != null) {
        if (b.latestQuarterScore !== a.latestQuarterScore) {
          return b.latestQuarterScore - a.latestQuarterScore;
        }
      } else if (a.latestQuarterScore != null) {
        return -1;
      } else if (b.latestQuarterScore != null) {
        return 1;
      }

      if (a.growthScore != null && b.growthScore != null) {
        if (b.growthScore !== a.growthScore) return b.growthScore - a.growthScore;
      } else if (a.growthScore != null) {
        return -1;
      } else if (b.growthScore != null) {
        return 1;
      }

      if (a.avg4QuarterScore != null && b.avg4QuarterScore != null) {
        if (b.avg4QuarterScore !== a.avg4QuarterScore) {
          return b.avg4QuarterScore - a.avg4QuarterScore;
        }
      } else if (a.avg4QuarterScore != null) {
        return -1;
      } else if (b.avg4QuarterScore != null) {
        return 1;
      }

      return a.companyName.localeCompare(b.companyName);
    });

  const latestQuarterLabel = latestLabel ?? null;
  const averageBlendedScore = computeAverageScore(tableRows.map((row) => row.blendedScore));
  const averageLatestQuarterScore = computeAverageScore(
    tableRows.map((row) => row.latestQuarterScore),
  );
  const averageGrowthScore = computeAverageScore(tableRows.map((row) => row.growthScore));

  return (
    <WatchlistShell
      title={firstWatchlist.name}
      description={`Your first watchlist · ${tableRows.length} ${
        tableRows.length === 1 ? "company" : "companies"
      }`}
      chips={
        <>
          <span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>Watchlist</span>
          <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
            {tableRows.length} companies
          </span>
          {latestQuarterLabel && (
            <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
              Latest quarter: {latestQuarterLabel}
            </span>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={PANEL_CARD_CLASS}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Companies tracked
          </p>
          <p className="mt-2 text-2xl font-black leading-none text-foreground">
            {tableRows.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved companies in the active watchlist.
          </p>
        </div>
        <div className={PANEL_CARD_CLASS}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Avg blended score
          </p>
          <p className="mt-2 text-2xl font-black leading-none text-foreground">
            {averageBlendedScore != null ? averageBlendedScore.toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Blends quarter, growth, and 4Q average scores.
          </p>
        </div>
        <div className={PANEL_CARD_CLASS}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Latest quarter
          </p>
          <p className="mt-2 text-2xl font-black leading-none text-foreground">
            {latestQuarterLabel ?? "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current quarter coverage used for the watchlist view.
          </p>
        </div>
      </div>

      <div className={TABLE_CARD_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/35 px-4 py-3">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Watchlist ranking
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ranked by blended score, then latest quarter, growth, and moat context.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
              Avg latest qtr: {averageLatestQuarterScore != null ? averageLatestQuarterScore.toFixed(1) : "—"}
            </span>
            <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
              Avg growth: {averageGrowthScore != null ? averageGrowthScore.toFixed(1) : "—"}
            </span>
          </div>
        </div>
        <WatchlistTable rows={tableRows} />
      </div>
    </WatchlistShell>
  );
}
