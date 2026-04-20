# Story of a Stock Portal Design System

This document captures the current visual language used across the portal. It is meant to be a working reference for future UI changes, not a theoretical brand book.

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

## Global Shell

### Background

The app uses a neutral background based on Tailwind / CSS variables in [`app/globals.css`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/globals.css).

The background should feel:

- clean
- slightly atmospheric
- not pure flat gray
- able to support both dark and light themes

Background gradients should stay subtle. They are there to create depth, not to become the page content.

### Navbar

The global navbar in [`app/(hero)/navbar.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/(hero)/navbar.tsx) defines the brand tone:

- sticky
- translucent
- rounded container
- compact spacing
- search-first layout
- clear but calm navigation

Important navbar traits:

- strong outer shell with a soft border
- blurred / glassy feel
- brand mark with a gentle gradient
- search field as the main utility action
- nav links treated as pills or text chips, not heavy buttons

## Section System

The company page uses a reusable section shell in [`app/company/components/section-card.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/company/components/section-card.tsx).

### Section card anatomy

Each section should generally have:

- rounded outer shell
- color-tinted accent line at the top
- small section-dot or marker
- title with bold weight
- optional description
- optional pill row
- content area with lighter nested surfaces

### Section tone language

Tones are semantic, not decorative.

- `sky`: industry, future growth, analysis, exploration
- `emerald`: business snapshot, healthy operating context, positive momentum
- `amber`: quarterly score, guidance, caution, watchfulness, mixed confidence
- `violet`: key variables, analytical framing, model inputs
- `rose`: community, user-generated or socially noisy surfaces, risk-adjacent accents
- `slate`: fallback / neutral sections

Tone should be consistent across a section:

- shell tint
- accent line
- chip highlights
- nested card emphasis

## Surface Grammar

The portal uses a consistent surface grammar across most pages.

### 1. Outer shell

This is the largest card or panel.

Traits:

- larger radius
- soft border
- low-contrast tinted background
- subtle radial glow
- shadow that suggests elevation, not floating chrome

### 2. Summary block

This is the first inner block inside a section.

Traits:

- slightly stronger surface than the shell background
- a bit more opaque
- may use a tinted wash if the section has a semantic tone
- contains the most important summary text

### 3. Nested detail blocks

Used for:

- drawers
- comparisons
- breakdowns
- historical trails
- subcategories

Traits:

- smaller radius than the outer shell
- visually quieter than the summary block
- border remains visible
- can stack vertically without feeling heavy

### 4. Tiny content cards

Used for:

- pills
- chips
- metrics
- badges
- quarter markers
- status labels

Traits:

- compact
- rounded
- small type
- low padding
- should never dominate the hierarchy

## Typography

