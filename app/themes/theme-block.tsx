// One theme block on /themes: the editorial claim (title + "why now" blurb) LEADS,
// then a compact ranked list of members carrying the leaderboard's four scores
// (Quarter / Growth / Valuation / Read). Rank 1 = best read. No Trend column — this
// is exactly the Overall board row (eng review), rendered compact instead of in the
// full sortable table. Every number and band comes from the same lib the board uses,
// so a company reads identically on both surfaces.

import Link from "next/link";

import { BOARD_READS } from "@/lib/board-read";
import { BANDS, bandForScore } from "@/lib/score-band";
import { GROWTH_BANDS, bandForGrowthScore } from "@/lib/growth-band";
import { VALUATION_BANDS, bandForValuationScore } from "@/lib/valuation-band";
import type { ThemeBlock, ThemeMember } from "@/lib/themes/types";

function fmt(score: number | null): string {
  return score == null ? "—" : score.toFixed(1);
}

/** A desktop score cell: number over its band word — the board's grammar. */
function ScoreCell({
  score,
  bandLabel,
  bandClass,
  emphasize = false,
  dimmed = false,
}: {
  score: number | null;
  bandLabel: string | null;
  bandClass: string;
  emphasize?: boolean;
  dimmed?: boolean;
}) {
  if (score == null || bandLabel == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="leading-tight">
      <div
        className={`tabular-nums ${emphasize ? "text-base font-semibold" : "font-medium"} text-foreground`}
      >
        {score.toFixed(1)}
      </div>
      <div className={`text-[10px] font-medium ${dimmed ? "text-muted-foreground" : bandClass}`}>
        {bandLabel}
      </div>
    </div>
  );
}

