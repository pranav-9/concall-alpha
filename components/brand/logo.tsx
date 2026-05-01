import { cn } from "@/lib/utils";

// The mark: two mirrored S-curves that share top, center, and bottom anchor
// points, pierced by a vertical bar that extends past both terminals — the
// classic "$" tell. The forward S bulges left then right, the mirrored S
// bulges right then left; their overlap creates a vesica-piscis-style braid
// at the upper and lower bowls. Drawn as strokes (not fills) so the
// interlocking detail reads at OG-image sizes and the silhouette stays
// recognizable at favicon sizes. Uses currentColor so it themes via the
// parent's text color.
export const BRAND_MARK_VIEWBOX = "0 0 64 64";

// Forward S: top-center → bulges LEFT → center → bulges RIGHT → bottom-center.
export const BRAND_MARK_PATH_FORWARD =
  "M32 12 C14 12 14 32 32 32 C50 32 50 52 32 52";

// Mirrored S: top-center → bulges RIGHT → center → bulges LEFT → bottom-center.
export const BRAND_MARK_PATH_MIRROR =
  "M32 12 C50 12 50 32 32 32 C14 32 14 52 32 52";

// Vertical "$" bar.
export const BRAND_MARK_BAR = { x: 32, y1: 5, y2: 59 } as const;
export const BRAND_MARK_S_STROKE = 5.5;
export const BRAND_MARK_BAR_STROKE = 4;

const TILE_GRADIENT_LIGHT =
  "bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(220,252,231,0.85),rgba(186,230,253,0.85))]";
const TILE_GRADIENT_DARK =
  "dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(6,78,59,0.55),rgba(12,74,110,0.55))]";

// Inner SVG content for the brand mark. Use inside any <svg> with the
// BRAND_MARK_VIEWBOX to render the full braid + bar.
export function BrandGlyph() {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line
        x1={BRAND_MARK_BAR.x}
        y1={BRAND_MARK_BAR.y1}
        x2={BRAND_MARK_BAR.x}
        y2={BRAND_MARK_BAR.y2}
        strokeWidth={BRAND_MARK_BAR_STROKE}
      />
      <path d={BRAND_MARK_PATH_FORWARD} strokeWidth={BRAND_MARK_S_STROKE} />
      <path d={BRAND_MARK_PATH_MIRROR} strokeWidth={BRAND_MARK_S_STROKE} />
    </g>
  );
}

export type BrandMarkProps = {
  className?: string;
  size?: number;
  /** When true, drops the tile chrome (border, shadow, gradient) and renders the bare glyph. */
  bare?: boolean;
};

export function BrandMark({ className, size = 40, bare = false }: BrandMarkProps) {
  if (bare) {
    return (
      <svg
        viewBox={BRAND_MARK_VIEWBOX}
        width={size}
        height={size}
        className={cn("text-foreground", className)}
        role="img"
        aria-label="Story of a Stock"
      >
        <BrandGlyph />
      </svg>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[22%] border border-border/60 shadow-sm",
        TILE_GRADIENT_LIGHT,
        TILE_GRADIENT_DARK,
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox={BRAND_MARK_VIEWBOX}
        width={size * 0.78}
        height={size * 0.78}
        className="text-foreground"
        role="img"
        aria-label="Story of a Stock"
      >
        <BrandGlyph />
      </svg>
    </span>
  );
}

export type BrandWordmarkProps = {
  className?: string;
  /** Show the small "Research platform" eyebrow above the wordmark (navbar style). */
  showEyebrow?: boolean;
  /** Wordmark text size. "sm" matches the navbar; "md" matches a footer; "lg" for hero/OG contexts. */
  size?: "sm" | "md" | "lg";
};

export function BrandWordmark({ className, showEyebrow = false, size = "sm" }: BrandWordmarkProps) {
  const wordmarkClass =
    size === "lg"
      ? "text-lg font-bold sm:text-xl"
      : size === "md"
        ? "text-base font-semibold"
        : "text-sm font-bold sm:text-base";

  return (
    <span className={cn("min-w-0", className)}>
      {showEyebrow ? (
        <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-foreground/80">
          Research platform
        </span>
      ) : null}
      <span className={cn("block truncate text-foreground", wordmarkClass)}>
        Story of a Stock
      </span>
    </span>
  );
}

export type BrandLogoProps = {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  showEyebrow?: boolean;
  wordmarkSize?: BrandWordmarkProps["size"];
};

export function BrandLogo({
  className,
  size = 40,
  showWordmark = true,
  showEyebrow = false,
  wordmarkSize = "sm",
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark size={size} />
      {showWordmark ? <BrandWordmark showEyebrow={showEyebrow} size={wordmarkSize} /> : null}
    </span>
  );
}
