import { DESK_CARD, DeskSection } from "./desk-ui";
import DeskMostViewed from "./desk-most-viewed";
import { RankedRows, type RankedRow } from "./desk-ranked-rows";

// The right rail: two ranked blocks under "Top of the book" — the quarter's
// highest reads and the companies readers are viewing most.
export default function DeskTopOfBook({
  quarterLabel,
  topPerformers,
  mostViewedWeek,
  mostViewedMonth,
  mostViewedInitial,
}: {
  quarterLabel: string;
  topPerformers: RankedRow[];
  mostViewedWeek: RankedRow[];
  mostViewedMonth: RankedRow[];
  mostViewedInitial: "week" | "month";
}) {
  return (
    <DeskSection id="desk-top-of-book" eyebrow="Top of the book" link={{ href: "/leaderboards", label: "Leaderboards →" }}>
      <div className="space-y-5">
        {topPerformers.length > 0 ? (
          <div className={DESK_CARD}>
            <h3 className="house-data house-micro px-4 pb-2 pt-4 text-[var(--ink-soft)] sm:px-5">
              {quarterLabel} top performers
            </h3>
            <RankedRows rows={topPerformers} module="desk_top_performers" />
          </div>
        ) : null}
        <DeskMostViewed week={mostViewedWeek} month={mostViewedMonth} initialWindow={mostViewedInitial} />
      </div>
    </DeskSection>
  );
}
