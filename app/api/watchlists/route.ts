import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

type Payload = {
  name?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const name = (body.name ?? "").trim();

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { ok: false, error: "Watchlist name must be 2–80 characters." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const userId =
      !claimsError && typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const ip = await getClientIp();
    const limit = await checkRateLimit(supabase, {
      scope: "watchlists:post",
      identifier: `user:${userId}|ip:${ip}`,
      limit: 10,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) {
      return rateLimitResponse(limit);
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("watchlists")
      .select("id, name")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (existingError) {
      logger.error("supabase: failed to load watchlists", {
        userId,
        error: existingError,
      });
      return NextResponse.json(
        { ok: false, error: "Unable to load watchlists." },
        { status: 500 },
      );
    }

    const existing = existingRows?.[0] as { id: number; name: string } | undefined;
    if (existing) {
      return NextResponse.json({
        ok: true,
        watchlistId: existing.id,
        name: existing.name,
        existing: true,
      });
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from("watchlists")
      .insert({
        user_id: userId,
        name,
      })
      .select("id, name")
      .single();

    if (insertError || !insertedRow) {
      logger.error("supabase: failed to create watchlist", {
        userId,
        error: insertError,
      });
      return NextResponse.json(
        { ok: false, error: "Unable to create watchlist." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      watchlistId: insertedRow.id,
      name: insertedRow.name,
      existing: false,
    });
  } catch (err) {
    logger.warn("watchlists: invalid POST payload", { error: err });
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}
