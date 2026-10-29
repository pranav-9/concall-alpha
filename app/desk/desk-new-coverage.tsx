// "New to coverage" (2026-10-29 redesign): the companies that most recently
// entered coverage (lib/desk-new-coverage.ts). The newest gets the large card —
// its story-engine line (company_story) and a link to its initiation story in
// the Journal, or to the company page when none is written yet; the next few
// list with their engine tag and sector.

import { getAllPostMeta, type BlogPostMeta } from "@/app/blog/posts";
import { HomepageModuleLink } from "@/components/homepage-module-link";
import { formatRelativeActivityTime } from "@/lib/activity-feed";
import { getCompanyStoryLines } from "@/lib/company-story";
import type { DeskCompany } from "@/lib/desk-leaderboard";
import { initiationStory } from "@/lib/desk-journal";
import { selectNewCoverage } from "@/lib/desk-new-coverage";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import {
  CardEyebrow,
  DESK_CARD,
  DESK_FOCUS,
  DESK_HOVER,
  DESK_ROW_RULE,
  DeskCrest,
  DeskSection,
  compactAge,
  tradingName,
} from "./desk-ui";
import { DeskSectionTracker } from "./desk-section-tracker";

function readPosts(): BlogPostMeta[] {
  try {
    return getAllPostMeta();
  } catch (error) {
    // No Journal link is a fallback, not a failure: the card points at the company.
    logger.warn("desk new coverage: posts unreadable; linking company pages", { error });
    return [];
  }
}

export async function DeskNewCoverage({ companies }: { companies: DeskCompany[] }) {
  const picks = selectNewCoverage(companies, Date.now());
  if (picks.length === 0) return null;
  const [lead, ...rest] = picks;
  const stories = await getCompanyStoryLines(picks.map((c) => c.code));
  const initiation = initiationStory(readPosts(), lead.code);
  const leadStory = stories[lead.code.toUpperCase()];

  return (
    <DeskSectionTracker sectionId="desk_new_coverage">
      <DeskSection id="desk-new-coverage" eyebrow="New to coverage" link={{ href: "/leaderboards", label: "Coverage universe →" }}>
        <div className={cn(DESK_CARD, rest.length > 0 && "grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]")}>
          <HomepageModuleLink
            module="desk_new_coverage_lead"
            companyCode={lead.code}
            surface="desk"
            href={initiation ? `/blog/${initiation.slug}` : `/company/${lead.code}`}
            className={cn("flex flex-col p-5 sm:p-8", DESK_HOVER, DESK_FOCUS)}
          >
            <CardEyebrow parts={["Initiated", formatRelativeActivityTime(lead.createdAt)]} />
            <span className="mt-3 flex items-center gap-3.5">
              <DeskCrest code={lead.code} name={lead.name} size="lg" />
              <span className="house-display min-w-0 text-[26px] leading-[1.08] [text-wrap:balance] sm:text-[30px]">
                {tradingName(lead.name)}
              </span>
            </span>
            <span className="house-data mt-2.5 text-xs text-[var(--ink-soft)]">
              {[lead.code, lead.sector].filter(Boolean).join(" · ")}
            </span>
            {leadStory ? (
              <span className="mt-4 block max-w-[36rem] text-[15px] leading-relaxed text-[var(--ink-soft)] [text-wrap:pretty]">
                {leadStory.line}
              </span>
            ) : null}
            <span className="mt-auto block pt-6">
              <span className="flex justify-end border-t border-[var(--ink-soft)] pt-3.5">
                <span className="house-data text-xs text-[var(--ink)]">
                  {initiation ? "Read the initiation →" : "Open the company →"}
                </span>
              </span>
            </span>
          </HomepageModuleLink>

          {rest.length > 0 ? (
            <ul className="border-t border-[var(--rule)] lg:border-l lg:border-t-0">
              {rest.map((company) => {
                const engine = stories[company.code.toUpperCase()]?.engine;
                return (
                  <li key={company.code} className={DESK_ROW_RULE}>
                    <HomepageModuleLink
                      module="desk_new_coverage_row"
                      companyCode={company.code}
                      surface="desk"
                      href={`/company/${company.code}`}
                      className={cn("flex items-start gap-3 px-4 py-4 sm:px-5", DESK_HOVER, DESK_FOCUS)}
                    >
                      <DeskCrest code={company.code} name={company.name} />
                      <span className="min-w-0 flex-1">
                        <span className="house-display block truncate text-base leading-snug">{tradingName(company.name)}</span>
                        <span className="house-data mt-1 block text-[11px] leading-snug text-[var(--ink-soft)]">
                          {[engine, company.sector].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="house-data shrink-0 pt-0.5 text-[11px] text-[var(--ink-soft)]">
                        {compactAge(formatRelativeActivityTime(company.createdAt))}
                      </span>
                    </HomepageModuleLink>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </DeskSection>
    </DeskSectionTracker>
  );
}
