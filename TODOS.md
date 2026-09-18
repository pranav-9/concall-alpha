# TODOS — concall-alpha

Captured with context so a future session can pick any item up cold. Source review noted per item.

## Business profile batch 2 (Aeroflex/Vinyas/Astra Microwave) — deferred review findings (2026-09-18)

From the /ship review of `data/business-profile-batch2` (testing + maintainability specialists + red team + Claude/Codex adversarial, Codex ran with web search). Load-bearing items were fixed in that PR (schema-regression test for the draft JSON files, `about_sources` routed through `profileSourceSchema` before rendering, published badge/date derived from each draft's own `review_status`/`prepared_on` instead of a hand-maintained allowlist + hardcoded date). The "no CI enforcement of `npm test`" finding (package.json:9) re-surfaced but is already tracked below under Featured Reads latest-three — not duplicated here.

- [ ] **`profileSourceSchema.url` has no length bound** (XS, P4) — unlike every sibling field in the same schema (`label` 160, `locator` 80, `title`/`detail`/`text`/`period` all capped), `url` in `lib/business-snapshot/profile.ts:8` is an unbounded regex. Pre-existing, not introduced by this diff — surfaced because this diff is the first to push real citation content through it at volume. Not an active ReDoS shape and nothing validates it on a request path today, so low urgency; cap it (e.g. `.max(500)`) next time this file is touched.
- [ ] **Preview badge misreads the two original pilots as unpublished** (XS, P3) — found during `/document-release`, not the original review. `isPublished = draft.review_status === "user_approved"` (`app/dev/business-snapshot/page.tsx:21`) derives the "reviewed pilot" / "review draft" badge from each draft file's own `review_status`. `NEULANDLAB.json` and `CARTRADE.json` intentionally retain their pre-approval `review_status: "draft"` for audit (`data/business-profile-drafts/README.md`), so `/dev/business-snapshot?company=NEULANDLAB` (and `CARTRADE`) now renders "review draft · Prepared for review · not published" even though both are live-published pilots. The batch-2 files carry `review_status: "user_approved"` and render correctly — this is specifically a regression for the two pre-existing files against the new derivation logic. Needs a product call, not a mechanical fix: either stamp the two pilot mirrors with a status distinct from the audit-preserved original (breaks "preserve the exact reviewed draft envelope"), or derive `isPublished` from something other than the audit field (e.g. a separate `currently_live` flag). Dev-only route, no production impact.

## Featured Reads latest-three — deferred review findings (2026-09-13)

From the /ship review of `feat/featured-reads-latest-three` (testing + maintainability specialists + Claude/Codex adversarial). Load-bearing items were fixed in that PR (unique `id` tie-breaker, future-dated rows hidden at the fetch, fetch order and comparator driven from one `SELECTION_ORDER`, index reordered to match the query, vacuous clock/mutation tests made falsifiable, stale rotation docs corrected); these were judged not worth the churn now.

- [ ] **Producer copies a hand-typed `published_at` unchecked** (S, P2) — `promote_desk_featured_read.py` copies the card's `published_at` straight into the row, and `jsonschema.Draft7Validator(schema)` runs with no format checker, so `2099-01-01T00:00:00Z`, an IST time with no offset, and `not-a-date` all validate. Recency now decides every slot, so the portal hides future rows at the fetch (`.lte("published_at", now)` in `lib/desk-featured/data.ts`) — that turns a bad row into "invisible until its time" instead of "pins the strip", but the real fix is producer-side: stamp `now()` at promote unless the card carries an offset-bearing past time, and pass `format_checker=Draft7Validator.FORMAT_CHECKER`. Start at: `concallyser/scripts/promote_desk_featured_read.py` (outside this repo).
- [ ] **No `npm test` in CI** (S, P2) — `.github/workflows/` holds only `refresh-overview-cache.yml`, so the `SELECTION_ORDER` ↔ comparator contract and every other invariant in `tests/` are guarded only when someone runs the suite locally. Add a PR workflow running `npm test` on Node 24.
- [ ] **One company or one batch can fill all three slots** (S, P3) — pure recency has no per-company dedupe; a directory promote or a company with several section upgrades can take every card (the old rotation spread these out). Product call: keep only the freshest row per `company_code` before slicing. Start at: `selectFeaturedReads` in `lib/desk-featured/select.ts`.
- [ ] **Featured Reads archive** (M, P3) — cards now leave the strip after ~1–3 days, the tradeoff accepted when the rotation was dropped. An "All featured reads" index keeps high-effort deep-tracks reachable. Start at: a `/desk/featured` route reading `desk_featured_read` without the limit, linked from the strip header.
- [ ] **A 1–2 card strip leaves an empty column and the skeleton jumps** (XS, P3) — pre-existing: with no secondaries the hero keeps its `1.6fr` column at `lg`, and `DeskFeaturedReadsFallback` always draws hero + 2. Give the hero `lg:col-span-2` when there are no secondaries. Start at: the grid in `app/desk/desk-featured-reads.tsx`.
- [ ] **Comparator is hand-written beside `SELECTION_ORDER`** (XS, P4) — a test pins them together, so drift is caught, not impossible; building the comparator from `SELECTION_ORDER` would remove the duplicate. Related and theoretical: `Date.parse` truncates to milliseconds while Postgres orders at microseconds, so two cards inside one millisecond could order differently in SQL and JS before weight/id decide.
- [ ] **Partial index for eligible, above-threshold rows** (XS, P4) — a flood of fresh `eligible` rows below weight 40 would make the fetch scan past them. The table is ~10 rows, so only worth it if it grows: `where status = 'eligible' and feature_weight >= 40`. Start at: `lib/supabase/desk_featured_read.sql`.

## Phone views (Filings / Themes / Ranking / Sectors) — deferred review findings (2026-09-13)

From the /ship review of `feat/mobile-views` (5 specialists + red team + Claude/Codex adversarial + Codex structured). Load-bearing items were fixed in that PR (raw `attachment_url` href → `safeFilingHref` at the loader, trailing-slash chrome gate, real QoQ delta, Δ a11y states, 44px chips, list semantics, shared theme rank rule, lazy phone boards); these were judged not worth the churn now.

- [ ] **`leaderboard_row_click` fires for quarter/growth/moat from the phone paint only** (S, P3) — the desktop tables (`app/company/leaderboard-table.tsx`, `app/leaderboards/growth-table.tsx`, `app/leaderboards/moat-table.tsx`) never emitted it; only the Overall board does. A PostHog breakdown by `board` on those three reads as phone traffic until the desktop tables emit the same event (or a `paint` property separates them). Start at: `rowClick` in `app/leaderboards/phone-boards.tsx`.
- [ ] **Two `<h1>`s in the server HTML on the four dual-tree routes** (XS, P4) — `MobileMasthead` + the desktop header both render until matchMedia unmounts one; `display:none` keeps the loser out of the a11y tree once CSS lands, so it only bites no-JS/reader-mode clients and crawlers that don't render. Fix if it shows up in Search Console: demote the phone title to `role="heading"` or emit the desktop h1 only. Start at: `components/mobile-card.tsx` `MobileMasthead`.
- [ ] **Theme phone row: name + up to three tags share ~130px** (XS, P4) — `best` + `below cut` + `unofficial` can leave the truncated name a few characters. Let tags wrap under the name if a real theme ever carries two tags on one member. Start at: `MemberRow` in `app/themes/theme-block-phone.tsx`.
- [ ] **Sector sort chips are direction toggles wearing `aria-current`** (XS, P4) — tapping the highlighted chip flips asc/desc (same as the desktop header links); the `↓`/`↑` glyph is the only cue. Consider `aria-pressed` + a visible "tap again to flip" hint if replay shows confusion. Start at: the phone `nav[aria-label="Sort sectors"]` in `app/sectors/page.tsx`.
- [ ] **`new` badge on the phone Overall board has no desktop counterpart** (XS, P4) — the handoff drew it; `components/score-board-table.tsx` never carried newness. Either add `isNew` to `buildScoreBoardRows` and the desktop board, or drop the phone badge, so both paints agree. Start at: `PhoneOverallBoard` `newCodes`.

## Telegram community — deferred review findings (2026-09-13)

From the /ship review of `feat/telegram-community` (5 specialists + Claude/Codex adversarial + Codex structured). Load-bearing items were fixed in that PR (off-site href guard, send/ledger lock, env parser); these were judged not worth the churn now.

- [x] **Footer column headed "Learn" → "Connect"** — DONE 2026-09-13 in the Telegram visibility push (`feat/telegram-visibility`, `components/site-footer.tsx`).
- [ ] **Journal card caption is `text-sm` while the post body is `text-[15px]`** (XS, P4) — one-step-smaller seam at the end of every post; intentional demotion for now. Start at: `components/telegram-join-card.tsx`.
- [ ] **`section_href` has no pattern in the shared schema** (S, P3) — `/schemas/desk_featured_read_v1.json` only sets `minLength`; the drafter now rejects off-site hrefs at read time, but the producer side should refuse to write them. Add `"pattern": "^/company/[A-Z0-9_&-]+(#[a-z0-9-]+)?$"` and mirror it in `lib/desk-featured/types.ts` + `concallyser/scripts/promote_desk_featured_read.py`. Root `schemas/` lives outside this repo.
- [ ] **No browser-level test for the join surfaces** (S, P3) — footer, Journal index line, and post card are unit-untestable here (no component harness); coverage audit put user flows at 0/14. If a Playwright smoke suite ever lands, first cases: env unset → nothing renders; env set → three links with `community_join_click` surfaces `footer` / `journal_index` / `journal_post`.
- [ ] **Sender still has a send→append gap** (XS, P4) — the lock stops concurrent runs, and an ambiguous reply exits 2 with a "may have landed" note, but a crash between a delivered send and the append still needs a manual `--log-only`. A `status: "sending"` reservation row would close it; deferred because the ledger is append-only and a stale reservation needs its own cleanup rule. Start at: `scripts/telegram-send.mjs`.

## Guidance "what to watch" — deferred review findings (2026-09-08)

From the /ship review of `feat/guidance-what-to-watch` (5 specialists + red team + Claude/Codex adversarial). Everything load-bearing was fixed in that PR; these were judged not worth the churn.

- [ ] **`liveStateKey`'s `pushed_out` branch is unreachable** (XS, P4) — `classifyGuidanceItem` grades `statusKey: "delayed"` as RESOLVED unconditionally (deliberate, 2026-09-06: a moved goalpost is itself the broken promise), so no live row ever carries `state: "delayed"`. That makes `LIVE_META.pushed_out` ("Pushed out") and `liveNote`'s "pushed out" clause dead. Left in place because the `Record<LiveStateKey, …>` type requires the entry and the state is legal in the type. Delete both only if `LiveState` itself is ever narrowed. Start at: `lib/guidance-tracking/verdict.ts` `liveStateKey` / `app/company/components/guidance-history-section.tsx` `LIVE_META`.
- [ ] **Trail depth demotes brand-new guidance** (S, P3) — materiality rule 6 sorts `trail.length` DESCENDING, so a commitment issued for the first time this quarter loses every tie to an old restated one. Arguably first-issue is the most material live news. Only bites after year/scope/news/metric/quarter all tie, so it is rare; needs a real example before tuning. Start at: `materialityKey` in `lib/guidance-tracking/verdict.ts`.
- [ ] **Collapsed rows are absent from the DOM** (S, P3) — both new toggles mount their rows on click, so in-page find (⌘F) and crawlers see only the 3 watch cards and 5 resolved rows. Consistent with the rest of the portal's `<details>` blocks, but the Guidance section is now the densest example. Consider rendering hidden rows with `hidden` instead of unmounting if SEO or find-in-page matters. Start at: `WhatToWatch` / `ResolvedTrackRecord`.
- [ ] **Test fixture ordering trap** (XS, P4) — `tests/guidance-verdict-coverage-gaps.test.ts` derives its default `guidanceKey` from a module-level `nextId` counter, and the comparator's last tiebreak is `guidanceKey.localeCompare`. Inserting a test near the top silently renumbers later fixtures, and past 10 the lexicographic order inverts ("k10" < "k9"). Latent only — every order-asserting test passes explicit keys. Fix by deriving the default key from the fixture's own text.
- [ ] **`RESOLVED_PREVIEW_COUNT` lives in the component, `LIVE_WATCH_COUNT` in verdict.ts** (XS, P4) — the split is real (the verdict layer slices `watch`/`watchRest`; the resolved preview is pure presentation), but `docs/reader-intent/guidance-tracking.md` documents both together, so its "five most recent rows" can drift from the code with nothing failing.

## P0 — pre-existing test failure noticed on overview-signal-board (2026-08-21)

### 0. `tests/board-read.test.ts` fails on main
- **What:** `npm test` stops at `board-read.test.ts`: `strong print, cooling outlook: expected peaking, got cheap_forming`. Noticed while shipping the overview signal board; `lib/board-read.ts` was not touched on that branch, and the failure reproduces on `main` (3ede8f2).
- **Why:** The test suite runs `for f in tests/*.test.ts … || exit 1`, so this one assertion masks every later test file from running in CI. Either the `quality_fair`/`cheap_forming` split (2026-08-13) changed the intended classification and the fixture is stale, or the classifier ordering regressed — decide which before editing either side (`compute_composite_score.py` mirrors the weights, not the labels).
- **Priority:** P0
- **Depends on:** nothing.

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

## Industry/Sub-sector merge — deferred follow-ups (eng review 2026-08-28)

### 1. Refactor SECTION_MAP to id-keyed object literals (P3)
- **What:** Replace the positional `SECTION_MAP.foo = SECTIONS[n]` mapping in `app/company/constants.ts` with an id-keyed object literal (or derive the map from `SECTIONS` by id), so dormant entries can be pruned without a silent index shift.
- **Why:** Today removing an earlier `SECTIONS[n]` element renumbers every later index — a footgun. It's the root cause behind keeping the now-dead `sub-sector` entry dormant (and the same applies to `walk-the-talk`/`community`). Codex outside-voice flagged it during the Industry re-enable.
- **Pros:** Lets us actually delete dead section ids cleanly; removes a whole class of index-shift bugs. **Cons:** Touches a shared registry every section reads; needs a typecheck + quick browser pass to confirm no id drift.
- **Context:** `SECTION_MAP` at `app/company/constants.ts:67-81` currently indexes into the `SECTIONS` tuple by position. Consumers use `SECTION_MAP.<name>`; keep those call sites stable, just change how the map is built.
- **Depends on:** nothing.

### 2. Alias `#sub-sector` hash → the merged Industry sub-anchor (P3)
- **What:** Map the retired `#sub-sector` hash to `#industry-context-sub-sectors` (a sub-anchor on the Sub-sectors block) so stray bookmarks/external links land on the merged section instead of the Overview fallback.
- **Why:** Merging Sub-sectors into Industry Context orphaned the `#sub-sector` hash; `lib/section-hash.ts` resolves unknown hashes to the fallback tab (Overview).
- **Pros:** No dead deep-links. Small — `section-hash.ts` already prefix-matches `<sectionId>-<block>`, so adding an alias + a matching anchor id on the block is enough. **Cons:** Near-zero; low urgency since the Sub-sectors tab was never publicly live, so real bookmarks are unlikely.
- **Context:** Resolver at `lib/section-hash.ts`; the Sub-sectors block lives inside `app/company/components/industry-context-section.tsx`. Add an `id="industry-context-sub-sectors"` (or similar) anchor and a `sub-sector → industry-context` alias in the resolver.
- **Depends on:** nothing.
