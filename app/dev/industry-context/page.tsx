import { notFound } from "next/navigation";
import Link from "next/link";
import { IndustryContextSection } from "@/app/company/components/industry-context-section";

// Dev-only preview harness for the redesigned Industry Context section. Renders
// the real server component against live Supabase data. The company set is
// chosen to exercise the branches: two-sided vs linear chains, clear vs
// "mixed" capital cycles, real market-share matches vs none, and companies
// with the most regulations / player dimensions.
const PREVIEW_COMPANIES: { code: string; name: string; note: string }[] = [
  { code: "CCL", name: "CCL Products", note: "Linear chain · mixed cycle · share matches" },
  { code: "CARTRADE", name: "CarTrade Tech", note: "Two-sided · clear cycles · real shares" },
  { code: "ASTRAMICRO", name: "Astra Microwave", note: "Richest payload · 3 regs · 3 cards" },
  { code: "HDFCLIFE", name: "HDFC Life", note: "Life insurance · 4 cards · 3 regs" },
  { code: "TECHM", name: "Tech Mahindra", note: "IT services" },
];

export default async function IndustryContextPreview({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { company } = await searchParams;
  const active = PREVIEW_COMPANIES.find((item) => item.code === company) ?? PREVIEW_COMPANIES[0];

  return (
    <main className="mx-auto max-w-5xl px-3 py-8 sm:px-6">
      <div className="mb-5 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Industry Context · redesign preview (dev only)
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{active.name}</h1>
        <nav aria-label="Preview company" className="flex flex-wrap gap-2">
          {PREVIEW_COMPANIES.map((item) => (
            <Link
              key={item.code}
              href={`/dev/industry-context?company=${item.code}`}
              aria-current={item.code === active.code ? "page" : undefined}
              className={`rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                item.code === active.code
                  ? "border-sky-600 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.code}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">{active.note}</p>
      </div>
      <IndustryContextSection companyCode={active.code} companyName={active.name} />
    </main>
  );
}
