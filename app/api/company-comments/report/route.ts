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
  reason?: string;
};

type ReportRow = {
  reports_count: number | null;
  already_reported: boolean;
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

    const ip = await getClientIp();
    const limit = await checkRateLimit(supabase, {
      scope: "comments:report",
      identifier: `ip:${ip}|v:${visitorId}`,
      limit: 10,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) {
      return rateLimitResponse(limit);
    }

    const { data, error } = await supabase.rpc("report_company_comment", {
      p_comment_id: commentId,
      p_visitor_id: visitorId,
      p_reason: reason,
    });

    if (error) {
      if (error.code === "P0002") {
        return NextResponse.json(
          { ok: false, error: "Comment not found." },
          { status: 404 },
        );
      }
      logger.error("supabase rpc: report_company_comment failed", {
        commentId,
        error,
      });
      return NextResponse.json(
        { ok: false, error: "Unable to record report." },
        { status: 500 },
      );
    }

    const row = Array.isArray(data) ? (data[0] as ReportRow | undefined) : (data as ReportRow | null);
    const response = NextResponse.json({
      ok: true,
      reported: true,
      alreadyReported: Boolean(row?.already_reported),
      reportsCount: Number(row?.reports_count ?? 0),
    });

    if (isNew) {
      applyVisitorIdCookie(response, visitorId);
    }

    return response;
  } catch (err) {
    logger.warn("company-comments/report: invalid POST payload", { error: err });
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}
