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
import { assignCompetitionRanks } from "@/lib/leaderboard-rank";
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
  quarterRank: number | null;
  growthScore: number | null;
  growthRank: number | null;
  avg4QuarterScore: number | null;
  overallRank: number | null;
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

const formatRank = (value: number | null) => {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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

  const latestQuarterRows = latestLabel
    ? [...rows].sort((a, b) => {
        const aScore = toNumeric(a[latestLabel]);
        const bScore = toNumeric(b[latestLabel]);
        if (aScore != null && bScore != null) {
          if (bScore !== aScore) return bScore - aScore;
          return a.company.localeCompare(b.company);
        }
        if (aScore != null) return -1;
        if (bScore != null) return 1;
        return a.company.localeCompare(b.company);
      })
    : [...rows];

  const rankedQuarterRows = assignCompetitionRanks(
    latestQuarterRows,
    (row) => (latestLabel ? toNumeric(row[latestLabel]) : null),
  );

  const quarterRankByCode = new Map<string, { rank: number; latestScore: number | null; avg4: number | null }>();
  rankedQuarterRows.forEach((row) => {
    quarterRankByCode.set(row.company.toUpperCase(), {
      rank: row.leaderboardRank,
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

  const growthRankedRows = assignCompetitionRanks(
    Array.from(latestGrowthByCompany.values())
      .map((row) => ({
        company: (row.company ?? "").trim().toUpperCase(),
        growthScore: toNumeric(row.growth_score),
      }))
      .sort((a, b) => {
        if (a.growthScore != null && b.growthScore != null) {
          if (b.growthScore !== a.growthScore) return b.growthScore - a.growthScore;
          return a.company.localeCompare(b.company);
        }
        if (a.growthScore != null) return -1;
        if (b.growthScore != null) return 1;
        return a.company.localeCompare(b.company);
      }),
    (row) => row.growthScore,
  );

  const growthRankByCode = new Map<string, { rank: number; growthScore: number | null }>();
  growthRankedRows.forEach((row) => {
    growthRankByCode.set(row.company, {
      rank: row.leaderboardRank,
      growthScore: row.growthScore,
    });
  });

  const companyNameByCode = new Map<string, string>();
  ((companyNameRows ?? []) as CompanyNameRow[]).forEach((row) => {
    companyNameByCode.set(row.code.toUpperCase(), row.name?.trim() || row.code);
  });

  const tableRows: WatchlistTableRow[] = watchlistCodes
    .map((companyCode) => {
      const quarterData = quarterRankByCode.get(companyCode);
      const growthData = growthRankByCode.get(companyCode);
      const quarterRank = quarterData?.rank ?? null;
      const growthRank = growthData?.rank ?? null;
      const overallRank =
        quarterRank != null && growthRank != null
          ? (quarterRank + growthRank) / 2
          : quarterRank ?? growthRank ?? null;

      return {
        companyCode,
        companyName: companyNameByCode.get(companyCode) ?? companyCode,
        latestQuarterScore: quarterData?.latestScore ?? null,
        quarterRank,
        growthScore: growthData?.growthScore ?? null,
        growthRank,
        avg4QuarterScore: quarterData?.avg4 ?? null,
        overallRank,
      };
    })
    .sort((a, b) => {
      if (a.overallRank != null && b.overallRank != null) {
        if (a.overallRank !== b.overallRank) return a.overallRank - b.overallRank;
      } else if (a.overallRank != null) {
        return -1;
      } else if (b.overallRank != null) {
        return 1;
      }

      if (a.quarterRank != null && b.quarterRank != null) {
        if (a.quarterRank !== b.quarterRank) return a.quarterRank - b.quarterRank;
      } else if (a.quarterRank != null) {
        return -1;
      } else if (b.quarterRank != null) {
        return 1;
      }

      if (a.growthRank != null && b.growthRank != null) {
        if (a.growthRank !== b.growthRank) return a.growthRank - b.growthRank;
      } else if (a.growthRank != null) {
        return -1;
      } else if (b.growthRank != null) {
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
              <TableHead>Latest Qtr Score</TableHead>
              <TableHead>Qtr Rank</TableHead>
              <TableHead>Growth Score</TableHead>
              <TableHead>Growth Rank</TableHead>
              <TableHead>Avg 4 Qtr Score</TableHead>
              <TableHead>Overall Rank</TableHead>
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
                <TableCell>{formatRank(row.quarterRank)}</TableCell>
                <TableCell>
                  {row.growthScore != null ? <ConcallScore score={row.growthScore} size="sm" /> : "—"}
                </TableCell>
                <TableCell>{formatRank(row.growthRank)}</TableCell>
                <TableCell>
                  {row.avg4QuarterScore != null ? <ConcallScore score={row.avg4QuarterScore} size="sm" /> : "—"}
                </TableCell>
                <TableCell>{formatRank(row.overallRank)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
