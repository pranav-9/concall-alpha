# TODOS — concall-alpha

Captured with context so a future session can pick any item up cold. Source review noted per item.

## Marketing-readiness plumbing — deferred follow-ups (2026-07-17)

(Shipped that day: first-touch attribution fix + Acquisition report section, sitemap/robots/metadataBase/company-page metadata, `[beta]` dropped. Domain decision: storyofastock.in. See memory `project_marketing_readiness_plumbing`.)

### 1. Per-company OG share cards
- **What:** `app/company/[code]/opengraph-image.tsx` rendering company name, sector, and the score trail, so links shared into WhatsApp/X/Telegram look like evidence instead of the generic brand card.
- **Why:** WhatsApp/Telegram groups are the likely forward-channel for Indian retail investors; the shared-link preview is the pitch. The site-wide card (`app/opengraph-image.tsx`) already has the reusable brand-mark constants (`components/brand/logo`); data via `getCachedCompanyPageOverview` + `lib/score-path.ts`.
- **Depends on:** nothing. Deliberately deferred from the 2026-07-17 pass.

### 2. Email capture (owned channel)
- **What:** Small Supabase table + anon-insert API route + signup component on Journal/homepage. Copy the `user_requests` pattern (`lib/supabase/user_requests.sql` + `app/api/user-requests/route.ts`): RLS insert-only policy, server client, manual SQL apply.
- **Why:** ValuePickr ban proved platform risk first-hand; email is the un-bannable channel, and the quarterly earnings calendar gives a natural send cadence ("what changed across your names this season"). Also the retention lever for the 88%-one-day-visitor problem.
- **Depends on:** nothing code-wise; product call on placement.

### 3. Domain + Search Console ops (user actions)
- **What:** Register storyofastock.in (external registrar — Vercel can't sell .in; storyofastock.com is taken), connect in Vercel → Settings → Domains, set `NEXT_PUBLIC_SITE_URL=https://storyofastock.in` in Vercel env, redeploy, submit sitemap in Google Search Console + Bing Webmaster Tools.
- **Why:** Everything code-side already hangs off `NEXT_PUBLIC_SITE_URL` (`lib/site-url.ts`); until set, canonicals/sitemap point at the production vercel.app URL and earned SEO accrues to the wrong domain.
- **Depends on:** deploy of the 2026-07-17 pass.

### 4. Re-pull acquisition data after the first channel test
- **What:** After the Neuland X-thread (links tagged `utm_source=twitter&utm_campaign=neuland`) has run for a week-plus, download the admin report and compare channels on *return visits*, not raw arrivals.
- **Why:** The question that decides where marketing effort goes is "which channel sends people who come back" — the hypotheses doc's H2 gate. April-2026's 3x traffic spike was unattributable under the old self-referrer bug; this is the first test the fixed pipeline can actually measure.
- **Depends on:** deploy + the thread being posted (user action).

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
