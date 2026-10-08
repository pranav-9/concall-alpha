import { describeAge } from "@/lib/admin/freshness";
import { ACTIVITY_SOURCE_LABELS, formatIst, type ActiveAccountRow } from "@/lib/admin/metrics";

import { AdminEmpty, AdminPanel, AdminTag } from "./shell";
import { TABLE, TD, TD_NUM, TD_TIME, TH, TH_NUM } from "./tokens";

const SOURCE_TONE = { session: "signal", sign_in: "muted", watchlist: "warn" } as const;

const SOURCE_TITLE = {
  session: "Last page load while signed in, to within about an hour",
  sign_in: "Last fresh sign-in; the account may have been back since without signing in again",
  watchlist: "Last watchlist created or company saved",
} as const;

export function ActiveAccountsTable({ rows, now }: { rows: ActiveAccountRow[]; now: Date }) {
  return (
    <AdminPanel eyebrow="Recently active" flush right={<span>last visit, sign-in or watchlist write</span>}>
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>Last active (IST)</th>
            <th className={TH}>Account</th>
            <th className={TH}>Via</th>
            <th className={TH_NUM}>Saves</th>
            <th className={TH}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <AdminEmpty colSpan={5}>No account was active in this range.</AdminEmpty>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className={TD_TIME}>
                  <span className="text-[var(--ink)]">{describeAge(row.lastActiveAt, now)}</span>
                  <span className="hidden sm:inline"> · {formatIst(row.lastActiveAt, now)}</span>
                </td>
                <td className={TD}>
                  <span className="whitespace-nowrap">
                    {row.displayName ?? row.email ?? (
                      <span className="house-data text-[12px] text-[var(--ink-soft)]">{row.id}</span>
                    )}
                  </span>
                  {row.displayName && row.email ? (
                    <span className="house-data block whitespace-nowrap text-[11px] text-[var(--ink-soft)] sm:ml-2 sm:inline">
                      {row.email}
                    </span>
                  ) : null}
                </td>
                <td className={TD}>
                  <AdminTag tone={SOURCE_TONE[row.source]} title={SOURCE_TITLE[row.source]}>
                    {ACTIVITY_SOURCE_LABELS[row.source]}
                  </AdminTag>
                </td>
                <td className={`${TD_NUM} ${row.saves === 0 ? "text-[var(--ink-soft)]" : ""}`}>{row.saves}</td>
                <td className={TD_TIME}>{formatIst(row.createdAt, now).split(",")[0]}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminPanel>
  );
}
