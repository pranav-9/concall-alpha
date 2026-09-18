import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * "Who is reading?" asked once per request. React `cache()` dedupes it across
 * every server component in the render — the company page's watchlist slot and
 * each gated panel all need the answer, and each sits in its own Suspense
 * boundary, so calling it there (not at the top of the page) keeps the shell
 * streaming for signed-in readers while the token verifies.
 *
 * Any failure reads as anonymous: a Supabase blip shows the sign-up gate, it
 * never takes the page down.
 */
export const getAuthenticatedUserId = cache(async (): Promise<string | null> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  } catch {
    return null;
  }
});

export async function getIsAuthenticated(): Promise<boolean> {
  return (await getAuthenticatedUserId()) !== null;
}
