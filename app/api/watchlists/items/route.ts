import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  companyCode?: string;
};

export async function POST(request: Request) {
  try {
    return await addWatchlistItem(request);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    return await removeWatchlistItem(request);
  } catch {
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

  const { data: watchlistRows, error: watchlistError } = await supabase
    .from("watchlists")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (watchlistError) {
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
