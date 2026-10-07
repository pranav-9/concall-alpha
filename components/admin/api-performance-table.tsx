import {
  formatIst,
  formatMs,
  type ApiPerformanceRow,
  type ApiRouteAggregateRow,
} from "@/lib/admin/metrics";

import { AdminEmpty, AdminPanel, AdminTag } from "./shell";
import { TABLE, TD, TD_CODE, TD_NUM, TD_TIME, TH, TH_NUM } from "./tokens";

export type { ApiPerformanceRow, ApiRouteAggregateRow };

export function ApiRouteBreakdownTable({ rows }: { rows: ApiRouteAggregateRow[] }) {
  return (
    <AdminPanel eyebrow="Per route" flush right={<span>over the sampled rows</span>}>
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>Route</th>
            <th className={TH_NUM}>Calls</th>
            <th className={TH_NUM}>5xx</th>
            <th className={TH_NUM}>4xx</th>
            <th className={TH_NUM}>Avg</th>
            <th className={TH_NUM}>P95</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <AdminEmpty colSpan={6}>No API calls recorded in this range.</AdminEmpty>
          ) : (
            rows.map((row) => (
              <tr key={row.route}>
                <td className={`${TD_CODE} text-[var(--ink)]`}>{row.route}</td>
                <td className={TD_NUM}>{row.calls.toLocaleString("en-IN")}</td>
                <td className={`${TD_NUM} ${row.serverErrorCount > 0 ? "text-[var(--alarm)]" : "text-[var(--ink-soft)]"}`}>
                  {row.serverErrorCount}
                </td>
                <td className={`${TD_NUM} text-[var(--ink-soft)]`}>{row.clientErrorCount}</td>
                <td className={TD_NUM}>{formatMs(row.avgMs)}</td>
                <td className={TD_NUM}>{formatMs(row.p95Ms)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminPanel>
  );
}

function statusTone(code: number): "signal" | "warn" | "alarm" | "muted" {
  if (code >= 500) return "alarm";
  if (code >= 400) return "warn";
  if (code >= 200 && code < 300) return "signal";
  return "muted";
}

export function ApiPerformanceTable({ rows }: { rows: ApiPerformanceRow[] }) {
  return (
    <AdminPanel eyebrow="Slowest calls" flush right={<span>search terms are never stored</span>}>
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>When (IST)</th>
            <th className={TH}>Route</th>
            <th className={TH}>Status</th>
            <th className={TH_NUM}>Duration</th>
            <th className={TH_NUM}>Results</th>
            <th className={TH_NUM}>Query len</th>
            <th className={TH}>Error</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <AdminEmpty colSpan={7}>No API calls recorded in this range.</AdminEmpty>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className={TD_TIME}>{formatIst(row.createdAt)}</td>
                <td className={`${TD_CODE} text-[var(--ink)]`}>
                  <span className="text-[var(--ink-soft)]">{row.method}</span> {row.route}
                </td>
                <td className={TD}>
                  <AdminTag tone={statusTone(row.statusCode)}>{row.statusCode}</AdminTag>
                </td>
                <td className={TD_NUM}>{formatMs(row.durationMs)}</td>
                <td className={`${TD_NUM} text-[var(--ink-soft)]`}>{row.resultCount ?? "–"}</td>
                <td className={`${TD_NUM} text-[var(--ink-soft)]`}>{row.queryLength ?? "–"}</td>
                <td className={`${TD_CODE} max-w-[220px] truncate`}>{row.errorCode ?? "–"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminPanel>
  );
}
