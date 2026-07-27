# Posted-X ledger

Durable record of what we've already **said publicly** on X, so the `/x-post-drafter` skill
never re-drafts a company/quarter angle that's already been posted. Companion to
`../external-takes/` (what *others* said); this one is our own outbound side.

- `posted.jsonl` — one JSON object per draft. Append-only; never rewrite past rows.

The drafter reads this automatically — `scripts/x-post-candidates.mjs` annotates every candidate
with `posted_history` and sets `already_posted_this_quarter: true` when a `status: "posted"` row
already exists for that company **and** quarter. Those candidates sink to the bottom of the
ranking, and `--exclude-posted` drops them entirely.

## Row shape (`posted.jsonl`)

```json
{
  "posted_on": "2026-07-27",              // date the user actually posted (or drafted, if not yet posted)
  "status": "posted",                     // posted | drafted | skipped
  "handle": "pranav_handle",
  "url": null,                            // tweet URL once known; null if unrecorded
  "company": "APARINDS",
  "quarter": "Q1FY27",
  "angle": "record quarter, all guidance questions declined on a securities notice",
  "score_at_post": 5.5,
  "qoq_at_post": -1.3,
  "source_status": "unofficial",          // provenance at the time of posting
  "chars": 258,
  "text": "APAR just printed its best quarter ever — …"
}
```

`status` is the whole point of the file:

- **`posted`** — went out on X. Blocks the same company+quarter from being re-drafted.
- **`drafted`** — generated and shown to the user but not confirmed posted. Kept as history so we
  can see what was offered; does **not** block a re-draft.
- **`skipped`** — explicitly rejected. Doesn't block, but the `angle` is worth reading before
  pitching the same hook again.

`angle` matters more than `text` for dedupe: the same company can be posted about twice in a
quarter if the hook is genuinely different (the print, then a guidance revision). Read the angle
before deciding it's a repeat.

`source_status` records provenance **at post time**. A post written off an `unofficial` transcript
that later re-scores is worth revisiting — that's a follow-up post, not a correction, unless the
direction flipped.

## Seeding

Rows are appended by the model at the end of a `/x-post-drafter` run, once the user says which
drafts they posted. There is no scraper: X's unauthenticated syndication timeline returns empty
for accounts under ~10k followers (see `../external-takes/README.md`), so our own timeline can't
be read back automatically. The ledger is only as complete as what gets recorded here.
