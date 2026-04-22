import { NextResponse } from "next/server";

import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_ACCESS_COOKIE_VALUE,
  isValidAdminPasscode,
} from "@/lib/admin-auth";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  passcode?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const ip = await getClientIp();
    const limit = await checkRateLimit(supabase, {
      scope: "admin:login",
      identifier: `ip:${ip}`,
      limit: 10,
      windowSeconds: 15 * 60,
    });
    if (!limit.allowed) {
      return rateLimitResponse(limit);
    }

    const body = (await request.json()) as Payload;
    const passcode = (body.passcode ?? "").trim();

    if (!isValidAdminPasscode(passcode)) {
      return NextResponse.json(
        { ok: false, error: "Invalid passcode." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_ACCESS_COOKIE, ADMIN_ACCESS_COOKIE_VALUE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12,
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
