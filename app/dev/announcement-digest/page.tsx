import fs from "node:fs";
import path from "node:path";

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AnnouncementPlainCards,
  AnnouncementSynthesisCards,
} from "@/app/company/components/company-announcements-section";
import { normalizeAnnouncementDigest } from "@/lib/announcement-digest/normalize";
import type { AnnouncementDigestRow } from "@/lib/announcement-digest/types";
import { getCompanyExchangeDeskData } from "@/lib/exchange-desk";
import { createClient } from "@/lib/supabase/server";

// Dev-only preview for the Announcements tab's synthesis cards. Reads the
// announcement_digest_v1 sandbox record that
// concallyser/scripts/synthesize_announcements.py writes to
// /tmp/sandbox_announcement_digest/<CODE>.json (so a digest can be checked
// before it is promoted), or the promoted row with ?source=live, and paints it
// over the company's real tape. Pick companies that exercise the branches:
// a clear rule pick, a model pick, a neutral-only window (no "biggest"), a
// company with a scale anchor, and one whose tape moved since the digest.
const SANDBOX_DIR = process.env.ANNOUNCEMENT_DIGEST_SANDBOX_DIR ?? "/tmp/sandbox_announcement_digest";

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

function readSandbox(code: string): { status?: string; error?: string | null; payload?: unknown } | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(SANDBOX_DIR, `${code}.json`), "utf8"));
  } catch {
    return null;
  }
}

export default async function AnnouncementDigestPreview({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; source?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { company, source } = await searchParams;
  const codes = sandboxCodes();
  const active = company && /^[A-Z0-9&_-]+$/.test(company) ? company : (codes[0] ?? "HFCL");

  const supabase = await createClient();
  const [{ data: companyRow }, { data: liveRow }, tape] = await Promise.all([
    supabase.from("company").select("name").eq("code", active).maybeSingle(),
    source === "live"
      ? supabase
          .from("company_announcement_digest")
          .select("company_code, payload, generated_at, substrate_hash, model, updated_at")
          .eq("company_code", active)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getCompanyExchangeDeskData(active, null),
  ]);
  const name = (companyRow as { name?: string } | null)?.name ?? active;

  const sandbox = source === "live" ? null : readSandbox(active);
  const row: AnnouncementDigestRow | null =
    source === "live"
      ? ((liveRow as AnnouncementDigestRow | null) ?? null)
      : sandbox?.payload
        ? { company_code: active, payload: sandbox.payload }
        : null;
  const result = normalizeAnnouncementDigest(row);

  return (
    <main className="mx-auto max-w-[1180px] px-3 py-8 sm:px-6">
      <div className="mb-5 space-y-3">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Dev preview · Announcements synthesis cards · {source === "live" ? "promoted row" : "sandbox"}
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          {name} <span className="text-muted-foreground">({active})</span>
        </h1>
        <p className="flex flex-wrap gap-2 text-xs">
          {codes.map((code) => (
            <Link
              key={code}
              href={`/dev/announcement-digest?company=${encodeURIComponent(code)}`}
              className={code === active && source !== "live" ? "font-semibold text-foreground" : "text-muted-foreground"}
            >
              {code}
            </Link>
          ))}
          <Link href={`/dev/announcement-digest?company=${encodeURIComponent(active)}&source=live`} className="text-muted-foreground">
            [live]
          </Link>
        </p>
        {sandbox && sandbox.status !== "ok" ? (
          <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
            Sandbox status <span className="font-medium text-foreground">{sandbox.status}</span>
            {sandbox.error ? ` — ${sandbox.error}` : ""}. The tab renders its plain cards.
          </p>
        ) : null}
        {result.error ? (
          <p className="rounded-md border border-dashed border-[var(--alarm)] p-3 text-xs text-[var(--alarm)]">
            {result.error}
          </p>
        ) : null}
      </div>
      <div className="house-tokens">
        {result.digest ? (
          <AnnouncementSynthesisCards digest={result.digest} data={tape} />
        ) : (
          <AnnouncementPlainCards data={tape} />
        )}
      </div>
    </main>
  );
}
