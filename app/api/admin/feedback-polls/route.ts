import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_ACCESS_COOKIE, hasAdminAccess } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { adminPollWriteSchema } from "@/lib/feedback-polls/types";

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return hasAdminAccess(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value);
}

// Create or update a poll definition. Body matches adminPollWriteSchema; if
// `id` is provided (via query param), the row is updated, otherwise inserted.
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = adminPollWriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid poll payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const updateId = url.searchParams.get("id");

  const supabase = createAdminClient();
  const row = {
    slug: parsed.data.slug,
    question_text: parsed.data.question_text,
    question_type: parsed.data.question_type,
    options: parsed.data.question_type === "rating_1_5" ? null : parsed.data.options,
    starts_at: parsed.data.starts_at,
    ends_at: parsed.data.ends_at,
    status: parsed.data.status,
  };

  if (updateId) {
    const { error } = await supabase
      .from("feedback_polls")
      .update(row)
      .eq("id", updateId);
    if (error) {
      logger.error("feedback-polls admin: update failed", { error, updateId });
      return NextResponse.json(
        { ok: false, error: "Unable to update poll." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, id: updateId });
  }

  const { data, error } = await supabase
    .from("feedback_polls")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    logger.error("feedback-polls admin: insert failed", { error });
    return NextResponse.json(
      { ok: false, error: "Unable to create poll." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
