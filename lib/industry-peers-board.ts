import "server-only";

// The Industry tab's "Covered peers" board: the company and every covered
// company in its sub-sector, on the watchlist's rows (buildWatchlistBoard), so
// a peer reads exactly as it would on a watchlist holding the same names.

import { getConcallData } from "@/app/company/get-concall-data";
import {
  buildWatchlistBoard,
  type GrowthRankRow,
} from "@/app/watchlists/[id]/build-board";
import type { ScoreBoardRow } from "@/components/score-board-table";
import { COVERAGE_SELECT } from "@/lib/coverage-policy";
import { selectIndustryPeers, type PeerCompanyRow } from "@/lib/industry-peers";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export type IndustryPeersBoard = {
  subSector: string;
  sector: string | null;
  rows: ScoreBoardRow[];
  /** UPPERCASE code → live rank on the leaderboard's Overall board. */
  overallRankByCode: Record<string, number>;
};

/** null when there is no peer to show, or a read failed — the tab renders without the block. */
export async function getIndustryPeersBoard(companyCode: string): Promise<IndustryPeersBoard | null> {
  try {
    const supabase = await createClient();
    const { data: companyRows } = await supabase
      .from("company")
      .select(`code, name, sector, sub_sector, ${COVERAGE_SELECT}`);
    const companies = (companyRows ?? []) as PeerCompanyRow[];
    const peerSet = selectIndustryPeers(companyCode, companies);
    if (!peerSet) return null;

    // Unfiltered quarter rows + every growth score: the board's "#N overall"
    // chips rank against the whole covered universe, not just these peers.
    const [{ rows, latestLabel }, { data: growthRows }] = await Promise.all([
      getConcallData(),
      supabase
        .from("growth_outlook")
        .select("company, growth_score, run_timestamp")
        .order("run_timestamp", { ascending: false }),
    ]);

    const { tableRows, overallRankByCode } = await buildWatchlistBoard({
      watchlistCodes: peerSet.codes,
      rows,
      latestLabel: latestLabel ?? null,
      companyNameRows: companies,
      growthRows: (growthRows ?? []) as GrowthRankRow[],
    });

    return {
      subSector: peerSet.subSector,
      sector: peerSet.sector,
      rows: tableRows,
      overallRankByCode,
    };
  } catch (error) {
    logger.warn("industry-peers: board read failed; block omitted", { error, companyCode });
    return null;
  }
}
