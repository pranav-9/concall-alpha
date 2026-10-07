import { formatIst, type LatestWatchlistActivityRow } from "@/lib/admin/metrics";

import { AdminEmpty, AdminPanel, AdminTag } from "./shell";
import { TABLE, TD, TD_MUTED, TD_TIME, TH } from "./tokens";

export type { LatestWatchlistActivityRow };

export function LatestWatchlistActivityTable({ rows }: { rows: LatestWatchlistActivityRow[] }) {
  return (
    <AdminPanel eyebrow="Latest watchlist activity" flush>
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>When (IST)</th>
            <th className={TH}>Action</th>
            <th className={TH}>Company</th>
            <th className={TH}>Watchlist</th>
            <th className={TH}>User</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <AdminEmpty colSpan={5}>No watchlist activity in this range.</AdminEmpty>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className={TD_TIME}>{formatIst(row.occurredAt)}</td>
                <td className={TD}>
                  <AdminTag tone={row.action === "company_added" ? "signal" : "muted"}>
                    {row.action === "company_added" ? "added" : "created"}
                  </AdminTag>
                </td>
                <td className={TD}>
                  {row.companyCode ? (
                    <>
                      {row.companyName ?? row.companyCode}
                      <span className="house-data ml-2 text-[11px] text-[var(--ink-soft)]">{row.companyCode}</span>
                    </>
                  ) : (
                    <span className="text-[var(--ink-soft)]">–</span>
                  )}
                </td>
                <td className={TD_MUTED}>{row.watchlistName ?? "–"}</td>
                <td className={TD_MUTED}>{row.userDisplayName ?? row.userEmail ?? row.userId ?? "–"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminPanel>
  );
}
