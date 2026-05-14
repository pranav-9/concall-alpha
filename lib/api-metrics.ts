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

function isMissingMetricsTableError(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("api_route_metrics") === true
  );
}

export async function recordApiRouteMetric(metric: ApiRouteMetric) {
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
}
