// "The wire · filings that mattered, last 7 days" (2026-10-29 redesign): the
// week's top filings (lib/desk-wire.ts — /announcements' own Top 5) as one
// large card, two small ones and plain rows. Each item opens the company's
// Announcements tab; the full tape lives on /announcements.

import { HomepageModuleLink } from "@/components/homepage-module-link";
import { getRecentStoryReads } from "@/lib/announcement-story-read";
import { selectTopStoryReads } from "@/lib/announcement-story-read/select";
import { buildWire, type WireItem } from "@/lib/desk-wire";
import { getExchangeDeskData } from "@/lib/exchange-desk";
import { cn } from "@/lib/utils";
import {
  CardEyebrow,
  DESK_CARD,
  DESK_FOCUS,
  DESK_HOVER,
  DeskCrest,
  DeskSection,
  istDayMonth,
  tradingName,
} from "./desk-ui";
import { DeskSectionTracker } from "./desk-section-tracker";

const hrefFor = (item: WireItem) => `/company/${item.companyCode}#company-announcements`;

function CompanyLine({ item }: { item: WireItem }) {
  return (
    <span className="mt-2.5 flex min-w-0 items-center gap-2">
      <DeskCrest name={item.companyName} size="sm" />
      <span className="house-data min-w-0 truncate text-xs text-[var(--ink-soft)]">
        {tradingName(item.companyName)} · {item.companyCode}
        {item.belowCut ? " · below the cut" : ""}
      </span>
    </span>
  );
}

function LeadItem({ item }: { item: WireItem }) {
  return (
    <HomepageModuleLink
      module="desk_wire_lead"
      companyCode={item.companyCode}
      surface="desk"
      href={hrefFor(item)}
      className={cn("block p-5 sm:p-8", DESK_HOVER, DESK_FOCUS)}
    >
      <CardEyebrow parts={[item.categoryLabel, istDayMonth(item.filedRaw)]} />
      <CompanyLine item={item} />
      <span className="house-display mt-4 block text-[26px] leading-[1.06] [text-wrap:balance] sm:text-[34px]">
        {item.headline}
      </span>
      {item.dek ? (
        <span className="mt-4 block max-w-[38rem] text-[15px] leading-relaxed text-[var(--ink-soft)] [text-wrap:pretty]">
          {item.dek}
        </span>
      ) : null}
    </HomepageModuleLink>
  );
}

function SideItem({ item }: { item: WireItem }) {
  return (
    <HomepageModuleLink
      module="desk_wire_side"
      companyCode={item.companyCode}
      surface="desk"
      href={hrefFor(item)}
      className={cn("block flex-1 p-5 sm:p-6", DESK_HOVER, DESK_FOCUS)}
    >
      <CardEyebrow parts={[item.categoryLabel, istDayMonth(item.filedRaw)]} />
      <CompanyLine item={item} />
      <span className="house-display mt-3 block text-lg leading-snug [text-wrap:balance] sm:text-xl">{item.headline}</span>
      {item.dek ? (
        <span className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--ink-soft)] [text-wrap:pretty]">{item.dek}</span>
      ) : null}
    </HomepageModuleLink>
  );
}

function RowItem({ item }: { item: WireItem }) {
  return (
    <HomepageModuleLink
      module="desk_wire_row"
      companyCode={item.companyCode}
      surface="desk"
      href={hrefFor(item)}
      className={cn(
        "grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 px-4 py-3.5 sm:grid-cols-[3.75rem_14rem_minmax(0,1fr)] sm:items-center sm:gap-x-4 sm:px-5",
        DESK_HOVER,
        DESK_FOCUS,
      )}
    >
      <span className="house-data pt-0.5 text-xs text-[var(--ink-soft)] sm:pt-0">{istDayMonth(item.filedRaw)}</span>
      <span className="flex min-w-0 items-center gap-2">
        <DeskCrest name={item.companyName} size="sm" />
        <span className="house-display truncate text-[15px]">{tradingName(item.companyName)}</span>
      </span>
      <span className="col-start-2 text-sm leading-snug text-[var(--ink-soft)] sm:col-start-auto sm:truncate">
        {item.headline}
      </span>
    </HomepageModuleLink>
  );
}

export async function DeskWire() {
  const now = new Date();
  const [data, storyReads] = await Promise.all([getExchangeDeskData(), getRecentStoryReads(now)]);
  const picks = selectTopStoryReads(storyReads, data.updates, data.belowCut, now);
  const items = buildWire(picks, data.updates, now.getTime());
  if (items.length === 0) return null;
  const [lead, ...others] = items;
  const side = others.slice(0, 2);
  const rows = others.slice(2);

  return (
    <DeskSectionTracker sectionId="desk_wire">
      <DeskSection
        id="desk-wire"
        eyebrow="The wire · Filings that mattered, last 7 days"
        live
        link={{ href: "/announcements", label: `All ${data.total} filings →` }}
      >
        <div className={DESK_CARD}>
          <div className={cn(side.length > 0 && "grid lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]")}>
            <LeadItem item={lead} />
            {side.length > 0 ? (
              <div className="flex flex-col divide-y divide-[var(--rule)] border-t border-[var(--rule)] lg:border-l lg:border-t-0">
                {side.map((item) => (
                  <SideItem key={item.id} item={item} />
                ))}
              </div>
            ) : null}
          </div>
          {rows.length > 0 ? (
            <ul className="divide-y divide-[var(--rule)] border-t border-[var(--rule)]">
              {rows.map((item) => (
                <li key={item.id}>
                  <RowItem item={item} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </DeskSection>
    </DeskSectionTracker>
  );
}
