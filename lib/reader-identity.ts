// "Who is reading" reduced to what the reader pages and the navbar need. Kept
// free of Next.js and Supabase imports so the contract is pinned by
// tests/reader-identity.test.ts; the request-scoped wiring lives in
// lib/supabase/auth-state.ts and lib/watchlist-codes.ts.

/** The verified token claims the portal reads. Only `sub` is guaranteed. */
export type ReaderClaims = {
  sub: string;
  email?: string;
  user_metadata?: { full_name?: unknown; avatar_url?: unknown; [key: string]: unknown };
};

export type ReaderWatchlist = {
  /** The verified reader, or null when signed out or the auth check failed. */
  userId: string | null;
  /** Every company code on the reader's watchlists; null when signed out. */
  codes: string[] | null;
};

/**
 * The reader and their watchlist codes in one call, so a page can start it in
 * the same Promise.all as its data reads instead of awaiting the auth check
 * first.
 *
 * The two failures stay apart: an auth failure reads as signed out, but a
 * watchlist failure keeps the reader signed in with an empty list. A blip in
 * the watchlist query must never put a signed-in reader behind the sign-up gate.
 */
export async function resolveReaderWatchlist(deps: {
  getUserId: () => Promise<string | null>;
  getCodes: (userId: string) => Promise<string[]>;
}): Promise<ReaderWatchlist> {
  let userId: string | null;
  try {
    userId = await deps.getUserId();
  } catch {
    return { userId: null, codes: null };
  }
  if (!userId) return { userId: null, codes: null };
  try {
    return { userId, codes: await deps.getCodes(userId) };
  } catch {
    return { userId, codes: [] };
  }
}

export type NavbarUser = {
  email: string | null;
  name: string | null;
  avatar: string | null;
};

/** The navbar's signed-in user, read off the verified token claims. */
export function navbarUserFromClaims(claims: ReaderClaims | null | undefined): NavbarUser | null {
  if (!claims || typeof claims.sub !== "string" || claims.sub === "") return null;
  const meta = claims.user_metadata ?? {};
  return {
    email: textOrNull(claims.email),
    name: textOrNull(meta.full_name),
    avatar: textOrNull(meta.avatar_url),
  };
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
