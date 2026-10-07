import { CompanyViewsTable, RecentCompanyOpensTable } from "@/components/admin/company-views-table";
import { AdminAlert, AdminShell, AdminStat, AdminStatRow, DATA_LOAD_ERROR } from "@/components/admin/shell";
import { getCompaniesData, type CompaniesData } from "@/lib/admin/queries";
import { parseRange, resolveWindow } from "@/lib/admin/range";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams)?.range);
  const window = resolveWindow(range);

  let data: CompaniesData | null = null;
  let error: string | null = null;
  try {
    data = await getCompaniesData(window);
  } catch {
    error = DATA_LOAD_ERROR;
  }

  return (
    <AdminShell
      section="companies"
      range={range}
      title="Companies"
      lede="Which covered companies get opened, how often, and where the opens came from. Counts are page opens, not unique visitors."
    >
      {error ? <AdminAlert>{error}</AdminAlert> : null}
      {data ? (
        <>
          <AdminStatRow columns={3}>
            <AdminStat label="Company opens" value={data.totalOpens.current} delta={data.totalOpens} range={range} />
            <AdminStat label="Companies opened" value={data.companiesOpened} note="distinct pages with ≥1 open" />
            <AdminStat
              label="Opens per company"
              value={data.companiesOpened > 0 ? (data.totalOpens.current / data.companiesOpened).toFixed(1) : "–"}
              note="how concentrated the reading is"
            />
          </AdminStatRow>
          <CompanyViewsTable rows={data.top} />
          <RecentCompanyOpensTable rows={data.recent} />
        </>
      ) : null}
    </AdminShell>
  );
}
