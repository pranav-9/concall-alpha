import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

type Payload = {
  companyCode?: string;
};

export async function POST(request: Request) {
  try {
    return await addWatchlistItem(request);
  } catch (err) {
    logger.warn("watchlists/items: invalid POST payload", { error: err });
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    return await removeWatchlistItem(request);
  } catch (err) {
    logger.warn("watchlists/items: invalid DELETE payload", { error: err });
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}

async function resolveWatchlistContext(request: Request) {
  const body = (await request.json()) as Payload;
  const companyCode = (body.companyCode ?? "").trim().toUpperCase();

  if (companyCode.length < 1 || companyCode.length > 32) {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: "Invalid company code." },
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

  const ip = await getClientIp();
  const limit = await checkRateLimit(supabase, {
    scope: "watchlist-items",
    identifier: `user:${userId}|ip:${ip}`,
    limit: 30,
    windowSeconds: 60,
  });
  if (!limit.allowed) {
    return {
      errorResponse: rateLimitResponse(limit),
    } as const;
  }

  const { data: watchlistRows, error: watchlistError } = await supabase
    .from("watchlists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (watchlistError) {
    logger.error("supabase: failed to load watchlists for items op", {
      userId,
      error: watchlistError,
    });
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: "Unable to load watchlists." },
        { status: 500 },
      ),
    } as const;
  }

  const firstWatchlist = watchlistRows?.[0] as { id: number } | undefined;
  if (!firstWatchlist) {
    return {
      errorResponse: NextResponse.json(
        { ok: false, error: "Create a watchlist first.", code: "watchlist_missing" },
        { status: 400 },
      ),
    } as const;
  }

  return { supabase, companyCode, firstWatchlist } as const;
}

async function addWatchlistItem(request: Request) {
  const context = await resolveWatchlistContext(request);
  if ("errorResponse" in context) return context.errorResponse;

  const { supabase, companyCode, firstWatchlist } = context;

  const { data: existingItems, error: existingError } = await supabase
    .from("watchlist_items")
    .select("id")
    .eq("watchlist_id", firstWatchlist.id)
    .eq("company_code", companyCode)
    .limit(1);

  if (existingError) {
    logger.error("supabase: failed to load watchlist_items", {
      error: existingError,
    });
    return NextResponse.json(
      { ok: false, error: "Unable to load watchlist items." },
      { status: 500 },
    );
  }

  if ((existingItems?.length ?? 0) > 0) {
    return NextResponse.json({
      ok: true,
      added: false,
      alreadyExists: true,
    });
  }

  const { error: insertError } = await supabase.from("watchlist_items").insert({
    watchlist_id: firstWatchlist.id,
    company_code: companyCode,
  });

  if (insertError) {
    logger.error("supabase: failed to insert watchlist_item", {
      watchlistId: firstWatchlist.id,
      companyCode,
      error: insertError,
    });
    return NextResponse.json(
      { ok: false, error: "Unable to add company to watchlist." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    added: true,
    alreadyExists: false,
  });
}

async function removeWatchlistItem(request: Request) {
  const context = await resolveWatchlistContext(request);
  if ("errorResponse" in context) return context.errorResponse;

  const { supabase, companyCode, firstWatchlist } = context;

  const { data: existingItems, error: existingError } = await supabase
    .from("watchlist_items")
    .select("id")
    .eq("watchlist_id", firstWatchlist.id)
    .eq("company_code", companyCode)
    .limit(1);

  if (existingError) {
    logger.error("supabase: failed to load watchlist_items", {
      error: existingError,
    });
    return NextResponse.json(
      { ok: false, error: "Unable to load watchlist items." },
      { status: 500 },
    );
  }

  if ((existingItems?.length ?? 0) === 0) {
    return NextResponse.json({
      ok: true,
      removed: false,
      notFound: true,
    });
  }

  const { error: deleteError } = await supabase
    .from("watchlist_items")
    .delete()
    .eq("watchlist_id", firstWatchlist.id)
    .eq("company_code", companyCode);

  if (deleteError) {
    logger.error("supabase: failed to delete watchlist_item", {
      watchlistId: firstWatchlist.id,
      companyCode,
      error: deleteError,
    });
    return NextResponse.json(
      { ok: false, error: "Unable to remove company from watchlist." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    removed: true,
    notFound: false,
  });
}
