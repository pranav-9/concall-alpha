import { cache } from "react";

import type { ReaderClaims } from "@/lib/reader-identity";
import { createClient } from "@/lib/supabase/server";

/**
 * "Who is reading?" asked once per request. React `cache()` dedupes it across
 * every server component in the render — the navbar, the company page's
 * watchlist slot and each gated panel all need the answer, and each sits in its
 * own Suspense boundary, so calling it there (not at the top of the page) keeps
 * the shell streaming for signed-in readers while the token verifies.
 *
 * Cheap only because the project signs tokens with asymmetric (ES256) keys:
 * getClaims() then verifies the signature locally against the cached public
 * keys. Under the legacy shared HS256 secret it cannot, and it silently falls
 * back to a getUser() network round trip to Supabase Auth on every call — which
 * is what slowed every signed-in page in Sep–Oct 2026. Keep the project on
 * asymmetric signing keys, and read "who is reading" through here rather than
 * calling getUser().
 *
 * Any failure reads as anonymous: a Supabase blip shows the sign-up gate, it
 * never takes the page down.
 */
export const getReaderClaims = cache(async (): Promise<ReaderClaims | null> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    return claims && typeof claims.sub === "string" ? claims : null;
  } catch {
    return null;
  }
});

export async function getAuthenticatedUserId(): Promise<string | null> {
  return (await getReaderClaims())?.sub ?? null;
}

export async function getIsAuthenticated(): Promise<boolean> {
  return (await getAuthenticatedUserId()) !== null;
}
