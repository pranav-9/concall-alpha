# Story of a Stock Portal Design System

This document is the source of truth for visual language across the portal. It describes the system we want to build toward — not necessarily the exact state of every page today. When the implementation drifts, the doc wins; update the code, not the doc, unless we are deliberately changing direction.

All file paths in this document are relative to the `concall-alpha/` project root.

## Design Goal

The portal should feel like a serious research product, not a consumer app and not a spreadsheet clone.

The core feeling is:

- analytical
- compact
- premium but restrained
- data-first, with layered context
- dark enough to feel focused, but not heavy

The best mental model is a research desk with soft glass surfaces, color-coded evidence, and strong information hierarchy.

## High-Level Principles

### 1. Neutral base, selective color

Most surfaces are neutral. Color is used only when it adds meaning:

- section identity
- trend direction
- status / verdict
- score emphasis
- risk or opportunity signaling

Avoid using saturated color as decoration. Color should explain structure or state.

### 2. Layered depth, not flat panels

The portal relies on visible layers:

- page background
- top navbar shell
- section card shell
- subsection card
- nested detail card
- pill / badge / chip

Every layer should be distinguishable by a small change in opacity, border strength, tint, or inset shadow.

### 3. Calm hierarchy

Primary content should be easy to scan in one pass.

The hierarchy should usually be:

- section title
- short descriptor or status
- summary panel
- supporting detail blocks
- expandable detail trails

If a card feels decorative before it feels informative, the hierarchy is wrong.

### 4. Soft contrast, not harsh contrast

The design uses high legibility, but avoids hard black-and-white contrast except where needed for text.

Prefer:

- muted surfaces
- soft borders
- tinted cards
- subtle glow
- rounded corners

Avoid:

- harsh outlined boxes everywhere
- dense visual noise
- hard dividers used as the primary organizational tool

---

## Surface Families

The portal has two distinct surface families. Each has its own card tokens, its own shell rules, and its own vocabulary. **Pick the family before you pick the token.**

### Research surfaces

Used wherever the user is reading dense analytical content. The company page is the canonical example; sub-sector deep-dives, historical trails, and any future "research workspace" view also belong here.

Feel: flat, opaque, calm. Cards stack quietly. Tone comes from the section shell's border + accent + radial glow, never from an inner surface tint. The reader's eye should rest on text, not on glass.

Tokens live at [`app/company/components/surface-tokens.ts`](../app/company/components/surface-tokens.ts). Section shells are rendered by [`app/company/components/section-card.tsx`](../app/company/components/section-card.tsx).

### Atmospheric surfaces

Used on landing, index, and marketing pages: the homepage hero, leaderboards, sectors, sector detail, watchlists, requests, how-scores-work, q4fy26. These pages are scannable rather than reading-dense, and they carry the brand feel of the portal.

Feel: glassy, layered, slightly tinted. Cards have a milky gradient wash, an inset highlight along the top edge, and a soft drop shadow. The reader's eye should glide across surfaces and stop on counters, leaderboards, and CTAs.

Tokens live at [`lib/design/shell.ts`](../lib/design/shell.ts).

### Where each family applies

| Page / area | Family |
|---|---|
| Homepage hero, framework grid, marketing CTAs | Atmospheric |
| `/leaderboards`, `/sectors`, `/sector/[slug]`, `/watchlists`, `/requests`, `/how-scores-work`, `/q4fy26` | Atmospheric |
| `/company/[code]` and all `app/company/components/*` sections | Research |
| Tables embedded inside index pages (`leaderboards/moat-table`, `company/data-table` chrome on index views) | Atmospheric outer shell, plain rows inside |
| Chrome (navbar, footer, banner, fade-out overlays) | Neither — chrome has its own rules below |

### Hard rules between families

- **Never mix tokens across families in the same surface.** A research `SectionCard` does not contain an atmospheric panel as an inner card, and an atmospheric page does not host a research `SectionCard` as a top-level shell.
- **Family is a property of the page, not of the component.** A `Tabs` primitive can render in either family; the page's family decides which token the trigger background uses.
- **Chrome is shared.** The navbar, footer, banner, and fade-out gradients use the same chrome tokens regardless of which family the page belongs to.

---

## Global Shell

### Background

The app uses neutral background tokens defined in [`app/globals.css`](../app/globals.css).

The background should feel:

- clean
- slightly atmospheric
- not pure flat gray
- able to support both dark and light themes

Atmospheric pages may add a single subtle radial wash behind the hero block; research pages should leave the background plain.

### Navbar

The global navbar in [`app/(hero)/navbar.tsx`](../app/(hero)/navbar.tsx) defines the brand tone:

- sticky
- translucent
- rounded container (`rounded-[1.5rem]`)
- compact spacing
- search-first layout
- clear but calm navigation

Important navbar traits:

- strong outer shell with a soft border
- blurred / glassy feel — the only place `backdrop-blur-lg` is allowed
- brand mark with a gentle gradient
- search field as the main utility action
- nav links treated as pills or text chips, not heavy buttons

The navbar must always include the [`ThemeSwitcher`](../components/theme-switcher.tsx). Light/dark is a first-class capability of the design; users must be able to toggle.

### Footer

[`components/site-footer.tsx`](../components/site-footer.tsx). Quiet, low-contrast, links arranged in two short columns. Does not use either surface family — it is structural chrome, not content.

### Page width

All chrome and content uses `max-w-[1440px]`. This is the single canonical container width. Side padding scales: `px-3 sm:px-4 lg:px-8` on content, `px-3 sm:px-6 lg:px-10` on the navbar/footer wrappers.

---

## Research Surfaces

