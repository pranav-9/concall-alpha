import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { cookies, headers } from "next/headers";

import { getUnifiedUpdates } from "@/lib/activity-feed";
import { ADMIN_ACCESS_COOKIE, hasAdminAccess } from "@/lib/admin-auth";
import {
  HOMEPAGE_ACTIVITY_FEED_TAG,
  toHomepageActivityFeedUpsert,
} from "@/lib/homepage-activity-feed";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidRefreshSecret(value: string | null): boolean {
  const expected = process.env.HOMEPAGE_ACTIVITY_REFRESH_SECRET;
  if (!expected || !value) return false;

  const expectedBuf = Buffer.from(expected);
  const valueBuf = Buffer.from(value);
  if (expectedBuf.length !== valueBuf.length) return false;

  return timingSafeEqual(expectedBuf, valueBuf);
}

export async function POST() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const access = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshSecret = headerStore.get("x-homepage-activity-refresh-secret");
  if (!hasAdminAccess(access) && !isValidRefreshSecret(refreshSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    logger.error("refresh-homepage-activity: missing service-role env", { error });
    return NextResponse.json(
      { ok: false, error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  let updates;
  try {
    updates = await getUnifiedUpdates({
      limit: 50,
      collapseSameCompanyRuns: false,
      supabaseClient: supabase,
    });
  } catch (error) {
    logger.error("refresh-homepage-activity: feed build failed", { error });
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to build homepage activity feed.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  const refreshedAt = new Date().toISOString();
  const rows = updates.map((update) =>
    toHomepageActivityFeedUpsert(update, refreshedAt),
  );

  if (rows.length === 0) {
    revalidateTag(HOMEPAGE_ACTIVITY_FEED_TAG);
    return NextResponse.json({ ok: true, refreshed: 0, deletedStale: 0 });
  }

  const { error: upsertError, count } = await supabase
    .from("homepage_activity_feed")
    .upsert(rows, { onConflict: "id", count: "exact" });

  if (upsertError) {
    logger.error("refresh-homepage-activity: upsert failed", { error: upsertError });
    return NextResponse.json(
      { ok: false, error: "Failed to upsert homepage_activity_feed." },
      { status: 500 },
    );
  }

  const activeIds = rows.map((row) => row.id);
  const { error: deleteError, count: deleteCount } = await supabase
    .from("homepage_activity_feed")
    .delete({ count: "exact" })
    .not("id", "in", `(${activeIds.map((id) => `"${id.replaceAll('"', '""')}"`).join(",")})`);

  if (deleteError) {
    logger.warn("refresh-homepage-activity: stale row delete failed", { error: deleteError });
  }

  revalidateTag(HOMEPAGE_ACTIVITY_FEED_TAG);

  return NextResponse.json({
    ok: true,
    refreshed: count ?? rows.length,
    deletedStale: deleteError ? null : deleteCount ?? 0,
  });
}