function MemberRow({ member, rank }: { member: ThemeMember; rank: number | null }) {
  const dim = member.belowCut;
  const read = BOARD_READS[member.readKey];
  const quarterBand = member.quarterScore != null ? BANDS[bandForScore(member.quarterScore)] : null;
  const growthBand =
    member.growthScore != null ? GROWTH_BANDS[bandForGrowthScore(member.growthScore)] : null;
  const valuationBand =
    member.valuationScore != null
      ? VALUATION_BANDS[bandForValuationScore(member.valuationScore)]
      : null;

  const companyCell = (
    <span className="flex min-w-0 items-baseline gap-2">
      <Link
        href={`/company/${member.companyCode}`}
        prefetch={false}
        title={dim ? `${member.companyName} — below the coverage cut` : member.companyName}
        className={`min-w-0 truncate font-semibold hover:underline ${
          dim ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {member.companyName}
      </Link>
      {member.isBestRead && (
        <span className="shrink-0 rounded-sm border border-teal-600/60 px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.12em] text-teal-700 dark:border-teal-400/50 dark:text-teal-300">
          Best read
        </span>
      )}
      {member.notYetScored && (
        <span className="shrink-0 rounded-sm border border-border/60 px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Not yet scored
        </span>
      )}
      {member.belowCut && (
        <span
          title="Below the coverage cut — de-emphasized on discovery surfaces, not ranked within the theme"
          className="shrink-0 rounded-sm border border-amber-600/50 px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.1em] text-amber-700 dark:border-amber-400/40 dark:text-amber-300"
        >
          Below cut
        </span>
      )}
      {member.quarterSourceStatus === "unofficial" && (
        <span
          title="Scored off a third-party transcript inside the SEBI window — re-scored when the issuer files"
          className="shrink-0 rounded-sm border border-sky-600/50 px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.1em] text-sky-700 dark:border-sky-400/40 dark:text-sky-300"
        >
          Unofficial
        </span>
      )}
    </span>
  );

  const rankCell = (
    <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
      {rank ?? "—"}
    </span>
  );

  return (
    <li className={`border-b border-border/45 py-2.5 last:border-0 ${dim ? "opacity-55" : ""}`}>
      {/* Desktop: one grid row — # · Company · Qtr · Grw · Val · Read. */}
      <div className="hidden items-center gap-3 sm:grid sm:grid-cols-[1.5rem_minmax(0,1fr)_3.25rem_3.25rem_3.5rem_3.75rem]">
        {rankCell}
        {companyCell}
        <div className="text-right">
          <ScoreCell
            score={member.quarterScore}
            bandLabel={quarterBand?.label ?? null}
            bandClass={quarterBand?.textClass ?? ""}
            dimmed={dim}
          />
        </div>
        <div className="text-right">
          <ScoreCell
            score={member.growthScore}
            bandLabel={growthBand?.label ?? null}
            bandClass={growthBand?.textClass ?? ""}
            dimmed={dim}
          />
        </div>
        <div className="text-right">
          <ScoreCell
            score={member.valuationScore}
            bandLabel={valuationBand?.label ?? null}
            bandClass={valuationBand?.textClass ?? ""}
            dimmed={dim}
          />
        </div>
        <div className="text-right">
          {member.readScore != null ? (
            <div className="leading-tight">
              <div className="text-base font-semibold tabular-nums text-foreground">
                {member.readScore.toFixed(1)}
              </div>
              <div className={`text-[10px] font-medium ${dim ? "text-muted-foreground" : read.textClass}`}>
                {read.label}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {/* Mobile: two lines — (1) # + company, (2) the four scores compact. */}
      <div className="sm:hidden">
        <div className="flex items-baseline gap-2">
          {rankCell}
          {companyCell}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 pl-8 font-mono text-xs tabular-nums text-muted-foreground">
          <span>
            <span className="mr-1 text-[9px] uppercase tracking-wide text-muted-foreground/70">Q</span>
            {fmt(member.quarterScore)}
          </span>
          <span>
            <span className="mr-1 text-[9px] uppercase tracking-wide text-muted-foreground/70">G</span>
            {fmt(member.growthScore)}
          </span>
          <span>
            <span className="mr-1 text-[9px] uppercase tracking-wide text-muted-foreground/70">V</span>
            {fmt(member.valuationScore)}
          </span>
          <span className="text-foreground">
            <span className="mr-1 text-[9px] uppercase tracking-wide text-muted-foreground/70">Read</span>
            <span className="font-semibold">{fmt(member.readScore)}</span>
          </span>
        </div>
      </div>
    </li>
  );
}

export function ThemeBlockView({
  block,
  quarterLabel,
}: {
  block: ThemeBlock;
  quarterLabel?: string | null;
}) {
  let rank = 0;
  const provisionalCount = block.members.filter(
    (member) => member.quarterSourceStatus === "unofficial",
  ).length;
  return (
    <section className="border-t-2 border-foreground pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-foreground sm:text-2xl">
          {block.title}
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
          {block.memberCount} covered
        </span>
      </div>
      {block.blurb && (
        <p className="mt-2 max-w-[66ch] text-sm leading-relaxed text-muted-foreground">
          {block.blurb}
        </p>
      )}
      {quarterLabel && (
        <p className="mt-2 font-mono text-[11px] tracking-[0.02em] text-muted-foreground/80">
          Scores as of {quarterLabel}
          {provisionalCount > 0 && ` · ${provisionalCount} provisional`}
        </p>
      )}
      {/* Desktop column headers. Mobile rows carry per-cell Q/G/V/Read labels inline
          instead, so the header is desktop-only — same grid template as MemberRow. */}
      <div className="mt-4 hidden items-center gap-3 border-b border-border/45 pb-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70 sm:grid sm:grid-cols-[1.5rem_minmax(0,1fr)_3.25rem_3.25rem_3.5rem_3.75rem]">
        <span aria-hidden="true" />
        <span>Company</span>
        <span className="text-right">Qtr</span>
        <span className="text-right">Grw</span>
        <span className="text-right">Val</span>
        <span className="text-right text-foreground/70">Read</span>
      </div>
      {(() => {
        // Rank every member first (below-cut / unscored carry none, matching the board),
        // then show the top 3 by Read and collapse the rest behind a toggle. Collapse only
        // when it saves more than one row, so a 4-member theme just shows all four.
        const rows = block.members.map((member) => {
          const showRank = !member.belowCut && member.readScore != null;
          if (showRank) rank += 1;
          return { member, rank: showRank ? rank : null };
        });
        const VISIBLE = 3;
        const collapse = rows.length > VISIBLE + 1;
        const visible = collapse ? rows.slice(0, VISIBLE) : rows;
        const hidden = collapse ? rows.slice(VISIBLE) : [];

        return (
          <>
            <ul>
              {visible.map(({ member, rank: rowRank }) => (
                <MemberRow key={member.companyCode} member={member} rank={rowRank} />
              ))}
            </ul>
            {hidden.length > 0 && (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 border-t border-border/45 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show {hidden.length} more</span>
                  <span className="hidden group-open:inline">Show fewer</span>
                  <span aria-hidden="true" className="transition-transform group-open:rotate-180">
                    ↓
                  </span>
                </summary>
                <ul>
                  {hidden.map(({ member, rank: rowRank }) => (
                    <MemberRow key={member.companyCode} member={member} rank={rowRank} />
                  ))}
                </ul>
              </details>
            )}
          </>
        );
      })()}
    </section>
  );
}
