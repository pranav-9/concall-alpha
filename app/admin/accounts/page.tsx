import { RecentAccountsTable } from "@/components/admin/recent-accounts-table";
import { AdminAlert, AdminShell, AdminStat, AdminStatRow, DATA_LOAD_ERROR } from "@/components/admin/shell";
import { getAccountsData, type AccountsData } from "@/lib/admin/queries";
import { parseRange, resolveWindow } from "@/lib/admin/range";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams)?.range);
  const window = resolveWindow(range);

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
      lede="Every sign-up is a reader who hit the gate and came through. Newest first."
    >
      {error ? <AdminAlert>{error}</AdminAlert> : null}
      {data ? (
        <>
          <AdminStatRow columns={3}>
            <AdminStat label="Sign-ups in range" value={data.created.current} delta={data.created} range={range} />
            <AdminStat label="Accounts all time" value={data.total} />
            <AdminStat
              label="Share of all accounts"
              value={data.total > 0 ? `${Math.round((data.created.current / data.total) * 100)}%` : "–"}
              note="created in this range"
            />
          </AdminStatRow>
          <RecentAccountsTable rows={data.rows} total={data.total} />
        </>
      ) : null}
    </AdminShell>
  );
}
