---
name: concall-alpha-feature-planner
description: Use when planning a new feature, section, or surface in the concall-alpha Next.js portal — from initial pitch through scoping. Walks four phases (Discovery, Discussion, Scoping, Execution-handoff) anchored to the portal's actual patterns: schema-first types, surface tokens, drawer-vs-details discipline, server-first data fetching, the four portal-owned Supabase tables, and the manual SQL apply workflow. Ends with a tight brief and hands off to /plan-eng-review, /review, /qa, /ship.
---

# Concall Alpha Feature Planner

## Quick Start

Run this skill at the front of any "I want to add X to the portal" conversation, before writing types, components, or SQL. Walk the four phases in order. The output is a one-page brief that downstream skills consume.

Hand off targets after Phase 4:

- `/plan-eng-review` — architecture lock-in before coding.
- `/plan-design-review` — UI plan critique (skip if no new surface).
- `/review` — diff review pre-merge.
- `/qa` — feature QA on the live build.
- `/ship` — merge + deploy.

If the feature has no upstream data in concallyser yet, stop. It's a concallyser ticket first, not a concall-alpha feature.

## Phase 1 — Discovery

Surface the actual problem before sketching a solution.

- **Who is the reader?** Cross-check against the audience tiers in [../docs/product-charter.md](../docs/product-charter.md). If the feature only helps one tier, name which.
- **What IR-document evidence backs it?** Concallyser ingests transcripts, investor presentations, and annual reports. Name the source-type. If the answer is "we'd need to extract new fields," this is concallyser work first.
- **Does the data already exist in Supabase?** Concall-alpha is a read-only consumer of analysis tables. If the answer is no, scope the concallyser side before scoping the portal side.
- **What shape is the feature?** New section on the company page, new surface on an existing section, new global capability (watchlist / comments / search / leaderboard), or a homepage/leaderboard surface. The shape determines which patterns apply.
- **Is anything similar shipped?** Sibling sections (Moat, Growth, Business Snapshot, Guidance, Key Variables, Sector Intelligence) often handle the same primitive. Pick a sibling to imitate before designing fresh.

## Phase 2 — Discussion

Pressure-test fit before committing to scope.

- **Charter fit.** Use [../docs/product-charter.md](../docs/product-charter.md) as a direction tiebreaker. The charter is acknowledged-low-quality — if the project has a current hypothesis/positioning doc, that wins on conflicts.
- **Surface fit.** Map the feature to a surface family per [docs/portal-design-system.md](docs/portal-design-system.md): research surfaces (company page, flat opaque cards) versus atmospheric surfaces (homepage/leaderboards, glassy layered). Don't mix families.
- **Anti-positioning.** List two or three things this feature explicitly is not doing. Forces clarity and shrinks the build.
- **Sibling-section discipline.** For each primitive the feature needs (rating + tier display, evidence list, source trail, audit metadata, "what would change the call" block, thread-style trail), find the existing implementation and reuse it. Don't reinvent a primitive that ships in Moat or Guidance.
- **Renderer state already decided.** Some surfaces have intentional defaults (Business Snapshot is expanded by default; Industry Context is intentionally not rendered; Guidance History uses thread-style trails, not comparison cards). Check [CLAUDE.md](CLAUDE.md) gotchas before assuming you can flip these.

## Phase 3 — Scoping

Make the build small and concrete.

