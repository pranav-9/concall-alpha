# TODOS — concall-alpha

Captured with context so a future session can pick any item up cold. Source review noted per item.

## How Scores Work page — diagram pass follow-ups (2026-06-24)

### 1. Growth Score tab — same diagrammatic treatment
- **What:** Replace the Growth Score tab's prose card-soup with diagrams, mirroring the quarterly pass: weight bars for the six components + a worked example.
- **Why:** The quarterly tab now shows its model visually (`app/how-scores-work/quarterly-model.tsx`); the Growth tab still only describes it — inconsistent, and Growth is the vaguer half.
- **Different shape — do not copy the quarterly diagram:** Growth is a weighted AVERAGE of 0-10 sub-scores with dynamic renormalization (missing components renormalize), NOT signed ±2 leans off a 5.5 baseline with a cap. So the diverging-bar metaphor doesn't transfer. Use a 0-10 "sub-score × weight" track (each component's 0-10 sub-score as a marker, weight as bar thickness, final = weighted mean on the same 0-10 axis). Weights (real): catalyst 30 / scenario 25 / guidance 15 / execution 15 / sentiment 10 / industry 5. No baseline, no cap.
- **Source of truth:** `concallyser/app/phase5_growth/growth_outlook.py` `_compute_growth_score` (~lines 657-811).
- **Depends on:** nothing.

### 2. Quarterly diagram polish (deferred)
- **Illustrative leans.** The worked example uses hardcoded leans (→ 7.1), not a real DB `score_breakdown`. Could wire a representative real quarter.
- **Non-core weight bars** are only subtly dimmer than core in dark mode (the model tiles now carry the core/context distinction, so this is low priority).

(Done in the 2026-06-24 layout pass: two-column model+weights, worked-example beside its explanation, bands-as-colour-legend now rendered from `lib/score-band.ts` (`BANDS` + `SCORE_BAND_ORDER`, drift killed), distribution redrawn as a band-coloured density curve, hero metric card removed, default tab → Quarterly, pictorial icon-tile category model.)

## Trajectory labels — deferred follow-ups (eng review 2026-06-12)

### 1. Sparkline inside the Trend cell/tooltip (v2 of trajectory labels) — PARTLY DONE (2026-06-25)
- **Done:** the inline sparkline now exists. `app/company/components/trend-badge.tsx` (the shared Trend cell) renders an inline `kpi-sparkline` when passed a `scorePath`, and it **ships on the watchlist** (`app/watchlists/watchlist-table.tsx`). `lib/score-path.ts` builds the path.
- **Residual:** the **leaderboard** still passes no `scorePath` (text-only Trend cell) — the original render-cost concern on a 128-row table. Decide whether to enable it there, or keep the sparkline as a watchlist-only signal (smaller table, more decision-focused surface).
- **Depends on:** behavioral-analytics evidence that leaderboard readers want the path inline (watchlist already has it).

### 2. Label-transition alerts ("TIMETECHNO started Cracking")
- **What:** Surface trajectory-label transitions (especially →Cracking, →Climbing) in the homepage activity feed when a new quarter lands.
- **Why:** A label is most valuable the day it changes — this is the real-time trigger the Neuland returns analysis identified as the path to a defensible forward-returns claim (prospective transition dates, not hindsight windows).
- **Pros:** Turns a static column into an event stream; integrates with the existing activity-feed surface; creates the prospective dataset for the returns study. **Cons:** Needs transition persistence — real plumbing.
- **Context:** v1 labels are stateless read-time derivation; nothing remembers yesterday's label. Two designs: derive prior-label from score history minus the newest quarter (stateless), or persist label snapshots (stateful, explicit). Integration points: `lib/supabase/homepage_activity_feed.sql`, `lib/homepage-activity-feed.ts`.
- **Depends on:** v1 shipped and vocabulary stabilized; ideally TODO 3 (threshold re-validation) first, so transitions aren't tuning artifacts.

### 3. Re-validate thresholds + revisit gap-awareness after the re-score backlog lands
- **What:** When the ~470-row legacy re-score backlog lands (3× more labelable history), re-run the label-distribution analysis treating the new data as a holdout set for the 11 hand-tuned constants in `lib/score-trajectory.ts`, and revisit the D2 decision (gap guard vs full fy/qtr-distance gap-awareness).
- **Why:** Outside-voice review correctly flagged that thresholds fit on 45 companies have no holdout — the backlog is the holdout, arriving for free.
- **Pros:** Converts the overfitting critique into a scheduled validation with a concrete trigger; pinned fixtures surface drift as test failures. **Cons:** none material (~1 analysis session).
- **Context:** Thresholds live in one constants block in `lib/score-trajectory.ts`; real-path fixtures in `tests/score-trajectory.test.ts`. Re-run the distribution script pattern from the 2026-06-12 feasibility analysis (memory: `project_trend_label_taxonomy_analysis`). Expect SAILIFE/NEULANDLAB-class boundary cases in new shapes.
- **Depends on:** Re-score backlog execution (separate workstream; memory: `project_legacy_score_hiding`).