The L1 → L4 system. This is the system used by the company page and any future research workspace view.

### The four card levels

Tokens live at [`app/company/components/surface-tokens.ts`](../app/company/components/surface-tokens.ts). Import them. Do not redeclare these strings inline.

| Level | Purpose | Token | Exact classes |
|---|---|---|---|
| **L1** | Section shell | `SectionCard` | Rendered by [`section-card.tsx`](../app/company/components/section-card.tsx). Outer `rounded-[1.55rem]` shell with tone-tinted border + background, radial tone glow, and a `h-1` tone accent bar on top. Always use `SectionCard` for a new section — never hand-roll the shell. |
| **L2** | Summary / primary block | `elevatedBlockClass` | `rounded-xl border border-border/35 bg-background/75 shadow-md shadow-black/20` |
| **L3** | Nested detail / mini-card | `nestedDetailClass` | `rounded-md border border-border/25 bg-background/45` |
| **L4** | Quietest subsection wrapper | `snapshotSubsectionClass` | `rounded-xl border border-border/20 bg-background/25` |

**Dark summary variant.** `elevatedMutedBlockClass` (`bg-muted/35` instead of `bg-background/75`) exists for summary blocks that intentionally sit one step *darker* than L2 (e.g., a dashboard-style band inside a lighter section). Use it sparingly — it is not a lighter alternative to L2, and it should never be mixed with L2 in the same section unless the hierarchy is deliberate.

### Section tones

Tones are semantic, not decorative.

- `sky` — industry, future growth, analysis, exploration
- `emerald` — business snapshot, healthy operating context, positive momentum
- `amber` — quarterly score, guidance, caution, watchfulness, mixed confidence
- `violet` — key variables, analytical framing, model inputs
- `rose` — community, user-generated or socially noisy surfaces, risk-adjacent accents
- `slate` — fallback / neutral sections

Tone is consistent across a section: shell tint, accent line, chip highlights, nested-card emphasis. Mapping for known sections lives in `SECTION_TONE_BY_ID` inside [`section-card.tsx`](../app/company/components/section-card.tsx).

### Mini-card accent strip

A mini-card accent strip is an `h-1.5` bar at the top of an L3 card, used to reinforce that a row of mini-cards are parallel categorical items (e.g., the three subsector dimensions).

- **On or off must be consistent within a section.** If the Subsector Analysis mini-cards have a strip, the Value Chain mini-cards and Regulations mini-cards must match — either all on or all off.
- **Strip color uses the parent section's tone**, not a hard-coded one-off. Pick `{tone}-500/80` for solid strips and `from-transparent via-{tone}-500/70 to-transparent` for gradient strips. Do not paint a violet strip inside a sky section.
- **Default is off.** Add the strip only when the mini-cards represent *parallel categorical siblings* that benefit from a categorical marker. Time-series cards, drawer cards, and single-purpose summary panels should stay unaccented.
- The strip is `h-1.5` on L3 and `h-1` on L1. Do not mix these heights.

### L2 background is non-negotiable

Every section's primary prose or summary content must be wrapped in an `elevatedBlockClass` block — the solid `bg-background/75` token. Content may not float bare on the section shell when it is prose or text. (Bare is fine when the only content is a row of drawer cards that are themselves L2-level.)

Section tone comes from the `SectionCard` shell — never from tinting an inner card. **The following are forbidden on Research surfaces below L1:**

- Gradient backgrounds (`bg-gradient-to-br from-background/9X via-background/9X to-…`).
- Inset highlight shadows (`shadow-[inset_0_1px_0_rgba(255,255,255,…)]`).
- `backdrop-blur-sm` or any backdrop filter on inner cards.
- Color-tinted card backgrounds (`to-emerald-50/14`, `to-amber-50/14`, `from-sky-50/16`, etc.).
- `bg-card` as a nested-card background — use `nestedDetailClass`.
- Ad-hoc opacities like `bg-background/70`, `bg-background/85` on L3 — use `nestedDetailClass` (`/45`).

If a research section wants visual emphasis beyond L2, promote the content to its own `SectionCard`-style sub-surface rather than tinting or softening the inner L2 card.

### Decision tree (Research)

When adding a new surface inside a research page:

1. **Is this the outermost container of a new page section?** → Use `SectionCard` with a tone from `SECTION_TONE_BY_ID`. Done.
2. **Is this the single primary summary block inside a section?** → Use `elevatedBlockClass`. Use `elevatedMutedBlockClass` only if the section brief explicitly calls for a darker band.
3. **Is this one card inside a grid / drawer / breakdown row?** → Use `nestedDetailClass`. Decide accent-strip on/off *for the whole grid at once*, using the section's tone.
4. **Is this a quiet grouping wrapper that itself contains L3 cards?** → Use `snapshotSubsectionClass`.
5. **None of the above?** → It is probably a chip/badge, not a card. Use the chip patterns below, not a new card token.

If none of the above fit, update this document *before* shipping the new surface.

---

## Atmospheric Surfaces

The glassy, layered family used on landing, index, and marketing pages.

### Anatomy

An atmospheric page has three card levels, plus the same chip patterns as the rest of the system.

- **A1 — atmospheric shell.** The hero block at the top of the page. Larger radius, stronger inset highlight, deeper drop shadow, slightly stronger tone tint. One per page, at most.
- **A2 — atmospheric panel.** Top-level grouping panels: framework explainer panels, score-model containers, table shells. Smaller radius, lighter inset, lighter drop, lighter tint.
- **A3 — atmospheric inner card.** The flat content card that lives *inside* an A1 or A2: stat/metric cards in a hero grid, content cards in a framework explainer, form-field wrappers, descriptor blocks at the top of a Tabs panel. Flat — no gradient, no inset highlight, no blur. Provides visual containment without compounding the glass effect.

