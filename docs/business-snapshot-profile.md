# Business snapshot: company background

The snapshot now reads in this order: the business and an optional evidence-backed
change summary, company timeline, business facts, segments, reported mix history,
and the existing business momentum / segment history details.

## Data contract

`concallyser/schemas/business_profile.schema.json` defines four optional additions
inside the existing `about_company` object: `business_intro`, `company_timeline`,
`business_facts`, and `what_changed`. The canonical business snapshot schema
references those definitions. No new database columns or migration are needed.

Phase 3 and Phase 9 share the profile contract and extraction instructions. Their
loaders already preserve the complete `about_company` object. Every milestone,
fact and change requires a source URL; both producers check that citations come
from documents actually supplied to the model. That check establishes provenance,
not factual entailment: content still needs source review before promotion.

Existing rows remain valid. The UI omits unavailable additions. Invalid additions
are withheld with a brief availability message; valid background blocks and the
old introduction still render. A newly deployed UI does not populate historical
snapshots automatically: refresh / review company data through the normal
sandbox workflow before promotion. The reviewed NEULANDLAB and CARTRADE pilot backgrounds were promoted on
16 September 2026, followed by a second batch — AEROFLEX, VINYAS and ASTRAMICRO —
approved and promoted the same day. Other company records were not changed.

Historical mix bars use reported or restated segment shares. Missing shares stay
unfilled, totals above 100% are not plotted, and estimated / incomparable values
are not presented as reported history. Guidance-based projected shares remain
deferred until a sourced scenario contract exists.

## Local review

Run `npm run dev -- --port 3017` and open `/dev/business-snapshot`. This route is
development-only (404 in production). It now defaults to a source-backed Neuland
background draft; use `?company=CARTRADE`, `?company=AEROFLEX`, `?company=VINYAS`
or `?company=ASTRAMICRO` for the other four. The drafts and content audit are in
`data/business-profile-drafts/`; all five backgrounds are now published. The JSON
envelopes retain the original review draft for audit.
Use `?state=synthetic` for the full synthetic chart fixture, `?state=legacy` or
`?state=empty` to review older and missing snapshots.

Checks: `npx tsx tests/business-profile.test.ts`, `npx tsx tests/business-profile-drafts.test.ts`
(schema-validates every draft file's `about_company` against `businessProfileSchema`
so a hand-edit that exceeds a field limit fails loudly instead of being silently
dropped), `npm run typecheck`, and targeted ESLint on the changed files. Pipeline
checks: from `concallyser`, run `.venv/bin/python -m pytest tests/test_business_profile.py -q`.

Promotion uses `concallyser/scripts/promote_business_profile.py`: dry-run with
`--backup PATH` first, inspect the plan, then repeat with `--apply` after user
review. It updates only background fields and their existing JSON mirrors, stores
source metadata under `details.business_profile_review`, and preserves financial
blocks and `generated_at`. Existing rows are backed up before any write.
