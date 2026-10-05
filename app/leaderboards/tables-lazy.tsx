"use client";

import dynamic from "next/dynamic";
import type { CompanyRow } from "@/app/company/leaderboard-table";
import type { ScoreBoardRow } from "@/components/score-board-table";
import type { GrowthRowTable } from "./growth-table";
import type { MoatRowTable } from "./moat-table";
import { FilterEmpty, filterByCodes, useBoardFilterCodes } from "./board-filter";
import type {
  PhoneGrowthBoard as PhoneGrowthBoardImpl,
  PhoneMoatBoard as PhoneMoatBoardImpl,
  PhoneOverallBoard as PhoneOverallBoardImpl,
  PhoneQuarterBoard as PhoneQuarterBoardImpl,
} from "./phone-boards";

// SSR stays ON. These were `ssr: false` (commit eaaac82 "speed"), which left a
// five-row skeleton on the server HTML and let a 100+-row table pop in on the
// client — the footer jumped by thousands of pixels and Speed Insights put
// /leaderboards CLS at 0.27 (field) / 0.288 (lab). The tables only touch
// `window` inside event handlers, so rendering them on the server is safe; the
// dynamic() wrapper still code-splits each tab, which was the point of the
// original change. The skeleton now only shows during client-side tab swaps.
//
// Rows only, no card. Every caller already sits inside its own shell — the
// Overall tab wraps in TABLE_CARD_SKY (app/leaderboards/page.tsx), the Moat
// table wraps itself — so a carded skeleton nested a card inside a card on
// load, and hand-rolled the TABLE_CARD_SKY recipe to do it.
function TableSkeleton() {
  return (
    <div className="p-6">
      <div className="space-y-2">
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/40" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/30" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/30" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/30" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted/30" />
      </div>
    </div>
  );
}

// Every export below is a thin wrapper that applies the page's board filters
// (./board-filter) to the lazily loaded board. Growth and Moat rows carry their
// own rank, so they are filtered here; the Quarter and Overall boards rank the
// rows they are handed, so they take the codes and hide rows after ranking.
const LeaderboardTableImpl = dynamic<{
  quarterLabels: string[];
  data: CompanyRow[];
  gateCutIndex?: number;
  filterCodes?: ReadonlySet<string> | null;
}>(
  () =>
    import("@/app/company/leaderboard-table").then((mod) => mod.LeaderboardTable),
  {
    loading: () => <TableSkeleton />,
  },
);

export function LeaderboardTable(props: {
  quarterLabels: string[];
  data: CompanyRow[];
  gateCutIndex?: number;
}) {
  return <LeaderboardTableImpl {...props} filterCodes={useBoardFilterCodes()} />;
}

const GrowthTableImpl = dynamic<{ data: GrowthRowTable[]; gateCutIndex?: number }>(
  () => import("./growth-table").then((mod) => mod.GrowthTable),
  {
    loading: () => <TableSkeleton />,
  },
);

export function GrowthTable({ data, gateCutIndex }: { data: GrowthRowTable[]; gateCutIndex?: number }) {
  const keep = useBoardFilterCodes();
  const rows = filterByCodes(data, keep, (row) => row.companyCode);
  if (keep != null && rows.length === 0) return <FilterEmpty />;
  return <GrowthTableImpl data={rows} gateCutIndex={gateCutIndex} />;
}

const MoatTableImpl = dynamic<{ data: MoatRowTable[]; gateCutIndex?: number }>(
  () => import("./moat-table").then((mod) => mod.MoatTable),
  {
    loading: () => <TableSkeleton />,
  },
);

export function MoatTable({ data, gateCutIndex }: { data: MoatRowTable[]; gateCutIndex?: number }) {
  const keep = useBoardFilterCodes();
  const rows = filterByCodes(data, keep, (row) => row.companyCode);
  if (keep != null && rows.length === 0) return <FilterEmpty />;
  return <MoatTableImpl data={rows} gateCutIndex={gateCutIndex} />;
}

