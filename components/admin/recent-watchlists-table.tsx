import { formatIst } from "@/lib/admin/metrics";
import type { RecentWatchlistRow } from "@/lib/admin/queries";

import { AdminEmpty, AdminPanel } from "./shell";
import { TABLE, TD, TD_CODE, TD_TIME, TH } from "./tokens";

export type { RecentWatchlistRow };

export function RecentWatchlistsTable({ rows }: { rows: RecentWatchlistRow[] }) {
  return (
    <AdminPanel eyebrow="Watchlists created" flush>
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>Created (IST)</th>
            <th className={TH}>Name</th>
            <th className={TH}>Owner</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <AdminEmpty colSpan={3}>No watchlists created in this range.</AdminEmpty>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className={TD_TIME}>{formatIst(row.created_at)}</td>
                <td className={TD}>{row.name || <span className="text-[var(--ink-soft)]">untitled</span>}</td>
                <td className={TD}>
                  {row.user_display_name || row.user_email ? (
                    <span>
                      {row.user_display_name ?? row.user_email}
                      {row.user_display_name && row.user_email ? (
                        <span className="house-data ml-2 text-[11px] text-[var(--ink-soft)]">{row.user_email}</span>
                      ) : null}
                    </span>
                  ) : (
                    <span className={`${TD_CODE} border-0 p-0`}>{row.user_id || "–"}</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminPanel>
  );
}
