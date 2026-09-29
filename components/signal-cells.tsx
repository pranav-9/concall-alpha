// The watchlist board's four categorical cells — Moat, Forensic checks,
// Guidance, Management. Each is a word (or a tally) in a house tone, sized to
// sit beside the number+band score cells without out-shouting them. Pure
// markup over lib/board-signals vocabulary; the words and tones are decided
// there so the phone list and the desktop table can't print different ones.
//
// Colour comes from the house custom properties (--signal / --warn / --alarm /
// --ink-soft), which resolve because both boards mount inside a `.house`
// frame. An unknown-tone or missing signal renders a quiet dash, never a
// guess.

import {
  forensicTone,
  guidanceCellLabel,
  guidanceCellNote,
  guidanceTone,
  managementTone,
  moatCellLabel,
  moatTone,
  type BoardSignals,
  type ForensicSignal,
  type GuidanceSignal,
  type ManagementSignal,
  type MoatSignal,
  type SignalTone,
} from "@/lib/board-signals";
import { MIN_COMMITMENTS_FOR_GRADE } from "@/lib/walk-the-talk/grade-utils";

export const TONE_VAR: Record<SignalTone, string> = {
  good: "var(--signal)",
  warn: "var(--warn)",
  bad: "var(--alarm)",
  muted: "var(--ink-soft)",
};

const EMPTY = (
  <span className="text-muted-foreground" aria-label="not available">
    —
  </span>
);

