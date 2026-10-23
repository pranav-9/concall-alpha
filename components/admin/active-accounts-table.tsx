import { describeAge } from "@/lib/admin/freshness";
import { ACTIVITY_SOURCE_LABELS, formatIst, type AccountPages, type ActiveAccountRow } from "@/lib/admin/metrics";

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
            <th className={TH}>Pages</th>
            <th className={TH_NUM}>Saves</th>
            <th className={TH}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <AdminEmpty colSpan={6}>No account was active in this range.</AdminEmpty>
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
                <td className={TD}>
                  <PagesCell pages={row.pages} now={now} />
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

/** "N views · M pages", opening to each page, most recently visited first. */
function PagesCell({ pages, now }: { pages: AccountPages | null | undefined; now: Date }) {
  if (!pages) return <span className="text-[var(--ink-soft)]">–</span>;
  if (pages.views === 0) return <span className="house-data text-[12px] text-[var(--ink-soft)]">none tracked</span>;
  return (
    <details className="group">
      <summary className="house-data cursor-pointer whitespace-nowrap text-[12px] text-[var(--ink)] marker:text-[var(--ink-soft)]">
        {pages.views} {pages.views === 1 ? "view" : "views"} · {pages.pages.length}{" "}
        {pages.pages.length === 1 ? "page" : "pages"}
      </summary>
      <ul className="mt-1.5 max-h-64 space-y-0.5 overflow-y-auto pr-1">
        {pages.pages.map((page) => (
          <li key={page.path} className="flex items-baseline gap-2 text-[12px]">
            <a
              href={page.path}
              target="_blank"
              rel="noreferrer"
              title={page.path}
              className="house-data max-w-[260px] truncate text-[var(--ink)] hover:underline"
            >
              {page.path}
            </a>
            {page.views > 1 ? <span className="house-data text-[var(--ink-soft)]">×{page.views}</span> : null}
            <span className="house-data ml-auto whitespace-nowrap text-[11px] text-[var(--ink-soft)]">
              {describeAge(page.lastAt, now)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
