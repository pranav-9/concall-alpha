import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

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
    });
  } catch (err) {
    logger.warn("watchlists: invalid POST payload", { error: err });
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}
