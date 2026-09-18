import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next-path";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only same-site paths; blocks open-redirect via absolute/protocol-relative URLs.
  const safeNext = safeNextPath(searchParams.get("next"), "/watchlists");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/error?error=${encodeURIComponent("Google sign-in failed. Please try again.")}`,
  );
}
