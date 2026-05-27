import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchPayload = {
  name?: string;
};

async function resolveWatchlist(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const watchlistId = Number.parseInt(rawId, 10);

  if (!Number.isFinite(watchlistId) || watchlistId <= 0) {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: "Invalid watchlist id." },
        { status: 400 },
      ),
    } as const;
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId =
    !claimsError && typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  if (!userId) {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      ),
    } as const;
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("watchlists")
    .select("id")
    .eq("id", watchlistId)
    .eq("user_id", userId)
    .limit(1);

  if (existingError) {
    logger.error("supabase: failed to load watchlist for [id] op", {
      userId,
      watchlistId,
      error: existingError,
    });
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: "Unable to load watchlist." },
        { status: 500 },
      ),
    } as const;
  }

  if (!existingRows?.[0]) {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: "Watchlist not found.", code: "watchlist_missing" },
        { status: 404 },
      ),
    } as const;
  }

  return { supabase, watchlistId, userId, request } as const;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const resolved = await resolveWatchlist(request, context);
    if ("errorResponse" in resolved) return resolved.errorResponse;

    const { supabase, watchlistId, userId } = resolved;
    const body = (await request.json()) as PatchPayload;
    const name = (body.name ?? "").trim();

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { ok: false, error: "Watchlist name must be 2–80 characters." },
        { status: 400 },
      );
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from("watchlists")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", watchlistId)
      .eq("user_id", userId)
      .select("id, name")
      .single();

    if (updateError || !updatedRow) {
      logger.error("supabase: failed to rename watchlist", {
        userId,
        watchlistId,
        error: updateError,
      });
      return NextResponse.json(
        { ok: false, error: "Unable to rename watchlist." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      watchlistId: updatedRow.id,
      name: updatedRow.name,
    });
  } catch (err) {
    logger.warn("watchlists/[id]: invalid PATCH payload", { error: err });
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const resolved = await resolveWatchlist(request, context);
  if ("errorResponse" in resolved) return resolved.errorResponse;

  const { supabase, watchlistId, userId } = resolved;

  const { error: deleteError } = await supabase
    .from("watchlists")
    .delete()
    .eq("id", watchlistId)
    .eq("user_id", userId);

  if (deleteError) {
    logger.error("supabase: failed to delete watchlist", {
      userId,
      watchlistId,
      error: deleteError,
    });
    return NextResponse.json(
      { ok: false, error: "Unable to delete watchlist." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, deleted: true });
}
