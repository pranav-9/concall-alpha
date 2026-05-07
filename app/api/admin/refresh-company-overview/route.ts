import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { cookies, headers } from "next/headers";

import { ADMIN_ACCESS_COOKIE, hasAdminAccess } from "@/lib/admin-auth";
import {
  buildCompanyPageOverviewCacheRow,
  companyOverviewCacheTag,
  toCompanyPageOverviewUpsert,
} from "@/lib/company-overview-cache";
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

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    return [maybeError.message, maybeError.details, maybeError.hint, maybeError.code]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" | ") || JSON.stringify(error);
  }
  return String(error);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const access = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshSecret = headerStore.get("x-homepage-activity-refresh-secret");
  if (!hasAdminAccess(access) && !isValidRefreshSecret(refreshSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { companyCode?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const companyCode = typeof body.companyCode === "string" ? body.companyCode.trim().toUpperCase() : "";
  if (!companyCode) {
    return NextResponse.json(
      { ok: false, error: "companyCode is required." },
      { status: 400 },
    );
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    logger.error("refresh-company-overview: missing service-role env", { error });
    return NextResponse.json(
      { ok: false, error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  let overview;
  try {
    overview = await buildCompanyPageOverviewCacheRow(supabase, companyCode);
  } catch (error) {
    logger.error("refresh-company-overview: build failed", { companyCode, error });
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to build company overview.",
        detail: errorDetail(error),
      },
      { status: 500 },
    );
  }

  if (!overview) {
    return NextResponse.json(
      { ok: false, error: "Company not found or has no overview data." },
      { status: 404 },
    );
  }

  const { error } = await supabase
    .from("company_page_overview_cache")
    .upsert(toCompanyPageOverviewUpsert(overview), { onConflict: "company_code" });

  if (error) {
    logger.error("refresh-company-overview: upsert failed", { companyCode, error });
    return NextResponse.json(
      { ok: false, error: "Failed to upsert company_page_overview_cache." },
      { status: 500 },
    );
  }

  revalidateTag(companyOverviewCacheTag(companyCode));

  return NextResponse.json({
    ok: true,
    companyCode,
    refreshedAt: overview.refreshed_at,
  });
}
