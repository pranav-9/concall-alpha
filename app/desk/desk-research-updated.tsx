// "Research updated" — the desk's opening list (2026-10-29 redesign). One row
// per company whose research just moved: the producer's research card
// (desk_featured_read — a deep-track's strategy line, written at promote time)
// with the company's latest ConcallScore and how long ago it landed. The full,
// honest tape of every section update lives at /activity.

import Link from "next/link";

import ConcallScore from "@/components/concall-score";
import { HomepageModuleLink } from "@/components/homepage-module-link";
import { formatRelativeActivityTime } from "@/lib/activity-feed";
import type { FeaturedRead } from "@/lib/desk-featured/types";
import { cn } from "@/lib/utils";
import {
  DESK_CARD,
  DESK_FOCUS,
  DESK_HOVER,
  DESK_ROW_RULE,
  DeskCrest,
  DeskSection,
  compactAge,
} from "./desk-ui";

function ResearchRow({ read, score }: { read: FeaturedRead; score: number | null }) {
  const age = compactAge(formatRelativeActivityTime(read.publishedAtRaw));
  return (
    <HomepageModuleLink
      module="desk_research_updated"
      companyCode={read.companyCode}
      surface="desk"
      href={read.href}
      className={cn("flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-5", DESK_ROW_RULE, DESK_HOVER, DESK_FOCUS)}
    >
      <DeskCrest code={read.companyCode} name={read.companyName} />
      <span className="min-w-0 flex-1">
        <span className="house-display block text-[15px] leading-snug sm:text-base">{read.companyName}</span>
        <span className="mt-1 line-clamp-3 text-sm leading-relaxed text-[var(--ink-soft)] [text-wrap:pretty] sm:line-clamp-2">
          {read.headline}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3 pt-0.5">
        {score != null ? <ConcallScore score={score} size="sm" /> : null}
        <span className="house-data w-7 text-right text-[11px] text-[var(--ink-soft)]">{age}</span>
      </span>
    </HomepageModuleLink>
  );
}

export function DeskResearchUpdated({
  reads,
  scoreByCode,
}: {
  reads: FeaturedRead[];
  /** UPPERCASE code → latest ConcallScore (discovery-listed companies only). */
  scoreByCode: ReadonlyMap<string, number | null>;
}) {
  if (reads.length === 0) return null;
  return (
    <DeskSection id="desk-research-updated" eyebrow="Research updated" live link={{ href: "/activity", label: "All activity →" }}>
      <div className={DESK_CARD}>
        {reads.map((read) => (
          <ResearchRow key={read.id} read={read} score={scoreByCode.get(read.companyCode.toUpperCase()) ?? null} />
        ))}
        <div className="border-t border-[var(--rule)] px-4 py-4 sm:px-5">
          <Link href="/activity" prefetch={false} className={cn("house-link house-data text-xs", DESK_FOCUS)}>
            See all activity →
          </Link>
        </div>
      </div>
    </DeskSection>
  );
}
