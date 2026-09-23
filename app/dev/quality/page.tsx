import fs from "node:fs";
import path from "node:path";

import Link from "next/link";
import { notFound } from "next/navigation";

import { QualitySection } from "@/app/company/components/quality-section";
import { formatShortDate } from "@/app/company/[code]/page-helpers";
import { normalizeCompanyQuality } from "@/lib/company-quality/normalize";
import { normalizeMoatAnalysis } from "@/lib/moat-analysis/normalize";
import type { MoatAnalysisRow } from "@/lib/moat-analysis/types";
import { createClient } from "@/lib/supabase/server";

// Dev-only preview harness for the Quality tab. Reads the company_quality_v1
// sandbox JSON that concallyser/scripts/scrape_screener_quality.py writes to
// /tmp/sandbox_quality/<CODE>.json (so the tab can be checked before the row is
// promoted) and the real moat row from Supabase. Pick companies that exercise
// the branches: net cash vs levered, a loss year, a bank / broker, short history.
const SANDBOX_DIR = process.env.QUALITY_SANDBOX_DIR ?? "/tmp/sandbox_quality";

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

export default async function QualityPreview({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; source?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { company, source } = await searchParams;
  const codes = sandboxCodes();
  const active = company && /^[A-Z0-9&-]+$/.test(company) ? company : (codes[0] ?? "TDPOWERSYS");

  const supabase = await createClient();
  const [{ data: moatRows }, { data: companyRow }, { data: liveRow }] = await Promise.all([
    supabase
      .from("moat_analysis")
      .select(
        "id, company_code, company_name, industry, rating, tier, gatekeeper_answer, cycle_tested, assessment_payload, assessment_version, created_at, updated_at",
      )
      .eq("company_code", active)
      .limit(1),
    supabase.from("company").select("name").eq("code", active).maybeSingle(),
    source === "live"
      ? supabase.from("company_quality").select("company_code, generated_at, payload").eq("company_code", active).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const moat = normalizeMoatAnalysis((moatRows?.[0] as MoatAnalysisRow | undefined) ?? null);
  const payload = source === "live" ? (liveRow as { payload?: unknown } | null)?.payload ?? null : readSandbox(active);
  const quality = normalizeCompanyQuality(
    payload
      ? {
          company_code: active,
          payload,
          generated_at: (payload as { source?: { scraped_at?: string } }).source?.scraped_at ?? null,
        }
      : null,
  );
  const name = (companyRow as { name?: string } | null)?.name ?? active;

  return (
    <main className="mx-auto max-w-[1180px] px-3 py-8 sm:px-6">
      <div className="mb-5 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Quality tab · preview (dev only) · {source === "live" ? "live row" : `sandbox ${SANDBOX_DIR}`}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{name}</h1>
        <nav aria-label="Preview company" className="flex flex-wrap gap-2">
          {codes.map((code) => (
            <Link
              key={code}
              href={`/dev/quality?company=${code}${source === "live" ? "&source=live" : ""}`}
              aria-current={code === active ? "page" : undefined}
              className={`rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                code === active
                  ? "border-emerald-600 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {code}
            </Link>
          ))}
        </nav>
      </div>
      <QualitySection
        companyCode={active}
        companyName={name}
        quality={quality}
        qualityGeneratedAtShort={formatShortDate(quality?.generatedAtRaw)}
        moat={moat}
        moatGeneratedAtShort={formatShortDate(moat?.updatedAtRaw)}
      />
    </main>
  );
}
