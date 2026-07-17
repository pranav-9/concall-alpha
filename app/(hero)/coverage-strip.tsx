import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COVERAGE_SELECT, isDiscoveryListed } from "@/lib/coverage-policy";

type CoverageRow = {
  code: string;
  sector?: string | null;
  market_cap_band_at_admission?: string | null;
  excluded_from_discovery?: boolean | null;
};

export function CoverageStripFallback() {
  return <div aria-hidden className="h-4" />;
}

export default async function CoverageStrip() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company")
    .select(`code, sector, ${COVERAGE_SELECT}`);

  const covered = ((data ?? []) as CoverageRow[]).filter((company) =>
    isDiscoveryListed(company),
  );
  if (covered.length === 0) return <CoverageStripFallback />;

  const sectorCount = new Set(
    covered
      .map((company) => company.sector?.trim())
      .filter((sector): sector is string => Boolean(sector)),
  ).size;

  return (
    <p className="px-4 text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
      {covered.length} companies · {sectorCount} sectors · handpicked mid &amp; small caps
      <Link
        href="/coverage"
        prefetch={false}
        className="ml-2 whitespace-nowrap text-foreground/80 underline underline-offset-4 transition-colors hover:text-foreground"
      >
        How coverage works →
      </Link>
    </p>
  );
}
