import { adminPage } from "@/components/admin/admin-page";
import { ApiPerformanceTable, ApiRouteBreakdownTable } from "@/components/admin/api-performance-table";
import {
  AdminAlert,
  AdminNote,
  AdminShell,
  AdminStat,
  AdminStatRow,
  DATA_LOAD_ERROR,
} from "@/components/admin/shell";
import { formatMs, type ApiPerformanceData } from "@/lib/admin/metrics";
import { getApiPerformanceData } from "@/lib/admin/queries";
import { parseRange, resolveWindow } from "@/lib/admin/range";

export const dynamic = "force-dynamic";

async function AdminApiPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams)?.range);
  const window = resolveWindow(range);

  let data: ApiPerformanceData | null = null;
  let error: string | null = null;
  try {
    data = await getApiPerformanceData(window);
  } catch {
    error = DATA_LOAD_ERROR;
  }

  return (
    <AdminShell
      section="api"
      range={range}
      title="API"
      lede="Server-side timing for the instrumented routes. 5xx are real failures; 4xx are validation and auth rejections, kept apart so junk traffic cannot bury a failure."
    >
      {error ? <AdminAlert>{error}</AdminAlert> : null}
      {data && !data.available ? (
        <AdminAlert tone="warn">
          The api_route_metrics table is not available. Apply lib/supabase/api_route_metrics.sql in Supabase and reload the
          schema.
        </AdminAlert>
      ) : null}
      {data ? (
        <>
          <AdminStatRow columns={4}>
            <AdminStat label="Calls" value={data.totalCalls} note={data.sampled ? `stats over the latest ${data.sampledCalls.toLocaleString("en-IN")}` : "all in range"} />
            <AdminStat label="Server errors (5xx)" value={data.serverErrorCount} />
            <AdminStat label="Client 4xx" value={data.clientErrorCount} />
            <AdminStat label="P95 latency" value={formatMs(data.p95Ms)} note={`avg ${formatMs(data.avgMs)} · p50 ${formatMs(data.p50Ms)} · p90 ${formatMs(data.p90Ms)}`} />
          </AdminStatRow>
          {data.sampled ? (
            <AdminNote>
              Latency and error stats are computed over the most recent {data.sampledCalls.toLocaleString("en-IN")} of{" "}
              {data.totalCalls.toLocaleString("en-IN")} calls in this range. Calls is the full count; the rest describe the
              sample.
            </AdminNote>
          ) : null}
          <ApiRouteBreakdownTable rows={data.perRoute} />
          <ApiPerformanceTable rows={data.slowRows} />
        </>
      ) : null}
    </AdminShell>
  );
}

// Gated inside the page, before any query — see components/admin/admin-page.tsx.
export default adminPage(AdminApiPage);
