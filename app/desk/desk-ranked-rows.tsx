// One ranked list in the desk's right rail: rank · logo · name · ConcallScore,
// a hairline between rows. Shared by Top performers (server) and Most viewed
// (client), so it carries no hooks.

import ConcallScore from "@/components/concall-score";
import { HomepageModuleLink } from "@/components/homepage-module-link";
import { cn } from "@/lib/utils";
import { DESK_FOCUS, DESK_HOVER, DeskCrest, tradingName } from "./desk-ui";

export type RankedRow = { code: string; name: string; latestScore: number | null };

export function RankedRows({ rows, module }: { rows: RankedRow[]; module: string }) {
  return (
    <ol>
      {rows.map((row, i) => (
        <li key={row.code} className="border-t border-[var(--rule)]">
          <HomepageModuleLink
            module={module}
            companyCode={row.code}
            surface="desk"
            href={`/company/${row.code}`}
            className={cn("flex items-center gap-3 px-4 py-3 sm:px-5", DESK_HOVER, DESK_FOCUS)}
          >
            <span className="house-data w-4 shrink-0 text-xs text-[var(--ink-soft)]">{i + 1}</span>
            <DeskCrest code={row.code} name={row.name} />
            <span className="house-display min-w-0 flex-1 truncate text-[15px]" title={row.name}>
              {tradingName(row.name)}
            </span>
            {row.latestScore != null ? <ConcallScore score={row.latestScore} size="sm" /> : null}
          </HomepageModuleLink>
        </li>
      ))}
    </ol>
  );
}
