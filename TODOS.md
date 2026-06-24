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
- **Non-core weight bars** are only subtly dimmer than core in dark mode (the ● dot carries the distinction). Consider dimming non-core further or a clearer encoding.
- **Bands grid still hand-copied.** The quarterly "Score bands" array in `app/how-scores-work/page.tsx` duplicates `lib/score-band.ts`. Import `BANDS` + `SCORE_BAND_ORDER` to kill drift, and optionally colour the band labels with each band's `textClass`. (The worked-example score+label already derive live via `bandForScore`.)
- **Illustrative leans.** The worked example uses hardcoded leans (→ 7.1), not a real DB `score_breakdown`. Could wire a representative real quarter.

## Trajectory labels — deferred follow-ups (eng review 2026-06-12)

### 1. Sparkline inside the Trend cell/tooltip (v2 of trajectory labels)
- **What:** Replace the Trend tooltip's text score-path with an inline sparkline (reuse `app/company/components/kpi-sparkline.tsx` / `kpi-sparkline-lazy.tsx`) in the cell or a hover card.
- **Why:** Makes the label's reasoning visual at a glance — strongest form of the articulated-take principle.
- **Pros:** Component already shipped for Key Variables; pure reuse. **Cons:** Hover cards on touch are fiddly; render cost on a 128-row table; v1 text path already carries the reasoning.
- **Context:** v1 ships label + Δ + title-tooltip with path text ("Climbed +3.2 over 4 qtrs: 5.0 → 7.1 → 7.7 → 8.2"). Sparkline was explicitly cut from v1 during eng review to keep the diff small and prove label value first. Start at `app/company/leaderboard-table.tsx` Trend cell.
- **Depends on:** v1 shipped; behavioral-analytics evidence that readers hover/want the path.

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
