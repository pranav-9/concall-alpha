import fs from "node:fs";
import path from "node:path";

import Link from "next/link";
import { notFound } from "next/navigation";

import { GuidanceHistorySection } from "@/app/company/components/guidance-history-section";
import { GuidanceHeaderPills } from "@/app/company/components/guidance-header-pills";
import { currentReportingQuarter } from "@/lib/current-quarter";
import { normalizeGuidanceSnapshot } from "@/lib/guidance-snapshot/normalize";
import { parseForwardStrength, type GuidanceSnapshotRow } from "@/lib/guidance-snapshot/types";
import { buildEvidenceByKey } from "@/lib/guidance-tracking/horizon-split";
import { buildGuidanceVerdict } from "@/lib/guidance-tracking/verdict";

// Dev-only preview harness for the Guidance tab off a deep-track WORKSPACE, not
// Supabase — so a sandbox that has not been promoted (a horizons backfill, a
// fresh /company-deep-track run) can be checked in the real section first.
// Reads <root>/<CODE>/sandbox/guid_<CODE>.json (the guidance_snapshot payload)
// and guidance_tracking_<CODE>.json (per-thread evidence_class), exactly what
// guidance_strength_score.py --apply would promote. Pick companies that
// exercise the branches: both horizons, this-year only, long-term only, and a
// v1 workspace (no horizons → the single whole-book card).
const TRACK_DIR =
  process.env.GUIDANCE_TRACK_DIR ?? path.resolve(process.cwd(), "../concallyser/data/analysis/guidance_track");

function workspaceCodes(): string[] {
  try {
    return fs
      .readdirSync(TRACK_DIR)
      .filter((code) => fs.existsSync(path.join(TRACK_DIR, code, "sandbox", `guid_${code}.json`)))
      .sort();
  } catch {
    return [];
  }
}

function readJson(file: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

type Sandbox = Record<string, unknown>;

export default async function GuidanceStrengthPreview({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { company } = await searchParams;
  const codes = workspaceCodes();
  const active = codes.find((c) => c === company?.toUpperCase()) ?? codes[0] ?? null;

  const sandboxDir = active ? path.join(TRACK_DIR, active, "sandbox") : null;
  const snap = sandboxDir ? (readJson(path.join(sandboxDir, `guid_${active}.json`)) as Sandbox | null) : null;
  const trackingRows = sandboxDir
    ? ((readJson(path.join(sandboxDir, `guidance_tracking_${active}.json`)) as Sandbox[] | null) ?? [])
    : [];

  // The sandbox keeps the non-promoted blocks at top level; store_guidance_snapshot
  // routes them into `details`. Rebuild the stored row shape so the same
  // normalizer + parser the company page uses run here unchanged.
  const row: GuidanceSnapshotRow | null =
    snap && active
      ? {
          company_code: active,
          generated_at: (snap.generated_at as string | undefined) ?? null,
          analysis_window_quarters: (snap.analysis_window_quarters as number | undefined) ?? null,
          guidance_items: snap.guidance_items,
          source_files: snap.source_files,
          details: {
            forward_strength: snap.forward_strength,
            strategy_narrative: snap.strategy_narrative,
            deep_track: snap.deep_track,
          },
          updated_at: (snap.generated_at as string | undefined) ?? null,
        }
      : null;
  const normalized = normalizeGuidanceSnapshot(row);
  const forwardStrength = parseForwardStrength(normalized?.details ?? null);
  const evidenceByKey = buildEvidenceByKey(
    trackingRows.map((r) => ({
      guidance_key: r.guidance_key,
      evidence_class: (r.details as Record<string, unknown> | undefined)?.evidence_class,
    })),
  );
  const items = normalized?.guidanceItems ?? [];
  const current = currentReportingQuarter();
  const verdict = items.length > 0 ? buildGuidanceVerdict(items, current, snap?.credibility_verdict) : null;
  const horizons = forwardStrength?.horizons;
  const shape = !forwardStrength
    ? "no forward_strength → credibility-first layout"
    : !horizons
      ? "v1 (no horizons) → single whole-book card"
      : horizons.thisYear && horizons.longTerm
        ? `two horizon cards · anchor ${horizons.anchorFyLabel}`
        : horizons.thisYear
          ? `this-year card only · anchor ${horizons.anchorFyLabel}`
          : `long-term card only · anchor ${horizons.anchorFyLabel}`;

  return (
    <main className="mx-auto max-w-5xl px-3 py-8 sm:px-6">
      <div className="mb-5 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Guidance · strength-by-horizon preview (dev only) · {TRACK_DIR}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{active ?? "No workspace found"}</h1>
        <p className="text-sm text-muted-foreground">{shape}</p>
        <nav aria-label="Preview company" className="flex flex-wrap gap-1.5">
          {codes.map((code) => (
            <Link
              key={code}
              href={`/dev/guidance-strength?company=${code}`}
              aria-current={code === active ? "page" : undefined}
              className={`rounded-md border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                code === active ? "border-sky-600 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {code}
            </Link>
          ))}
        </nav>
      </div>
      <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Guidance</h2>
          {verdict ? <GuidanceHeaderPills verdict={verdict} /> : null}
        </div>
        {items.length > 0 ? (
          <GuidanceHistorySection
            items={items}
            sourceFiles={normalized?.sourceFiles}
            currentQtr={current}
            forwardStrength={forwardStrength}
            evidenceByKey={evidenceByKey}
            credibilityVerdict={snap?.credibility_verdict}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No guidance items in this sandbox.</p>
        )}
      </section>
    </main>
  );
}
