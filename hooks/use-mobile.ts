import { BREAKPOINT_MD, useMinWidth } from "./use-min-width"

/**
 * True below Tailwind's `md` (768px). Server and first client render return
 * false (the hook underneath is null there), exactly as before — this is the
 * same matchMedia implementation as useMinWidth, not a second one.
 */
export function useIsMobile() {
  return useMinWidth(BREAKPOINT_MD) === false
}
