// Two chips that sit under a ConcallScore on the boards: where the score came
// from, and whether it just landed. Both are neutral by construction — colour on
// this portal is reserved for section tones, score bands and charts (see
// docs/portal-design-system.md), and neither of these is a judgement about the
// company. They qualify the number, they don't re-rank it.

const CHIP_BASE =
  "inline-flex items-center whitespace-nowrap rounded-full border px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.08em]";

// On a below-cut row the whole line is de-emphasized, so a chip must not be the
// one thing still at full contrast — same reasoning as the band word beside it
// in score-board-table's ScoreCell.
type ChipProps = { scoredAt?: string | null; dimmed?: boolean };

/** Marks a score read off a third-party transcript rather than the issuer's own. */
export function UnofficialChip({ scoredAt }: ChipProps) {
  return (
    <span
      className={`${CHIP_BASE} border-border/70 bg-muted/50 text-muted-foreground`}
      title={
        "Scored from a third-party transcript, published before the company filed its own. " +
        "It will be re-scored when the official transcript lands." +
        (scoredAt ? `\nScored ${scoredAt}` : "")
      }
    >
      Unofficial
    </span>
  );
}

/** Marks a score written or re-written inside the last 24 hours. */
export function FreshScoreChip({ scoredAt, dimmed = false }: ChipProps) {
  return (
    <span
      className={`${CHIP_BASE} ${
        dimmed
          ? "border-border/70 bg-muted/50 text-muted-foreground"
          : "border-foreground/30 bg-foreground/[0.07] text-foreground"
      }`}
      title={
        "Scored in the last 24 hours." + (scoredAt ? `\nScored ${scoredAt}` : "")
      }
    >
      New · 24h
    </span>
  );
}
