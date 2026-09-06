// The one skeleton every company-page loading state draws: an optional title
// bar plus two or three pulsing blocks. Consumers own the container (card,
// border, min-height); this only owns the bars, so the route-level loading
// state, the server Suspense fallback, and the lazy-tab placeholder cannot
// drift apart in colour or rhythm.
const BAR = "w-full animate-pulse rounded-xl motion-reduce:animate-none";

export function SectionSkeleton({
  blocks = "short",
  showTitle = true,
}: {
  /** "tall" adds a third block for placeholders that must fill a viewport. */
  blocks?: "short" | "tall";
  /** Off when the surrounding card already renders a real title. */
  showTitle?: boolean;
}) {
  return (
    <div className="space-y-3">
      {showTitle ? (
        <div className="h-5 w-44 animate-pulse rounded-md bg-muted/50 motion-reduce:animate-none" />
      ) : null}
      <div className={`h-24 bg-muted/40 ${BAR}`} />
      <div className={`h-32 bg-muted/30 ${BAR}`} />
      {blocks === "tall" ? <div className={`h-40 bg-muted/25 ${BAR}`} /> : null}
    </div>
  );
}
