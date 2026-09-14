import { createClient } from "@supabase/supabase-js";

import { createRetryingFetch } from "./fetch-with-retry";

// Shared by every public-read client: reads retry a transient gateway failure
// instead of failing the page (or, at build time, the whole deploy).
const retryingFetch = createRetryingFetch();

export function createPublicReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase public read environment variables.");
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: { fetch: retryingFetch },
  });
}
