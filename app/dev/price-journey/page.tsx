import fs from "node:fs";
import path from "node:path";

import Link from "next/link";
import { notFound } from "next/navigation";

import { formatShortDate } from "@/app/company/[code]/page-helpers";
import { PriceJourneySection } from "@/app/company/components/price-journey-section";
import { SectionCard, SectionUpdatedAt } from "@/app/company/components/section-card";
import { normalizePricePhases } from "@/lib/price-phases/normalize";
import { createClient } from "@/lib/supabase/server";

// Dev-only preview harness for the Price journey block. Reads the price_phases_v1
// sandbox JSON that concallyser/scripts/price_phases.py writes to
// /tmp/sandbox_price_phases/<CODE>.json, so the block can be checked before the rows are
// promoted (`&source=live` reads the promoted row). Cases worth opening: a long history
// with eight phases (MCX, TIMETECHNO), a loss stretch with no split (PAYTM, SAMHI), a
// young listing on daily bars (KSHINTL), a standalone basis (E2E).
const SANDBOX_DIR = process.env.PRICE_PHASES_SANDBOX_DIR ?? "/tmp/sandbox_price_phases";

function sandboxCodes(): string[] {
  try {
    return fs
      .readdirSync(SANDBOX_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
  } catch {
    return [];
  }
}

function readSandbox(code: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(SANDBOX_DIR, `${code}.json`), "utf8"));
  } catch {
    return null;
  }
}

export default async function PriceJourneyPreview({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; source?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { company, source } = await searchParams;
  const codes = sandboxCodes();
  const active = company && /^[A-Z0-9&_-]+$/.test(company) ? company : (codes[0] ?? "TIMETECHNO");

  const supabase = await createClient();
  const [{ data: companyRow }, { data: liveRow }] = await Promise.all([
    supabase.from("company").select("name").eq("code", active).maybeSingle(),
    source === "live"
      ? supabase.from("price_phases").select("company_code, as_of, payload").eq("company_code", active).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const payload = source === "live" ? ((liveRow as { payload?: unknown } | null)?.payload ?? null) : readSandbox(active);
  const result = normalizePricePhases(payload ? { company_code: active, payload } : null);
  const name = (companyRow as { name?: string } | null)?.name ?? active;

  return (
    <main className="mx-auto max-w-[1180px] px-3 py-8 sm:px-6">
      <div className="mb-5 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Price journey · preview (dev only) · {source === "live" ? "live row" : `sandbox ${SANDBOX_DIR}`}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{name}</h1>
        <nav aria-label="Preview company" className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {codes.map((code) => (
            <Link
              key={code}
              href={`/dev/price-journey?company=${encodeURIComponent(code)}${source === "live" ? "&source=live" : ""}`}
              aria-current={code === active ? "page" : undefined}
              className={`rounded-md border px-2 py-1 text-xs ${
                code === active ? "border-violet-600 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {code}
            </Link>
          ))}
        </nav>
      </div>
      {!result ? (
        <p className="text-sm text-muted-foreground">No payload for {active}.</p>
      ) : !result.ok ? (
        <p className="text-sm text-rose-600">Payload rejected by lib/price-phases/types.ts: {result.error}</p>
      ) : (
        <SectionCard
          id="price-journey"
          title="Price journey"
          headerAction={<SectionUpdatedAt date={formatShortDate(result.data.asOf)} />}
        >
          {result.data.stale ? (
            <p className="text-sm text-muted-foreground">
              Being refreshed: the last prices here are from {formatShortDate(result.data.asOf)}.
            </p>
          ) : (
            <PriceJourneySection data={result.data} companyLabel={name} />
          )}
        </SectionCard>
      )}
    </main>
  );
}
