# concall-alpha — agent guide

Next.js 15 / React 19 portal that reads concall analysis from Supabase and renders company pages, leaderboards, and sector views. Sibling app [concallyser/](../concallyser/) produces the data; this repo only consumes it.

## 30-second architecture

- `app/` — Next App Router. Company page is `app/company/[code]/`; section components live in `app/company/components/`.
- `lib/<domain>/` — per-section data layer. Each domain folder has `types.ts` (frontend payload validation) and `normalize.ts` (raw → display shape). Domains: `business-snapshot`, `moat-analysis`, `growth-outlook`, `guidance-snapshot`, `guidance-tracking`, `key-variables-snapshot`, `sector-intelligence`, `company-industry-analysis`.
- `lib/<top-level>.ts` — cross-cutting utilities not scoped to one domain. Examples: `admin-auth.ts`, `company-overview-cache.ts`, `company-freshness.ts`, `visitor-id.ts`, `logger.ts`, `utils.ts`, `nse-event-calendar.ts`, `homepage-activity-feed.ts`, `leaderboard-rank.ts`.
- `lib/supabase/` — Supabase clients (`client.ts`, `server.ts`, `middleware.ts`, `admin.ts`, `public-read.ts`) plus `*.sql` files that define the portal-owned tables.
- `components/ui/` — shadcn/ui primitives. `app/company/components/surface-tokens.ts` is the shared surface-class source.

## Source of truth rules

The cross-cutting rules in [../CLAUDE.md](../CLAUDE.md) (schemas-as-authority, versioned-root-wins, schema-valid-vs-framework-faithful, never-copy-from-peer-rows) apply here in full. Concall-alpha-specific additions:

- **`lib/<domain>/types.ts` is the frontend's own validation gate.** It must accept everything the schema accepts and reject what the schema rejects. If you change one, change both.
- **Derive `lib/<domain>/types.ts` from the schema**, not from a Supabase row — same reasoning as never-copy-from-peer-rows.

## Verify before claiming done

In order of cost:

```bash
npm run lint        # fast
npm run typecheck   # medium speed; catches type drift
npm run build       # full Next build, slow but catches RSC / route-level issues
```

For UI changes: run `npm run dev` and exercise the change in a browser. Type-check passing is not the same as feature working — say so explicitly if you couldn't browser-verify. Mobile layout is part of the check (the section SKILL spells this out).

## Don't touch without asking

- `lib/supabase/*.sql` — these are applied **manually** in the Supabase SQL editor. Editing them does not migrate the live DB. If a column is missing in production, the fix is to apply DDL in Supabase + run `notify pgrst, 'reload schema';` (PostgREST caches schema).
- `SUPABASE_SERVICE_ROLE_KEY`-backed code paths (`lib/supabase/admin.ts`, `app/admin/`) — these read across users. Don't broaden their use.
- `data/input/` does **not** live in this repo; it's owned by `concallyser/`. Don't add scripts here that write to it.

## Adding a new analysis section

Reference implementation: `moat-analysis`. Files to copy/adapt:

1. Schema in `/schemas/<name>_v<n>.json` (or use existing `concallyser/schemas/<name>.schema.json`).
2. `lib/<name>/types.ts` — TS types + a validator that mirrors the schema.
3. `lib/<name>/normalize.ts` — normalize raw Supabase row → display shape.
4. `app/company/components/<name>-section.tsx` — UI. Use `SectionCard`, `surface-tokens.ts`, and the drawer-vs-details rules from the SKILL below.
5. Wire into the company page (see how `moat-analysis-section.tsx` is wired in `app/company/[code]/`).

Before pitching or scoping a new feature, section, or surface, walk the four phases in [skills/concall-alpha-feature-planner/SKILL.md](skills/concall-alpha-feature-planner/SKILL.md). It produces a one-page brief that hands off to `/plan-eng-review` and `/ship`.

Read [skills/concall-alpha-ui-patterns/SKILL.md](skills/concall-alpha-ui-patterns/SKILL.md) before any company-page UI change. It has the section hierarchy, drawer vs details rules, and review checklist.

## Project-specific gotchas

- **Every `concall_analysis` query must filter `.not("details->scoring_meta", "is", null)`.** Rows without `scoring_meta` were scored under retired pre-deterministic logic and are misleading; they are hidden portal-wide (decision 2026-06-12) but kept in the DB as the re-score backlog. If you add a new query, carry the filter.

