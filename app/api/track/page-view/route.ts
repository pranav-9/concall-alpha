import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { applyVisitorIdCookie, getOrCreateVisitorId } from "@/lib/visitor-id";

type Payload = {
  path?: string;
  companyCode?: string | null;
};

const PATH_REGEX = /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@/?%]*$/;
const COMPANY_CODE_REGEX = /^[A-Za-z0-9._-]{1,24}$/;

function validate(body: Payload) {
  const path = (body.path ?? "").trim();
  const companyCode = body.companyCode?.trim() || null;

  if (!path || path.length > 2048 || !PATH_REGEX.test(path)) {
    return { ok: false as const, error: "Invalid path." };
  }

  if (companyCode && !COMPANY_CODE_REGEX.test(companyCode)) {
    return { ok: false as const, error: "Invalid company code." };
  }

  return { ok: true as const, path, companyCode };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const parsed = validate(body);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }

    const { visitorId, isNew } = await getOrCreateVisitorId();

    const h = await headers();
    const userAgent = h.get("user-agent");
    const referrer = h.get("referer");

    const supabase = await createClient();
    await supabase.from("page_view_events").insert({
      visitor_id: visitorId,
      path: parsed.path,
      company_code: parsed.companyCode,
      user_agent: userAgent,
      referrer,
    });

    const response = NextResponse.json({ ok: true });
    if (isNew) {
      applyVisitorIdCookie(response, visitorId);
    }

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 }
    );
  }
}
