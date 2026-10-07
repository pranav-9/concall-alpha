import { LatestWatchlistActivityTable } from "@/components/admin/latest-watchlist-activity-table";
import { RecentWatchlistsTable } from "@/components/admin/recent-watchlists-table";
import { AdminAlert, AdminShell, AdminStat, AdminStatRow, DATA_LOAD_ERROR } from "@/components/admin/shell";
import { TopSavedCompaniesTable } from "@/components/admin/top-saved-companies-table";
import { getWatchlistsData, type WatchlistsData } from "@/lib/admin/queries";
import { parseRange, resolveWindow } from "@/lib/admin/range";

export const dynamic = "force-dynamic";

export default async function AdminWatchlistsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams)?.range);
  const window = resolveWindow(range);

  let data: WatchlistsData | null = null;
  let error: string | null = null;
  try {
    data = await getWatchlistsData(window);
  } catch {
    error = DATA_LOAD_ERROR;
  }

  return (
    <AdminShell
      section="watchlists"
      range={range}
      title="Watchlists"
      lede="Saves are the strongest intent signal the portal has: a reader chose to come back to a company."
    >
      {error ? <AdminAlert>{error}</AdminAlert> : null}
      {data ? (
        <>
          <AdminStatRow columns={3}>
            <AdminStat label="Watchlists created" value={data.created.current} delta={data.created} range={range} />
            <AdminStat label="Companies saved" value={data.saved.current} delta={data.saved} range={range} />
            <AdminStat label="Saves per watchlist" value={data.averageSaves} note="in this range" />
          </AdminStatRow>
          <LatestWatchlistActivityTable rows={data.activity} />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <RecentWatchlistsTable rows={data.recent} />
            <TopSavedCompaniesTable rows={data.topSaved} />
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
