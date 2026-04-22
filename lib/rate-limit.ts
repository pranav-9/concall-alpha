import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string | null;
  limit: number;
};

export type RateLimitConfig = {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "unknown";
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  { scope, identifier, limit, windowSeconds }: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = `${scope}:${identifier}`;
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail open: we'd rather let requests through than 500 the whole endpoint
    // if the rate-limit table/function is misconfigured. The error is logged
    // so it shows up in monitoring.
    logger.error("rate_limit rpc failed (fail-open)", { scope, error });
    return { allowed: true, remaining: limit, resetAt: null, limit };
  }

  const row = Array.isArray(data)
    ? (data[0] as { allowed?: boolean; remaining?: number; reset_at?: string } | undefined)
    : (data as { allowed?: boolean; remaining?: number; reset_at?: string } | null);

  return {
    allowed: Boolean(row?.allowed),
    remaining: Number(row?.remaining ?? 0),
    resetAt: row?.reset_at ?? null,
    limit,
  };
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (result.resetAt) {
    const resetMs = Date.parse(result.resetAt);
    if (Number.isFinite(resetMs)) {
      const retryAfter = Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
      headers["Retry-After"] = String(retryAfter);
      headers["X-RateLimit-Reset"] = String(Math.floor(resetMs / 1000));
    }
  }
  return NextResponse.json(
    { ok: false, error: "Too many requests. Try again shortly." },
    { status: 429, headers },
  );
}
