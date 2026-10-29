// "Leaderboard movers · this week" (2026-10-29 redesign): the biggest climbs
// and slips in Overall-board rank between the newest daily snapshot and the one
// a week before it (lib/desk-movers.ts). The number is places moved; the circle
// is the company's latest ConcallScore, as everywhere else on the desk.

import ConcallScore from "@/components/concall-score";
import { HomepageModuleLink } from "@/components/homepage-module-link";
import type { DeskCompany } from "@/lib/desk-leaderboard";
import { computeMovers, type Mover } from "@/lib/desk-movers";
import { getCachedWeeklyRankPair } from "@/lib/leaderboard-snapshot";
import { cn } from "@/lib/utils";
import { DESK_CARD, DESK_FOCUS, DESK_HOVER, DeskCrest, DeskSection, tradingName } from "./desk-ui";
import { DeskSectionTracker } from "./desk-section-tracker";

function MoverRow({ mover }: { mover: Mover }) {
  const up = mover.delta > 0;
  return (
    <li className="border-t border-[var(--rule)]">
      <HomepageModuleLink
        module="desk_movers"
        companyCode={mover.code}
        surface="desk"
        href={`/company/${mover.code}`}
        title={`Rank ${mover.priorRank} → ${mover.rank}`}
        className={cn("flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5", DESK_HOVER, DESK_FOCUS)}
      >
        <span
          className={cn(
            "house-data w-9 shrink-0 text-sm tabular-nums",
            up ? "text-[var(--signal)]" : "text-[var(--alarm)]",
          )}
        >
          {/* U+2212 so a slip lines up with a climb's "+". */}
          {up ? `+${mover.delta}` : `−${Math.abs(mover.delta)}`}
        </span>
        <DeskCrest name={mover.name} />
        <span className="min-w-0 flex-1">
          <span className="house-display block truncate text-[15px]">{tradingName(mover.name)}</span>
          <span className="house-data block text-[11px] text-[var(--ink-soft)]">now #{mover.rank}</span>
        </span>
        {mover.latestScore != null ? <ConcallScore score={mover.latestScore} size="sm" /> : null}
      </HomepageModuleLink>
    </li>
  );
}

function Side({ label, tone, movers, empty }: { label: string; tone: string; movers: Mover[]; empty: string }) {
  return (
    <div>
      <h3 className={cn("house-data house-micro px-4 py-3 sm:px-5", tone)}>{label}</h3>
      {movers.length > 0 ? (
        <ol>
          {movers.map((m) => (
            <MoverRow key={m.code} mover={m} />
          ))}
        </ol>
      ) : (
        <p className="house-data border-t border-[var(--rule)] px-4 py-3.5 text-xs text-[var(--ink-soft)] sm:px-5">{empty}</p>
      )}
    </div>
  );
}

export async function DeskMovers({ companies }: { companies: DeskCompany[] }) {
  const pair = await getCachedWeeklyRankPair();
  const { climbing, slipping } = computeMovers({ latest: pair.latest, prior: pair.prior, companies });
  if (climbing.length === 0 && slipping.length === 0) return null;

  return (
    <DeskSectionTracker sectionId="desk_movers">
      <DeskSection
        id="desk-movers"
        eyebrow="Leaderboard movers · this week"
        link={{ href: "/leaderboards", label: "Full leaderboard →" }}
      >
        <div className={cn(DESK_CARD, "grid divide-y divide-[var(--rule)] md:grid-cols-2 md:divide-x md:divide-y-0")}>
          <Side label="Climbing" tone="text-[var(--signal)]" movers={climbing} empty="No climbs this week." />
          <Side label="Slipping" tone="text-[var(--alarm)]" movers={slipping} empty="No slips this week." />
        </div>
      </DeskSection>
    </DeskSectionTracker>
  );
}
