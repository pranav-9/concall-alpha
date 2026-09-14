// Desk "Featured Reads" — the editorial front page (mockup: one hero card +
// two stacked secondaries). Each card foregrounds a notable section upgrade or
// new-coverage event with a written headline, enticing the read.
//
// Hierarchy: COMPANY NAME leads every card (the display h3) — a reader tracking
// a name must recognise it at a glance before anything else. The editorial
// headline is the subhead beneath it. The producer's summary is deliberately
// NOT rendered (2026-09-14): three names × name + headline + paragraph was too
// much text for a first-time reader; it stays in the row for the Telegram
// drafter and a future archive page. In its place, a guidance re-read carries a
// data exhibit — the company's guidance record as one dot per commitment
// (featured-guidance-record.tsx), derived exactly as the Guidance section
// derives its track record. The footer meta carries
// the ticker code, sector and time; it does not repeat the name. The headline is
// also folded into the h3 as screen-reader-only text so two cards for the same
// company still have distinct headings in the outline.
//
// Reads its OWN table (desk_featured_read), authored by the concallyser
// producers — not the rebuilt activity feed. The recency ledger below stays the
// honest, complete tape; this strip is the curated skin on top. Renders the
// whole section or nothing — an empty pool returns null, no empty shell.

import Link from "next/link";

import { formatRelativeActivityTime } from "@/lib/activity-feed";
import { cn } from "@/lib/utils";
import { HomepageModuleLink } from "@/components/homepage-module-link";
import { getCachedDeskFeaturedReads } from "@/lib/desk-featured/data";
import { selectFeaturedReads } from "@/lib/desk-featured/select";
import { changeKindSuffix, type FeaturedRead } from "@/lib/desk-featured/types";
import type { GuidanceRecord } from "@/lib/desk-featured/guidance-record";
import { getCachedGuidanceRecords } from "@/lib/desk-featured/guidance-record-data";
import { FeaturedGuidanceRecord } from "./featured-guidance-record";
import { BelowSm, FromSm } from "@/components/viewport-gate";
import { DeskFeaturedReadsTracker } from "./desk-featured-reads-tracker";
import { Chevron, MOBILE_CARD, MOBILE_HEAD_RIGHT, MOBILE_ROW, MobileCardHead } from "@/components/mobile-card";

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
  const parts = [read.companyCode, read.sector, time].filter(
    (p): p is string => Boolean(p),
  );
  return (
    <span className="house-data house-micro text-[var(--ink-soft)]">
      {parts.join(" · ")}
    </span>
  );
}

function HeroCard({ read, record }: { read: FeaturedRead; record: GuidanceRecord | null }) {
  return (
    <HomepageModuleLink
      module="featured_read_hero"
      companyCode={read.companyCode}
      surface="desk"
      href={read.href}
      className={cn(
        "flex h-full flex-col rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] p-6 transition-colors sm:p-8",
        CARD_HOVER,
        CARD_FOCUS,
      )}
    >
      <Eyebrow read={read} />
      <h3 className="house-display mt-3 max-w-2xl text-2xl leading-[1.1] text-[var(--ink)] sm:text-3xl">
        {read.companyName}
        <span className="sr-only">: {read.headline}</span>
      </h3>
      <p className="mb-6 mt-2 max-w-2xl text-lg font-medium leading-snug text-[var(--ink)] sm:text-xl">
        {read.headline}
      </p>
      {/* The record sits on the footer rule, filling the card's lower half. */}
      {record ? <FeaturedGuidanceRecord record={record} size="hero" className="mt-auto" /> : null}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-[var(--rule)] pt-4",
          record ? "mt-5" : "mt-auto",
        )}
      >
        <Meta read={read} />
        <span className="house-data house-micro text-[var(--signal)]">Read the analysis →</span>
      </div>
    </HomepageModuleLink>
  );
}

function SecondaryCard({ read, record }: { read: FeaturedRead; record: GuidanceRecord | null }) {
  return (
    <HomepageModuleLink
      module="featured_read_secondary"
      companyCode={read.companyCode}
      surface="desk"
      href={read.href}
      className={cn(
        "flex flex-col rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] p-5 transition-colors",
        CARD_HOVER,
        CARD_FOCUS,
      )}
    >
      <Eyebrow read={read} />
      <h3 className="house-display mt-2 text-lg leading-snug text-[var(--ink)]">
        {read.companyName}
        <span className="sr-only">: {read.headline}</span>
      </h3>
      <p className="mt-1 text-sm font-medium leading-snug text-[var(--ink)]">
        {read.headline}
      </p>
      {record ? <FeaturedGuidanceRecord record={record} size="compact" className="mt-3" /> : null}
      <div className="mt-4">
        <Meta read={read} />
      </div>
    </HomepageModuleLink>
  );
}

