import { NextResponse } from "next/server";

import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_SESSION_SECONDS,
  createAdminAccessToken,
  isValidAdminPasscode,
} from "@/lib/admin-auth";
import { withRouteMetric } from "@/lib/api-metrics";
import { logger } from "@/lib/logger";

type Payload = {
  passcode?: string;
};

export async function POST(request: Request) {
  return withRouteMetric("/api/admin/login", "POST", () => handlePOST(request));
}

async function handlePOST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const passcode = (body.passcode ?? "").trim();

    if (!isValidAdminPasscode(passcode)) {
      return NextResponse.json(
        { ok: false, error: "Invalid passcode." },
        { status: 401 }
      );
    }

    // Signed with the passcode + service-role key (lib/admin-auth.ts); null
    // only when the service-role key is missing, which /admin can't run without.
    const token = createAdminAccessToken();
    if (!token) {
      logger.error("admin/login: cannot sign the access cookie — SUPABASE_SERVICE_ROLE_KEY missing");
      return NextResponse.json(
        { ok: false, error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_ACCESS_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ADMIN_SESSION_SECONDS,
      path: "/",
    });
    return response;
  } catch (err) {
    logger.warn("admin/login: invalid POST payload", { error: err });
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 }
    );
  }
}