// The "Overall" tab: four score columns (Quarter / Growth / Valuation / Read)
// over the whole mid/small universe, below-cut names included as a greyed tail.
// The same board renders a watchlist (with a Remove column and nothing greyed) —
// see components/score-board-table.tsx.
type OverallTableProps = {
  rows: ScoreBoardRow[];
  priorRankByCode?: Record<string, number>;
  coverageCutRank?: number;
  gateCutIndex?: number;
  /** UPPERCASE codes of companies new to coverage — the "Added" chip. */
  addedCodes?: string[];
};

const OverallTableImpl = dynamic<OverallTableProps & { filterCodes?: ReadonlySet<string> | null }>(
  () => import("@/components/score-board-table").then((mod) => mod.ScoreBoardTable),
  {
    loading: () => <TableSkeleton />,
  },
);

export function OverallTable(props: OverallTableProps) {
  return <OverallTableImpl {...props} filterCodes={useBoardFilterCodes()} />;
}

// The phone paints (app/leaderboards/phone-boards.tsx), split the same way so a
// desktop visitor — whose BelowSm tree unmounts right after hydration — never
// downloads them. SSR stays on (same reasoning as above); they use no `useId`.
// One card-shaped skeleton: the phone card is `mx-4`, so the stand-in is too.
function PhoneBoardSkeleton() {
  return (
    <div className="mx-4 mt-3 space-y-px overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] p-3.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-[58px] animate-pulse rounded-md bg-[var(--paper)]" />
      ))}
    </div>
  );
}

const PhoneOverallBoardLazy = dynamic<React.ComponentProps<typeof PhoneOverallBoardImpl>>(
  () => import("./phone-boards").then((mod) => mod.PhoneOverallBoard),
  { loading: () => <PhoneBoardSkeleton /> },
);
const PhoneQuarterBoardLazy = dynamic<React.ComponentProps<typeof PhoneQuarterBoardImpl>>(
  () => import("./phone-boards").then((mod) => mod.PhoneQuarterBoard),
  { loading: () => <PhoneBoardSkeleton /> },
);
const PhoneGrowthBoardLazy = dynamic<React.ComponentProps<typeof PhoneGrowthBoardImpl>>(
  () => import("./phone-boards").then((mod) => mod.PhoneGrowthBoard),
  { loading: () => <PhoneBoardSkeleton /> },
);
const PhoneMoatBoardLazy = dynamic<React.ComponentProps<typeof PhoneMoatBoardImpl>>(
  () => import("./phone-boards").then((mod) => mod.PhoneMoatBoard),
  { loading: () => <PhoneBoardSkeleton /> },
);

type PhoneProps<T extends (props: never) => unknown> = Omit<Parameters<T>[0], "filterCodes">;

export function PhoneOverallBoard(props: PhoneProps<typeof PhoneOverallBoardImpl>) {
  return <PhoneOverallBoardLazy {...props} filterCodes={useBoardFilterCodes()} />;
}
export function PhoneQuarterBoard(props: PhoneProps<typeof PhoneQuarterBoardImpl>) {
  return <PhoneQuarterBoardLazy {...props} filterCodes={useBoardFilterCodes()} />;
}
export function PhoneGrowthBoard({ rows, gateCutIndex }: PhoneProps<typeof PhoneGrowthBoardImpl>) {
  const keep = useBoardFilterCodes();
  const kept = filterByCodes(rows, keep, (row) => row.companyCode);
  if (keep != null && kept.length === 0) return <FilterEmpty />;
  return <PhoneGrowthBoardLazy rows={kept} gateCutIndex={gateCutIndex} />;
}
export function PhoneMoatBoard({ rows, gateCutIndex }: PhoneProps<typeof PhoneMoatBoardImpl>) {
  const keep = useBoardFilterCodes();
  const kept = filterByCodes(rows, keep, (row) => row.companyCode);
  if (keep != null && kept.length === 0) return <FilterEmpty />;
  return <PhoneMoatBoardLazy rows={kept} gateCutIndex={gateCutIndex} />;
}
