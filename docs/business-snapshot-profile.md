# Business snapshot: company background

The snapshot now reads in this order: the business and an optional evidence-backed
change summary, company timeline, business facts, segments, reported mix history,
and the existing business momentum / segment history details.

## Data contract

`concallyser/schemas/business_profile.schema.json` defines four optional additions
inside the existing `about_company` object: `business_intro`, `company_timeline`,
`business_facts`, and `what_changed`. The canonical business snapshot schema
references those definitions. No new database columns or migration are needed.

`what_changed` may also carry an optional `stat`: the change's headline number
(`value` such as `+17` in ASCII digits, `unit` of `pts` / `%` / `x` / `bps` or null,
and a short `label`). The UI shows it large in the "What is changing?" panel,
captioned with the label and the change's own `period` ("FY24 to H1 FY26" reads as
a range only when both sides are periods; any other period is shown as written). A
negative number is drawn neutral, not in the panel's emerald.

Nothing produces it yet, and the Phase 3/9 producers cannot: their extraction
instructions do not ask for it and their models reject it (a `stat` fails their
validation like any unknown key). It arrives only on a reviewed draft promoted
through `promote_business_profile.py`, whose dry run prints a NOTE for such a draft
and whose `--apply` refuses it unless `--portal-renders-stat` confirms the build
that renders it is live. A null `stat` is dropped on promotion, and a Phase 3/9
re-run or re-import replaces `about_company` and drops a promoted stat, so
re-promote the draft afterwards. Nothing checks the number mechanically: it must be
stated in, or plain arithmetic on, the change's own cited sources, and the Step 6
review brief asks the reviewer to verify it like the rest of the change.

Deploy order matters. A portal bundle from before this field has a strict reader
that rejects the unknown `stat` key, even as `null`, and withholds the whole change
block. Deploy the portal first, and promote a stat only after it is live (also
before rolling the portal back below this field). A malformed `stat` on a current
bundle is dropped on its own: the change stays, the profile is flagged, and the
"temporarily unavailable" notice shows.

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
`data/business-profile-drafts/`; all five backgrounds have been reviewed and
promoted to Supabase. The JSON envelopes retain the original review draft for
audit — `NEULANDLAB.json` and `CARTRADE.json` still carry their pre-approval
`review_status: "draft"`, so the preview labels those two "review draft" /
"Prepared for review · not published" even though both are live; the second
batch's files carry `review_status: "user_approved"` and label "reviewed pilot"
(tracked as a known preview-badge mismatch in TODOS.md, not a promotion issue).
Use `?state=synthetic` for the full synthetic chart fixture (it is also the only
state that carries a `what_changed.stat`), `?state=legacy` or `?state=empty` to
review older and missing snapshots.

Checks: `npx tsx tests/business-profile.test.ts`, `npx tsx tests/business-profile-drafts.test.ts`
(validates each of the five named draft files' `about_company` fields via
`normalizeBusinessProfile`/`businessProfileSchema` in `lib/business-snapshot/profile.ts`,
so a hand-edit that exceeds a field limit fails loudly instead of being silently
dropped — the file list is a hardcoded import, so a new draft file needs its own
import added to the test), `npm run typecheck`, and targeted ESLint on the changed
files. Pipeline checks: from `concallyser`, run `.venv/bin/python -m pytest tests/test_business_profile.py -q`.

Promotion uses `concallyser/scripts/promote_business_profile.py`: dry-run with
`--backup PATH` first, inspect the plan, then repeat with `--apply` after user
review. It updates only background fields and their existing JSON mirrors, stores
source metadata under `details.business_profile_review`, and preserves financial
blocks and `generated_at`. Existing rows are backed up before any write.
