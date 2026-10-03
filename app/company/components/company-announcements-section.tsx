import { getCompanyAnnouncementDigest } from "@/lib/announcement-digest";
import { countNewerThan, formatFiledLabel } from "@/lib/announcement-digest/normalize";
import type { DigestChip, NormalizedAnnouncementDigest } from "@/lib/announcement-digest/types";
import {
  buildFilingHistory,
  categoryChips,
  defaultTapeFilter,
  deriveActivity,
  DIGEST_WINDOW_DAYS,
  fiscalQuarterOf,
  historyHeadline,
  isAdverse,
  isGood,
  quarterHeadline,
  recordStartLabel,
  scaleLine,
  windowRows,
  type HistorySlot,
} from "@/lib/announcement-tape";
import { getCompanyExchangeDeskData } from "@/lib/exchange-desk";
import {
  IMPACT_META,
  formatOrderSize,
  type ExchangeDeskData,
  type ExchangeImpact,
  type ExchangeUpdate,
} from "@/lib/exchange-desk/types";
import type { CompanyPageOverviewCacheRow } from "@/lib/company-overview-cache";
import { cn } from "@/lib/utils";
import { AnnouncementTape, type TapeRow } from "./announcement-tape";
import {
  accentTextClass,
  cardClass,
  displayClass,
  impactPillClass,
  kickerClass,
  monoClass,
} from "./announcement-tokens";
import { SectionCard } from "./section-card";

// Announcements tab (redesign 2026-10-03). Top to bottom, each one glance:
//   1. The quarter in filings — a templated headline (the digest's activity
//      word against the quarters on record) over the producer's read of the
//      last 90 days and its category counts.
//   2. The one that matters — the filing the producer picked and read from its
//      PDF: what it is, its scale, what it changes.
//   3. Filing history — one tile per filing, stacked by fiscal quarter and
//      coloured by impact; picking a quarter filters the tape.
//   4. Filing tape — grouped by fiscal quarter, opening on the non-neutral
//      rows when there are enough of them.
// The model-written strings (summary text, what, so-what, pick reason) come
// from company_announcement_digest and are guarded by the producer
// (concallyser/scripts/synthesize_announcements.py). Everything else is counts
// and closed templates in lib/announcement-tape.ts. Copy describes, never
// advises. A company with no digest gets the same two cards from tape facts.

const pluralize = (count: number, singular: string) =>
  `${count} ${singular}${count === 1 ? "" : "s"}`;

const headlineClass = cn(
  displayClass,
  "text-[20px] leading-[1.18] text-foreground sm:text-[24px] lg:text-[26px] [text-wrap:balance]",
);
const lineClass = "text-[14px] leading-relaxed text-foreground/85 [text-wrap:pretty]";
const metaClass = cn(monoClass, "text-[11px] text-muted-foreground");

function ImpactPill({ impact }: { impact: ExchangeImpact }) {
  return <span className={impactPillClass(impact)}>{IMPACT_META[impact].label}</span>;
}

function LabelledLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className={lineClass}>
      <span className="font-semibold text-foreground">{label}:</span> {children}
    </p>
  );
}

function OpenFiling({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        metaClass,
        "rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      )}
    >
      Open filing ↗
    </a>
  );
}

// ---- 1. The quarter in filings ---------------------------------------------

function QuarterCard({
  headline,
  text,
  chips,
  meta,
  note,
}: {
  headline: string;
  text: string | null;
  chips: DigestChip[];
  meta: string;
  note: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-[14px] border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.10] via-sky-500/[0.04] to-transparent p-5 sm:p-6">
      <p className={cn(kickerClass, accentTextClass)}>The quarter in filings</p>
      <p className={cn(headlineClass, "mt-3")}>{headline}</p>
      {text ? <p className={cn(lineClass, "mt-3")}>{text}</p> : null}
      {chips.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {chips.map((chip) => (
            <LabelledLine key={chip.label} label={chip.label}>
              {chip.value}
              {chip.detail ? `, ${chip.detail}` : ""}
            </LabelledLine>
          ))}
        </div>
      ) : null}
      <p className={cn(metaClass, "mt-auto pt-4")}>
        {meta}
        {note ? (
          <>
            <span aria-hidden> · </span>
            {note}
          </>
        ) : null}
      </p>
    </div>
  );
}

