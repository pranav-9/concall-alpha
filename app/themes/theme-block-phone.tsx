// Phone presentation of one theme block (handoff 2026-09-13, "Themes — mobile"):
// a house card with a signal accent on its left edge — title beside the In Focus
// meter, the "why now" blurb, an Avg-read meta line, then the member board as
// whole-row links carrying Q · G · V · Read. Same ranking, same collapse rule and
// the same band libs as theme-block.tsx, so a company reads identically on both
// paints. Server component: the collapse is a <details>, no client state.

import Link from "next/link";

import { MOBILE_CARD, MOBILE_LI, MOBILE_LINK, MobileTag } from "@/components/mobile-card";
import { BOARD_READS } from "@/lib/board-read";
import { clampHotness, formatInFocusUpdated } from "@/lib/in-focus";
import { BANDS, bandForScore } from "@/lib/score-band";
import { rankThemeMembers, splitThemeRows, themeAvgRead } from "@/lib/themes/rank";
import type { ThemeBlock, ThemeMember } from "@/lib/themes/types";
import { cn } from "@/lib/utils";

function fmt(score: number | null): string {
  return score == null ? "—" : score.toFixed(1);
}

/**
 * The In Focus meter as five vertical bars over a caption. It is a METER, not a
 * rating: the filled bars take the neutral ink, never a data or accent colour
 * (the external-claims guardrail InFocusPips already follows), so it can't read
 * as a buy signal. Null renders nothing at all.
 */
function InFocusBars({ value, updatedAt }: { value: number | null; updatedAt: string | null }) {
  const v = clampHotness(value);
  if (v == null) return null;
  const when = formatInFocusUpdated(updatedAt);
  const tip =
    `In focus: ${v}/5 — how much this theme is drawing attention now ` +
    `(earnings momentum, re-rating, community buzz).` +
    (when ? ` Updated ${when}.` : "") +
    ` Not investment advice.`;
  return (
    <span title={tip} className="flex shrink-0 flex-col items-end gap-1">
      <span role="img" aria-label={`In focus: ${v} of 5`} className="flex items-center gap-[3px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            aria-hidden
            className={cn(
              "h-[11px] w-[5px] rounded-[1px]",
              i <= v ? "bg-[var(--ink)]" : "bg-[var(--rule)]",
            )}
          />
        ))}
      </span>
      <span className="house-data text-[9px] uppercase tracking-[0.06em] text-[var(--ink-soft)]">
        In focus
      </span>
    </span>
  );
}

function MemberRow({ member, rank }: { member: ThemeMember; rank: number | null }) {
  const dim = member.belowCut;
  const read = BOARD_READS[member.readKey];
  return (
    <li className={MOBILE_LI}>
      <Link
        href={`/company/${member.companyCode}`}
        prefetch={false}
        title={dim ? `${member.companyName} — below the coverage cut` : member.companyName}
        className={cn(MOBILE_LINK, "flex items-center gap-2.5 px-3.5 py-[11px]", dim && "opacity-70")}
      >
        <span className="house-data w-4 shrink-0 text-center text-[11px] tabular-nums text-[var(--ink-soft)]">
          {rank ?? "—"}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className={cn(
              "house-display truncate text-[13.5px]",
              dim ? "text-[var(--ink-soft)]" : "text-[var(--ink)]",
            )}
          >
            {member.companyName}
          </span>
          {member.isBestRead ? <MobileTag tone="signal">best</MobileTag> : null}
          {member.notYetScored ? <MobileTag>not scored</MobileTag> : null}
          {member.belowCut ? (
            <MobileTag
              tone="warn"
              title="Below the coverage cut — de-emphasized on discovery surfaces, not ranked within the theme"
            >
              below cut
            </MobileTag>
          ) : null}
          {member.quarterSourceStatus === "unofficial" ? (
            <MobileTag title="Scored off a third-party transcript inside the SEBI window — re-scored when the issuer files">
              unofficial
            </MobileTag>
          ) : null}
        </span>
        <span className="house-data flex w-[132px] shrink-0 items-baseline justify-end gap-[9px] text-[11px] tabular-nums">
          <span className="text-[var(--ink-soft)]">{fmt(member.concallScore)}</span>
          <span className="text-[var(--ink-soft)]">{fmt(member.growthScore)}</span>
          <span className="text-[var(--ink-soft)]">{fmt(member.valuationScore)}</span>
          <span
            className={cn(
              "min-w-[24px] text-right font-bold",
              member.readScore == null || dim ? "text-[var(--ink-soft)]" : read.textClass,
            )}
          >
            {fmt(member.readScore)}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function ThemeBlockPhone({
  block,
  quarterLabel,
}: {
  block: ThemeBlock;
  quarterLabel?: string | null;
}) {
  // Rank, then top 3 + collapse — the shared rule (lib/themes/rank), so this
  // paint can't disagree with the desktop block or the desk card.
  const { visible, hidden } = splitThemeRows(rankThemeMembers(block.members));
  const avgRead = themeAvgRead(block.members);
  const avgBand = avgRead != null ? BANDS[bandForScore(avgRead)] : null;
  const provisionalCount = block.members.filter(
    (m) => m.quarterSourceStatus === "unofficial",
  ).length;

  return (
    <section
      aria-labelledby={`theme-phone-${block.slug}`}
      className={cn(MOBILE_CARD, "mt-4 border-l-2 border-l-[var(--signal)]")}
    >
      <div className="border-b border-[var(--rule)] px-3.5 pb-3 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <h2
            id={`theme-phone-${block.slug}`}
            className="house-display min-w-0 flex-1 text-lg leading-[1.15] [text-wrap:pretty]"
          >
            {block.title}
          </h2>
          <InFocusBars value={block.hotness} updatedAt={block.updatedAt} />
        </div>
        {block.blurb ? (
          <p className="mt-[9px] text-[12.5px] leading-[1.5] text-[var(--ink-soft)] [text-wrap:pretty]">
            {block.blurb}
          </p>
        ) : null}
        <p className="house-data mt-2.5 flex flex-wrap items-center gap-x-2 text-[10px] text-[var(--ink-soft)]">
          <span>
            Avg read{" "}
            <span className={cn("font-bold tabular-nums", avgBand ? avgBand.textClass : "")}>
              {fmt(avgRead)}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span>
            {block.memberCount} covered
            {quarterLabel ? ` · scores as of ${quarterLabel}` : ""}
            {provisionalCount > 0 ? ` · ${provisionalCount} provisional` : ""}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2.5 border-b border-[var(--rule)] px-3.5 py-2">
        <span aria-hidden className="w-4 shrink-0" />
        <span className="house-data flex-1 text-[9px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          Company
        </span>
        <span className="house-data w-[132px] text-right text-[9px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
          Q · G · V · Read
        </span>
      </div>

      <ul role="list" aria-label={`${block.title} — companies by Read`}>
        {visible.map(({ member, rank: rowRank }) => (
          <MemberRow key={member.companyCode} member={member} rank={rowRank} />
        ))}
      </ul>
      {hidden.length > 0 ? (
        <details className="group">
          <summary className="house-data flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-3.5 py-3 text-[10px] uppercase tracking-[0.08em] text-[var(--ink-soft)] transition-colors active:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--signal)] [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show {hidden.length} more</span>
            <span className="hidden group-open:inline">Show fewer</span>
            <span aria-hidden className="transition-transform group-open:rotate-180">
              ↓
            </span>
          </summary>
          <ul role="list" className="border-t border-[var(--rule)]">
            {hidden.map(({ member, rank: rowRank }) => (
              <MemberRow key={member.companyCode} member={member} rank={rowRank} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
