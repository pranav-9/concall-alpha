// The /themes desktop card (design upgrade 2026-10-16, the user's mockup): the
// editorial claim leads — THEME NN · SINCE Qx FYyy, the title, the "why now"
// blurb — beside the one DRIVING FACTOR; then a strip of up to three sourced
// KPI tiles with sparklines; then the "RIDING IT · N" names and OPEN THEME →
// (the theme page carries the scored board). A theme without a story renders
// the header and footer only — never an empty strip. Server component.

import Link from "next/link";

import { InFocusPips } from "@/components/in-focus-pips";
import { DRIVER_KIND_LABEL, type ThemeStoryKpi } from "@/lib/themes/story";
import type { ThemeBlock, ThemeMember } from "@/lib/themes/types";

import { ThemeSparkline } from "./theme-sparkline";

const EYEBROW = "font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

export function themeIndexLabel(index: number): string {
  return `Theme ${String(index).padStart(2, "0")}`;
}

function KpiTile({ kpi }: { kpi: ThemeStoryKpi }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 px-6 py-5 first:pl-0 last:pr-0" title={kpi.source.note}>
      <div className="min-w-0">
        <div className={EYEBROW}>{kpi.label}</div>
        <div className="mt-3 text-[28px] font-black leading-none tracking-[-0.04em] tabular-nums text-foreground">
          {kpi.value}
        </div>
        {kpi.sub && (
          <div className="mt-2 font-mono text-[11px] tracking-[0.02em] text-teal-700 dark:text-teal-300">
            {kpi.sub}
          </div>
        )}
      </div>
      {kpi.series && <ThemeSparkline points={kpi.series} label={kpi.label} />}
    </div>
  );
}

/** "E2E Networks Limited" → "E2E Networks": the riding-it line is a roll call, not a filing. */
export function shortCompanyName(name: string): string {
  return name.replace(/\s+(Limited|Ltd\.?|Pvt\.?\s+Ltd\.?)$/i, "").trim() || name;
}

function RidingName({ member, last }: { member: ThemeMember; last: boolean }) {
  const dim = member.belowCut;
  return (
    <>
      <Link
        href={`/company/${member.companyCode}`}
        prefetch={false}
        title={dim ? `${member.companyName} — below the coverage cut` : member.companyName}
        className={`whitespace-nowrap hover:underline ${dim ? "text-muted-foreground" : "text-foreground"}`}
      >
        {shortCompanyName(member.companyName)}
      </Link>
      {!last && <span className="text-muted-foreground/60">, </span>}
    </>
  );
}

export function ThemeCard({
  block,
  quarterLabel,
  standalone = false,
}: {
  block: ThemeBlock;
  quarterLabel?: string | null;
  /** On /themes/[slug] the card IS the page: no self-link on the title, no OPEN THEME →. */
  standalone?: boolean;
}) {
  const story = block.story;
  const provisionalCount = block.members.filter((m) => m.quarterSourceStatus === "unofficial").length;
  const href = `/themes/${block.slug}`;

  return (
    <section
      aria-labelledby={`theme-${block.slug}`}
      className="rounded-xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-[2px]"
    >
      {/* Header: eyebrow + title · blurb · driving factor */}
      <div className="grid gap-x-10 gap-y-5 px-7 pb-6 pt-7 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <div className={`${EYEBROW} flex flex-wrap items-center gap-x-3`}>
            <span>{themeIndexLabel(block.index)}</span>
            {block.sinceQuarter && <span>Since {block.sinceQuarter}</span>}
          </div>
          <h2
            id={`theme-${block.slug}`}
            className="mt-3 text-[30px] font-black leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[34px]"
          >
            {standalone ? (
              block.title
            ) : (
              <Link href={href} prefetch={false} className="hover:underline decoration-2 underline-offset-4">
                {block.title}
              </Link>
            )}
          </h2>
          <div className="mt-3">
            <InFocusPips value={block.hotness} updatedAt={block.updatedAt} />
          </div>
        </div>
        <div className="min-w-0 self-center">
          {block.blurb && (
            <p className="max-w-[60ch] text-[15px] leading-[1.65] text-muted-foreground">{block.blurb}</p>
          )}
        </div>
        {story && (
          <aside className="min-w-0 self-center border-border/60 md:border-l md:pl-6">
            <div className={EYEBROW}>Driving factor · {DRIVER_KIND_LABEL[story.driver.kind]}</div>
            <div className="mt-2 text-lg font-bold leading-tight text-foreground">{story.driver.title}</div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{story.driver.line}</p>
          </aside>
        )}
      </div>

      {/* KPI strip */}
      {story && story.kpis.length > 0 && (
        <div
          className="grid border-y border-border/60 px-7 md:divide-x md:divide-border/60"
          style={{ gridTemplateColumns: `repeat(${story.kpis.length}, minmax(0, 1fr))` }}
        >
          {story.kpis.map((kpi) => (
            <KpiTile key={kpi.label} kpi={kpi} />
          ))}
        </div>
      )}

      {/* Footer: riding it + open theme */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 px-7 py-4">
        <p className="min-w-0 flex-1 text-sm leading-relaxed">
          <span className={`${EYEBROW} mr-3 whitespace-nowrap`}>
            Riding it · {block.memberCount}
          </span>
          {block.members.map((member, i) => (
            <RidingName key={member.companyCode} member={member} last={i === block.members.length - 1} />
          ))}
        </p>
        {!standalone && (
          <Link
            href={href}
            prefetch={false}
            className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Open theme →
          </Link>
        )}
      </div>
      {quarterLabel && provisionalCount > 0 && (
        <p className="px-7 pb-3 font-mono text-[10px] tracking-[0.02em] text-muted-foreground/70">
          Scores as of {quarterLabel} · {provisionalCount} provisional
        </p>
      )}
    </section>
  );
}
