# concall-alpha — agent guide

Next.js 15 / React 19 portal that reads concall analysis from Supabase and renders company pages, leaderboards, and sector views. Sibling app [concallyser/](../concallyser/) produces the data; this repo only consumes it.

## 30-second architecture

- `app/` — Next App Router. Company page is `app/company/[code]/`; section components live in `app/company/components/`.
- `lib/<domain>/` — per-section data layer. Each domain folder has `types.ts` (frontend payload validation) and `normalize.ts` (raw → display shape). Domains: `business-snapshot`, `moat-analysis`, `growth-outlook`, `guidance-snapshot`, `guidance-tracking`, `key-variables-snapshot`, `sector-intelligence`, `company-industry-analysis`.
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

Read [skills/concall-alpha-ui-patterns/SKILL.md](skills/concall-alpha-ui-patterns/SKILL.md) before any company-page UI change. It has the section hierarchy, drawer vs details rules, and review checklist.

## Project-specific gotchas

- Industry Context and Business Snapshot are collapsed by default on the company page. Don't "fix" this.
- Guidance History uses thread-style trails, not full comparison cards. Don't reintroduce comparison cards without a product reason.
- `/admin` requires both `ADMIN_PANEL_PASSCODE` and `SUPABASE_SERVICE_ROLE_KEY`. If a feature seems to "not work locally," check `.env.local`.
- `lib/supabase/*.sql` files exist beyond the four named in the README (e.g. `homepage_activity_feed.sql`, `company_page_overview_cache.sql`, `activity_feed_score_history_indexes.sql`). Treat the README list as incomplete; check the directory.

## Where to look first

- UI conventions: [skills/concall-alpha-ui-patterns/SKILL.md](skills/concall-alpha-ui-patterns/SKILL.md)
- Visual system: [docs/portal-design-system.md](docs/portal-design-system.md)
- Surface classes: [app/company/components/surface-tokens.ts](app/company/components/surface-tokens.ts)
- Section reference: [app/company/components/moat-analysis-section.tsx](app/company/components/moat-analysis-section.tsx)
- Supabase migrations folder: [docs/migrations/](docs/migrations/)
- Schemas (canonical): [/schemas/](../schemas/) and [../concallyser/schemas/](../concallyser/schemas/)

## Maintaining this file

This file is loaded into every agent conversation. Keep it skimmable (target: under 150 lines). Update when conventions change — stale instructions are worse than no instructions. Don't grow it into a tutorial; deeper docs belong in `skills/` or `docs/`.
