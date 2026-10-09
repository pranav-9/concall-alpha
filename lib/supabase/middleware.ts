import { createServerClient } from "@supabase/ssr/dist/module/createServerClient";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip middleware check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getSession(). A simple mistake could make it very hard to
  // debug issues with users being randomly logged out.

  // IMPORTANT: If you remove this refresh and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  // Refresh only — the portal is public, so there is no redirect-to-login
  // here and nothing in this file decides who may see what. getSession() reads
  // the session from the cookies and, only when the access token has expired,
  // rotates it; setAll() above writes the new cookies onto the response. It
  // does not verify the token, which is fine precisely because this is
  // refresh-only: every access decision (sign-up gates, watchlists) reads
  // verified claims through lib/supabase/auth-state.ts instead. This used to
  // call getClaims(), which also verifies — a network call to Supabase Auth on
  // every signed-in request while the project signed tokens with the legacy
  // HS256 secret. A Supabase blip must never take a page down: fall through and
  // let the request render with whatever session it had.
  try {
    await supabase.auth.getSession();
  } catch {
    return NextResponse.next({ request });
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
