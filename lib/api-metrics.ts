import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export type ApiRouteMetric = {
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  resultCount?: number | null;
  queryLength?: number | null;
  errorCode?: string | null;
};

function createMetricsClient() {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_LOCAL_API_METRICS !== "true"
  ) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function asNonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function isMissingMetricsTableError(error: { code?: string }) {
  // Match on the PostgREST/Postgres error CODE only. Matching on a message
  // substring like "api_route_metrics" would also swallow genuine
  // constraint-violation errors, whose constraints are all named
  // `api_route_metrics_*` — hiding real insert failures.
  return error.code === "42P01" || error.code === "PGRST205";
}

export async function recordApiRouteMetric(metric: ApiRouteMetric) {
  try {
    const supabase = createMetricsClient();
    if (!supabase) return;

    const { error } = await supabase.from("api_route_metrics").insert({
      route: metric.route.slice(0, 160),
      method: metric.method.slice(0, 12),
      status_code: metric.statusCode,
      duration_ms: asNonNegativeInteger(metric.durationMs),
      result_count:
        typeof metric.resultCount === "number"
          ? asNonNegativeInteger(metric.resultCount)
          : null,
      query_length:
        typeof metric.queryLength === "number"
          ? asNonNegativeInteger(metric.queryLength)
          : null,
      error_code: metric.errorCode ? metric.errorCode.slice(0, 80) : null,
    });

    if (error && !isMissingMetricsTableError(error)) {
      logger.warn("api metrics: failed to record route metric", {
        route: metric.route,
        statusCode: metric.statusCode,
        error,
      });
    }
  } catch (error) {
    // Telemetry must never break the request it is measuring. Callers wrap
    // this in `after()`, but guard here too so a bare/awaited caller is safe.
    logger.warn("api metrics: unexpected error recording route metric", {
      route: metric.route,
      error,
    });
  }
}

/**
 * Wrap a route handler so a metric is recorded on EVERY exit path — the timer
 * starts before the handler runs, and the `status_code` is read from the actual
 * Response returned (or 500 for an unhandled throw, which is then re-thrown so
 * behavior is unchanged). The insert is deferred via `after()`, so it adds no
 * client latency and is not dropped when the serverless invocation freezes.
 *
 * Use this for routes where latency + status is the signal. For richer per-call
 * fields (resultCount / queryLength) record inline instead — see
 * app/api/company-search/route.ts.
 */
export async function withRouteMetric<T extends Response>(
  route: string,
  method: string,
  handler: () => Promise<T | undefined>,
): Promise<T | undefined> {
  const startedAt = performance.now();
  try {
    const response = await handler();
    const durationMs = performance.now() - startedAt;
    // Handlers always return a Response at runtime; `?? 500` only guards the
    // `| undefined` TypeScript infers from Next's loose route-handler typing.
    const statusCode = response?.status ?? 500;
    after(() =>
      recordApiRouteMetric({
        route,
        method,
        durationMs,
        statusCode,
        errorCode: statusCode >= 400 ? `http_${statusCode}` : null,
      }),
    );
    return response;
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    after(() =>
      recordApiRouteMetric({
        route,
        method,
        durationMs,
        statusCode: 500,
        errorCode: "unhandled_exception",
      }),
    );
    throw error;
  }
}