A1 and A2 share the same recipe family: a diagonal background gradient, a `backdrop-blur-sm` glass layer, an inset white highlight along the top edge, and a soft far-throw drop shadow. **A3 deliberately does not use any of those four ingredients** — that is the entire point of A3, and the reason it is the only legal way to nest content cards inside A1 or A2.

A3's recipe is the same as L2 (`elevatedBlockClass`) on research surfaces. The shape repeats across both families because the visual job is the same: a calm, flat content card that does not compete with its parent.

### Tokens

Tokens live at [`lib/design/shell.ts`](../lib/design/shell.ts). Import them. Do not redeclare these strings inline.

| Level | Token | Purpose |
|---|---|---|
| **A1** | `HERO_CARD` | Page-leading hero shell |
| **A2** | `PANEL_CARD_SKY` | Default atmospheric panel (sky-tinted) |
| **A2** | `PANEL_CARD_NEUTRAL` | Tone-neutral atmospheric panel |
| **A2-table** | `TABLE_CARD_SKY` | Table-shell variant: no padding, `overflow-hidden` |
| **A3** | `INNER_CARD` | Flat content card inside an A1 or A2 |
| Page shell | `PAGE_SHELL` | Atmospheric page container with width + padding |
| Background | `PAGE_BACKGROUND_ATMOSPHERIC` | The radial tint behind the hero — opt-in, one per page |

Exact recipes:

```
A1 — HERO_CARD:
  rounded-[1.6rem]
  border border-{tone}-200/35 dark:border-{tone}-700/25
  bg-gradient-to-br from-background/97 via-background/92 to-{tone}-50/12 dark:to-{tone}-950/12
  shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_18px_36px_-30px_rgba(15,23,42,0.26)]
  backdrop-blur-sm
  p-4 sm:p-6

A2 — PANEL_CARD_*:
  rounded-[1.45rem]
  border border-{tone}-200/25 dark:border-{tone}-700/20
  bg-gradient-to-br from-background/97 via-background/93 to-{tone}-50/10 dark:to-{tone}-950/10
  shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_28px_-26px_rgba(15,23,42,0.18)]
  backdrop-blur-sm
  p-4

A2-table — TABLE_CARD_*:
  overflow-hidden
  rounded-[1.45rem]
  border border-{tone}-200/25 dark:border-{tone}-700/20
  bg-gradient-to-br from-background/97 via-background/93 to-{tone}-50/10 dark:to-{tone}-950/10
  shadow-[0_18px_38px_-32px_rgba(15,23,42,0.24)]
  backdrop-blur-sm
  (no padding — rows define their own)

A3 — INNER_CARD:
  rounded-xl
  border border-border/35
  bg-background/75
  shadow-md shadow-black/20
  p-3 sm:p-4
  (no gradient, no inset highlight, no backdrop-blur)
```

### Atmospheric tones

Atmospheric is intentionally narrower than research. Only two tones:

- **Sky** — default. Used for analysis, exploration, leaderboards, sector views, hero blocks.
- **Neutral** — opt-in. Used when the page's content has no analytical lean (request submission, raw lists, footers of marketing pages). Replaces `{tone}-50/N` with `muted/N` and `{tone}-200/N` with `border/N`.

Emerald, amber, violet, and rose are **not** valid atmospheric tones. If you find yourself wanting an emerald atmospheric panel, you are probably building a research surface.

### Decision tree (Atmospheric)

When adding a new surface inside an atmospheric page:

1. **Is this the page-leading hero block?** → Use `HERO_CARD` (`A1`). Only one per page.
2. **Is this a top-level grouping panel — framework explainer, score-model container, list shell?** → Use `PANEL_CARD_SKY` (`A2`). Use `PANEL_CARD_NEUTRAL` only if the panel's content is genuinely tone-neutral.
3. **Is this a table shell?** → Use `TABLE_CARD_SKY` (`A2-table`). The table rows inside are plain — no atmospheric treatment per row.
4. **Is this a stat card, content card, descriptor block, or form-field wrapper living *inside* an A1 or A2?** → Use `INNER_CARD` (`A3`). This is the only legal way to nest a card inside an atmospheric panel.
5. **Is this a tab strip, segmented control, or pill row?** → Use the chip / pill rules below. Do not wrap each item in `A2` or `A3`.
6. **Is this a chip, badge, button, or other text-level element?** → Chip patterns below.

### Hard limits

- **Never nest a glass surface inside another glass surface.** No `HERO_CARD` inside `HERO_CARD`/`PANEL_CARD_*`. No `PANEL_CARD_*` inside `HERO_CARD`/`PANEL_CARD_*`. The glass effect compounds badly and the page reads as unfocused.
- **A3 is the legal nesting layer.** When an A1 or A2 needs internal cards, use `INNER_CARD`. Never reach for another A1/A2 to do the job.
- **Never nest A3 inside A3.** A3 holds content, not cards. If you need a card inside an A3, you are looking at the wrong hierarchy — promote the parent or use chips.
- **Never put atmospheric tokens inside a research `SectionCard`.** If a research page wants a hero feel, use a slate-toned `SectionCard` and the L2/L3 tokens.
- **Atmospheric pages do not use `SectionCard`.** Their structure is hero (A1) → panels (A2) → inner cards (A3) → chips.

---

## Chips and Badges

Chips and badges are the same family across both surface families. They are the smallest layer in the hierarchy.

### Chip recipes

