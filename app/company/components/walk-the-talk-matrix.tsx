import { AlertTriangle, Check, Clock, Minus, X } from "lucide-react";

import { chipClass, type ChipTone } from "./chip-tone";
import { nestedDetailClass } from "./surface-tokens";
import type {
  NormalizedGuidanceStatusKey,
  WalkTheTalkCommitmentRow,
} from "@/lib/walk-the-talk/types";
import { cn } from "@/lib/utils";

type Props = {
  commitments: WalkTheTalkCommitmentRow[];
};

// Status → chip presentation. Maps Phase 6 statusKey to walk-the-talk's
// chip vocabulary. Methodology locked 2026-05-14 in /plan-design-review:
//   met       → emerald (the on-time signal)
//   delayed   → rose    (mgmt admitted delay)
//   dropped   → rose    (walked back; bad-faith signal)
//   revised   → amber   (deviated, direction unknown)
//   active    → slate   (still in window)
//   not_yet_clear → slate
//   unknown   → slate   (defensive fallback)
function statusPresentation(statusKey: NormalizedGuidanceStatusKey): {
  label: string;
  tone: ChipTone;
  icon: typeof Check;
} {
  switch (statusKey) {
    case "met":
      return { label: "Met", tone: "emerald", icon: Check };
    case "delayed":
      return { label: "Delayed", tone: "rose", icon: AlertTriangle };
    case "dropped":
      return { label: "Dropped", tone: "rose", icon: X };
    case "revised":
      return { label: "Revised", tone: "amber", icon: AlertTriangle };
    case "active":
      return { label: "Active", tone: "slate", icon: Clock };
    case "not_yet_clear":
      return { label: "Pending", tone: "slate", icon: Clock };
    case "unknown":
      return { label: "Unknown", tone: "slate", icon: Minus };
  }
}

const cellHeaderClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
const cellBodyClass = "text-[13px] leading-snug text-foreground";
const cellMutedClass = "text-[12px] leading-snug text-muted-foreground";
const sectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

function CommitmentRow({ row }: { row: WalkTheTalkCommitmentRow }) {
  const status = statusPresentation(row.status_key);
  const StatusIcon = status.icon;

  return (
    <div className={cn(nestedDetailClass, "p-3")}>
      <div className="space-y-2 md:grid md:grid-cols-[1fr_auto] md:items-start md:gap-3 md:space-y-0">
        <div className="space-y-1">
          <p className={cellBodyClass}>{row.label}</p>
          {row.latest_view ? (
            <p className={cellMutedClass}>{row.latest_view}</p>
          ) : row.status_reason ? (
            <p className={cellMutedClass}>{row.status_reason}</p>
          ) : null}
        </div>

        <span
          className={cn(
            chipClass(status.tone),
            "shrink-0 gap-1.5 md:self-start",
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
          {row.delay_mention_count > 1 ? (
            <span className="ml-1 opacity-70">
              · {row.delay_mention_count} delays
            </span>
          ) : null}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-left">
        <Cell label="First mentioned" value={row.source_quarter ?? "—"} />
        <Cell label="Target" value={row.target_period ?? "—"} />
        <Cell label="Latest" value={row.latest_quarter ?? "—"} />
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className={cellHeaderClass}>{label}</p>
      <p className={cellBodyClass}>{value}</p>
    </div>
  );
}

// Switch to per-category <details> when the flat matrix exceeds this
// threshold. Keeps long-history companies (e.g. NAVINFLUOR with 21 items)
// from blowing up the page; users still see all rows inline, just grouped.
const LARGE_THRESHOLD = 30;

const CATEGORY_DISPLAY = {
  capex: "Capex",
  capacity: "Capacity",
  revenue: "Revenue",
  margin: "Margin",
  other: "Other",
} as const;

function FlatList({ commitments }: { commitments: WalkTheTalkCommitmentRow[] }) {
  return (
    <div className="space-y-2">
      {commitments.map((row) => (
        <CommitmentRow key={row.guidance_key} row={row} />
      ))}
    </div>
  );
}

function GroupedByCategory({
  commitments,
}: {
  commitments: WalkTheTalkCommitmentRow[];
}) {
  const groups = new Map<
    WalkTheTalkCommitmentRow["category"],
    WalkTheTalkCommitmentRow[]
  >();
  for (const row of commitments) {
    const list = groups.get(row.category) ?? [];
    list.push(row);
    groups.set(row.category, list);
  }
  const order: WalkTheTalkCommitmentRow["category"][] = [
    "capex",
    "capacity",
    "revenue",
    "margin",
    "other",
  ];

  return (
    <div className="space-y-3">
      {order
        .filter((c) => groups.has(c))
        .map((category, idx) => (
          <details
            key={category}
            open={idx === 0}
            className="rounded-md border border-border/30 bg-background/30 px-3 py-2"
          >
            <summary className="cursor-pointer list-none">
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground">
                {CATEGORY_DISPLAY[category]}
              </span>
              <span className="ml-2 text-[11px] text-muted-foreground">
                ({groups.get(category)!.length})
              </span>
            </summary>
            <div className="mt-3 space-y-2">
              {groups.get(category)!.map((row) => (
                <CommitmentRow key={row.guidance_key} row={row} />
              ))}
            </div>
          </details>
        ))}
    </div>
  );
}

// Inline commitment matrix. Replaces the previous drawer pattern — the
// per-row content lives directly in the page flow so users see all tracked
// commitments without an extra click.
export function WalkTheTalkMatrix({ commitments }: Props) {
  if (commitments.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className={sectionLabelClass}>Commitments</p>
        <p className="text-[11px] text-muted-foreground">
          {commitments.length} tracked
        </p>
      </div>

      {commitments.length <= LARGE_THRESHOLD ? (
        <FlatList commitments={commitments} />
      ) : (
        <GroupedByCategory commitments={commitments} />
      )}
    </div>
  );
}
