import { SectionCard } from "./section-card";
import { SectionSkeleton } from "./section-skeleton";

// Server Suspense fallback for each company-page panel (page.tsx). It is only
// ever on screen when the reader switches to a panel whose payload is still
// streaming — an early tab tap, or a deep link like /company/X#guidance-history
// — and the workspace shows one panel at a time, so it stands alone in the
// column.
//
// `size` is decided by page.tsx from the cached overview row: a panel that will
// render a real section gets a viewport-tall skeleton (a ~350px card left the
// footer in view, and it moved ~600px when the section landed — deep-link CLS
// 0.28–0.30 in the 2026-09-05 probe), while a panel that will render its short
// empty state gets a short skeleton (a tall one would pull the footer UP into
// view when the empty state lands — the mirror shift). `min-h-screen` (100vh)
// on purpose: safe overshoot on phones, and it holds without `svh` support.
export function SectionLoading({
  id,
  title,
  size = "panel",
}: {
  id: string;
  title: string;
  size?: "panel" | "block";
}) {
  return (
    <SectionCard id={id} title={title}>
      <div role="status" className={size === "panel" ? "min-h-screen" : "min-h-[280px]"}>
        <SectionSkeleton showTitle={false} blocks={size === "panel" ? "tall" : "short"} />
        <span className="sr-only">Loading {title}…</span>
      </div>
    </SectionCard>
  );
}
