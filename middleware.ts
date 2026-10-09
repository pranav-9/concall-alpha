import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * The portal is public — no auth enforcement here. The one job is keeping a
 * signed-in reader signed in: server components can't write cookies
 * (lib/supabase/server.ts swallows setAll), so without this an expired access
 * token is never rotated and the reader intermittently renders as logged out.
 * Anonymous requests carry no Supabase cookie and pass straight through. The
 * refresh makes no network call unless the token has actually expired; it runs
 * before every page, so keep it that way (see lib/supabase/middleware.ts).
 *
 * Prefetch requests are deliberately NOT excluded from the matcher: a prefetch
 * rendered with an expired token would rotate the refresh token server-side
 * without saving it, and the reader's next request could be signed out.
 */
export async function middleware(request: NextRequest) {
  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name);
  if (!hasSupabaseAuthCookie(cookieNames)) {
    return NextResponse.next({ request });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - ingest (PostHog reverse proxy — analytics traffic, no auth needed)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
