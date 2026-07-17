import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getOwnHosts, normalizeExternalReferrer, sanitizeUtmValue } from "@/lib/attribution";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { applyVisitorIdCookie, getOrCreateVisitorId } from "@/lib/visitor-id";

type Payload = {
  path?: string;
  companyCode?: string | null;
  // Attribution fields are optional: bundles deployed before 2026-07 POST only
  // the two fields above, and attribution is best-effort — sanitized, never 400.
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
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
    // The request's own Referer header is always this app's page — the real
    // acquisition referrer is the client-reported document.referrer.
    const referrer = normalizeExternalReferrer(body.referrer, getOwnHosts(process.env));

    const supabase = await createClient();
    const { error: insertError } = await supabase.from("page_view_events").insert({
      visitor_id: visitorId,
      path: parsed.path,
      company_code: parsed.companyCode,
      user_agent: userAgent,
      referrer,
      utm_source: sanitizeUtmValue(body.utmSource),
      utm_medium: sanitizeUtmValue(body.utmMedium),
      utm_campaign: sanitizeUtmValue(body.utmCampaign),
      utm_content: sanitizeUtmValue(body.utmContent),
      utm_term: sanitizeUtmValue(body.utmTerm),
    });

    if (insertError) {
      logger.error("supabase: failed to insert page_view_event", {
        path: parsed.path,
        companyCode: parsed.companyCode,
        error: insertError,
      });
    }

    const response = NextResponse.json({ ok: true });
    if (isNew) {
      applyVisitorIdCookie(response, visitorId);
    }

    return response;
  } catch (err) {
    logger.warn("track/page-view: invalid POST payload", { error: err });
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 }
    );
  }
}
