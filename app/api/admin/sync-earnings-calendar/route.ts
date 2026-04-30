import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_ACCESS_COOKIE, hasAdminAccess } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";
import { fetchNseEvents } from "@/lib/nse-event-calendar";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CompanyRow = { code: string; name: string | null };

const normalizeKey = (s: string | null | undefined) =>
  s?.trim().toUpperCase().replace(/\s+/g, " ") ?? "";

const buildCompanyMatcher = (companies: CompanyRow[]) => {
  const byCode = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const c of companies) {
    const codeKey = normalizeKey(c.code);
    if (codeKey) byCode.set(codeKey, c.code);
    const nameKey = normalizeKey(c.name);
    if (nameKey) byName.set(nameKey, c.code);
  }
  return (nseSymbol: string, nseName: string | null): string | null => {
    const symbolKey = normalizeKey(nseSymbol);
    if (symbolKey && byCode.has(symbolKey)) return byCode.get(symbolKey)!;
    const nameKey = normalizeKey(nseName);
    if (nameKey && byName.has(nameKey)) return byName.get(nameKey)!;
    return null;
  };
};

export async function POST() {
  const cookieStore = await cookies();
  const access = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  if (!hasAdminAccess(access)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    logger.error("sync-earnings-calendar: missing service-role env", { error: err });
    return NextResponse.json(
      { ok: false, error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  let fetched;
  try {
    fetched = await fetchNseEvents();
  } catch (err) {
    logger.error("sync-earnings-calendar: NSE fetch failed", { error: err });
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch NSE event calendar.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  const { data: companyData, error: companyError } = await supabase
    .from("company")
    .select("code, name");
  if (companyError) {
    logger.error("sync-earnings-calendar: company fetch failed", { error: companyError });
    return NextResponse.json(
      { ok: false, error: "Could not load companies for matching." },
      { status: 500 },
    );
  }

  const matchCompany = buildCompanyMatcher((companyData ?? []) as CompanyRow[]);
  const now = new Date().toISOString();

  const upsertRows = fetched.events.map((evt) => ({
    nse_symbol: evt.symbol,
    company_name: evt.companyName,
    company_code: matchCompany(evt.symbol, evt.companyName),
    event_date: evt.eventDate,
    purpose: evt.purpose,
    description: evt.description,
    inferred_fy: evt.inferredFy,
    inferred_qtr: evt.inferredQtr,
    source: "nse",
    raw: evt.raw,
    fetched_at: now,
    updated_at: now,
  }));

  const { error: upsertError, count } = await supabase
    .from("earnings_calendar")
    .upsert(upsertRows, { onConflict: "nse_symbol,event_date", count: "exact" });

  if (upsertError) {
    logger.error("sync-earnings-calendar: upsert failed", { error: upsertError });
    return NextResponse.json(
      { ok: false, error: "Failed to upsert earnings_calendar." },
      { status: 500 },
    );
  }

  const matched = upsertRows.filter((r) => r.company_code).length;
  return NextResponse.json({
    ok: true,
    rawCount: fetched.rawCount,
    resultEvents: upsertRows.length,
    upserted: count ?? upsertRows.length,
    matchedToCompanies: matched,
  });
}
