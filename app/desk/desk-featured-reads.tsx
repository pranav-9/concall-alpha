// Desk "Featured Reads" — the editorial front page (mockup: one hero card +
// two stacked secondaries). Each card foregrounds a notable section upgrade or
// new-coverage event with a written headline + crisp summary, enticing the read.
//
// Reads its OWN table (desk_featured_read), authored by the concallyser
// producers — not the rebuilt activity feed. The recency ledger below stays the
// honest, complete tape; this strip is the curated skin on top. Renders the
// whole section or nothing — an empty pool returns null, no empty shell.

import Link from "next/link";

import { formatRelativeActivityTime } from "@/lib/activity-feed";
import { cn } from "@/lib/utils";
import { getCachedDeskFeaturedReads } from "@/lib/desk-featured/data";
import { selectFeaturedReads } from "@/lib/desk-featured/select";
import { changeKindSuffix, type FeaturedRead } from "@/lib/desk-featured/types";

// Shared whole-card affordances, matching the recency ledger: an on-brand teal
// focus ring (the bare-<a> house skin has none) and a quiet teal hover wash.
const CARD_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)]";
const CARD_HOVER = "hover:border-[color-mix(in_srgb,var(--signal)_45%,var(--rule))]";

function Eyebrow({ read }: { read: FeaturedRead }) {
  const suffix = changeKindSuffix(read.changeKind);
  return (
    <p className="house-data house-micro uppercase text-[var(--signal)]">
      {read.tagLabel}
      {suffix ? (
        <span className="text-[var(--ink-soft)]">
          {" · "}
          {suffix}
        </span>
      ) : null}
    </p>
  );
}

function Meta({ read }: { read: FeaturedRead }) {
  const time = formatRelativeActivityTime(read.publishedAtRaw);
  const parts = [read.companyName, read.sector, time].filter(
    (p): p is string => Boolean(p),
  );
  return (
    <span className="house-data house-micro text-[var(--ink-soft)]">
      {parts.join(" · ")}
    </span>
  );
}

function HeroCard({ read }: { read: FeaturedRead }) {
  return (
    <Link
      href={read.href}
      prefetch={false}
      className={cn(
        "flex h-full flex-col rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] p-6 transition-colors sm:p-8",
        CARD_HOVER,
        CARD_FOCUS,
      )}
    >
      <Eyebrow read={read} />
      <h3 className="house-display mt-3 text-2xl leading-[1.1] text-[var(--ink)] sm:text-3xl">
        {read.headline}
      </h3>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--ink-soft)] sm:text-base">
        {read.summary}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[var(--rule)] pt-4">
        <Meta read={read} />
        <span className="house-data house-micro text-[var(--signal)]">Read the analysis →</span>
      </div>
    </Link>
  );
}

function SecondaryCard({ read }: { read: FeaturedRead }) {
  return (
    <Link
      href={read.href}
      prefetch={false}
      className={cn(
        "flex flex-col rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] p-5 transition-colors",
        CARD_HOVER,
        CARD_FOCUS,
      )}
    >
      <Eyebrow read={read} />
      <h3 className="house-display mt-2 text-lg leading-snug text-[var(--ink)]">
        {read.headline}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-snug text-[var(--ink-soft)]">
        {read.summary}
      </p>
      <div className="mt-4">
        <Meta read={read} />
      </div>
    </Link>
  );
}

export function DeskFeaturedReadsFallback() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="h-64 animate-pulse rounded-lg border border-[var(--rule)] bg-[var(--paper-2)]" />
      <div className="flex flex-col gap-5">
        <div className="h-[7.5rem] animate-pulse rounded-lg border border-[var(--rule)] bg-[var(--paper-2)]" />
        <div className="h-[7.5rem] animate-pulse rounded-lg border border-[var(--rule)] bg-[var(--paper-2)]" />
      </div>
    </div>
  );
}

export default async function DeskFeaturedReads() {
  const reads = await getCachedDeskFeaturedReads().catch(() => []);
  const featured = selectFeaturedReads(reads);
  if (featured.length === 0) return null;

  const [hero, ...secondaries] = featured;

  return (
    <section aria-labelledby="desk-featured" className="house-block">
      <div className="flex items-baseline justify-between border-b border-[var(--rule)] pb-3">
        <h2 id="desk-featured" className="house-data house-micro uppercase text-[var(--ink-soft)]">
          Featured reads
        </h2>
        <Link
          href="#desk-recency"
          className="house-data house-micro uppercase text-[var(--ink-soft)] transition-colors hover:text-[var(--signal)]"
        >
          Latest updates ↓
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <HeroCard read={hero} />
        {secondaries.length > 0 && (
          <div className="flex flex-col gap-5">
            {secondaries.map((read) => (
              <SecondaryCard key={read.id} read={read} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
