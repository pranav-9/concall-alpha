import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ConcallScore from "@/components/concall-score";
import { WatchlistCreateButton } from "@/components/watchlist-create-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getConcallData } from "@/app/company/get-concall-data";
import { createClient } from "@/lib/supabase/server";

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

type WatchlistTableRow = {
  companyCode: string;
  companyName: string;
  latestQuarterScore: number | null;
  growthScore: number | null;
  avg4QuarterScore: number | null;
  blendedScore: number | null;
};

export const metadata: Metadata = {
  title: "Watchlists – Story of a Stock",
  description: "Track the companies in your watchlist.",
};

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
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Unable to load your watchlists right now.
        </div>
      </div>
    );
  }

  const firstWatchlist = watchlistRows?.[0] as
    | { id: number; name: string; created_at?: string | null }
    | undefined;

  if (!firstWatchlist) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-foreground">Your watchlist</h1>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t created a watchlist yet.
            </p>
          </div>
          <WatchlistCreateButton />
        </div>
      </div>
    );
  }

  const { data: watchlistItemsData, error: watchlistItemsError } = await supabase
    .from("watchlist_items")
    .select("company_code")
    .eq("watchlist_id", firstWatchlist.id)
    .order("created_at", { ascending: true });

  if (watchlistItemsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Unable to load your watchlist companies right now.
        </div>
      </div>
    );
  }

  const watchlistCodes = ((watchlistItemsData ?? []) as WatchlistItemRow[])
    .map((row) => (row.company_code ?? "").trim().toUpperCase())
    .filter(Boolean);

  if (watchlistCodes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-border bg-card p-6 space-y-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-foreground">{firstWatchlist.name}</h1>
            <p className="text-sm text-muted-foreground">Your first watchlist</p>
          </div>
          <p className="text-sm text-muted-foreground">
            No companies added yet. Add a company from its detail page.
          </p>
        </div>
      </div>
    );
  }

  const [{ rows, latestLabel }, { data: companyNameRows }, { data: growthRows }] = await Promise.all([
    getConcallData(),
    supabase.from("company").select("code, name"),
    supabase
      .from("growth_outlook")
      .select("company, growth_score, run_timestamp")
      .order("run_timestamp", { ascending: false }),
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

  const companyNameByCode = new Map<string, string>();
  ((companyNameRows ?? []) as CompanyNameRow[]).forEach((row) => {
    companyNameByCode.set(row.code.toUpperCase(), row.name?.trim() || row.code);
  });

  const tableRows: WatchlistTableRow[] = watchlistCodes
    .map((companyCode) => {
      const quarterData = quarterScoreByCode.get(companyCode);
      const growthScore = growthScoreByCode.get(companyCode) ?? null;
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{firstWatchlist.name}</h1>
        <p className="text-sm text-muted-foreground">
          Your first watchlist · {tableRows.length} {tableRows.length === 1 ? "company" : "companies"}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Qtr Score</TableHead>
              <TableHead>Growth Score</TableHead>
              <TableHead>4Q Avg Score</TableHead>
              <TableHead className="border-l border-border/70 pl-4">
                <div className="flex flex-col gap-0.5">
                  <span>Avg Score</span>
                  <span className="text-[10px] font-medium text-muted-foreground normal-case">
                    Derived from first 3
                  </span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows.map((row) => (
              <TableRow key={row.companyCode}>
                <TableCell>
                  <Link
                    href={`/company/${row.companyCode}`}
                    prefetch={false}
                    className="font-medium text-foreground hover:underline"
                  >
                    {row.companyName}
                  </Link>
                </TableCell>
                <TableCell>
                  {row.latestQuarterScore != null ? <ConcallScore score={row.latestQuarterScore} size="sm" /> : "—"}
                </TableCell>
                <TableCell>
                  {row.growthScore != null ? <ConcallScore score={row.growthScore} size="sm" /> : "—"}
                </TableCell>
                <TableCell>
                  {row.avg4QuarterScore != null ? <ConcallScore score={row.avg4QuarterScore} size="sm" /> : "—"}
                </TableCell>
                <TableCell className="border-l border-border/70 pl-4">
                  {row.blendedScore != null ? (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 dark:border-emerald-700/40 dark:bg-emerald-950/20">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                        Blend
                      </span>
                      <ConcallScore score={row.blendedScore} size="sm" />
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
