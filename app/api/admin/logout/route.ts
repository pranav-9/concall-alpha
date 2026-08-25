import { NextResponse } from "next/server";
import { ADMIN_ACCESS_COOKIE } from "@/lib/admin-auth";
import { withRouteMetric } from "@/lib/api-metrics";

export async function POST() {
  return withRouteMetric("/api/admin/logout", "POST", () => handlePOST());
}

async function handlePOST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