/** One word in its tone, with an optional muted sub-line. */
function WordCell({
  word,
  tone,
  sub,
  dimmed,
  title,
}: {
  word: string;
  tone: SignalTone;
  sub?: string | null;
  dimmed: boolean;
  title?: string;
}) {
  return (
    <div className="leading-tight" title={title}>
      <div
        className="text-[13px] font-semibold"
        style={{ color: dimmed ? "var(--ink-soft)" : TONE_VAR[tone] }}
      >
        {word}
      </div>
      {sub ? (
        <div className="house-data text-[10px]" style={{ color: "var(--ink-soft)" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

export function MoatCell({ moat, dimmed }: { moat: MoatSignal | null; dimmed: boolean }) {
  if (!moat) return EMPTY;
  return (
    <WordCell
      word={moatCellLabel(moat)}
      tone={moatTone(moat.rating)}
      dimmed={dimmed}
      title="Moat rating and strength from the Quality tab. No trajectory is stored, so none is claimed."
    />
  );
}

/**
 * The tally as a three-segment bar (clean · watch · flag, proportional to the
 * assessed count) over the three numbers in the same tones. The bar is the
 * glanceable read; the numbers are the exact one.
 */
export function ForensicChecksCell({
  forensics,
  dimmed,
}: {
  forensics: ForensicSignal | null;
  dimmed: boolean;
}) {
  if (!forensics || forensics.assessed === 0) return EMPTY;
  const { clean, watch, flag, assessed } = forensics;
  const segments: Array<{ n: number; tone: SignalTone; label: string }> = [
    { n: clean, tone: "good", label: "clean" },
    { n: watch, tone: "warn", label: "watch" },
    { n: flag, tone: "bad", label: "flag" },
  ];
  const summary = `${clean} clean, ${watch} watch, ${flag} flag of ${assessed} forensic checks`;
  return (
    <div
      className={`w-[6.5rem] leading-tight ${dimmed ? "opacity-60" : ""}`}
      title={summary}
      aria-label={summary}
    >
      <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full" aria-hidden>
        {segments.map(
          (s) =>
            s.n > 0 && (
              <span
                key={s.label}
                className="block h-full"
                style={{ width: `${(s.n / assessed) * 100}%`, background: TONE_VAR[s.tone] }}
              />
            ),
        )}
      </div>
      <div className="house-data mt-1 flex items-baseline gap-2.5 text-[11px] font-medium tabular-nums" aria-hidden>
        {segments.map((s) => (
          <span key={s.label} style={{ color: s.n > 0 ? TONE_VAR[s.tone] : "var(--ink-soft)" }}>
            {s.n}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GuidanceCell({
  guidance,
  dimmed,
}: {
  guidance: GuidanceSignal | null;
  dimmed: boolean;
}) {
  if (!guidance) return EMPTY;
  return (
    <WordCell
      word={guidanceCellLabel(guidance)}
      tone={guidanceTone(guidance)}
      sub={guidanceCellNote(guidance)}
      dimmed={dimmed}
      title="How strong the forward guidance is: its ambition, qualified when the evidence behind it is thin."
    />
  );
}

/** Tier word over "N/M met". The ratio waits for enough graded commitments, as the Guidance header does. */
export function ManagementCell({
  management,
  dimmed,
}: {
  management: ManagementSignal | null;
  dimmed: boolean;
}) {
  if (!management) return EMPTY;
  const enoughToGrade = management.countedCount >= MIN_COMMITMENTS_FOR_GRADE;
  const scored = management.verdictSource === "scored";
  // A 1-of-1 record isn't a tier; without a stored verdict there's nothing to say yet.
  if (!enoughToGrade && !scored) {
    return (
      <WordCell
        word="Too early"
        tone="muted"
        sub={management.countedCount > 0 ? `${management.metCount}/${management.countedCount} met` : null}
        dimmed={dimmed}
        title={`Fewer than ${MIN_COMMITMENTS_FOR_GRADE} graded commitments — not enough to call a tier.`}
      />
    );
  }
  return (
    <WordCell
      word={management.tierLabel}
      tone={managementTone(management.tier)}
      sub={enoughToGrade ? `${management.metCount}/${management.countedCount} met` : null}
      dimmed={dimmed}
      title="Guidance credibility: the tier from the Guidance tab, and how many graded commitments were met."
    />
  );
}

// ---------------------------------------------------------------------------
// Phone: the same four facts as one wrapped line of "label word" pairs.
// ---------------------------------------------------------------------------

function PhoneSignal({
  label,
  word,
  tone,
  dimmed,
}: {
  label: string;
  word: string | null;
  tone: SignalTone;
  dimmed: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-muted-foreground">{label}</span>
      {word == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="font-semibold" style={{ color: dimmed ? "var(--ink-soft)" : TONE_VAR[tone] }}>
          {word}
        </span>
      )}
    </span>
  );
}

export function PhoneSignalsLine({ signals, dimmed }: { signals: BoardSignals; dimmed: boolean }) {
  const { moat, forensics, guidance, management } = signals;
  const mgmtEnough = management != null && management.countedCount >= MIN_COMMITMENTS_FOR_GRADE;
  const mgmtWord =
    management == null
      ? null
      : mgmtEnough || management.verdictSource === "scored"
        ? `${management.tierLabel}${mgmtEnough ? ` ${management.metCount}/${management.countedCount}` : ""}`
        : "Too early";
  return (
    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px] leading-tight">
      <PhoneSignal
        label="Moat"
        word={moat ? moatCellLabel(moat) : null}
        tone={moat ? moatTone(moat.rating) : "muted"}
        dimmed={dimmed}
      />
      <PhoneSignal
        label="Checks"
        word={forensics && forensics.assessed > 0 ? `${forensics.clean}·${forensics.watch}·${forensics.flag}` : null}
        tone={forensics ? forensicTone(forensics) : "muted"}
        dimmed={dimmed}
      />
      <PhoneSignal
        label="Guidance"
        word={
          guidance
            ? `${guidanceCellLabel(guidance)}${guidance.evidence === "thinly_evidenced" ? ", thin" : guidance.evidence === "partly_evidenced" ? ", partly" : ""}`
            : null
        }
        tone={guidance ? guidanceTone(guidance) : "muted"}
        dimmed={dimmed}
      />
      <PhoneSignal
        label="Mgmt"
        word={mgmtWord}
        tone={management && (mgmtEnough || management.verdictSource === "scored") ? managementTone(management.tier) : "muted"}
        dimmed={dimmed}
      />
    </div>
  );
}
