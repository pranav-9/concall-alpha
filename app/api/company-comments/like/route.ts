import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { applyVisitorIdCookie, getOrCreateVisitorId } from "@/lib/visitor-id";

type Payload = {
  commentId?: string;
};

type ToggleRow = {
  liked: boolean;
  likes_count: number | null;
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

    const ip = await getClientIp();
    const limit = await checkRateLimit(supabase, {
      scope: "comments:like",
      identifier: `ip:${ip}|v:${visitorId}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      return rateLimitResponse(limit);
    }

    const { data, error } = await supabase.rpc("toggle_company_comment_like", {
      p_comment_id: commentId,
      p_visitor_id: visitorId,
    });

    if (error) {
      if (error.code === "P0002") {
        return NextResponse.json(
          { ok: false, error: "Comment not found." },
          { status: 404 },
        );
      }
      logger.error("supabase rpc: toggle_company_comment_like failed", {
        commentId,
        error,
      });
      return NextResponse.json(
        { ok: false, error: "Unable to toggle like." },
        { status: 500 },
      );
    }

    const row = Array.isArray(data) ? (data[0] as ToggleRow | undefined) : (data as ToggleRow | null);
    const response = NextResponse.json({
      ok: true,
      liked: Boolean(row?.liked),
      likesCount: Number(row?.likes_count ?? 0),
    });

    if (isNew) {
      applyVisitorIdCookie(response, visitorId);
    }

    return response;
  } catch (err) {
    logger.warn("company-comments/like: invalid POST payload", { error: err });
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}
