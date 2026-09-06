import { SectionSkeleton } from "../components/section-skeleton";

// Route-level loading state. Until this existed, clicking a company link
// anywhere on the site showed nothing for the ~1s server render — a 2026-08-01
// session replay recorded a visitor reading that silence as a dead click. The
// shell (outer padding, top gradient, 1440px column) mirrors page.tsx exactly
// so the skeleton is replaced in place rather than jumping.
export default function CompanyPageLoading() {
  return (
    <div className="relative isolate w-full overflow-hidden px-3 py-3 pb-24 sm:px-4 sm:py-4 sm:pb-28 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.06),_transparent_34%),linear-gradient(to_bottom,_rgba(255,255,255,0.75),_transparent)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_34%),linear-gradient(to_bottom,_rgba(15,23,42,0.32),_transparent)]" />
      <div className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-5 overflow-x-hidden">
        {/* Overview card stand-in: name row, then the scorecard band. */}
        <div className="space-y-4 rounded-2xl border border-border/50 bg-background/70 p-5">
          <div className="space-y-2">
            <div className="h-7 w-64 max-w-full animate-pulse rounded-md bg-muted/50" />
            <div className="h-4 w-40 animate-pulse rounded-md bg-muted/40" />
          </div>
          <div className="h-28 w-full animate-pulse rounded-xl bg-muted/40" />
        </div>
        {/* Two section stand-ins — enough to signal "the page is coming". */}
        <div className="rounded-2xl border border-border/50 bg-background/70 p-5">
          <SectionSkeleton />
        </div>
        <div className="rounded-2xl border border-border/50 bg-background/70 p-5">
          <SectionSkeleton />
        </div>
      </div>
    </div>
  );
}
