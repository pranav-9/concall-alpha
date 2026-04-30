import Link from "next/link";
import ConcallScore from "@/components/concall-score";
import { ScoreDelta } from "@/components/score-delta";
import {
  formatRelativeActivityTime,
  getUnifiedUpdates,
  typeChipClass,
} from "@/lib/activity-feed";

export default async function RecentScoreUpdates({
  heroPanel = false,
}: {
  heroPanel?: boolean;
} = {}) {
  const isCompact = heroPanel;
  const updates = await getUnifiedUpdates({ limit: isCompact ? 9 : 6 });
  if (updates.length === 0) return null;

  const headerClass = isCompact
    ? "px-3 py-2.5 border-b border-border"
    : "p-3 sm:p-4 border-b border-border";
  const titleClass = isCompact
    ? "text-base font-bold tracking-[-0.01em] text-foreground"
    : "text-base sm:text-lg font-bold text-foreground";
  const subtitleClass = isCompact
    ? "text-[11px] text-muted-foreground leading-tight"
    : "text-xs text-muted-foreground leading-relaxed";
  const rowClass = isCompact
    ? "flex items-start justify-between gap-2 px-3 py-2 hover:bg-accent/70 transition-colors"
    : "flex items-center justify-between gap-2.5 px-3 py-2.5 hover:bg-accent/70 transition-colors";
  const companyNameClass = isCompact
    ? "text-[13px] font-semibold leading-tight text-foreground truncate"
    : "text-sm font-semibold text-foreground truncate";
  const metaRowClass = isCompact
    ? "mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]"
    : "mt-0.5 flex flex-wrap items-center gap-2 text-xs";
  const chipClass = isCompact
    ? "text-[10px] px-2 py-0.5 rounded-full border font-medium leading-none"
    : "text-[11px] px-2.5 py-0.5 rounded-full border font-medium";
  const dateClass = isCompact
    ? "text-[10px] text-muted-foreground"
    : "text-[11px] text-muted-foreground";
  const detailClass = isCompact
    ? "text-[10px] text-muted-foreground line-clamp-1"
    : "text-[11px] text-muted-foreground line-clamp-1";
  const footerClass = isCompact
    ? "px-3 pb-2 pt-1 sm:border-t sm:border-border"
    : "px-3 sm:px-4 pb-3 sm:pb-4 pt-2 border-t border-border";

  return (
    <section className={heroPanel ? "h-full w-full" : "w-[95%] sm:w-[90%] pt-6 sm:pt-8"}>
      <div className={heroPanel ? "flex h-full flex-col rounded-xl border border-border bg-card" : "rounded-xl border border-border bg-card"}>
        <div className={headerClass}>
          <h2 className={titleClass}>
            Latest Updates
          </h2>
          <p className={subtitleClass}>
            Recent activity across covered companies
          </p>
        </div>

        <div className={heroPanel ? "flex-1 divide-y divide-border overflow-y-auto" : "divide-y divide-border"}>
          {updates.map((item, index) => {
            const mobileOnlyHidden = heroPanel && index === 8 ? "hidden sm:block sm:border-t-0" : "";
            const row = (
              <div className={rowClass}>
                <div className="min-w-0">
                  <p className={companyNameClass}>
                    {item.companyName}
                    {item.companyIsNew && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-medium leading-none text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                        New
                      </span>
                    )}
                  </p>
                  <div className={metaRowClass}>
                    <span
                      className={`${chipClass} ${typeChipClass(item.type)}`}
                    >
                      {item.sourceLabel}
                    </span>
                    {item.detail &&
                      item.type !== "guidance_monitor" && (
                      <span className={detailClass}>
                        {item.detail}
                      </span>
                    )}
                    <span className={dateClass} title={item.atRaw ?? undefined}>
                      {formatRelativeActivityTime(item.atRaw)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {typeof item.score === "number" ? (
                    <>
                      <ConcallScore score={item.score} size="sm" />
                      <ScoreDelta
                        score={item.score}
                        priorScore={item.priorScore}
                        className={isCompact ? "text-[9px]" : "text-[10px]"}
                      />
                    </>
                  ) : item.contextLabel ? (
                    <span
                      className={`${chipClass} ${typeChipClass(item.type)}`}
                    >
                      {item.contextLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            );

            const href =
              item.artifactHref ??
              (item.companyCode ? `/company/${item.companyCode}` : null);
            if (!href) {
              return (
                <div key={item.id} className={mobileOnlyHidden}>
                  {row}
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={href}
                prefetch={false}
                className={mobileOnlyHidden}
              >
                {row}
              </Link>
            );
          })}
        </div>

        <div className={footerClass}>
          <Link
            href="/activity"
            prefetch={false}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            See all activity →
          </Link>
        </div>
      </div>
    </section>
  );
}
