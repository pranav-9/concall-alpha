import { ActiveAccountsTable } from "@/components/admin/active-accounts-table";
import { RecentAccountsTable } from "@/components/admin/recent-accounts-table";
import { AdminAlert, AdminShell, AdminStat, AdminStatRow, DATA_LOAD_ERROR } from "@/components/admin/shell";
import { getAccountsData, type AccountsData } from "@/lib/admin/queries";
import { parseRange, rangeLabel, resolveWindow } from "@/lib/admin/range";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams)?.range);
  const window = resolveWindow(range);
  const now = new Date();

  let data: AccountsData | null = null;
  let error: string | null = null;
  try {
    data = await getAccountsData(window);
  } catch {
    error = DATA_LOAD_ERROR;
  }

  return (
    <AdminShell
      section="accounts"
      range={range}
      title="Accounts"
      lede="Who is using the portal while signed in, and who just joined."
    >
      {error ? <AdminAlert>{error}</AdminAlert> : null}
      {data?.sessionSignal.state === "missing" ? (
        <AdminAlert tone="warn">
          Visits are not counted yet, so last active falls back to sign-ins and watchlist writes and reads older than it
          is. Apply lib/supabase/admin_account_activity.sql in the Supabase SQL editor, then run notify pgrst, &apos;reload
          schema&apos;.
        </AdminAlert>
      ) : null}
      {data?.sessionSignal.state === "error" ? (
        <AdminAlert tone="warn">
          Session activity could not be read ({data.sessionSignal.message}). Last active falls back to sign-ins and
          watchlist writes.
        </AdminAlert>
      ) : null}
      {data ? (
        <>
          <AdminStatRow columns={4}>
            <AdminStat
              label="Active in range"
              value={data.active.length}
              note={range === "all" ? "any recorded activity" : rangeLabel(range).toLowerCase()}
            />
            <AdminStat
              label="Active share"
              value={data.total > 0 ? `${Math.round((data.active.length / data.total) * 100)}%` : "–"}
              note="of all accounts"
            />
            <AdminStat label="Sign-ups in range" value={data.created.current} delta={data.created} range={range} />
            <AdminStat label="Accounts all time" value={data.total} note={`${data.total - data.everActive} never active`} />
          </AdminStatRow>
          <ActiveAccountsTable rows={data.active} now={now} />
          <RecentAccountsTable rows={data.rows} total={data.total} />
        </>
      ) : null}
    </AdminShell>
  );
}
