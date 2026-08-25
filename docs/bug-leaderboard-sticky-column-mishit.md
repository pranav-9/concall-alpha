# Bug: leaderboard sticky-column tap opens the wrong company (mobile)

**Status:** diagnosed, not fixed (needs a real Android device to verify a fix).
**Severity:** high on mobile — a tap navigates to a different company than the one touched.
**Surface:** `/leaderboards`, the horizontally-scrollable boards (Quarter, Growth; any board using the sticky name column).

## Evidence

PostHog session replay (Jīnd visitor, Android Chrome, 354×660, 2026-08-25):
- Rage-tap captured on `<a href="/company/ADVAIT">` ("Advait Energy Transitions Limited").
- The element's href was **correct** (`/company/ADVAIT`), yet the page that loaded next was **NETWEB**.
- ADVAIT only opened ~10s later after a back-out and retry.
- Zero console errors in the whole session.

The correct href on the tapped element rules out a React key / index / data bug — the anchor pointed at the right place. The browser's **touch hit-test resolved to a different row's anchor** than the one painted on top.

## Mechanism

The company-name cell is `position: sticky; left: 0; z-10` inside a `div.overflow-x-auto` table.
Token: `STICKY_NAME_CELL` in [lib/design/shell.ts](../lib/design/shell.ts) (~line 59), applied by [app/company/data-table.tsx](../app/company/data-table.tsx) (`cell.column.id === stickyColId && STICKY_NAME_CELL`).

On touch, during/after a horizontal scroll (including momentum/overscroll settle), Chrome-Android can hit-test a `position: sticky` element against the pre-snap compositor position while it paints at the snapped position. The finger is over the sticky ADVAIT cell visually, but the hit-test resolves to whichever scrolled cell/anchor was under that screen coordinate before the sticky column snapped back — a different row (NETWEB). Known Chromium quirk with sticky cells inside horizontal scroll containers on touch.

## Repro

1. Real Android phone, Chrome, ~354px wide (or DevTools device mode won't reliably reproduce — this is a real-compositor bug).
2. `/leaderboards` → Quarter or Growth tab.
3. Horizontally scroll the board a little, let it settle, then immediately tap a company name in the frozen left column.
4. Occasionally a different company's page opens.

## Proposed fix (verify on device before shipping)

Harden `STICKY_NAME_CELL` so the sticky cell owns an unambiguous compositor layer and stacking:
- Promote to its own layer: add `transform: translateZ(0)` (Tailwind `[transform:translateZ(0)]`) or `will-change: transform` on the sticky cell so paint and hit-test share one layer.
- Keep the opaque background (already `bg-background`) and raise stacking clearly above the scrolling cells (currently `z-10`; the scrolling `<td>`s are `z-auto`) — consider `z-20` while staying below the `z-30` `TABLE_SCROLL_HINT` and the `z-20` `STICKY_NAME_HEAD` (avoid a new conflict).
- Ensure the anchor fills the cell so the live target matches the painted name (the anchor is currently text-width only).

`STICKY_NAME_CELL` is shared by [components/score-board-table.tsx](../components/score-board-table.tsx) too, so a fix here covers every board — good, since the mis-hit can happen on any of them. That shared blast radius is also why this wasn't patched blind: it needs device verification (the fix can't be confirmed from a headless/desktop browser).

## Related, already shipped (separate hazard, not this bug)

`data-table.tsx` now takes a stable `getRowId` (companyCode), wired from the Quarter and Growth tables. That closes a *different* real hazard — TanStack defaulted `row.id` to the array index, so a client sort could reuse a DOM node across identity and rewrite its href. It is defensive and correct, but it is **not** the cause of the Advait→Netweb report (that anchor's href was already correct — a hit-test issue, above).
