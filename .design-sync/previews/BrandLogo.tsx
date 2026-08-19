import { BrandLogo } from "concall-alpha";

// BrandLogo is the full lockup: the tiled mark plus the "Story of a Stock"
// wordmark, optionally under a "Research platform" eyebrow. The navbar call
// site is `<BrandLogo size={40} showEyebrow />` (app/(hero)/navbar.tsx).
// Both halves are drawn in currentColor / text-foreground, so the lockup
// inherits the surface it sits on rather than carrying its own colour.

export const Navbar = () => (
  <div className="flex min-h-[4.25rem] items-center justify-between gap-3 rounded-[1.5rem] border border-border/60 bg-background/80 px-3 shadow-sm">
    <BrandLogo size={40} showEyebrow />
    {/* The real navbar drops its links below the wide breakpoint
        (hidden min-[1200px]:flex) — the lockup is what survives the squeeze. */}
    <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
      <span>Leaderboards</span>
      <span>Journal</span>
    </div>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-col gap-6">
    <BrandLogo size={28} wordmarkSize="sm" />
    <BrandLogo size={40} wordmarkSize="md" />
    <BrandLogo size={56} wordmarkSize="lg" />
  </div>
);

export const MarkOnly = () => (
  <div className="flex items-end gap-6">
    <BrandLogo size={32} showWordmark={false} />
    <BrandLogo size={44} showWordmark={false} />
    <BrandLogo size={64} showWordmark={false} />
  </div>
);

// Stacked rather than three-up on purpose: the lockup has a fixed minimum
// width, so a three-column split shears the wordmark in any narrow container.
export const OnSurfaces = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
      <BrandLogo size={40} showEyebrow />
      <span className="shrink-0 text-[11px] text-muted-foreground">Page ground</span>
    </div>
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted p-4">
      <BrandLogo size={40} showEyebrow />
      <span className="shrink-0 text-[11px] text-muted-foreground">Muted panel</span>
    </div>
    <div className="dark flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
      <BrandLogo size={40} showEyebrow />
      <span className="shrink-0 text-[11px] text-muted-foreground">Dark theme</span>
    </div>
  </div>
);
