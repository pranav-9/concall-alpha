# Guidance lineage — reader intent

What an analyst should walk away with after reading this section, and what
the section must surface (or hide) to deliver it. Schema lives at
[`schemas/guidance_lineage_v1.json`](../../../schemas/guidance_lineage_v1.json);
producers are the Phase 8 lineage builder
([`concallyser/app/phase8_guidance_lineage/builder.py`](../../../concallyser/app/phase8_guidance_lineage/builder.py))
and the Phase 10 per-company snapshot
([`concallyser/app/phase10_guidance_snapshot/runner.py`](../../../concallyser/app/phase10_guidance_snapshot/runner.py)).
This doc covers reader-side intent only.

The section in `concall-alpha` is rendered as **`guidance-history-section.tsx`**
(a thread-style trail per commitment, by deliberate design — see
`concall-alpha/CLAUDE.md` "project gotchas"). Don't reintroduce comparison
cards.

## What does the reader walk away believing?

> "Of \[N] tracked commitments, management has delivered \[X] on time,
> \[Y] late (avg slip \[Z] quarters), \[A] are still pending past their
> stated target, \[B] were withdrawn, and \[C] are pending in the current
> window. The pattern of slippage is concentrated in \[category], and the
> single most consequential overdue commitment is \[label]."

The section's whole job is **execution credibility**. Not "what did
management say" (Phase 6 narrative does that), and not "what's the moat"
(moat section does that). It's: *do they deliver on what they commit to,
and where do they slip?*

The skim reader (10s) should leave with the delivery-rate gestalt and a
sense of slippage direction. The investor reader (60s) should leave with
the named overdue commitment(s) and the typical slippage magnitude.

## Headline data point

The **status distribution across commitments** is the prominence artifact
of this section. There is no single number — it's the proportion of
delivered_on_time vs delivered_late vs still_pending_past_target vs
withdrawn vs pending_in_window vs no_target_date vs ongoing.

If a reader cannot tell, in their first scan, whether this is a
"mostly-delivered" or "mostly-slipping" company, the section failed.

The secondary headline is **`slippage_quarters`** for the late commitments.
A company that delivers everything but two quarters late is a different
animal from one that delivers everything one quarter late, and the section
must transmit that difference.

## Load-bearing supporting evidence

These must be visible to the investor reader (60s pass), even when the
trail's per-commitment internals are collapsed:

1. **Per-commitment `current_status.label`** rendered as a status chip
   adjacent to the commitment label. The label is non-negotiable; without
   it the trail is just history without a verdict.
2. **`current_status.slippage_quarters`** when nonzero. Three quarters'
   slippage and "delivered" both render as "delivered_late" — the
   magnitude has to travel with the verdict.
3. **`first_announced.quarter`** and the **most-recent-revision quarter**.
   This is the trail span. It bounds how long management has been
   reaffirming, revising, or going quiet on the commitment.
4. **`current_status.target_quarter`** (when set) and **`delivery_quarter`**
   (when set). The delta between them is what slippage measures, and the
   reader should be able to verify the slippage by reading both fields.
5. **`current_status.rationale`** — the producer's one-sentence rationale
   citing specific quarters. If a reader doubts a status, this is the
   evidence. Investor pass should be able to see this; skimmer can do
   without.
6. **At least one revision's `verbatim_excerpt`** in the displayed trail.
   The whole point of the lineage artifact is that revisions are
   quotable. A trail that elides the management quotes is just a status
   table — it loses the human texture that makes the section trustworthy.

## What can be safely buried

- `raw_matches.{typed_claim_ids,statement_ids}` — Layer-1 reference IDs.
  Audit-trail only. Never surfaced on screen.
- `extraction_run_ids` and `patterns_file` — pipeline metadata. Not for
  readers.
- `compressed_text` (when `verbatim_excerpt` is present) — pick one to
  display per revision; keep the verbatim. Compressed is fallback.
- Pre-`min_quarter` raw mentions filtered out by patterns — invisible to
  the reader by design.
- Full revision chain for commitments with 8+ revisions — collapse beyond
  the 3–4 most recent, with a clear "show full chain" disclosure. The
  first_announced + delivery_quarter + last 2–3 revisions is enough for
  shape; the rest is depth.
