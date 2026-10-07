import { formatIst } from "@/lib/admin/metrics";
import type { AccountRow } from "@/lib/admin/queries";

import { AdminEmpty, AdminPanel } from "./shell";
import { TABLE, TD, TD_CODE, TD_TIME, TH } from "./tokens";

export type RecentAccountRow = AccountRow;

export function RecentAccountsTable({ rows, total }: { rows: AccountRow[]; total?: number }) {
  return (
    <AdminPanel
      eyebrow="Sign-ups in range"
      flush
      right={total != null ? <span className="house-data">{total.toLocaleString("en-IN")} accounts all time</span> : null}
    >
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>Created (IST)</th>
            <th className={TH}>Email</th>
            <th className={TH}>User id</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <AdminEmpty colSpan={3}>No accounts created in this range.</AdminEmpty>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className={TD_TIME}>{formatIst(row.created_at)}</td>
                <td className={TD}>{row.email ?? <span className="text-[var(--ink-soft)]">no email</span>}</td>
                <td className={`${TD_CODE} max-w-[280px] truncate`}>{row.id}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminPanel>
  );
}