| Variant | Classes |
|---|---|
| Neutral chip | `inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground` |
| Tone chip | `inline-flex items-center rounded-full border border-{tone}-200/60 bg-{tone}-100/70 px-2.5 py-1 text-[10px] font-medium text-{tone}-800 dark:border-{tone}-700/35 dark:bg-{tone}-900/30 dark:text-{tone}-200` |
| Pill (active nav, primary CTA) | `inline-flex items-center rounded-full bg-foreground px-3 py-2 text-xs font-medium text-background shadow-sm` |
| Pill (inactive nav) | `inline-flex items-center rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground` |

### Rules

- Chips inherit their parent surface's tone when one applies. A chip inside a sky section uses the sky tone variant; a chip inside a neutral atmospheric panel uses the neutral variant.
- Stack at most three different tones in a single chip row, and only when the tones mean different things (e.g., status + period + confidence).
- Do not use chips as decoration. Every chip must carry status, period, confidence, category, type, or trend direction.

---

## Typography

The portal uses Geist via [`app/layout.tsx`](../app/layout.tsx).

### Type scale

A small, fixed scale. Hand-sized values outside this scale are not allowed without updating this section.

| Tier | Classes | Use |
|---|---|---|
| Eyebrow | `text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground` | Section labels, framework eyebrows, small structural markers |
| Metadata | `text-[11px] text-muted-foreground` | Chip text, captions, timestamps, source attributions |
| Caption | `text-[12px] leading-snug` | Compact body, table cell text, drawer caption |
| Body compact | `text-[13px] leading-snug text-foreground/80` | Section descriptions, summary text inside L2 cards |
| Body | `text-sm leading-relaxed` (14px) | Default prose, list items, form field text |
| Body lead | `text-base leading-7` (16px) | Hero subtitle, intro paragraph |
| Section title | `text-lg font-bold leading-tight` | `SectionCard` titles, atmospheric panel titles |
| Page title (research) | `text-2xl sm:text-3xl font-bold` | Page H1 inside a research surface |
| Page title (atmospheric) | `text-3xl sm:text-4xl font-black tracking-[-0.04em]` | Hero H1 inside `HERO_CARD` |
| Hero headline | `text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em] leading-[0.95]` | Homepage hero only |
| Hero name | `text-[1.9rem] sm:text-[2.35rem] lg:text-[2.7rem] font-bold tracking-[-0.03em] leading-tight` | Company-page identity hero only — the company name in `overview-card.tsx`. Reserved for brand-anchor headlines on a research surface; do not use elsewhere. |

### Tracking

- `tracking-[0.16em]` is the canonical eyebrow tracking. Use everywhere structural metadata is uppercased.
- `tracking-[0.14em]` is reserved for chip labels that are uppercased.
- `tracking-[-0.04em]` is reserved for headline-weight titles (page title atmospheric, hero headline).
- Other tracking values (`0.12em`, `0.18em`, `0.22em`, `0.1em`, `0.08em`) are deprecated. Migrate to one of the above.

### Casing

- Eyebrows: UPPERCASE.
- Chip labels: sentence case by default; uppercase only when the chip is a structural marker (period, status code).
- Titles, body, descriptions: sentence case.
- Avoid uppercasing whole sentences or descriptive copy.

### Font weights

- `font-medium` (500): chip text, nav labels, default actions.
- `font-semibold` (600): eyebrows, table headers, summary labels.
- `font-bold` (700): section titles, page titles in research surfaces.
- `font-black` (900): hero headlines, atmospheric page titles, score numerals.
- Do not use `font-light` or `font-thin` anywhere.

---

## Color Discipline

### Neutral foundation

The majority of the portal is neutral:

- dark background in dark mode
- soft white / off-white in light mode
- muted borders
- subdued helper text

Neutrals come from the semantic tokens in [`app/globals.css`](../app/globals.css): `background`, `foreground`, `card`, `muted`, `muted-foreground`, `border`, `accent`, `popover`. Do not bypass these with raw `slate-`, `zinc-`, `stone-`, `neutral-`, or `gray-` palette utilities.

### Semantic accents

Color carries meaning. The legal sources of color are:

- **Section tones**, applied via `SectionCard` and `SECTION_TONE_BY_ID` (research) or `HERO_CARD` / `PANEL_CARD_*` (atmospheric).
- **Score colors**, applied only via [`components/concall-score.tsx`](../components/concall-score.tsx) — the single source of truth for score → color mapping. The file exposes `categoryFor(score)` for badge displays (7 tiers: label + bg + ring) and `chartColorFor(score)` for chart visualizations that need finer granularity (13-tier hex gradient). Both helpers live in this file because the score → color *concept* has one home, even when two visualizations call for different palettes.
- **Chart configs**, which legitimately need raw color values for Recharts / SVG attributes. Prefer `hsl(var(--chart-1))` … `hsl(var(--chart-5))` where the 5-color categorical palette fits. When the chart needs more colors (e.g., the 8-segment business breakdown) or semantic encoding (up/down/flat indicators in a sparkline), hex literals are allowed inside the chart-config file — but the palette must be defined as a single shared constant (e.g., [`business-segment-mix-constants.ts`](../app/company/components/business-segment-mix-constants.ts)), not duplicated across chart components.

Raw palette utilities (`bg-emerald-100`, `border-sky-700/35`, `text-amber-200`) are allowed *only* inside the four legal sources above. They may not be sprinkled onto inner cards, chips, or text outside that scope.

### Tinted overlays

The atmospheric family uses translucent tone washes by definition (the `to-{tone}-50/N` segment of its gradient). Research surfaces never repaint tone onto an inner card — tone lives on the L1 `SectionCard` only.

