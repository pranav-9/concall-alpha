import { adminPage } from "@/components/admin/admin-page";
import { FeedbackRequestsTable } from "@/components/admin/feedback-requests-table";
import { AdminAlert, AdminShell, AdminStat, AdminStatRow, DATA_LOAD_ERROR } from "@/components/admin/shell";
import { REQUEST_TYPE_LABELS } from "@/lib/admin/metrics";
import { getRequestsData, type RequestsData } from "@/lib/admin/queries";
import { parseRange, resolveWindow } from "@/lib/admin/range";

export const dynamic = "force-dynamic";

async function AdminRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams)?.range);
  const window = resolveWindow(range);

  let data: RequestsData | null = null;
  let error: string | null = null;
  try {
    data = await getRequestsData(window);
  } catch {
    error = DATA_LOAD_ERROR;
  }

  return (
    <AdminShell
      section="requests"
      range={range}
      title="Requests"
      lede="What readers asked for through the request form: feedback, stock asks, bug reports, section gaps. Open a row for the full message."
    >
      {error ? <AdminAlert>{error}</AdminAlert> : null}
      {data ? (
        <>
          <AdminStatRow columns={3}>
            <AdminStat label="Submitted" value={data.submitted.current} delta={data.submitted} range={range} />
            <AdminStat label={REQUEST_TYPE_LABELS.bug_report} value={data.byType.bug_report} note="of the latest 200" />
            <AdminStat label={REQUEST_TYPE_LABELS.stock_addition} value={data.byType.stock_addition} note="of the latest 200" />
            <AdminStat label={REQUEST_TYPE_LABELS.missing_section} value={data.byType.missing_section} note="of the latest 200" />
            <AdminStat label={REQUEST_TYPE_LABELS.section_improvement} value={data.byType.section_improvement} note="of the latest 200" />
            <AdminStat label={REQUEST_TYPE_LABELS.feedback} value={data.byType.feedback} note="of the latest 200" />
          </AdminStatRow>
          <FeedbackRequestsTable rows={data.rows} />
        </>
      ) : null}
    </AdminShell>
  );
}

// Gated inside the page, before any query — see components/admin/admin-page.tsx.
export default adminPage(AdminRequestsPage);
