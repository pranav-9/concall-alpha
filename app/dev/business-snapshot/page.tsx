import { notFound } from "next/navigation";
import { BusinessSnapshotSection } from "@/app/company/components/business-snapshot-section";
import { normalizeBusinessSnapshot } from "@/lib/business-snapshot/normalize";
import { profileSourceSchema } from "@/lib/business-snapshot/profile";
import { businessProfilePreview } from "@/tests/fixtures/business-profile-preview";
import neuland from "@/data/business-profile-drafts/NEULANDLAB.json";
import cartrade from "@/data/business-profile-drafts/CARTRADE.json";
import aeroflex from "@/data/business-profile-drafts/AEROFLEX.json";
import vinyas from "@/data/business-profile-drafts/VINYAS.json";
import astramicro from "@/data/business-profile-drafts/ASTRAMICRO.json";
import Link from "next/link";

const companyDrafts = [neuland, cartrade, aeroflex, vinyas, astramicro];

export default async function BusinessSnapshotPreview({ searchParams }: {
  searchParams: Promise<{ state?: string; company?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { state, company } = await searchParams;
  const draft = companyDrafts.find((item) => item.company === company) ?? neuland;
  const isPublished = draft.review_status === "user_approved";
  const aboutSources = (draft.about_sources ?? []).filter((source) => profileSourceSchema.safeParse(source).success);
  const isTestState = state === "legacy" || state === "empty" || state === "synthetic";
  const companyCode = isTestState ? "EXAMPLE" : draft.company;
  const companyName = isTestState ? "Example Components" : draft.company_name;
  const payload = state === "legacy" ? { about_company: { about_short: "A legacy company snapshot.", about_long: "This snapshot still has its original company description and no new profile fields." } }
    : state === "empty" ? null : state === "synthetic" ? businessProfilePreview : { about_company: draft.about_company };
  const snapshot = normalizeBusinessSnapshot({ companyCode, companyWebsite: null, snapshotRow: payload ? { company: companyCode, business_snapshot: payload } : null });
  return (
    <main className="mx-auto max-w-6xl px-3 py-8 sm:px-6">
      <div className="mb-5 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company background · {isPublished ? "reviewed pilot" : "review draft"}</p>
        <h1 className="text-2xl font-semibold text-foreground">{companyName}</h1>
        <nav aria-label="Preview company" className="flex flex-wrap gap-2">
          {companyDrafts.map((item) => <Link
            key={item.company}
            href={`/dev/business-snapshot?company=${item.company}`}
            aria-current={!isTestState && item.company === draft.company ? "page" : undefined}
            className={`rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!isTestState && item.company === draft.company ? "border-emerald-600 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >{item.company_name}</Link>)}
        </nav>
        <p className="text-sm text-muted-foreground">{isTestState
          ? "Synthetic test data · not investment research"
          : `${draft.source_period} disclosures · latest source filed ${draft.latest_source_date}. ${isPublished ? `Reviewed pilot · approved ${draft.prepared_on}.` : "Prepared for review · not published."}`}</p>
      </div>
      <BusinessSnapshotSection snapshot={snapshot} companyCode={companyCode} companyName={companyName} generatedAtShort={null} />
      {!isTestState ? (
        <details className="mt-5 text-sm text-muted-foreground">
          <summary className="cursor-pointer py-2">Sources for the company introduction</summary>
          <ul className="mt-2 space-y-2">
            {aboutSources.map((source, index) => <li key={`${source.url}-${index}`}><a className="break-words underline underline-offset-4" href={source.url} target="_blank" rel="noopener noreferrer">{source.label} · {source.locator}</a></li>)}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
