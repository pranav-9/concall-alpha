import * as React from "react";

/**
 * Viewport gate for components that render one of two layouts by breakpoint.
 * Returns `null` on the server and on the first client render (so SSR markup
 * and hydration agree — render BOTH layouts, CSS-toggled, in that state), then
 * `true`/`false` once matchMedia has answered, at which point the caller can
 * unmount the hidden layout. Unmounting a `display:none` subtree causes no
 * layout shift, so this is safe on CLS-sensitive pages.
 *
 * `minWidthPx` should match a Tailwind breakpoint (640 = sm, 1024 = lg) so the
 * JS gate and the CSS classes flip together.
 */
export function useMinWidth(minWidthPx: number): boolean | null {
  const [matches, setMatches] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${minWidthPx}px)`);
    const sync = () => setMatches(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [minWidthPx]);

  return matches;
}
