import Link from "next/link";

import { formatIst } from "@/lib/admin/metrics";
import type { CompanyViewRow, RecentCompanyOpenRow } from "@/lib/admin-company-views";

import { AdminEmpty, AdminPanel, AdminTag } from "./shell";
import { ROW_HOVER, TABLE, TD, TD_CODE, TD_NUM, TD_TIME, TH, TH_NUM } from "./tokens";

export function CompanyViewsTable({ rows }: { rows: CompanyViewRow[] }) {
  const max = rows[0]?.opens ?? 0;
  return (
    <AdminPanel eyebrow="Most opened companies" flush right={<span>page opens, not unique visitors</span>}>
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={`${TH} w-10`}>#</th>
            <th className={TH}>Company</th>
            <th className={TH}>Code</th>
            <th className={TH_NUM}>Opens</th>
            <th className={`${TH} hidden w-40 sm:table-cell`} aria-label="Share of the top company" />
            <th className={TH_NUM}>Last opened (IST)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <AdminEmpty colSpan={6}>No company pages opened in this range.</AdminEmpty>
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
                <td className={TD_NUM}>{row.opens.toLocaleString("en-IN")}</td>
                <td className={`${TD} hidden sm:table-cell`}>
                  <div className="h-1.5 w-full rounded-full bg-[var(--paper)]">
                    <div
                      className="h-1.5 rounded-full bg-[var(--signal)]"
                      style={{ width: `${max > 0 ? Math.max(2, (row.opens / max) * 100) : 0}%` }}
                    />
                  </div>
                </td>
                <td className={`${TD_TIME} text-right`}>{formatIst(row.lastViewed)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminPanel>
  );
}

export function RecentCompanyOpensTable({ rows }: { rows: RecentCompanyOpenRow[] }) {
  return (
    <AdminPanel eyebrow="Recent company opens" flush right={<span>Source = external referrer, else Direct</span>}>
      <table className={TABLE}>
        <thead>
          <tr>
            <th className={TH}>Opened (IST)</th>
            <th className={TH}>Company</th>
            <th className={TH}>Code</th>
            <th className={TH}>Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <AdminEmpty colSpan={4}>No recent company opens in this range.</AdminEmpty>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className={TD_TIME}>{formatIst(row.occurredAt)}</td>
                <td className={TD}>{row.companyName ?? row.companyCode}</td>
                <td className={TD_CODE}>{row.companyCode}</td>
                <td className={TD}>
                  {row.source === "Direct" ? (
                    <span className="text-[var(--ink-soft)]">Direct</span>
                  ) : (
                    <AdminTag tone="signal">{row.source}</AdminTag>
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
