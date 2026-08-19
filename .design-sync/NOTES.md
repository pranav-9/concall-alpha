# design-sync notes — concall-alpha

Repo-specific gotchas for syncing this package to claude.ai/design. Read before
re-running. Config lives beside this file in `config.json`.

## The shape of this repo is unusual

- **This is a Next.js app, not a published component library.** There is no
  `dist/` to bundle and `package.json` has **no `name` field**. Everything below
  exists to bridge that gap; none of it changes how the app itself builds.
- **`.design-sync/ds-entry.ts` is the entry barrel** and the single source of
  truth for what ships. Passed via `--entry`; maintained by hand. It exports, in
  order: the `components/ui` primitives, the brand marks, the score/read
  components, the company-page sections, then the **design-token modules**
  (`surface-tokens`, `lib/design/shell`, `lib/score-band`, `display-tokens`,
  `chip-tone`, `delta-tone`, `lib/portfolio-stance`, `lib/score-trajectory`),
  the **model builders** (`lib/growth-band`, `lib/read-distribution`,
  `lib/board-read`, `lib/score-freshness`), and `toast` re-exported from sonner.
  It deliberately excludes:
  - anything importing `@/lib/supabase/*` (auth forms, watchlist slots),
  - `async function` Server Components — `industry-context-section.tsx` and
    `sub-sector-section.tsx` cannot render in a browser bundle,
  - pure data/analytics orchestrators with no visual output.
  `section-feedback-button` / `section-helpfulness-footer` are *not* in the
  barrel but still bundle, because `SectionCard` imports them.
- **`.design-sync/shims/`** replaces `next/link`, `next/image`, `next/navigation`,
  `next/dynamic`, `@/lib/utils` and `@/lib/analytics` with inert equivalents,
  bound through `.design-sync/tsconfig.ds.json`'s `paths` (esbuild honours those
  via the converter's tsconfig-paths plugin). The `next/*` shims stop the Next
  client runtime being dragged in; the two `@/lib/*` shims exist because both
  modules read `process.env` at **module scope** and `process` does not exist in
  a browser IIFE — before shimming them, every one of the 64 components threw
  `ReferenceError: process is not defined` before mounting.
  **Exact-match path keys must precede the `@/*` wildcard** in the `paths`
  object: the converter's plugin returns on the first matching rule.

## Two generated inputs the converter depends on

Both are produced by `cfg.buildCmd`; re-run it before any re-sync.

1. **`.design-sync/build/ds.css`** (`cfg.cssEntry`) — built by
   `.design-sync/build-css.mjs` as fonts + compiled Tailwind + base layer.
   - The uploaded stylesheet is **static**, so a class it does not contain does
     not exist for any design built with this system. `.design-sync/tailwind.ds.ts`
     therefore adds a **safelist** widening the palette, spacing, sizing and
     layout scales, and scans `.design-sync/previews/**` as a content source.
     That is why the file is ~1.2 MB.
   - `app/globals.css` already carries `body { @apply bg-background
     text-foreground }`, so colours need no restating — **fonts do**. The portal
     loads Geist / Bricolage Grotesque / IBM Plex Mono through
     `next/font/google`, which only runs in a Next build; `ds-fonts.css` pulls
     the same three from Google Fonts and `ds-base.css` binds them to
     `--font-geist-sans` / `--font-display` / `--font-data` exactly as
     `app/layout.tsx` does. Drop either file and every design silently renders
     in a fallback face.