### Forbidden literals

- Hex color literals in `.tsx` / `.ts` files outside chart configs. (Chart configs are the documented exception; see "Semantic accents" above.)
- `rgba(...)` literals outside the inset-highlight and drop-shadow recipes documented in this file, the `PAGE_BACKGROUND_ATMOSPHERIC` radial-wash recipe, and chart configs. These recipes are tokens; everything else should be a Tailwind utility or a CSS variable.
- HSL literals outside `globals.css`.

---

## Spacing

Spacing is intentionally generous but controlled. Use the named scale; do not hand-tune `p-3.5`, `gap-2.5` etc. unless the named values genuinely don't fit.

### Container

- Page max width: `max-w-[1440px]` (canonical).
- Page side padding: `px-3 sm:px-4 lg:px-8` (atmospheric `PAGE_SHELL`); `px-3 sm:px-6 lg:px-10` (chrome wrappers).
- Page vertical padding: `py-4 sm:py-5` (atmospheric); `py-6 sm:py-8 lg:py-10` (homepage hero).
- Page section gap: `gap-5` (atmospheric); `gap-6 lg:gap-8` (homepage); `space-y-4` between research sections inside the company page.

### Card padding

| Surface | Mobile | Desktop |
|---|---|---|
| `SectionCard` (L1) | `p-4` | `p-5` |
| `elevatedBlockClass` (L2) | `p-3` | `p-4` |
| `nestedDetailClass` (L3) | `p-3` | `p-3` |
| `snapshotSubsectionClass` (L4) | `p-3` | `p-4` |
| `HERO_CARD` (A1) | `p-4` | `p-6` |
| `PANEL_CARD_*` (A2) | `p-4` | `p-4` |
| Chip / pill | `px-2.5 py-1` (chip) / `px-3 py-2` (pill) | same |

### Stack rhythm

- Default vertical rhythm inside a card: `space-y-3` for content, `space-y-1.5` for tightly-coupled label+value pairs, `space-y-4` between distinct subsections.
- Default horizontal rhythm: `gap-2` for chip rows, `gap-3` for stat cards, `gap-4` for major columns.

---

## Borders and Shadows

Borders and shadows support the content; they are not the content.

### Borders

- Use borders to define edges and hierarchy.
- Default border opacity: `/35` (L2), `/25` (L3), `/20` (L4), `/55-/60` (chips), `/60` (chrome).
- Avoid full-opacity borders except on chrome edges (navbar inner shell, footer top).
- Use `border-dashed` only for truly auxiliary hints (empty states, drag-and-drop targets). Never as a primary edge.

### Shadows

The portal uses four shadow tokens. Hand-rolled `shadow-[…]` strings outside this list are deprecated.

| Token | Recipe | Use |
|---|---|---|
| `shadow-md shadow-black/20` | Tailwind default | L2 / L3 cards on research surfaces |
| `shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_18px_36px_-30px_rgba(15,23,42,0.26)]` | Inset highlight + far drop, A1 weight | A1 atmospheric shells |
| `shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_28px_-26px_rgba(15,23,42,0.18)]` | Inset highlight + far drop, A2 weight | A2 atmospheric panels |
| `shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]` | Inset highlight only, no drop | Tone status pills, segmented control / TabsList chrome, glass-style standalone buttons. A subtle glass top edge on a single chip-shaped element. **Forbidden on cards** (where it would compound). |

Inset+drop atmospheric shadows belong only to the atmospheric card family. Research L2/L3 cards carry only `shadow-md shadow-black/20`. The chip-glass token is reserved for single rounded-full chip / pill / tab elements — it cannot be applied to any rectangular card surface.

### Radii

The portal uses a fixed radius scale. Other values are deprecated.

| Token | Use |
|---|---|
| `rounded-md` (6px) | L3 nested mini-cards |
| `rounded-xl` (12px) | L2 summary blocks, L4 wrappers |
| `rounded-2xl` (16px) | Pills with substantial padding, secondary chrome |
| `rounded-[1.45rem]` | A2 atmospheric panels and table shells |
| `rounded-[1.5rem]` | Navbar inner shell, mobile menu drawer |
| `rounded-[1.55rem]` | L1 `SectionCard` |
| `rounded-[1.6rem]` | A1 `HERO_CARD` |
| `rounded-full` | Chips, pills, score badges, brand mark |

`rounded-[1.35rem]`, `rounded-[1.65rem]`, `rounded-[1.8rem]`, `rounded-[2rem]` are deprecated. Migrate to the closest token above.

---

## Motion

The portal does not feel flashy. Motion is used to indicate state change and direction, never to draw attention.

### Durations

- `transition-colors` (Tailwind default, ~150ms): hover state on chips, links, pills, ghost buttons.
- `duration-200`: expand/collapse on `<details>` summaries, drawer openers, accordion sections.
- `duration-300`: drawer / sheet / modal enter and exit.
- No `duration-500+` on interactive elements.

### Easing

- Default `ease-out` for entering motion.
- Default `ease-in` for exiting motion.
- Do not use `cubic-bezier` overrides.
- Do not use spring or bounce easings.

### Allowed motions

- Color and background transitions on hover/focus.
- Translate-on-hover for cards: `hover:-translate-y-0.5` only, no larger lifts.
- Expand/collapse for `<details>` content.
- Drawer/sheet enter/exit.
- Carousel slide (the carousel primitive at [`components/ui/carousel.tsx`](../components/ui/carousel.tsx) handles this).

### Forbidden motions

