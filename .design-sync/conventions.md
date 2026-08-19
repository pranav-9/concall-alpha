# Building with the Story of a Stock portal DS

This is the component library behind an equity-research portal covering Indian
mid- and small-cap companies. It should read as **a research desk, not a
consumer app**: neutral surfaces, colour only where it carries meaning, layered
depth rather than flat panels.

## Setup

No app-level provider is required — the theme tokens live in `styles.css`
`:root`, so link that one file and components are styled. Two exceptions, both
of which render **blank or unstyled** without their wrapper:

- `Tooltip*` must be inside `TooltipProvider`.
- `Sidebar*` must be inside `SidebarProvider`.

**Dark mode is a class, not a media query.** Put `class="dark"` on `<html>` or
any ancestor; every token flips beneath it. There is no theme provider in this
bundle.

Fonts (Geist body, Bricolage Grotesque display, IBM Plex Mono for figures) load
from Google Fonts via `styles.css`. Do not restate `font-family` — use the
`.house-display` / `.house-data` classes or `var(--font-display)` /
`var(--font-data)`.

## The styling idiom: Tailwind utilities, semantic tokens first

Style with Tailwind utility classes. **Reach for the semantic token colour
before a palette colour** — `bg-card`, not `bg-white`; `text-muted-foreground`,
not `text-gray-500`. Only these carry the theme and flip in dark mode:

| Family | Classes |
|---|---|
| Page / text | `bg-background` `text-foreground` `text-muted-foreground` |
| Surfaces | `bg-card` `text-card-foreground` `bg-popover` `bg-muted` `bg-accent` |
| Emphasis | `bg-primary` `text-primary-foreground` `bg-secondary` `text-secondary-foreground` |
| Risk | `bg-destructive` `text-destructive` `text-destructive-foreground` |
| Lines | `border-border` `border-input` `ring-ring` |
| Charts | `fill-chart-1` … `fill-chart-5` (and `text-`/`stroke-` forms) |

**Type scale** — a small fixed scale; do not invent sizes:

| Tier | Classes |
|---|---|
| Eyebrow | `text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground` |
| Metadata | `text-[11px] text-muted-foreground` |
| Caption | `text-[12px] leading-snug` |
| Body compact | `text-[13px] leading-snug text-foreground/80` |
| Body | `text-sm leading-relaxed` |
| Section title | `text-lg font-bold leading-tight` |

Weights: `font-medium` chips and actions, `font-semibold` eyebrows and table
headers, `font-bold` titles, `font-black` score numerals. Never `font-light`.

## Surface classes are exported constants — import them, don't retype them

Research surfaces nest in four levels. `SectionCard` **is** L1; never hand-roll a
section shell. The rest are exported class strings:

```jsx
const { elevatedBlockClass, nestedDetailClass, snapshotSubsectionClass } = window.PortalDS;
```

- `elevatedBlockClass` — L2, the summary / primary block inside a section.
- `nestedDetailClass` — L3, a nested detail or mini-card.
- `snapshotSubsectionClass` — L4, the quietest subsection wrapper.
- `elevatedMutedBlockClass` — an L2 that deliberately sits one step darker.

Landing and marketing pages use the *atmospheric* family instead — `PAGE_SHELL`,
`HERO_CARD`, `PANEL_CARD_SKY`, `PANEL_CARD_NEUTRAL`, `TABLE_CARD_SKY`,
`INNER_CARD`, `PAGE_BACKGROUND_ATMOSPHERIC`, `CHIP_BASE`. **Pick the family
before the token, and never mix the two on one page.**

Section tones are semantic, not decorative: `sky` industry and growth, `emerald`
business and healthy momentum, `amber` score, guidance and caution, `violet` key
variables and model inputs, `rose` risk-adjacent, `slate` neutral fallback.

## Score vocabularies — four of them, never interchangeable

Getting this wrong produces confidently wrong copy:

- **Quarterly sentiment** (`BANDS`, `bandForScore`) — Strongly Bullish → Strongly
  Bearish, cuts 8 / 7 / 6.5 / 4.5 / 3. Diverging teal ↔ red around a ~5.5 midpoint.
- **Forward outlook** (`GROWTH_BANDS`, `bandForGrowthScore`) — Exceptional → Weak,
  cuts 8.5 / 8 / 7.5 / 7 / 6.5.
- **Board read** (`classifyBoardRead`) — *configurations* like "Quality at a fair
  price", used only for the Read column. Never summarise a Read with band words.
- **Moat** — closed enums: call × tier × posture × barrier strength.

A 6.7 is *Mildly Bullish* on the quarterly scale and *Soft* on the growth scale.
Use `ScoreBandPill` / `ConcallScore` rather than writing the label yourself.

## Where the truth lives

- `_ds/<folder>/styles.css` and its `@import` closure — the real compiled classes.
- `guidelines/docs/portal-design-system.md` — the full visual system (surface
  families, decision trees, colour discipline, chip recipes). Read it before
  designing a new page type.
- `components/<group>/<Name>/<Name>.prompt.md` and `.d.ts` — per-component API.

## An idiomatic composition

```jsx
const { SectionCard, ScoreBandPill, Badge, elevatedBlockClass } = window.PortalDS;

<SectionCard
  id="concall-score"
  title="ConcallScore"
  tone="amber"
  headerDescription="The quarter's read, scored from the transcript and the deck."
  headerRankPills={[{ label: "Top 8%", tone: "emerald" }]}
>
  <div className={`${elevatedBlockClass} p-4`}>
    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      Q1 FY27
    </div>
    <div className="mt-1 flex items-baseline gap-3">
      <span className="text-3xl font-black tabular-nums">8.2</span>
      <ScoreBandPill score={8.2} />
      <Badge variant="secondary">Official transcript</Badge>
    </div>
    <p className="mt-2 text-[13px] leading-snug text-foreground/80">
      CDMO carried the quarter — nearly all of the YoY increment.
    </p>
  </div>
</SectionCard>
```

Note `headerRankPills` tones are their own closed set:
`emerald | sky | amber | rose | slate`.