- **Schema first.** Identify the versioned schema in [../schemas/](../schemas/). It wins over any un-versioned sibling in [../concallyser/schemas/](../concallyser/schemas/). If no schema exists for the field set, the feature is gated on concallyser landing the schema first.
- **Types gate.** Plan `lib/<domain>/types.ts` plus a Zod schema. Derive from the schema, never from a peer JSON row in the DB (stale rows exist). Reference [lib/moat-analysis/types.ts](lib/moat-analysis/types.ts) as the canonical pattern: versioned schema → Zod schema → inferred TS → `NormalizedX` display shape.
- **Normalize layer.** Plan `lib/<domain>/normalize.ts`. It transforms a Supabase row into the display shape and validates the payload. Surface and label parse errors instead of silently rendering broken data.
- **Data path.** Server component fetches via `createClient()` from [lib/supabase/server.ts](lib/supabase/server.ts). Wrap the section in `<Suspense>` with a `SectionLoading` fallback. Use the `getCachedCompanyPageOverview` pattern for hot reads.
- **Section shell.** Wrap in `SectionCard` ([app/company/components/section-card.tsx](app/company/components/section-card.tsx)). Use existing surface classes from [app/company/components/surface-tokens.ts](app/company/components/surface-tokens.ts) — `elevatedBlockClass` (L2 summary), `nestedDetailClass` (L3 evidence), `snapshotSubsectionClass` (L4 quiet subsection). Do not invent new card classes.
- **Drawer vs details.** Apply the rule from [skills/concall-alpha-ui-patterns/SKILL.md](skills/concall-alpha-ui-patterns/SKILL.md): supporting evidence inside the same flow → inline `<details>`; richer drilldown or separate workflow → right-side `Drawer`. Don't drawer two short blocks.
- **Writes.** Mutations go through `app/api/<route>/route.ts` with validation, not direct client queries. The portal owns four mutable tables: `page_view_events`, `user_requests`, `company_comments`, `watchlists`. Everything else is read-only.
- **SQL.** New tables/indexes live in `lib/supabase/<name>.sql`. These files are **not migrations** — they are applied manually in the Supabase SQL editor. After any DDL, run `notify pgrst, 'reload schema';` to clear the PostgREST cache.
- **Admin and service-role.** If the feature reads across users, it belongs behind the existing `/admin` gate ([lib/supabase/admin.ts](lib/supabase/admin.ts)). Do not broaden service-role-key code paths to user-facing routes.
- **Out-of-scope list.** Force one explicit list of cuts. Anything not on the file list below is out.

## Phase 4 — Execution Handoff

The skill ends with a one-page brief and a handoff. Do not start coding inside this skill.

Produce:

- **Problem** — one paragraph. Reader, evidence, why now.
- **Approach** — one paragraph. Surface placement, sibling pattern reused, schema source.
- **File list** — planned new and touched paths, grouped by layer (schema, `lib/<domain>/`, `app/company/components/`, `app/api/`, `lib/supabase/*.sql`, page wiring).
- **Data path** — table read or written, cache strategy, write route if applicable.
- **Out of scope** — two or three explicit cuts.

Then:

1. Run `/plan-eng-review` to lock the architecture before coding.
2. For new UI surfaces, run `/plan-design-review`.
3. Build.
4. Run `/review` on the diff, `/qa` on the live build, then `/ship`.
5. For developer-facing changes (rare here), run `/plan-devex-review`.

## Review Checklist

Before exiting the planner:

- Versioned schema identified, and it is the authority over any un-versioned sibling?
- Types derive from the schema, not from a peer Supabase row?
- Surface tokens reused, no new card classes invented?
- Drawer-vs-details decision made for each disclosure?
- Mutations routed through `app/api/`, not direct client writes?
- SQL plan acknowledged as manual-apply with a `notify pgrst` follow-up?
- Sibling section checked for the same primitive before designing fresh?
- One explicit out-of-scope list exists?
- Charter and current hypothesis doc both consulted, with the newer one winning on conflict?

## Common File Map

- [../docs/product-charter.md](../docs/product-charter.md): direction tiebreaker; treat as low-quality if a newer hypothesis doc exists.
- [docs/portal-design-system.md](docs/portal-design-system.md): research vs atmospheric surface families.
- [../schemas/](../schemas/): versioned schemas, authoritative.
- [../concallyser/schemas/](../concallyser/schemas/): un-versioned domain schemas; loses to versioned sibling.
- [lib/moat-analysis/types.ts](lib/moat-analysis/types.ts): canonical schema → Zod → types → normalize reference.
- [app/company/components/surface-tokens.ts](app/company/components/surface-tokens.ts): shared surface classes.
- [app/company/components/section-card.tsx](app/company/components/section-card.tsx): section shell.
- [lib/supabase/server.ts](lib/supabase/server.ts): server-side Supabase client.
- [skills/concall-alpha-ui-patterns/SKILL.md](skills/concall-alpha-ui-patterns/SKILL.md): sibling skill — UI discipline once the plan is built.
- [CLAUDE.md](CLAUDE.md): gotchas (Industry Context not rendered, Business Snapshot expanded, manual SQL apply).