- Whole-page fade-ins.
- Continuous animations (rotating logos, pulsing call-outs) outside loading skeletons.
- Scroll-triggered reveals.
- Bouncing or springing interactions.

Loading skeletons use `animate-pulse` only.

---

## Navigation

### Top navigation

[`app/(hero)/navbar.tsx`](../app/(hero)/navbar.tsx). Rules:

- sticky
- rounded
- lightly translucent (`bg-background/82` over `backdrop-blur-lg` outer)
- compact
- search field is the primary utility action
- nav links are pills with the inactive/active recipe from "Chips and Badges"
- the navbar must contain the `ThemeSwitcher`
- on mobile, nav items collapse into a drawer that uses the same pill recipe

### In-page tabs

Tabs inside a page (research or atmospheric) follow:

- clear active state — pill with `bg-foreground text-background shadow-sm`
- soft inactive state — `text-muted-foreground hover:bg-accent hover:text-foreground`
- compact labels (`text-xs` or `text-sm`)
- badge-style numeric counts when useful (use the neutral chip recipe)
- do not over-animate — `transition-colors` only

The `Tabs` primitive at [`components/ui/tabs.tsx`](../components/ui/tabs.tsx) provides the structure; trigger backgrounds inherit the page family.

### Anchor sub-navigation

