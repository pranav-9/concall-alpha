---
name: concall-alpha-ui-patterns
description: Use when changing or reviewing the concall-alpha Next.js portal UI, especially company-page sections, moat/growth/business/key-variable blocks, collapsed details, drawers, table summaries, or evidence-disclosure behavior. Apply the app's existing section hierarchy, surface tokens, drawer-vs-details decision rules, and review checklist before making UI changes.
---

# Concall Alpha UI Patterns

## Quick Start

First inspect the nearby component and at least one sibling section before editing. Reuse local patterns from `app/company/components/` and shared UI primitives from `components/ui/`.

Use `rg` to find prior implementations:

```bash
rg -n "details|Drawer|SectionCard|nestedDetailClass|elevatedBlockClass|Show details|Hide details" app/company/components components/ui -S
```

## Section Hierarchy

Company-page analysis sections follow this hierarchy:

- Page-level shell: `SectionCard` for major sections.
- L2 summary blocks: `elevatedBlockClass`.
- L3 nested evidence blocks: `nestedDetailClass`.
- Supporting low-priority details: inline `<details>` disclosure, collapsed by default.
- Separate drilldowns or workflows: right-side `Drawer`.

Prefer existing tokens from `app/company/components/surface-tokens.ts` over new card styles.

## Drawer vs Details

Use inline `<details>` when the content is supporting evidence inside the same analytical flow:

- extra bullets
- source notes
- audit metadata
- evidence limitations
- upgrade/downgrade triggers
- compact "also considered" lists

Use a right-side `Drawer` when the content is a richer drilldown or separate workflow:

- long context explanations
- score breakdowns
- source-document trails
- discovery summaries
- catalyst trackers
- version history or audit logs

Do not use a drawer just to hide two or three short blocks. It adds interaction weight and removes page context.

## Disclosure Copy

Avoid vague disclosure labels when the hidden content has a clear purpose.

Prefer:

- `More evidence`
- `Show details`
- `Hide details`
- `Change triggers and limits of evidence`
- `Other catalysts`

Avoid using downside-only labels for neutral or mixed content. For moat analysis, `what_would_change_the_call` can contain both upgrade and downgrade triggers, so label it `What would change the call`, not `Watch for`.

## Moat Section Rules

The moat section is plain-language and verdict-first. A first-time reader should
get the answer from the top of the section without knowing framework vocabulary.
Do not surface the raw framework enums (`WIDE/NARROW MOAT`, `STRONG/MID/WEAK`,
`posture`, `tier_anchor_phrase`, `barrier_strength`, source-type names like
"Switching Costs") as the primary reader-facing copy. Translate them via the
static plain-language maps in `moat-analysis-section.tsx`
(`edgePhrase`, `advantageLabel`, `advantageMeaning`, `durabilityRead`).

Default (always-visible) display, in order:

- Verdict header — plain edge phrase (from `rating`×`tier`), a plain sentence,
  and the "How strong" Weak/Moderate/Strong meter (from `tier`).
- Advantages table — all four sources, applies-first, ruled-out greyed with the
  real `does_not_apply_reason`.
- "Will the edge last?" — a `Likely/Mixed/Unlikely` read derived from
  `cycle_tested` + `gatekeeper.barrier_strength`, with the two real prose cards
  (`step_0.headline`, `gatekeeper.rationale`).

Put everything else in ONE collapsed "Full analysis" `<details>` (discoverable by
label): per-source `presence`/`durability` bullets, `why_this_tier`,
`what_would_change_the_call`, credible attackers, `data_limitations`, generated
date. Do not surface schema/version metadata to the reader.

Do NOT invent data the payload does not carry:

- No moat **trajectory** ("widening" / "was weaker") — the table stores one
  overwritten row per company, so there is no history. (Deferred to a future
  moat-history capture.)
- No per-source **strength** rating (●●○ dots) or company-specific per-source
  one-liner — the v15 schema has no per-source strength, and `presence[]` is
  dense analyst prose. Both are pipeline-provided in a later schema bump; until
  then the advantages table shows the generic `advantageMeaning` template and
  omits the strength column.

Validate that the frontend schema does not accept payloads the pipeline would reject. In particular, source rendering assumes:

- `applies=true`: `presence` and `durability` are non-empty arrays; `does_not_apply_reason` is null.
- `applies=false`: `presence` and `durability` are null; `does_not_apply_reason` is populated.

## Review Checklist

Before finalizing a UI change:

- Check at least one sibling section for the established pattern.
- Confirm hidden content is still discoverable from a specific label.
- Confirm text does not imply a stronger analyst conclusion than the data supports.
- Confirm mobile layout has no overflowing chips, buttons, or narrow table labels.
- Confirm empty, deprecated, and missing-data states still render intentionally.
- Run the narrowest practical verification: typecheck, lint, build, or a targeted browser check depending on change size.

## Common File Map

- `app/company/components/section-card.tsx`: major section wrapper and page-level collapsible behavior.
- `app/company/components/surface-tokens.ts`: shared surface classes.
- `app/company/components/business-snapshot-section.tsx`: compact inline details and drawer examples.
- `app/company/components/future-growth-section.tsx`: details blocks plus richer drawers.
- `app/company/components/moat-analysis-section.tsx`: moat-specific renderer.
- `lib/moat-analysis/types.ts`: frontend v15 moat payload validation.
- `components/ui/drawer.tsx`: drawer primitive.