2. **`dist/types/` + `dist/package.json`** — both emitted by
   `.design-sync/build-types.mjs` (declaration-only `tsc` via
   `.design-sync/tsconfig.dts.json`, then the stub package.json).
   That stub package.json is load-bearing: the converter's `loadDts` walks up
   from the types root looking for the nearest `package.json` **with a `name`**,
   and `concall-alpha/package.json` has none — without the stub the build dies
   with `ENOENT: /package.json`. It also gives real prop contracts (e.g.
   `Button`'s `variant`/`size` unions come straight out of `cva`), instead of
   the empty `<Name>Props` a source-only package would otherwise emit.

## Two real portal defects this sync uncovered

Both are bugs in the app, not artefacts of the export. The DS-only Tailwind
config works around them so the exported system is coherent; **`../tailwind.config.ts`
still has both gaps, so the app itself renders neither.**

1. **`aria-invalid:` classes never compile.** Tailwind 3.4's built-in `aria`
   variants are busy/checked/disabled/expanded/hidden/pressed/readonly/required/
   selected — **`invalid` is not among them**. The `components/ui/` primitives
   are the v4-era shadcn generation and their `cva` base strings all carry
   `aria-invalid:*`, so `Input`, `Checkbox`, `Select`, `Toggle`, `ToggleGroup`
   and `Badge` ship **no field-error affordance at all**. Fixed here by
   declaring `theme.extend.aria.invalid` in `tailwind.ds.ts`.
2. **`components/ui/sidebar.tsx` is a v4 file in a v3 project.** `globals.css`
   declares the sidebar palette inside an `@theme inline` block — v4 syntax that
   Tailwind 3 ignores outright — and `tailwind.config.ts` has no `sidebar`
   colour, so `bg-sidebar`, `text-sidebar-foreground` and `border-sidebar-border`
   resolve to nothing and the rail renders with no background. Fixed here by
   mapping a `sidebar` colour scale in `tailwind.ds.ts`. Note the custom
   properties hold **full colours** (`hsl(0 0% 98%)`), so they map through
   `var(--sidebar)`, NOT `hsl(var(--sidebar))`.
   Still unfixed: `w-(--sidebar-width)` in that file is v4 arbitrary-property
   syntax that v3 cannot parse. Only a source edit fixes it.

A third, smaller one: **`app/company/[code]/chart.tsx` never sets
`isAnimationActive`**, so its 1500ms draw-on is still running when the capture
harness screenshots at ~900ms. `ConcallScoreSection` and `SegmentRevenueDisplay`
work around it inside their preview files by skewing `requestAnimationFrame`
timestamps forward. The real fix is `isAnimationActive={false}` in `chart.tsx`,
which is arguably right for the product too.

## Grouping

`.design-sync/docs/<Name>.md` holds one frontmatter stub per component whose only
job is `category:` — the converter's group heuristic takes the last non-generic
source directory, and `ui/` is on its generic list, so all 24 primitives would
otherwise land in `general`. The four groups are Primitives, Brand, Score & Read,
Company Page. Enrich these stubs with real usage prose when there's time; the
body is what becomes each component's `.prompt.md` for the design agent.

## Authoring previews — what the seven batches learned

- **There are FOUR band vocabularies and they are not interchangeable.**
  `lib/score-band.ts` = quarterly sentiment (Strongly Bullish → Strongly Bearish,
  cuts 8/7/6.5/4.5/3). `lib/growth-band.ts` = forward outlook (Exceptional →
  Weak, cuts 8.5/8/7.5/7/6.5). `lib/board-read.ts` = "configurations" ("Aligned
  & cheap", "Priced for it"), Read column only. Moat is its own closed-enum set
  (`call` × `tier` × `posture` × `tier_anchor_phrase` × `barrier_strength`).
  **A 6.7 is *Mildly Bullish* on the quarterly scale and *Soft* on the growth
  scale** — same number, opposite ends of the ramp.
- **Where a prop is a computed model, import the real builder through `@/`**
  rather than fabricating derived fields. Hand-rolled payloads contradict
  themselves — one caught a `read` disagreeing with its own dials, another a
  shared `numeric_value` printing a 24% chip on a "30%" thread. The model
  builders are now on the barrel for exactly this reason.
- **An invented Tailwind class can be worse than useless.** `cn()` runs
  tailwind-merge, so a class that conflicts with a component's own base class
  **deletes that base class** — `<Avatar className="size-12">` stripped the
  component's `size-8` and left the avatar unsized. Verify unusual classes exist
  in `_ds_bundle.css`, grepping the *escaped* selector (`.text-\[11px\]`,
  commas as `\2c `).
- **The capture harness pins the browser clock to 2024-05-15**
  (`page.clock.setFixedTime`). Anything deriving display state from `new Date()`
  renders as if it were May 2024 — this silently broke
  `GuidanceHistorySection`'s current-vs-track-record split. Pass an explicit
  "now" wherever an API allows it.
- **The capture camera is 900×700 and grid cells are ~390px wide with
  `overflow:hidden`.** Tailwind `sm:`/`md:` variants do NOT help, because the
  cell is narrow inside a *900px viewport* — those variants are still active.
  Compose unconditionally narrow, or set `cardMode: "column"`.
- **`cfg.overrides.<Name>.skip` is a no-op in this repo.** It filters story IDs
  against `c.storyIds`, which only the storybook shape populates; every manifest
  entry here has `stories: []`.
- `recharts` resolves fine inside previews (it bundles a second copy alongside
  the bundle's; recharts 2.15 matches children by `displayName`, so cross-copy
  composition still works — **a hazard for any future recharts 3 upgrade**).

## Known render warns (triaged, not new)

- Components that legitimately early-return `null` on empty payloads
  (`ScoreDelta` with no prior score, `BandSummaryLine` with `scored === 0`,
  several segment components) are covered by cells that show the rendering case
  alongside a caption, rather than a blank card.

## Re-sync risks

- **The entry barrel and `componentSrcMap` are hand-maintained.** A component
  added to `components/ui/` or `app/company/components/` will **not** appear in
  a re-sync until it is added to both. There is no discovery step that would
  catch the omission — the build will simply report the same count as last time.
- **A new `async` Server Component under `app/company/components/` will break the
  bundle** if someone adds it to the barrel. Check with
  `grep -l "export async function" app/company/components/*.tsx` before editing.
- **The preview fixtures are inlined, not derived from the DB.** They encode
  today's payload shapes; a schema change to any `lib/<domain>/types.ts` will
  make the matching preview stale without failing the build. The ones that run
  through the real normalizers (`normalizeMoatAnalysis`, `normalizeValuationCheck`,
  `normalizeQuarterlyV4Categories`, …) will surface it — those are the safe pattern.
- **Four components' previews were reconstructed from git history or authored
  with no live call site** (`OverviewCard`'s wiring came from `219159e^`;
  `ExpandableText`, `StanceBadge`, `SidebarNavigation` have no call site in the
  app). Their previews are the only documentation of intended use — and a signal
  the barrel could be pruned if they are genuinely dead.
- **The Tailwind safelist is a guess at future need**, not a derived set. If
  designs come back with unstyled elements, widen the patterns in
  `.design-sync/tailwind.ds.ts` rather than hand-editing the CSS.
- **Google Fonts is a network dependency at render time** (`[FONT_REMOTE]`).
  The families are not embedded in the bundle by design; if that ever has to
  change, download the woff2s and wire them through `cfg.extraFonts`.
- `dist/` is gitignored, so a fresh clone must run `cfg.buildCmd` before the
  converter — otherwise `loadDts` hits the missing-`name` crash described above.
  Both halves of that directory are generated, so there is nothing to restore by
  hand; just run the build command.