// ---------------------------------------------------------------------------
// Phone presentation (< sm): one card — a lead item (kicker, company name,
// editorial headline, code · sector · time) and brief rows for
// the rest. Same hierarchy as desktop: company name leads as the display h3,
// the headline is the subhead beneath it.
// ---------------------------------------------------------------------------

function MobileMeta({ read, className }: { read: FeaturedRead; className?: string }) {
  const time = formatRelativeActivityTime(read.publishedAtRaw);
  const parts = [read.companyCode, read.sector, time].filter((p): p is string => Boolean(p));
  return (
    <span className={cn("house-data text-[10px] text-[var(--ink-soft)]", className)}>
      {parts.join(" · ")}
    </span>
  );
}

function MobileKicker({ read, className }: { read: FeaturedRead; className?: string }) {
  const suffix = changeKindSuffix(read.changeKind);
  return (
    <span className={cn("house-data block uppercase text-[var(--signal)]", className)}>
      {read.tagLabel}
      {suffix ? ` · ${suffix}` : null}
    </span>
  );
}

function MobileLead({ read, record }: { read: FeaturedRead; record: GuidanceRecord | null }) {
  return (
    <HomepageModuleLink
      module="featured_read_hero"
      companyCode={read.companyCode}
      surface="desk"
      href={read.href}
      className={cn(MOBILE_ROW, "px-3.5 py-4")}
    >
      <MobileKicker read={read} className="text-[10px] tracking-[0.14em]" />
      <h3 className="house-display mt-[9px] text-xl leading-[1.12] text-[var(--ink)] [text-wrap:pretty]">
        {read.companyName}
        <span className="sr-only">: {read.headline}</span>
      </h3>
      <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--ink)] [text-wrap:pretty]">
        {read.headline}
      </p>
      {record ? <FeaturedGuidanceRecord record={record} size="compact" className="mt-3" /> : null}
      <span className="mt-[13px] flex items-center justify-between gap-2.5">
        <MobileMeta read={read} />
        <span className="house-data whitespace-nowrap text-[10px] text-[var(--ink)]">Read →</span>
      </span>
    </HomepageModuleLink>
  );
}

function MobileBrief({ read }: { read: FeaturedRead }) {
  return (
    <HomepageModuleLink
      module="featured_read_secondary"
      companyCode={read.companyCode}
      surface="desk"
      href={read.href}
      className={cn(MOBILE_ROW, "flex items-center gap-3 px-3.5 py-[13px] last:border-b-0")}
    >
      <span className="min-w-0 flex-1">
        <MobileKicker read={read} className="text-[9px] tracking-[0.12em]" />
        <h3 className="house-display mt-[3px] text-sm leading-[1.2] text-[var(--ink)] [text-wrap:pretty]">
          {read.companyName}
          <span className="sr-only">: {read.headline}</span>
        </h3>
        <p className="mt-[2px] line-clamp-1 text-[12px] leading-[1.25] text-[var(--ink-soft)] [text-wrap:pretty]">
          {read.headline}
        </p>
        <MobileMeta read={read} className="mt-[3px] block" />
      </span>
      <Chevron />
    </HomepageModuleLink>
  );
}

function MobileFeatured({
  hero,
  secondaries,
  heroRecord,
}: {
  hero: FeaturedRead;
  secondaries: FeaturedRead[];
  heroRecord: GuidanceRecord | null;
}) {
  return (
    <section aria-labelledby="desk-featured-mobile" className={MOBILE_CARD}>
      <MobileCardHead
        id="desk-featured-mobile"
        eyebrow="Featured"
        right={
          <Link href="#desk-recency-mobile" className={MOBILE_HEAD_RIGHT}>
            Latest reads
          </Link>
        }
      />
      <MobileLead read={hero} record={heroRecord} />
      {secondaries.map((read) => (
        <MobileBrief key={read.id} read={read} />
      ))}
    </section>
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

  // Only guidance re-reads carry a record; other sections render as before.
  const records = await getCachedGuidanceRecords(
    featured.filter((read) => read.section === "guidance").map((read) => read.companyCode),
  ).catch(() => ({}) as Record<string, GuidanceRecord>);
  const recordFor = (read: FeaturedRead): GuidanceRecord | null =>
    read.section === "guidance" ? (records[read.companyCode.toUpperCase()] ?? null) : null;

  return (
    <DeskFeaturedReadsTracker>
    <BelowSm>
      <MobileFeatured hero={hero} secondaries={secondaries} heroRecord={recordFor(hero)} />
    </BelowSm>
    <FromSm>
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
        <HeroCard read={hero} record={recordFor(hero)} />
        {secondaries.length > 0 && (
          <div className="flex flex-col gap-5">
            {secondaries.map((read) => (
              <SecondaryCard key={read.id} read={read} record={recordFor(read)} />
            ))}
          </div>
        )}
      </div>
    </section>
    </FromSm>
    </DeskFeaturedReadsTracker>
  );
}
