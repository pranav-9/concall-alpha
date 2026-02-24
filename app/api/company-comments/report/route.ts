import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyVisitorIdCookie, getOrCreateVisitorId } from "@/lib/visitor-id";

type Payload = {
  commentId?: string;
  reason?: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const commentId = (body.commentId ?? "").trim();
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;

    if (!UUID_REGEX.test(commentId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid commentId." },
        { status: 400 },
      );
    }

    if (reason && reason.length > 500) {
      return NextResponse.json(
        { ok: false, error: "reason cannot exceed 500 characters." },
        { status: 400 },
      );
    }

    const { visitorId, isNew } = await getOrCreateVisitorId();
    const supabase = await createClient();

    const { data: commentRow } = await supabase
      .from("company_comments")
      .select("id, reports_count, status")
      .eq("id", commentId)
      .maybeSingle();

    if (!commentRow || commentRow.status !== "visible") {
      return NextResponse.json(
        { ok: false, error: "Comment not found." },
        { status: 404 },
      );
    }

    const { data: existingReport } = await supabase
      .from("company_comment_reports")
      .select("id")
      .eq("comment_id", commentId)
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (!existingReport) {
      const { error: insertError } = await supabase.from("company_comment_reports").insert({
        comment_id: commentId,
        visitor_id: visitorId,
        reason,
      });

      if (!insertError) {
        await supabase
          .from("company_comments")
          .update({
            reports_count: Number(commentRow.reports_count ?? 0) + 1,
          })
          .eq("id", commentId);
      }
    }

    const response = NextResponse.json({
      ok: true,
      reported: true,
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
