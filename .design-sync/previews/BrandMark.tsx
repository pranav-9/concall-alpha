import { BrandMark } from "concall-alpha";

// BrandMark is the glyph alone — two mirrored S-curves pierced by a vertical
// bar (the "$" tell). By default it ships inside a rounded tile with a soft
// mint/sky gradient; `bare` drops the tile chrome and leaves the stroke, which
// is what the favicon and OG image use. The footer call site is
// `<BrandMark size={36} />` beside the wordmark set in plain text.

export const Footer = () => (
  <div className="flex items-center gap-3">
    <BrandMark size={36} />
    <div>
      <p className="text-base font-semibold text-foreground">Story of a Stock</p>
      <p className="text-xs text-muted-foreground">
        Research on 100 Indian mid and small caps.
      </p>
    </div>
  </div>
);

export const Sizes = () => (
  <div className="flex items-end gap-5">
    {[24, 36, 48, 64].map((size) => (
      <div key={size} className="flex flex-col items-center gap-2">
        <BrandMark size={size} />
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {size}px
        </span>
      </div>
    ))}
  </div>
);

export const Bare = () => (
  <div className="flex items-end gap-6">
    {[24, 40, 64].map((size) => (
      <div key={size} className="flex flex-col items-center gap-2">
        <BrandMark size={size} bare />
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {size}px bare
        </span>
      </div>
    ))}
  </div>
);

export const OnSurfaces = () => (
  <div className="grid grid-cols-3 gap-4">
    <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-background p-5">
      <div className="flex items-center gap-3">
        <BrandMark size={40} />
        <BrandMark size={40} bare />
      </div>
      <p className="text-[11px] text-muted-foreground">Page ground</p>
    </div>
    <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-muted p-5">
      <div className="flex items-center gap-3">
        <BrandMark size={40} />
        <BrandMark size={40} bare />
      </div>
      <p className="text-[11px] text-muted-foreground">Muted panel</p>
    </div>
    <div className="dark flex flex-col items-start gap-3 rounded-xl border border-border bg-background p-5">
      <div className="flex items-center gap-3">
        <BrandMark size={40} />
        <BrandMark size={40} bare />
      </div>
      <p className="text-[11px] text-muted-foreground">Dark theme</p>
    </div>
  </div>
);
