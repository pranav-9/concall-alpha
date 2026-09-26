import Link from "next/link";
import { notFound } from "next/navigation";
import { KeyVariablesSection } from "@/app/company/components/key-variables-section";
import { SectionCard } from "@/app/company/components/section-card";
import { normalizeKeyVariablesSnapshot } from "@/lib/key-variables-snapshot/normalize";
import type { KeyVariablesSnapshotRow } from "@/lib/key-variables-snapshot/types";
import { createClient } from "@/lib/supabase/server";
import {
  keyVariablesPreview7a,
  keyVariablesPreviewLegacy,
} from "@/tests/fixtures/key-variables-preview";

/**
 * Dev-only preview of the Key Variables section.
 *   /dev/key-variables                → the 7a fixture (every new field populated)
 *   /dev/key-variables?state=legacy   → a live-shaped row with none of the new fields
 *   /dev/key-variables?state=live&company=CODE → the promoted row for a company
 */
export default async function KeyVariablesPreview({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; company?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { state = "7a", company } = await searchParams;

  let row: KeyVariablesSnapshotRow | null = keyVariablesPreview7a;
  if (state === "legacy") row = keyVariablesPreviewLegacy;
  if (state === "live") {
    const code = (company ?? "VINYAS").toUpperCase();
    const supabase = await createClient();
    const { data } = await supabase
      .from("key_variables_snapshot")
      .select(
        "company_code, generated_at, discovery_summary, full_variable_list, deep_treatment, section_synthesis, details, updated_at",
      )
      .eq("company_code", code)
      .order("generated_at", { ascending: false })
      .limit(1);
    row = (data?.[0] as KeyVariablesSnapshotRow | undefined) ?? null;
  }
  const snapshot = normalizeKeyVariablesSnapshot(row);

  const states = [
    { key: "7a", label: "7a fixture", href: "/dev/key-variables" },
    { key: "legacy", label: "Legacy shape", href: "/dev/key-variables?state=legacy" },
    { key: "live", label: `Live · ${(company ?? "VINYAS").toUpperCase()}`, href: `/dev/key-variables?state=live&company=${company ?? "VINYAS"}` },
  ];

  return (
    <main className="mx-auto max-w-6xl px-3 py-8 sm:px-6">
      <div className="mb-5 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Key Variables · desktop refresh (7a)
        </p>
        <nav aria-label="Preview state" className="flex flex-wrap gap-2">
          {states.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.key === state ? "page" : undefined}
              className={`rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                item.key === state
                  ? "border-violet-600 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <SectionCard id="key-variables" title="Key Variables">
        {snapshot ? (
          <KeyVariablesSection
            snapshot={snapshot}
            companyCode={snapshot.companyCode}
            companyName={snapshot.companyCode === "VINYAS" ? "Vinyas Innovative Technologies" : null}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No snapshot for this state.</p>
        )}
      </SectionCard>
    </main>
  );
}
