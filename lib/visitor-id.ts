import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const VISITOR_COOKIE_NAME = "visitor_id";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getOrCreateVisitorId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  if (existing) {
    return { visitorId: existing, isNew: false as const };
  }

  return { visitorId: randomUUID(), isNew: true as const };
}

export function applyVisitorIdCookie(response: NextResponse, visitorId: string) {
  response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });
}