- **Every discovery surface must filter through `isDiscoveryListed` ([lib/coverage-policy.ts](lib/coverage-policy.ts)).** Coverage is a curated ~100 mid/small caps: companies admitted as large cap (`market_cap_band_at_admission = 'large'`) and those below the composite cut (`excluded_from_discovery`) are de-emphasized — off leaderboards/homepage/sectors, but their pages stay reachable **and searchable**. Select the columns via the shared `COVERAGE_SELECT` and pass the whole row to `isDiscoveryListed(company)`. NULL band = covered (fail-open). **Search (`lib/company-search-cache.ts`) and watchlists are deliberately unfiltered** — search is navigation, watchlists are user-owned.
  - The leaderboard has **four** company substrates, not two: `getConcallData()` (quarter board + Trend) is separate from `fetchLeaderboardData()` (growth + moat), plus the activity feed and the hero stats. A "hide these companies" change that only touches `data.ts` silently leaks them into the quarter/Trend board. `getConcallData({ excludeLargeCaps: true })` is opt-in for that reason.
  - Ranks (`quarter_rank`/`growth_rank`/`sector_rank` in the overview cache) are computed **within the covered universe only**; an excluded company gets null ranks and its page omits them.

- **Verifying coverage counts:** PostgREST `neq.large` silently drops NULL-band rows, so it under-counts. Mirror `isDiscoveryListed` in JS instead, or you'll "confirm" 98 when the portal shows 100.

- Industry Context is currently **not rendered** on the company page (`IndustryContextPanel` is defined in `app/company/[code]/company-detail-sections.tsx` but not imported into `page.tsx`). It was temporarily pulled while other sections get polished — do **not** re-wire it back into the page without checking with the user first.
- Business Snapshot renders **expanded by default** on the company page. The internal `<details>` blocks inside it (about "Read more", historical-economics drawer) are intentional *sub-element* collapses — don't flatten them.
- Guidance History uses thread-style trails, not full comparison cards. Don't reintroduce comparison cards without a product reason.
- `/admin` requires both `ADMIN_PANEL_PASSCODE` and `SUPABASE_SERVICE_ROLE_KEY`. If a feature seems to "not work locally," check `.env.local`.
- `lib/supabase/*.sql` files exist beyond the four named in the README (e.g. `homepage_activity_feed.sql`, `company_page_overview_cache.sql`, `activity_feed_score_history_indexes.sql`). Treat the README list as incomplete; check the directory.
- **`page_view_events.referrer` changed meaning 2026-07-17.** It now stores the client-reported external referrer (null = internal/direct); rows before that date hold the route's own Referer header — always the app itself — and are **not** acquisition data. Classify via `lib/attribution.ts` (`isInternalHost` treats all `*.vercel.app` as internal). Tracker payload fields beyond `path`/`companyCode` must stay optional (old cached bundles POST without them).
- **Canonical origin comes from `NEXT_PUBLIC_SITE_URL`** via [lib/site-url.ts](lib/site-url.ts) (metadataBase, sitemap, robots, canonicals). It's a Vercel env var, not code — never hardcode the domain, and never use `VERCEL_URL` for anything canonical (it's the per-deployment preview URL).

## Where to look first

- Feature planning: [skills/concall-alpha-feature-planner/SKILL.md](skills/concall-alpha-feature-planner/SKILL.md)
- UI conventions: [skills/concall-alpha-ui-patterns/SKILL.md](skills/concall-alpha-ui-patterns/SKILL.md)
- Visual system: [docs/portal-design-system.md](docs/portal-design-system.md)
- Surface classes: [app/company/components/surface-tokens.ts](app/company/components/surface-tokens.ts)
- Section reference: [app/company/components/moat-analysis-section.tsx](app/company/components/moat-analysis-section.tsx)
- Supabase migrations folder: [docs/migrations/](docs/migrations/)
- Schemas (canonical): [/schemas/](../schemas/) and [../concallyser/schemas/](../concallyser/schemas/)

## Maintaining this file

This file is loaded into every agent conversation. Keep it skimmable (target: under 150 lines). Update when conventions change — stale instructions are worse than no instructions. Don't grow it into a tutorial; deeper docs belong in `skills/` or `docs/`.
