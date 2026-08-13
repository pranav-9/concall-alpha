import Link from "next/link";

import { classifyBoardRead } from "@/lib/board-read";
import { computeBoardRanks, COVERAGE_BOARD_SIZE } from "@/lib/leaderboard-rank";
import { getOverallBoardRows } from "@/lib/overall-board";
import { topShareLabel } from "../[code]/display-tokens";

// The company's live # on the leaderboard's Overall board, computed with the
// SAME pipeline the board renders with (getOverallBoardRows → classifyBoardRead
// → computeBoardRanks) so the two surfaces can never show different ranks. Note
// this ranks on the board's recency-weighted quarter leg, which deliberately
// differs from the overview's flat 4Q mean — the rank belongs to the board, so
// it links there rather than restating the page's own Read.
//
// Server-only, streamed in behind Suspense: the board build is fleet-wide and
// the overview card must not block on it. Best-effort — any failure renders
// nothing (the rank is supporting context, never load-bearing).
export async function CompanyOverallRankSlot({ companyCode }: { companyCode: string }) {
  const code = companyCode.trim().toUpperCase();
  if (!code) return null;

  try {
    const rows = await getOverallBoardRows();
    const rankByCode = computeBoardRanks(
      rows.map((row) => ({
        companyCode: row.companyCode,
        companyName: row.companyName,
        readScore: classifyBoardRead({
          concallScore: row.concallScore,
          growthScore: row.growthScore,
          valuationScore: row.valuationScore,
        }).score,
      })),
    );
    const rank = rankByCode.get(code);
    // Not on the board (admitted large cap) or no Read yet: no rank to show.
    if (rank == null) return null;
    const total = rankByCode.size;
    const belowLine = rank > COVERAGE_BOARD_SIZE;

    return (
      <Link
        href="/leaderboards"
        className="inline-flex w-fit items-center gap-1 rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/60"
      >
        Overall Rank #{rank}/{total}
        <span className="text-muted-foreground">
          {belowLine ? "· below coverage line" : `· ${topShareLabel(rank, total)}`}
        </span>
        <span aria-hidden className="text-muted-foreground/70">
          →
        </span>
      </Link>
    );
  } catch {
    return null;
  }
}
