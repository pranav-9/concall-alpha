import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { applyVisitorIdCookie, getOrCreateVisitorId } from "@/lib/visitor-id";
import {
  multiSelectWithinCapNormalized,
  responseKindMatchesQuestionType,
  responsePayloadSchema,
  type FeedbackPollRow,
} from "@/lib/feedback-polls/types";
import { normalizePoll } from "@/lib/feedback-polls/normalize";

function sanitizeSourcePath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  if (!input.startsWith("/")) return null;
  if (input.length > 240) return null;
  return input;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = responsePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid response shape." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Fetch the currently-active poll. The poll_id in the payload must match
  // — otherwise the user is responding to a poll that is no longer live.
  const { data: activeRow, error: activeError } = await supabase
    .rpc("get_active_feedback_poll")
    .maybeSingle();

  if (activeError) {
    logger.error("feedback-polls /respond: active poll lookup failed", {
      error: activeError,
    });
    return NextResponse.json(
      { ok: false, error: "Unable to verify poll status." },
      { status: 500 },
    );
  }

  const activePoll = normalizePoll(activeRow as FeedbackPollRow | null);
  if (!activePoll || activePoll.id !== parsed.data.poll_id) {
    return NextResponse.json(
      { ok: false, error: "This poll is no longer active." },
      { status: 400 },
    );
  }

  // Kind must match question_type, and multi_select must respect the cap.
  if (
    !responseKindMatchesQuestionType(
      parsed.data.response_value.kind,
      activePoll.questionType,
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "Response kind does not match poll question type." },
      { status: 400 },
    );
  }

  if (
    parsed.data.response_value.kind === "multi_select" &&
    activePoll.options.kind === "multi_select" &&
    !multiSelectWithinCapNormalized(parsed.data.response_value, activePoll.options)
  ) {
    return NextResponse.json(
      { ok: false, error: "Too many options selected." },
      { status: 400 },
    );
  }

  const h = await headers();
  const userAgent = h.get("user-agent");
  const { visitorId, isNew } = await getOrCreateVisitorId();
  const sourcePath = sanitizeSourcePath(parsed.data.source_path);

  const { error: insertError } = await supabase
    .from("feedback_poll_responses")
    .insert({
      poll_id: parsed.data.poll_id,
      visitor_id: visitorId,
      response_value: parsed.data.response_value,
      source_path: sourcePath,
      user_agent: userAgent,
    });

  if (insertError) {
    logger.error("feedback-polls /respond: insert failed", {
      error: insertError,
      pollId: parsed.data.poll_id,
    });
    return NextResponse.json(
      { ok: false, error: "Unable to store response." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  if (isNew) {
    applyVisitorIdCookie(response, visitorId);
  }
  return response;
}