function quarterCardProps(
  digest: NormalizedAnnouncementDigest | null,
  data: ExchangeDeskData,
  slots: HistorySlot[],
  now: Date,
): React.ComponentProps<typeof QuarterCard> {
  if (digest) {
    const newer = countNewerThan(data.updates, digest.maxFiledAt);
    return {
      headline: quarterHeadline(digest.summary.activity, digest.materialCount, slots),
      text: digest.summary.text,
      chips: digest.summary.chips,
      meta: `${digest.windowFromLabel} · ${pluralize(digest.materialCount, "filing")}`,
      note: newer > 0 ? `${pluralize(newer, "filing")} since this read` : null,
    };
  }

  // No stored digest (a thin window, a payload that failed the schema, or the
  // table not applied): the same card from tape facts, with no model prose.
  const recent = windowRows(data.updates, now);
  const meta = `Last ${DIGEST_WINDOW_DAYS} days · ${pluralize(recent.length, "filing")}`;
  if (recent.length === 0) {
    const latest = data.updates[0];
    return {
      headline: `Nothing material in the last ${DIGEST_WINDOW_DAYS} days.`,
      text: latest ? `The last material filing was on ${formatFiledLabel(latest.filedRaw, now)}.` : null,
      chips: [],
      meta,
      note: null,
    };
  }
  const good = recent.filter((r) => isGood(r.impact)).length;
  const adverse = recent.filter((r) => isAdverse(r.impact)).length;
  const routine = recent.length - good - adverse;
  const mix = [
    good > 0 ? `${good} positive` : null,
    routine > 0 ? `${routine} routine` : null,
    adverse > 0 ? `${adverse} adverse` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return {
    headline: quarterHeadline(deriveActivity(recent), recent.length, slots),
    text: `${pluralize(recent.length, "material filing")} in the last ${DIGEST_WINDOW_DAYS} days: ${mix}.`,
    chips: categoryChips(recent),
    meta,
    note: null,
  };
}

// ---- 2. The one that matters -------------------------------------------------

function MattersCard({
  digest,
  data,
  now,
}: {
  digest: NormalizedAnnouncementDigest | null;
  data: ExchangeDeskData;
  now: Date;
}) {
  const shell = cn(cardClass, "flex min-w-0 flex-col p-5 sm:p-6");
  const biggest = digest?.biggest ?? null;

  if (biggest) {
    // The pick is normally still on the loaded tape: its summary line, filing
    // link and order size are the freshest copy of each.
    const tapeRow = data.updates.find((u) => u.id === biggest.announcementId) ?? null;
    const scale = scaleLine(biggest.scale, tapeRow?.orderSize ?? null);
    return (
      <div className={shell}>
        <div className="flex items-start justify-between gap-3">
          <p className={kickerClass}>The one that matters</p>
          <ImpactPill impact={biggest.impact} />
        </div>
        <p className={cn(headlineClass, "mt-3")}>{tapeRow?.summary ?? biggest.title}</p>
        <p className={cn(lineClass, "mt-3")}>{biggest.what}</p>
        <div className="mt-3 space-y-1.5">
          {scale ? <LabelledLine label="Scale">{scale}.</LabelledLine> : null}
          <LabelledLine label="What it changes">{biggest.soWhat}</LabelledLine>
        </div>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-4">
          <OpenFiling href={tapeRow?.attachmentUrl ?? null} />
          <span className={metaClass}>
            {biggest.categoryLabel}
            <span aria-hidden> · </span>
            {biggest.filedLabel}
          </span>
          <span className={cn(metaClass, "min-w-0 basis-full [text-wrap:pretty]")}>
            Why this one: {biggest.pickReason}
          </span>
        </div>
      </div>
    );
  }

  if (digest) {
    return (
      <div className={shell}>
        <p className={kickerClass}>The one that matters</p>
        <p className={cn(headlineClass, "mt-3")}>Nothing needle-moving in the window.</p>
        <p className={cn(lineClass, "mt-3")}>
          No filing rose above routine this window. The quarter&rsquo;s read covers what the tape adds up to.
        </p>
      </div>
    );
  }

  const latest: ExchangeUpdate | undefined = data.updates[0];
  if (!latest) return null;
  const scale = scaleLine(null, latest.orderSize);
  return (
    <div className={shell}>
      <div className="flex items-start justify-between gap-3">
        <p className={kickerClass}>Latest material filing</p>
        <ImpactPill impact={latest.impact} />
      </div>
      <p className={cn(headlineClass, "mt-3")}>{latest.summary}</p>
      {scale ? (
        <div className="mt-3">
          <LabelledLine label="Scale">{scale}.</LabelledLine>
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-4">
        <OpenFiling href={latest.attachmentUrl} />
        <span className={metaClass}>
          {latest.categoryLabel}
          <span aria-hidden> · </span>
          {formatFiledLabel(latest.filedRaw, now)}
        </span>
      </div>
    </div>
  );
}

// ---- Tape rows ---------------------------------------------------------------

function toTapeRows(updates: ExchangeUpdate[], now: Date): TapeRow[] {
  return updates.flatMap((u) => {
    const quarter = fiscalQuarterOf(u.filedRaw);
    if (!quarter) return [];
    return [
      {
        id: u.id,
        impact: u.impact,
        categoryLabel: u.categoryLabel,
        orderSizeLabel: u.orderSize ? formatOrderSize(u.orderSize) : null,
        summary: u.summary,
        attachmentUrl: u.attachmentUrl,
        dateLabel: formatFiledLabel(u.filedRaw, now),
        quarterKey: quarter.key,
        quarterLabel: quarter.label,
      },
    ];
  });
}

/**
 * Everything inside the section shell, from one tape + one (optional) digest.
 * Split out so the dev preview (/dev/announcement-digest) paints a sandbox
 * digest through exactly the code the company page runs.
 */
export function CompanyAnnouncementsBody({
  data,
  digest,
  now = new Date(),
}: {
  data: ExchangeDeskData;
  digest: NormalizedAnnouncementDigest | null;
  now?: Date;
}) {
  const slots = buildFilingHistory(data.updates, now);
  const youngRecord = slots.some((s) => s.beforeRecord || s.partial);
  const historyKicker = youngRecord
    ? `Filing history · since ${recordStartLabel()}`
    : `Filing history · last ${slots.length} quarters`;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <QuarterCard {...quarterCardProps(digest, data, slots, now)} />
        <MattersCard digest={digest} data={data} now={now} />
      </div>
      <AnnouncementTape
        rows={toTapeRows(data.updates, now)}
        slots={slots}
        historyKicker={historyKicker}
        historyHeadline={historyHeadline(slots)}
        defaultFilter={defaultTapeFilter(data.updates)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

export async function CompanyAnnouncementsSection({
  overview,
}: {
  overview: CompanyPageOverviewCacheRow;
}) {
  const [data, digestResult] = await Promise.all([
    getCompanyExchangeDeskData(overview.company_code, overview.company_name),
    getCompanyAnnouncementDigest(overview.company_code),
  ]);
  if (digestResult.error) {
    // A stored payload that fails the v1 schema: fall back to the tape-fact
    // cards, but say so — never render a broken digest, never hide the defect.
    console.warn("[announcement-digest]", digestResult.error);
  }

  return (
    <SectionCard
      id="company-announcements"
      title="Announcements"
      headerAction={
        data.total > 0 ? (
          <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
            {pluralize(data.total, "material filing")} on record
          </span>
        ) : null
      }
    >
      {data.total === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-muted/35 p-5">
          <p className="text-sm font-medium text-foreground">No material filings on record.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New material exchange announcements will appear here with their plain-English read.
          </p>
        </div>
      ) : (
        <CompanyAnnouncementsBody data={data} digest={digestResult.digest} />
      )}
    </SectionCard>
  );
}
