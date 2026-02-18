import { LeaderboardTable } from "./leaderboard-table";
import type { Metadata } from "next";
import { getConcallData } from "./get-concall-data";

export const metadata: Metadata = {
  title: "Leaderboard – Story of a Stock",
  description: "Latest concall sentiment leaderboard across companies.",
};

export default async function CompanyLeaderboardPage() {
  const { rows, quarterLabels } = await getConcallData();

  return (
    <div className="container mx-auto py-10">
      <LeaderboardTable
        quarterLabels={quarterLabels}
        data={rows}
      />
    </div>
  );
}