The company page uses [`top-section-tabs.tsx`](../app/company/components/top-section-tabs.tsx) and [`sidebar-navigation.tsx`](../app/company/components/sidebar-navigation.tsx) for jump-to-section navigation. These are research-surface chrome and follow research card rules: opaque `bg-background`, no atmospheric gradients, no `backdrop-blur` (the navbar's `backdrop-blur-lg` already handles the glass feel above).

---

## Theme Support

Light and dark are first-class. Every token in this document has both a light and a dark expression already wired into [`app/globals.css`](../app/globals.css) via the `:root` / `.dark` blocks.

Rules:

- The `ThemeSwitcher` component must be present in the navbar and reachable on every page.
- New tokens must define both light and dark expressions before shipping.
- Tone-tinted utilities used in section/atmospheric cards must include `dark:` variants.
- Do not assume the user is in dark mode when picking accent intensities.

---

## Company Page Pattern

The company page is the most opinionated surface in the product and the canonical example of the research family.

### General flow

The preferred order is:

1. overview / identity
2. industry / context
3. sub-sector analysis
4. business snapshot
5. quarterly score
6. key variables
7. future growth
8. guidance
9. community

### What makes the page feel coherent

- consistent `SectionCard` shells
- repeated summary/drawer pattern (L2 summary → L3 drawer cards)
- section-specific tones from `SECTION_TONE_BY_ID`
- shared rhythm of summary first, detail second

### What breaks coherence

- a section that uses a flatter or darker surface than the rest
- a section that uses pure dividers instead of nested cards
- a section that repeats the same metric too many times
- a section where the tone does not match the semantic meaning

---

## Per-Section Patterns

### Overview / identity

The first block on a company page is the identity hero: company name, ticker chip, "new" badge, and a grid of section-preview jump cards. It is rendered by [`overview-card.tsx`](../app/company/components/overview-card.tsx) and intentionally does not go through `SectionCard`.

Why a hand-rolled hero: the identity headline is the company name, not a generic section title. It needs to be visually larger and quieter than a section card — a brand anchor, not a section heading. The structural pattern is a research L1 shape (rounded-[1.55rem], opaque `bg-card/95`, soft drop shadow, slate-feeling) without `SectionCard`'s `h-1` accent, tone glow, or title slot.

Rules:

- The outer shell uses `rounded-[1.55rem]` (matches L1 SectionCard radius) so the overview reads as the same family as the section cards below.
- Company name uses the **Hero name** type tier from the type scale.
- Section preview mini-cards are `nestedDetailClass` (L3) with a slate accent strip on top — use the same recipe and tone for both the locked and clickable variants.
- Hover state on clickable previews: `hover:-translate-y-0.5 hover:border-border/55 hover:shadow-md`. No glass shadow recipes on hover.
- This is the only sanctioned hand-rolled L1 hero. Do not copy this pattern to build other heroes — extend `SectionCard` or reach for `HERO_CARD` instead.

### Industry Context

Should feel exploratory and analytical.

- sky-tinted shell
- content broken into cards
- layered structure for value chain and players
- accent strips, when used, follow sky tone — never violet, even on the "Types of Players" sub-block

### Business Snapshot

Should feel grounded, structured, and slightly greener than the rest.

- emerald-tinted outer shell
- stronger summary block
- nested blocks for segments, momentum, moat, and exceptions
- on desktop, use a 3-column mosaic with the donut in the rightmost rail and the segment cards filling the left 2x2 field when share data is available
- mix-shift callout treated as a distinct sub-surface
- inner cards use neutral L2/L3 tokens — never sky- or amber-tinted gradients (the section is emerald; tone is the shell's job)

### Quarterly Score

Should feel like a status panel with a high-signal trend line.

- amber section tone
- status strip with strong readability
- chart area and quarter detail separated into different blocks
- score numerals always rendered through `ConcallScore`

### Key Variables

Should feel technical and model-oriented.

- violet / analytical accents
- clear label hierarchy
- variable cards that are easy to scan
- small KPI sparklines via [`kpi-sparkline.tsx`](../app/company/components/kpi-sparkline.tsx) — chart colors come from the chart palette, never hex literals

### Future Growth

Should feel optimistic but still research-oriented.

- sky-toned framing
- strong summary block
- nested catalyst cards
- scenario analysis held in a quieter sub-panel (L4)

### Guidance History

Should feel like a longitudinal evidence trail.

- amber tone, but softened
- summary at top
- grouped threads
- expandable trails
- transparent historical continuity

The full guidance-tracker layout spec is in the [Appendix: Guidance Tracker](#appendix-guidance-tracker-layout).

### Community

Should feel more open and social than the rest of the product, but still aligned with the card system.

- rose accent
- comments should feel integrated into the research shell
- comment composer uses L2 inside the rose-toned `SectionCard`

### Changelog

[`app/changelog/page.tsx`](../app/changelog/page.tsx) should feel like a release ledger, not a blog post.

- newest-first release cards
- version and date chips with a clear scope badge
- short `added` / `improved` / `fixed` bullets for each shipped release
- one supporting side panel for reading rules and related links
- palette stays in the violet or slate family

---

## Data Presentation Rules

### Summary text

Summary text should be short, direct, and easy to scan.

If summary copy gets long:

- move supporting detail into a nested block
- use a drawer or expandable trail
- split into bullets when the story has multiple parts

### Charts

Charts should sit inside a calm frame and not compete with surrounding copy.

- enough padding
- clear labels
- restrained axis treatment
- strong contrast for the selected state
- colors come from the chart palette CSS variables, never hex literals
- on research surfaces, the chart container is an L2 or L3 card; on atmospheric surfaces, the chart sits inside a `PANEL_CARD_SKY`

### Tables

- Outer shell on atmospheric pages: `TABLE_CARD_SKY`. On research pages: L2 or `snapshotSubsectionClass`.
- Header row: `bg-muted/40` (research) or `bg-background/70` (atmospheric, against the gradient panel).
- Row borders: `border-b border-border/35`.
- Hover state: `hover:bg-accent/50`. Do not add per-row drop shadows.

---

## Responsive Behavior

The design should stay coherent on desktop and mobile.

### Desktop

- section cards can be wide
- two- and three-column breakdowns are acceptable
- drawers and carousels can be used to compress supporting information

### Mobile

- sections stack
- chips wrap cleanly
- cards do not become overly dense
- long explanatory bars collapse into simpler vertical structure
- hover-only interactions must have a tap-equivalent state

### Breakpoints

Use Tailwind's defaults: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px). Custom breakpoints are not used.

---

## Anti-Patterns

Never:

- mix research and atmospheric tokens in the same surface
- nest atmospheric panels inside other atmospheric panels
- paint tone onto a research inner card (it lives on the shell)
- paint a tone-mismatched accent (e.g., violet inside a sky section)
- use raw palette utilities outside the four legal color sources
- hand-roll a card shell instead of importing the canonical token
- use hex / rgba / hsl literals outside CSS variable definitions and the two atmospheric shadow recipes
- use uppercase tracking values outside `0.14em` / `0.16em`
- use radii outside the canonical scale
- use `font-light` or `font-thin`
- animate continuously
- skip the `dark:` variant on a tone-tinted utility

---

## Practical Rule of Thumb

When adding a new surface, ask:

1. **Which family is this page?** Research or Atmospheric?
2. What level of hierarchy is this within that family?
3. Does it need its own tone, or should it inherit the parent?
4. Should it be a full card, a nested block, or a chip?
5. Is the text trying to inform, classify, or summarize?
6. Does this block need more or less contrast than the sibling next to it?

If the new surface does not fit into one of the documented levels, **update this document before shipping**.

---

## Reference Components

Useful files to inspect when extending the system:

- [`app/layout.tsx`](../app/layout.tsx)
- [`app/globals.css`](../app/globals.css)
- [`app/(hero)/navbar.tsx`](../app/(hero)/navbar.tsx)
- [`components/site-footer.tsx`](../components/site-footer.tsx)
- [`components/theme-switcher.tsx`](../components/theme-switcher.tsx)
- [`components/concall-score.tsx`](../components/concall-score.tsx)
- [`components/ui/button.tsx`](../components/ui/button.tsx)
- [`components/ui/badge.tsx`](../components/ui/badge.tsx)
- [`lib/design/shell.ts`](../lib/design/shell.ts) — Atmospheric tokens
- [`app/company/components/surface-tokens.ts`](../app/company/components/surface-tokens.ts) — Research tokens
- [`app/company/components/section-card.tsx`](../app/company/components/section-card.tsx) — L1 shell + tone mapping
- [`app/company/[code]/page.tsx`](../app/company/[code]/page.tsx) — research family example
- [`app/page.tsx`](../app/page.tsx) — atmospheric family example
- [`app/company/components/quarterly-score-section.tsx`](../app/company/components/quarterly-score-section.tsx)
- [`app/company/components/guidance-history-section.tsx`](../app/company/components/guidance-history-section.tsx)
- [`app/company/components/expandable-text.tsx`](../app/company/components/expandable-text.tsx)

---

## Appendix: Guidance Tracker Layout

The guidance history section should read like a tracker dashboard, not a plain list.

Use:

- section header chips that surface the analysis window, refresh time, source depth, and current guidance
- keep style rationale and big-picture guidance in the main snapshot panels, not a drawer
- a three-column summary grid for direction style, big-picture growth, and credibility verdict
- a second two-column row for this year guidance data and the prior two years of guidance calibration
- keep style, growth trend, current guidance, and credibility as compact badges inside the summary cards, not as a separate hero strip
- keep the top summary cards sparse; do not add evidence-quarter, source, or calibration sub-panels back into them
- keep the big-picture growth card to one primary statement; do not add a nested subheading or supporting subtext block
- keep the top summary cards flat; use plain text and badges instead of nested inner panels
- an amber summary band with thread counts, source depth, and the latest tracked period
- status-group cards arranged in a responsive grid
- individual thread cards that surface type, status, target period, and mention span first
- collapsible quarter-by-quarter trails for the supporting evidence
- keep the existing guidance tracker underneath the snapshot and data cards
- avoid unnecessary explanatory copy; keep text light because the dashboard already carries a lot of text

---

## Migration Notes

The following are *known violations* that should be migrated to the rules above. They are listed here so that drift is visible; do not treat their existence as license to add more.

### Done

- ✅ `lib/design/shell.ts` exports `PANEL_CARD_NEUTRAL`, `TABLE_CARD_SKY`, `PAGE_BACKGROUND_ATMOSPHERIC`, `INNER_CARD`.
- ✅ `ThemeSwitcher` is wired into the navbar (desktop + mobile drawer).
- ✅ Atmospheric pages (sectors, sector detail, leaderboards, watchlists, requests, how-scores-work, moat-table, data-table, request-intake-form) import canonical tokens instead of re-declaring them inline.
- ✅ Inner cards in `sectors/page.tsx`, `how-scores-work/page.tsx`, and `request-intake-form.tsx` migrated to `INNER_CARD` (A3).
- ✅ Violet accent strip inside the sky-toned industry-context section migrated to sky.
- ✅ Sky-tinted gradient card inside the emerald-toned business-snapshot section flattened to `nestedDetailClass`.
- ✅ `bg-background/70` L3 cards in `guidance-snapshot-summary.tsx` and `historical-economics-data-pack.tsx` migrated to `nestedDetailClass`.
- ✅ `bg-card`-as-nested in `top-strategies-display.tsx` migrated to `nestedDetailClass`.
- ✅ Sidebar-navigation chrome `bg-card/95` migrated to opaque `bg-background` per the chrome rule.
- ✅ Atmospheric-style gradient panel in `business-segments-mosaic.tsx` flattened to `elevatedBlockClass`.
- ✅ Canonical container width unified at `max-w-[1440px]` across `PAGE_SHELL`, the company page, and the q4fy26 banner.
- ✅ `overview-card.tsx` outer radius normalized to `rounded-[1.55rem]` (canonical L1) and the section-preview L3 cards migrated from gradient + inset highlight + ring + `backdrop-blur` to `nestedDetailClass` with a slate accent strip.
- ✅ `how-scores-work/page.tsx` six A2-in-A2 violations resolved: descriptor blocks and example-pair blocks migrated to `INNER_CARD` (A3); content-grid wrappers that already contained A3 cards were flattened to plain `space-y-3` containers (heading + grid) to avoid A3-in-A3.
- ✅ `sector/[slug]/page.tsx` inline panel recipes (`PAGE_BACKGROUND_CLASS`, `INLINE_SUBCARD_CLASS`, `SMALL_SUBCARD_CLASS`, two inline JSX panels) migrated to `PAGE_BACKGROUND_ATMOSPHERIC` and `INNER_CARD`.
- ✅ "Hero name" typography tier added to the type scale to formally cover the company-name headline in `overview-card.tsx`.
- ✅ "Overview / identity" section added to Per-Section Patterns documenting `overview-card.tsx` as the single sanctioned hand-rolled L1 hero on the company page.
- ✅ Homepage (`app/page.tsx`) migrated to canonical atmospheric tokens: `PAGE_BACKGROUND_ATMOSPHERIC` for the radial wash, `HERO_CARD` for the lead block, `PANEL_CARD_NEUTRAL` for the three content panels (Fundamental Screeners, 7-step framework, Watch the research). The 7 framework cards converted from per-tone tinted-glass cards to flat `INNER_CARD` (A3) cards with tone accent strips at the top, with strip tones aligned to `SECTION_TONE_BY_ID` so the homepage teaches the same tone-section mapping the company page uses.
- ✅ Color Discipline reconciled: chart configs are now an explicit exempted zone for hex literals (Recharts / SVG attributes need raw values), with the requirement that palettes be defined as shared constants. The duplicated 8-color segment palette in `segment-revenue-display.tsx` removed — it now imports from [`business-segment-mix-constants.ts`](../app/company/components/business-segment-mix-constants.ts), the single source of truth.
- ✅ Card-shaped inset-highlight shadow violations cleaned up: `requests/page.tsx` `METRIC_CARD_CLASS` and `LIST_CARD_CLASS` migrated to `INNER_CARD`, an inline subcard in `sector/[slug]/page.tsx` migrated to `INNER_CARD`, and the donut-chart subsection wrapper in `business-segment-mix-donut-chart.tsx` migrated to `snapshotSubsectionClass` (L4) with the non-canonical inset+drop shadow removed.
- ✅ Chip-glass shadow recognized as a fourth canonical token: `shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]` for tone status pills, segmented controls / TabsList chrome, and standalone glass-style buttons. The doc's shadow-tokens table now lists it explicitly with the constraint that it is forbidden on rectangular card surfaces.
- ✅ Score-color mapping consolidated: `chartColorFor(score)` moved from `app/company/[code]/chart.tsx` into [`components/concall-score.tsx`](../components/concall-score.tsx), now living alongside `categoryFor`. Both helpers expose the same `score → color` concept; `categoryFor` returns 7-tier badge styling, `chartColorFor` returns 13-tier hex for chart visualizations. The doc's Color Discipline section names both helpers.

### Open

- A tracking sweep (still long-running): non-canonical `tracking-[…]`, `text-[Npx]`, `rounded-[…]`, and `shadow-[…]` values across the codebase. The largest concentration is in `app/company/[code]/page.tsx` and the company-section components. Migrate per scale, in focused passes, with screenshot diffs.
