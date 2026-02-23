import { NextResponse } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_ACCESS_COOKIE_VALUE,
  isValidAdminPasscode,
} from "@/lib/admin-auth";

type Payload = {
  passcode?: string;
};

export async function POST(request: Request) {
  try {
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
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 }
    );
  }
}
