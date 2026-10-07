import Link from "next/link";

import type { TopSavedCompanyRow } from "@/lib/admin/metrics";

import { AdminEmpty, AdminPanel } from "./shell";
import { ROW_HOVER, TABLE, TD, TD_CODE, TD_NUM, TH, TH_NUM } from "./tokens";

export type { TopSavedCompanyRow };

export function TopSavedCompaniesTable({ rows }: { rows: TopSavedCompanyRow[] }) {
  return (
    <AdminPanel eyebrow="Most saved companies" flush>
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={`${TH} w-10`}>#</th>
            <th className={TH}>Company</th>
            <th className={TH}>Code</th>
            <th className={TH_NUM}>Saves</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <AdminEmpty colSpan={4}>No companies saved in this range.</AdminEmpty>
          ) : (
            rows.map((row, index) => (
              <tr key={row.companyCode} className={ROW_HOVER}>
                <td className={TD_CODE}>{index + 1}</td>
                <td className={TD}>
                  <Link href={`/company/${row.companyCode}`} prefetch={false} className="hover:text-[var(--signal)]">
                    {row.companyName ?? row.companyCode}
                  </Link>
                </td>
                <td className={TD_CODE}>{row.companyCode}</td>
                <td className={TD_NUM}>{row.savedCount.toLocaleString("en-IN")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminPanel>
  );
}
