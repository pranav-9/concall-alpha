import { logger } from "@/lib/logger";

// Retries transient Supabase gateway failures on READ requests.
//
// Since 2026-09-13 Supabase's API gateway (sb-gateway-version 2, marked
// "degraded performance" on status.supabase.com) intermittently answers
// Vercel's build machines with Gateway Timeout, Bad Gateway or "Failed to get
// project config". The build prerenders `/` and `/company` against live data and
// their loaders re-throw, so a single blip failed the whole deploy (5 of 60
// deploys between 2026-09-13 and 09-14; none in the ten days before). Reads are
// idempotent, so a short retry absorbs a blip. A real outage still fails, after
// the last attempt. Writes and RPC posts are never retried.

const DEFAULT_DELAYS_MS = [300, 1000, 2500] as const;

// The gateway's own failure, as opposed to a PostgREST error (which carries a
// `code`). Matched on the message so it is retried whatever status it comes with.
const GATEWAY_CONFIG_ERROR = "Failed to get project config";

type FetchFn = typeof fetch;

export type RetryingFetchOptions = {
  /** Defaults to the global fetch, resolved per call (Next.js patches it). */
  fetchImpl?: FetchFn;
  /** Pause before each retry; its length is the retry count. */
  delaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (info: { attempt: number; url: string; reason: string }) => void;
};

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  return method.toUpperCase();
}

function urlOf(input: RequestInfo | URL): string {
  const raw = input instanceof Request ? input.url : String(input);
  // Path only — the query string can be long and isn't needed to spot a blip.
  return raw.split("?")[0];
}

async function transientReason(res: Response): Promise<string | null> {
  if (res.status >= 500) return `HTTP ${res.status}`;
  if (res.ok) return null;
  try {
    const body = (await res.clone().json()) as { message?: unknown; code?: unknown };
    return body?.message === GATEWAY_CONFIG_ERROR && body.code == null
      ? `HTTP ${res.status} ${GATEWAY_CONFIG_ERROR}`
      : null;
  } catch {
    return null;
  }
}

export function createRetryingFetch(options: RetryingFetchOptions = {}): FetchFn {
  const delays = options.delaysMs ?? DEFAULT_DELAYS_MS;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const onRetry =
    options.onRetry ??
    ((info) => logger.warn("supabase-fetch: transient failure on a read; retrying", info));

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const doFetch = options.fetchImpl ?? globalThis.fetch;
    const method = methodOf(input, init);
    if (method !== "GET" && method !== "HEAD") return doFetch(input, init);

    for (let attempt = 0; ; attempt++) {
      const isLast = attempt >= delays.length;
      let reason: string;
      try {
        const res = await doFetch(input, init);
        const transient = isLast ? null : await transientReason(res);
        if (!transient) return res;
        reason = transient;
        // Release the discarded body without awaiting: cancelling a cloned
        // (tee'd) stream only settles once every branch is cancelled.
        void res.body?.cancel().catch(() => {});
      } catch (err) {
        if (isLast || init?.signal?.aborted) throw err;
        reason = err instanceof Error ? err.message : String(err);
      }
      onRetry({ attempt: attempt + 1, url: urlOf(input), reason });
      await sleep(delays[attempt]);
    }
  }) as FetchFn;
}
