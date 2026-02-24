import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyVisitorIdCookie, getOrCreateVisitorId } from "@/lib/visitor-id";

type Payload = {
  commentId?: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const commentId = (body.commentId ?? "").trim();
    if (!UUID_REGEX.test(commentId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid commentId." },
        { status: 400 },
      );
    }

    const { visitorId, isNew } = await getOrCreateVisitorId();
    const supabase = await createClient();

    const { data: commentRow, error: commentError } = await supabase
      .from("company_comments")
      .select("id, likes_count, status")
      .eq("id", commentId)
      .maybeSingle();

    if (commentError || !commentRow || commentRow.status !== "visible") {
      return NextResponse.json(
        { ok: false, error: "Comment not found." },
        { status: 404 },
      );
    }

    const { data: existingLike } = await supabase
      .from("company_comment_likes")
      .select("comment_id")
      .eq("comment_id", commentId)
      .eq("visitor_id", visitorId)
      .maybeSingle();

    let liked = false;
    if (existingLike) {
      await supabase
        .from("company_comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("visitor_id", visitorId);

      await supabase
        .from("company_comments")
        .update({
          likes_count: Math.max(Number(commentRow.likes_count ?? 0) - 1, 0),
        })
        .eq("id", commentId);
    } else {
      const { error: insertLikeError } = await supabase
        .from("company_comment_likes")
        .insert({
          comment_id: commentId,
          visitor_id: visitorId,
        });

      if (!insertLikeError) {
        await supabase
          .from("company_comments")
          .update({
            likes_count: Number(commentRow.likes_count ?? 0) + 1,
          })
          .eq("id", commentId);
        liked = true;
      }
    }

    const { data: refreshedRow } = await supabase
      .from("company_comments")
      .select("likes_count")
      .eq("id", commentId)
      .single();

    const response = NextResponse.json({
      ok: true,
      liked,
      likesCount: Number(refreshedRow?.likes_count ?? 0),
    });

    if (isNew) {
      applyVisitorIdCookie(response, visitorId);
    }

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}
