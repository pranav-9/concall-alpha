import Link from "next/link";

import { AdminDailyVisitorsChart } from "@/components/admin/admin-daily-visitors-chart";
import { FreshnessBoard } from "@/components/admin/freshness-board";
import {
  AdminAlert,
  AdminNote,
  AdminPanel,
  AdminShell,
  AdminStat,
  AdminStatRow,
  ADMIN_SECTIONS,
  DATA_LOAD_ERROR,
  EYEBROW,
} from "@/components/admin/shell";
import { getPipelineFreshness, type FreshnessFeed } from "@/lib/admin/freshness";
import { getOverviewData, type OverviewData } from "@/lib/admin/queries";
import { adminHref, parseRange, resolveWindow } from "@/lib/admin/range";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SECTION_BLURBS: Record<string, string> = {
  accounts: "who signed up, when",
  companies: "which company pages get opened",
  watchlists: "saves, lists, who is building what",
  requests: "feedback, bug reports, stock asks",
  api: "route latency and error rates",
  polls: "author and read feedback polls",
  ops: "refresh feeds, sync the calendar, export",
};

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams)?.range);
  const window = resolveWindow(range);
  const now = new Date();

  let data: OverviewData | null = null;
  let feeds: FreshnessFeed[] = [];
  let error: string | null = null;
  try {
    const supabase = createAdminClient();
    [data, feeds] = await Promise.all([getOverviewData(window), getPipelineFreshness(supabase)]);
  } catch {
    error = DATA_LOAD_ERROR;
  }

  return (
    <AdminShell
      section="overview"
      range={range}
      title="Overview"
      lede="The portal in one read: who is coming, what they open, and whether every feed behind the pages is on cadence."
    >
      {error ? <AdminAlert>{error}</AdminAlert> : null}

      {data ? (
        <>
          <AdminStatRow columns={5}>
            <AdminStat label="Unique visitors" value={data.visitors.current} delta={data.visitors} range={range} />
            <AdminStat
              label="Sign-ups"
              value={data.accounts.current}
              delta={data.accounts}
              range={range}
              note={`${data.accountsTotal.toLocaleString("en-IN")} accounts all time`}
            />
            <AdminStat label="Company opens" value={data.companyOpens.current} delta={data.companyOpens} range={range} />
            <AdminStat label="Watchlists created" value={data.watchlists.current} delta={data.watchlists} range={range} />
            <AdminStat label="Requests" value={data.requests.current} delta={data.requests} range={range} />
          </AdminStatRow>
          {range === "all" ? (
            <AdminNote>All time has no prior window, so the cells carry no change line.</AdminNote>
          ) : null}

          <AdminDailyVisitorsChart data={data.series} capped={data.seriesCapped} />
        </>
      ) : null}

      <FreshnessBoard feeds={feeds} now={now} />

      <AdminPanel eyebrow="Sections">
        <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {ADMIN_SECTIONS.filter((s) => s.key !== "overview").map((s) => (
            <li key={s.key}>
              <Link href={adminHref(s.href, range)} prefetch={false} className="group block py-1">
                <span className={`${EYEBROW} group-hover:text-[var(--signal)]`}>{s.label}</span>
                <span className="mt-0.5 block text-[13px] text-[var(--ink-soft)]">{SECTION_BLURBS[s.key]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </AdminPanel>
    </AdminShell>
  );
}
