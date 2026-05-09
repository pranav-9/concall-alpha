# Growth outlook — reader intent

What an analyst should walk away with after reading this section, and what
the section must surface (or hide) to deliver it. Schema lives at
[`concallyser/schemas/growth_outlook.schema.json`](../../../concallyser/schemas/growth_outlook.schema.json);
this doc covers reader-side intent only.

This is the v1 reader-intent doc — newer than the schema, and not yet
re-validated against an updated framework spec. Use it as the analytical
target for screen design; treat it as authoritative until a `growth_outlook`
framework spec lands alongside the moat docs.

## What does the reader walk away believing?

> "Over the next 12–24 months, this company has \[N] concrete things going
> for it that should move revenue/margin, the most consequential is \[X],
> the base case suggests \[growth_pct] growth at \[confidence_pct]
> conviction, and the most likely thing that breaks the call is \[Y]."

Three loads in one read: (1) the **shape and concreteness of the growth
runway**, (2) the **base-case magnitude with calibrated confidence**, (3) the
**single biggest thing to watch**. A reader who can't reconstruct all three
from the section in 60 seconds means the section did not do its job.

The skim reader (10s) should leave with the score and the headline base-case
growth number. The investor reader (60s) should leave with the catalyst
ranking and the upside/downside bracket.

## Headline data point

`growth_score` — the deterministic 0–10 composite — is **the** prominence
artifact. It compresses six components into a single signal that tells the
reader whether to spend time on the section. If a reader misses the score,
the design failed.

Everything else (catalysts, scenarios, summary bullets) is supporting
elaboration of *why* the score is what it is.

Secondary headline: the base-case `growth_pct` and `confidence_pct`. These
should be visible without scrolling on desktop.

## Load-bearing supporting evidence

These must be visible to the investor reader (60s pass), even if they live
in collapsed regions for the skimmer:

1. **Top 3 catalysts** with `pill_revenue_impact`, `pill_margin_impact`,
   `pill_confidence`, `status_tag`, and `quantified.value+unit` where
   present. The catalyst's `priority.weighted_priority` is what justifies
   why this one is in the top 3 — if the same priority shows up across all
   three, the ranking signal collapses.
2. **Three scenarios** (base / upside / downside) with `growth_pct` and
   `confidence_pct`. The bracket must be visually distinct — three scenarios
   that read identically defeat the purpose of having scenarios.
3. **`risk_watch`** on each scenario. This is the single most decision-
   useful piece of text in the section: it's what would change the call.
   Burying it inside a scenario's collapsed details makes the section read
   uniformly bullish.
4. **`summary_bullets`** (≤3) as the elevator pitch. They should pre-state
   what the section will then evidence.

## What can be safely buried

- `fact_base[]` — the raw forward-looking facts feeding the LLM. Useful for
  audit, not for forming a view. Not surfaced on the section today; that's
  correct.
- `also_considered[]` — secondary catalysts behind a `Show details` /
  `Other catalysts` disclosure with a clear count. The label must indicate
  that this is *also-ran* content, not equal-rank content.
- `growth_score_components[]` — the per-component score breakdown.
  Drawer-eligible. Skimmer doesn't need it; investor opens it only when
  the headline score feels off.
- `discovery_summary.total_candidates_considered` and
  `selection_priority_stack` — methodology metadata. Footer-level or
  drawer-level only.
- Per-catalyst `timeline_evidence[]` — the evolution of each catalyst
  across quarters. Drawer-eligible (catalyst tracker pattern). Skimmer
  doesn't need it; investor uses it to validate the maturity claim.
- `priority` sub-scores other than `weighted_priority` — the four input
  scores (impact, certainty, time relevance, progression depth) are
  decomposition; the weighted score is the conclusion. Bury the inputs.

## Failure modes (how this section misleads)

1. **Uniform bullishness.** All three scenarios show similar growth_pct or
   identical confidence; risk_watch is absent or generic across scenarios;
   downside reads as "slightly less upside." A reader walks away thinking
   the company is monotonically de-risked. Reality: scenarios are designed
   to bracket — if they don't, the analyst hedged or the data is sparse,
   and that should be visible.
2. **Score without scenario calibration.** Growth score is high but the
   scenarios bracket is wide and confidence is low. The score reads as
   conviction; the scenarios say there isn't conviction. The section must
   not let the score dominate without the scenario hedge being visible.
3. **Top-3 catalysts indistinguishable.** All three carry the same status
   tag, same impact pill, same confidence pill. The "top 3" signal becomes
   noise — there's no internal ranking the reader can detect. A reader
   forming a view about the dominant catalyst can't.
4. **Catalyst quantification without timing.** A catalyst shows `₹500 Cr`
   revenue impact but `timing` is empty or vague ("medium term"). The
   reader anchors on the number without learning when. Both must travel
   together.
5. **`risk_watch` hidden in disclosure.** Buried inside scenario
   `<details>` (which is a defensible default for the prose body), and
   *the disclosure label is `Show details`*. A reader scanning for risks
   sees no risk content above the fold. Risk_watch deserves above-fold
   prominence on the base scenario at minimum.
6. **`also_considered` rendered as equal-rank.** When the secondary catalysts
   render at the same visual weight as the top 3 (same chip, same
   typography), the "top 3" filter loses its meaning.
7. **Status tags treated as decorative.** `status_tag` (announced /
   confirmed / in_delivery / ramping / achieved) carries the maturity
   signal. If all three top catalysts read `confirmed` because that's the
   default, the maturity discrimination collapses. The agent should flag
   when status diversity across the top 3 is suspiciously uniform.
8. **Score component drawer mis-labelled.** A label like `View details`
   or `More` doesn't tell the reader the drawer breaks the score apart.
   `View score breakdown` (current) is correct; degradations of that
   label are a reader regression.

## Skimmer vs investor split

| Element                    | Skimmer (10s)      | Investor (60s)        |
|---|---|---|
| Growth score               | Above-fold, large  | Above-fold + drawer for components |
| Base growth_pct + confidence | Above-fold        | Above-fold                          |
| Summary bullets            | Visible            | Visible                              |
| Top 3 catalysts            | Visible (titles + dominant chip) | Visible (full pills + quantification) |
| Catalyst timeline drawer   | Hidden (icon only) | Available, signposted by an icon with badge count |
| Scenarios (3)              | Base visible; upside/downside chip-only or compact | All three visible with risk_watch |
| Also-considered            | Drawer (closed)    | Drawer with count                    |
| Score components           | Drawer (closed)    | Drawer with breakdown                |
| Fact base                  | Hidden             | Hidden (not surfaced)                |

## Linking back

- [`concallyser/schemas/growth_outlook.schema.json`](../../../concallyser/schemas/growth_outlook.schema.json)
  — storage shape; field semantics; bracket sizes.
- [`concallyser/app/phase5_growth/growth_outlook.py`](../../../concallyser/app/phase5_growth/growth_outlook.py)
  — extraction code; the LLM-returned fields vs Python-filled fields.
- Consumer-side rendering rules (drawer-vs-details, surface hierarchy,
  chip discipline) — [`skills/concall-alpha-ui-patterns/SKILL.md`](../../skills/concall-alpha-ui-patterns/SKILL.md).
- Project gotchas (collapse defaults, etc.) — [`concall-alpha/CLAUDE.md`](../../CLAUDE.md).
