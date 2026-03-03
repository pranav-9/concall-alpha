import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  companyCode?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const companyCode = (body.companyCode ?? "").trim().toUpperCase();

    if (companyCode.length < 1 || companyCode.length > 32) {
      return NextResponse.json(
        { ok: false, error: "Invalid company code." },
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

    const { data: watchlistRows, error: watchlistError } = await supabase
      .from("watchlists")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (watchlistError) {
      return NextResponse.json(
        { ok: false, error: "Unable to load watchlists." },
        { status: 500 },
      );
    }

    const firstWatchlist = watchlistRows?.[0] as { id: number } | undefined;
    if (!firstWatchlist) {
      return NextResponse.json(
        { ok: false, error: "Create a watchlist first.", code: "watchlist_missing" },
        { status: 400 },
      );
    }

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
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}