- `human_reviewed` flag — internal QA signal. Surface only when `false`
  and the rendered status is high-stakes (e.g., a `delivered_on_time`
  that hasn't been confirmed by a human).

## Failure modes (how this section misleads)

1. **Status chips read as uniformly green.** If `delivered_on_time`,
   `pending_in_window`, `no_target_date`, and `ongoing` all render in the
   same positive tone, a reader scanning the chip column reads
   "everything is fine." `pending_in_window` and `no_target_date` are
   *neutral* — they should not borrow `delivered_on_time`'s color
   discipline. `still_pending_past_target` and `delivered_late` are the
   warning states; they must be visually distinct.
2. **Slippage hidden behind verdict.** A `delivered_late` status with
   `slippage_quarters: 3` rendered without the "+3 quarters" magnitude
   compresses three different companies (slip 1 / slip 3 / slip 6) into
   one cell. Magnitude must travel with the verdict.
3. **Categorical dilution of execution signal.** Partnerships, ongoing
   margin targets, and capex frames carry status `no_target_date` or
   `ongoing` — they're not failures. But mixing them into the same
   delivery-rate denominator as time-bound commitments dilutes the
   execution signal. Either the section separates time-bound vs
   categorical commitments visually, or the headline distribution must
   exclude categorical statuses from "delivery rate" framing.
4. **Trail without status surfacing on the trail head.** Thread-style
   trails are correct (per CLAUDE.md), but the trail head must lead with
   the status verdict. A trail that opens with "Q1FY24: announced..."
   without `current_status.label` adjacent makes the reader scroll to the
   bottom for the verdict. Verdict should be at the top of the trail,
   evidence chronologically below.
5. **Withdrawn vs delivered visually similar.** `withdrawn` is a
   credibility hit and must read distinctly from any "delivered" state.
   A withdrawn commitment with a calm chip looks like a closed-out
   commitment. It isn't.
6. **Reader can't see how long management has been talking.** If the
   trail span (`first_announced.quarter` → most-recent revision) isn't
   surfaced, a 6-quarter still-pending-past-target reads the same as a
   2-quarter slip. Six quarters of reaffirmation without delivery is the
   most damning execution signal in the dataset; it has to be visible.
7. **Verbatim excerpts cropped to opacity.** A 600-char `verbatim_excerpt`
   truncated to 60 chars with no expand affordance becomes
   "Anish Ganatra: We expect commissioning to..." — not quotable, not
   useful. The expand affordance must exist and be findable.
8. **Confidence flag ignored.** `current_status.confidence: low` is the
   producer's hedge. If the section renders low-confidence statuses with
   the same authority as high-confidence ones, the reader takes a
   speculative classification at face value.

## Skimmer vs investor split

| Element                                   | Skimmer (10s) | Investor (60s) |
|---|---|---|
| Status distribution (overall)             | Above-fold; chips with counts or a small bar | Above-fold; chips with counts |
| Per-commitment status chip                | Visible at trail head | Visible at trail head |
| Per-commitment slippage magnitude         | Visible alongside late/pending statuses | Visible alongside late/pending statuses |
| Commitment label                          | Visible | Visible |
| Trail span (first announced → most recent)| Visible (single line) | Visible |
| Latest 1–2 revisions of the trail         | Hidden (drawer/disclosure) | Visible inline |
| Full revision chain                       | Hidden | Drawer or "show full chain" disclosure |
| Verbatim excerpts                         | Hidden / 1-line preview | Visible inline (expandable) |
| `current_status.rationale`                | Hidden | Visible (often as tooltip or short subtext) |
| `confidence: low` warning                 | Visible (small flag) | Visible (with explanation) |
| `human_reviewed: false` (high-stakes only)| Hidden | Visible |
| Layer-1 reference IDs                     | Hidden | Hidden |

## Linking back

- [`schemas/guidance_lineage_v1.json`](../../../schemas/guidance_lineage_v1.json)
  — storage shape; status enum; slippage semantics.
- [`concallyser/app/phase8_guidance_lineage/`](../../../concallyser/app/phase8_guidance_lineage/)
  — Phase 8 producer: lineage rows from Layer 1 via the YAML pattern curator + LLM synthesis.
- [`concallyser/app/phase10_guidance_snapshot/`](../../../concallyser/app/phase10_guidance_snapshot/)
  — Phase 10 producer: one-row-per-company `guidance_snapshot` synthesis.
- Consumer-side rendering rules (thread-style trail discipline, drawer-vs-details,
  chip tone discipline) — [`skills/concall-alpha-ui-patterns/SKILL.md`](../../skills/concall-alpha-ui-patterns/SKILL.md).
- "Guidance History uses thread-style trails" gotcha — [`concall-alpha/CLAUDE.md`](../../CLAUDE.md).
