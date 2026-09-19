import DeskExchangeUpdates from "@/app/desk/desk-exchange-updates";
import { getCompanyExchangeDeskData } from "@/lib/exchange-desk";
import { IMPACT_META, type ExchangeDeskData } from "@/lib/exchange-desk/types";
import type { CompanyPageOverviewCacheRow } from "@/lib/company-overview-cache";
import { cn } from "@/lib/utils";
import { SectionCard } from "./section-card";
import { elevatedBlockClass } from "./surface-tokens";

const pluralize = (count: number, singular: string) =>
  `${count} ${singular}${count === 1 ? "" : "s"}`;

function SignalMix({ data }: { data: ExchangeDeskData }) {
  const positive = data.updates.filter(
    (item) => item.impact === "transformative" || item.impact === "positive",
  ).length;
  const adverse = data.updates.filter(
    (item) => item.impact === "negative" || item.impact === "severe",
  ).length;
  const categoryCounts = new Map<string, number>();
  for (const item of data.updates) {
    categoryCounts.set(item.categoryLabel, (categoryCounts.get(item.categoryLabel) ?? 0) + 1);
  }
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const readLine =
    positive === 0 && adverse === 0
      ? "All classified filings were routine."
      : `${pluralize(positive, "positive / transformative filing")} and ${pluralize(adverse, "negative / severe filing")} in the classified mix.`;

  return (
    <div className={cn(elevatedBlockClass, "min-w-0 p-4 sm:p-5")}>
      <p className="house-data text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ink-soft)]">
        Signal mix
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {pluralize(data.total, "material filing")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{readLine}</p>
      {topCategory ? (
        <p className="mt-3 border-t border-border/45 pt-3 text-xs text-muted-foreground">
          Most frequent: <span className="font-medium text-foreground">{topCategory[0]}</span>
          <span aria-hidden> · </span>
          {pluralize(topCategory[1], "filing")}
        </p>
      ) : null}
    </div>
  );
}

function LatestSignal({ data }: { data: ExchangeDeskData }) {
  const latest = data.updates[0];
  if (!latest) return null;
  const impact = IMPACT_META[latest.impact];

  return (
    <div className={cn(elevatedBlockClass, "min-w-0 p-4 sm:p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="house-data text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ink-soft)]">
          Latest material filing
        </p>
        <span className="house-data text-[10px] text-[var(--ink-soft)]">{latest.filedLabel}</span>
      </div>
      <p className="mt-2 text-base font-semibold leading-snug text-foreground">{latest.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/45 pt-3">
        <span
          className={cn(
            "house-data inline-flex rounded-full border px-2 py-0.5 text-[10px] leading-none",
            impact.className,
          )}
        >
          {impact.label}
        </span>
        <span className="house-data text-[10px] text-[var(--ink-soft)]">{latest.categoryLabel}</span>
        {latest.attachmentUrl ? (
          <a
            href={latest.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="house-data ml-auto text-[10px] text-[var(--ink-soft)] transition-colors hover:text-[var(--signal)]"
          >
            Open filing ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}

export async function CompanyAnnouncementsSection({
  overview,
}: {
  overview: CompanyPageOverviewCacheRow;
}) {
  const data = await getCompanyExchangeDeskData(overview.company_code, overview.company_name);

  return (
    <SectionCard id="company-announcements" title="Announcements">
      {data.total === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-muted/35 p-5">
          <p className="text-sm font-medium text-foreground">No material filings on record.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New material exchange announcements will appear here with their plain-English read.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 lg:grid-cols-2">
            <LatestSignal data={data} />
            <SignalMix data={data} />
          </div>
          {/* The feed is a house-skin component (Exchange Desk); give it the
              house palette without the paper ground so it reads the same as
              /announcements inside this SectionCard. */}
          <div className="house-tokens">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div>
                <p className="house-data text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  Filing tape
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Material exchange filings, filtered into business events and read into plain English.
                </p>
              </div>
              <span className="house-data text-[10px] text-[var(--ink-soft)]">Full history</span>
            </div>
            <DeskExchangeUpdates data={data} variant="company" />
          </div>
        </div>
      )}
    </SectionCard>
  );
}
