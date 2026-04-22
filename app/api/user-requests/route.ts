import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

type RequestType =
  | "feedback"
  | "stock_addition"
  | "bug_report"
  | "missing_section";

type Payload = {
  requestType?: string;
  subjectTarget?: string;
  message?: string;
  sourcePath?: string;
};

const requestTypes = new Set<RequestType>([
  "feedback",
  "stock_addition",
  "bug_report",
  "missing_section",
]);

function validate(payload: Payload) {
  const requestType = payload.requestType as RequestType | undefined;
  const subjectTarget = (payload.subjectTarget ?? "").trim();
  const message = (payload.message ?? "").trim();
  const sourcePath = typeof payload.sourcePath === "string" ? payload.sourcePath : null;

  if (!requestType || !requestTypes.has(requestType)) {
    return { ok: false as const, error: "Invalid request type." };
  }
  if (subjectTarget.length < 2 || subjectTarget.length > 120) {
    return { ok: false as const, error: "subjectTarget must be 2–120 characters." };
  }
  return {
    ok: true as const,
    requestType,
    subjectTarget,
    message,
    sourcePath,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const parsed = validate(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: parsed.error },
        { status: 400 }
      );
    }

    const h = await headers();
    const userAgent = h.get("user-agent");
    const requestId = crypto.randomUUID();

    const supabase = await createClient();

    const ip = await getClientIp();
    const limit = await checkRateLimit(supabase, {
      scope: "user-requests:post",
      identifier: `ip:${ip}`,
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) {
      return rateLimitResponse(limit);
    }

    const { error } = await supabase
      .from("user_requests")
      .insert({
        id: requestId,
        request_type: parsed.requestType,
        subject_target: parsed.subjectTarget,
        message: parsed.message,
        source_path: parsed.sourcePath,
        user_agent: userAgent,
      });

    if (error) {
      logger.error("supabase: failed to store user_request", {
        requestType: parsed.requestType,
        error,
      });
      return NextResponse.json(
        { ok: false, error: "Unable to store request." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: requestId });
  } catch (err) {
    logger.warn("user-requests: invalid POST payload", { error: err });
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 }
    );
  }
}
