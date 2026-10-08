import { adminPage } from "@/components/admin/admin-page";
import { FreshnessBoard } from "@/components/admin/freshness-board";
import { OpsActions } from "@/components/admin/ops-actions";
import { AdminAlert, AdminShell, DATA_LOAD_ERROR } from "@/components/admin/shell";
import { getPipelineFreshness, type FreshnessFeed } from "@/lib/admin/freshness";
import { parseRange } from "@/lib/admin/range";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function AdminOpsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams)?.range);
  const now = new Date();

  let feeds: FreshnessFeed[] = [];
  let error: string | null = null;
  try {
    feeds = await getPipelineFreshness(createAdminClient());
  } catch {
    error = DATA_LOAD_ERROR;
  }

  return (
    <AdminShell
      section="ops"
      range={range}
      title="Ops"
      lede="Every action the panel can take, beside the freshness read that says whether it is needed. Each one calls an existing admin route."
      timeless
    >
      {error ? <AdminAlert>{error}</AdminAlert> : null}
      <FreshnessBoard feeds={feeds} now={now} />
      <OpsActions range={range} />
    </AdminShell>
  );
}

// Gated inside the page, before any query — see components/admin/admin-page.tsx.
export default adminPage(AdminOpsPage);
