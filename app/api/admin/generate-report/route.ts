import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_ACCESS_COOKIE, hasAdminAccess } from "@/lib/admin-auth";
import {
  generateAdminReport,
  parseRange,
} from "@/lib/admin-analytics-report";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  if (!hasAdminAccess(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const range = parseRange(request.nextUrl.searchParams.get("range"));

  let markdown: string;
  let filename: string;
  try {
    const result = await generateAdminReport(range);
    markdown = result.markdown;
    filename = result.filename;
  } catch (error) {
    logger.error("generate-report: failed", { error });
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to generate admin report.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }

  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