The current app uses Geist in [`app/layout.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/layout.tsx).

### Type behavior

- strong headline weight for section titles
- slightly condensed utility labels
- smaller uppercase tracking for metadata
- normal sentence case for explanatory text
- short line lengths for body copy when possible

### Rules

- Titles should be direct and legible.
- Metadata should be smaller and quieter than content.
- Don’t overuse uppercase. Use it for structure, not for every label.
- Favor sentence case for meaningful explanations.

## Color Usage

### Neutral foundation

The majority of the portal should stay neutral:

- dark background in dark mode
- soft white / off-white in light mode
- muted borders
- subdued helper text

### Semantic accents

Use color to explain what the content means:

- blue / sky for analysis, exploration, and directional context
- emerald for positive operating strength or healthy business structure
- amber for uncertainty, trending, guidance, and score context
- violet for model variables and framework-based inputs
- rose for community and softer risk language

### Tinted overlays

The portal often uses translucent gradient washes behind content. These are especially useful in:

- section shells
- summary blocks
- detail drawers
- chart containers

The goal is a soft “milky” or glass-like layer, not an obvious colorful backdrop.

## Cards and Containers

### Card rules

Cards should feel like they belong to the same family.

Use:

- rounded corners
- 1px borders with low-opacity color
- translucent fills
- inset highlight shadows
- a slight outer shadow for depth

Avoid:

- flat hard borders on every child
- overly dark nested blocks inside already dark shells
- too many different radii in one section

### Nested content

Nested panels should always be one step quieter than their parent.

Example progression:

- section shell: visible tone
- summary block: slightly stronger
- nested detail block: quieter
- chip: quietest

## Navigation

### Top navigation

The top-level navigation should feel like part of the same product shell, not a separate website chrome.

Rules:

- sticky
- rounded
- lightly translucent
- compact
- search should feel primary
- primary actions should be pill-shaped and obvious

### In-page tabs

Tabs inside company pages should follow the same pattern:

- clear active state
- soft inactive state
- compact labels
- badge-style numeric status when useful
- do not over-animate

## Company Page Pattern

The company page is the most opinionated surface in the product.

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

- consistent section cards
- repeated summary/drawer pattern
- section-specific tones
- a shared rhythm of summary first, detail second

### What breaks coherence

- a section that uses a flatter or darker surface than the rest
- a section that uses pure dividers instead of nested cards
- a section that repeats the same metric too many times
- a section where the tone does not match the semantic meaning

## Pattern by Section

### Industry Context

Should feel exploratory and analytical.

Good traits:

- sky-tinted shell
- content broken into cards
- layered structure for value chain and players

### Business Snapshot

Should feel grounded, structured, and slightly greener than the rest.

Good traits:

- emerald-tinted outer plane
- stronger summary block
- nested blocks for segments, momentum, moat, and exceptions
- mix-shift callout treated as a distinct sub-surface

### Quarterly Score

Should feel like a status panel with a high-signal trend line.

Good traits:

- amber section tone
- status strip with strong readability
- chart area and quarter detail separated into different blocks

### Key Variables

Should feel technical and model-oriented.

Good traits:

- violet / analytical accents
- clear label hierarchy
- variable cards that are easy to scan

### Future Growth

Should feel optimistic but still research-oriented.

Good traits:

- sky-toned framing
- strong summary block
- nested catalyst cards
- scenario analysis held in a quieter sub-panel

### Guidance History

Should feel like a longitudinal evidence trail.

Good traits:

- amber tone, but softened
- summary at top
- grouped threads
- expandable trails
- transparent historical continuity

### Community

Should feel more open and social than the rest of the product, but still aligned with the card system.

Good traits:

- rose accent
- comments should feel integrated into the research shell

## Spacing

Spacing is intentionally generous but controlled.

Rules:

- use enough spacing to separate semantic blocks
- don’t rely on whitespace alone to explain structure
- nested blocks should have slightly tighter padding than parents
- wide content should be split into columns or cards before it gets too long

## Border and Shadow Language

Borders and shadows should support the content, not become the content.

### Borders

- Use borders to define edges and hierarchy.
- Keep opacity low.
- Avoid using dark borders as the primary styling device.

### Shadows

- Shadows should be soft and broad.
- Prefer subtle elevation over hard drop shadows.
- Inset highlights are useful to make translucent surfaces feel layered.

## Motion and Interaction

The portal should not feel flashy.

Use motion sparingly:

- hover state changes
- expand/collapse transitions
- drawer opening
- carousel selection

Preferred motion qualities:

- short
- smooth
- restrained
- functional

Avoid:

- large bounce effects
- flashy color transitions
- motion that draws attention away from data

## Data Presentation Rules

### Chips and badges

Use for:

- status
- period
- confidence
- category
- type
- trend direction

Rules:

- keep them small
- make them readable
- prefer semantic colors
- don’t stack too many different colors in a single row unless they mean different things

### Summary text

Summary text should be short, direct, and easy to scan.

If summary copy gets long:

- move supporting detail into a nested block
- use a drawer or expandable trail
- split into bullets when the story has multiple parts

### Charts

Charts should sit inside a calm frame and not compete with surrounding copy.

They should have:

- enough padding
- clear labels
- restrained axis treatment
- strong contrast for the selected state

## Responsive Behavior

The design should stay coherent on desktop and mobile.

### Desktop

- section cards can be wide
- two-column breakdowns are acceptable
- drawers and carousels can be used to compress supporting information

### Mobile

- sections should stack
- chips should wrap cleanly
- cards should not become overly dense
- long explanatory bars should collapse into simpler vertical structure

## Anti-Patterns

Avoid:

- flat dark boxes inside already dark sections
- inconsistent tone assignment
- too many different border colors in one small area
- tiny muted text used for critical information
- summary content stretched across overly wide lines
- using an accent color where a neutral surface would be better

## Practical Rule of Thumb

When adding a new surface, ask:

1. What level of hierarchy is this?
2. Does it need its own tone, or should it inherit the parent?
3. Should it be a full card, a nested block, or a chip?
4. Is the text trying to inform, classify, or summarize?
5. Does this block need more or less contrast than the sibling next to it?

If a new component does not fit the existing shell/card/chip grammar, it should be adjusted before it is shipped.

## Reference Components

Useful files to inspect when extending the system:

- [`app/layout.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/layout.tsx)
- [`app/globals.css`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/globals.css)
- [`app/(hero)/navbar.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/(hero)/navbar.tsx)
- [`app/company/components/section-card.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/company/components/section-card.tsx)
- [`app/company/[code]/page.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/company/[code]/page.tsx)
- [`app/company/components/quarterly-score-section.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/company/components/quarterly-score-section.tsx)
- [`app/company/components/guidance-history-section.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/company/components/guidance-history-section.tsx)
- [`app/company/components/expandable-text.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/app/company/components/expandable-text.tsx)
- [`components/ui/button.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/components/ui/button.tsx)
- [`components/ui/badge.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/components/ui/badge.tsx)
- [`components/site-footer.tsx`](/Users/pranavyadav/Documents/tech/concall-alpha-1/concall-alpha-1/components/site-footer.tsx)

