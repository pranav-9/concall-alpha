---
name: x-post-drafter
description: Use when the user wants ready-to-post X (Twitter) drafts about companies from our own coverage, prioritising the most recent quarter updates. Two modes. CLASSIC — 5 first-person, text-only options from the freshest ConcallScore prints; the user picks and posts. DAILY DESK — the full morning posting sheet per the 2026-07-31 Twitter strategy (Lane 1 speed posts capped at 2 with selection rules, Lane 3 disagreement replies, Lane 2 thread nudge, UTM first-reply links, provisional labels, compliance footer). Triggers on "X posts", "tweet ideas", "give me posts to share", "what should I post about", "draft tweets on recent quarters", "social posts about our companies"; daily desk on "daily posting sheet", "today's posts", "daily options", "posting desk", or when chained from /results-season-run.
---

# X post drafter

Turn our own coverage into **5 postable X drafts**, prioritised by recent-quarter updates. The
user picks the one they like and posts it themselves — this skill does **not** post anywhere (no X
API, and publishing is outward-facing; the user is always the one who hits send).

Work from `concall-alpha/` with Node ≥18.18 (`nvm use 24` — the default 18.12.1 fails). All data
comes from Supabase via the repo's `.env` REST pattern.

Two decisions are baked in (the user chose them):
- **Signal** = freshest ConcallScore prints **+** QoQ score moves **+** new/changed guidance.
- **Voice** = the user's own first-person Journal voice. **Text-only, no links.**

**Never re-pitch something already posted.** `concall-alpha/data/x-posts/posted.jsonl` is the
append-only record of what's gone out (schema in that dir's README). The candidates script reads
it automatically — no manual lookup needed — and step 4 is where you write back to it.

## Sequence

### 1. Gather candidates

```bash
node scripts/x-post-candidates.mjs --days 14 --top 12
```

Emits ranked JSON: one candidate per company (its newest fresh print), with `score`,
`qoq_delta` (vs `prior_quarter`), the ground-truth `rationale` (per-v4-category heading + detail
+ `direction`), any fresh `guidance_update`, and provenance flags. Widen with `--days 30` when the
window is quiet; `--include-excluded` to allow de-emphasised companies. Ranking already favours
recency, clean move size, guidance freshness, and discovery-listed names.

**Posted-ledger fields** (read these before drafting):
- `already_posted_this_quarter: true` → a `status: "posted"` row exists for this exact
  company+quarter. Ranking sinks it to the bottom; the top-level `already_posted[]` list names
  every one that was suppressed. **Don't draft it again** unless the user asks, or the new hook is
  genuinely different from the logged `angle` — and say so out loud when you do.
- `posted_history[]` → every logged row for that company (`posted` / `drafted` / `skipped`), each
  with its `angle`. Read the angles even when nothing is blocked: repeating last quarter's framing
  on a new print reads as a rerun. `drafted` rows were offered but never confirmed posted, so
  they're fair to re-pitch.
- Add `--exclude-posted` to drop suppressed candidates from the payload entirely.

**Sanity-check the quarter ordering.** If a candidate's `prior_quarter` is *later* than its
`quarter` (e.g. `Q2FY26` with prior `Q1FY27`), it's a backfilled old quarter, not a new print —
its `qoq_delta` is meaningless as a "move" and the news is stale. Drop it and say why
(`[[pipeline_bse_sweep_autochain_defects]]` — the sweep walks backwards).

### 2. Read the material — do not invent any of it

Every number, direction, and reason in a draft **must** trace to a candidate's `rationale`,
`score`, `qoq_delta`, or `guidance_update`. Never add a figure, a catalyst, or a conviction the
data doesn't contain. If a hook needs a fact that isn't in the payload, drop the hook.

Respect these flags:
- `source_status: "unofficial"` / `rescore_required: true` → the score came from a third-party
  transcript inside the SEBI window and may move when the official files. Fine to post the *read*,
  but **don't** anchor the post to a precise number as if it's final — lean on the "why", or add a
  light "(early read)" hedge. Surface this to the user per draft.
- `provider_mismatch_vs_prior: true` → the QoQ delta is provider-confounded (Gemini runs ~+1.3 hot
  vs DeepSeek). **Do not** frame it as a "move" / "jump" / "drop". Treat it as level-only.
- A clean `qoq_delta` (mismatch false) is the strongest hook — a score that fell 8.8→6.3 with the
  reason attached is a real post. Lead with the tension, not the number.

### 3. Draft 5 options

Pick **5 different companies** for variety (don't post five downgrades in a row — mix
improvements, declines, and a guidance-change note). Each draft:

- **≤ 280 characters**, text-only, no links. **Default to zero hashtags and never a cashtag.**
  Measured 2026-07-27 across 708 tweets from the six accounts in `data/external-takes/handles.txt`:
  cashtag usage was **0%** (not rare — zero; Indian tickers don't resolve on X), and four of six
  accounts used hashtags in ≤2% of posts. Not one generic reach tag (`#StockMarket`, `#Nifty50`,
  `#StocksToWatch`) appeared in the whole sample — those cluster with pump accounts and read as
  the opposite of the measured voice we're going for. The only defensible tag is a **single
  company-name tag** (`#TARIL`-style, as equities_samjho uses it) when characters genuinely allow;
  it aids in-app search for that company. Optional, never automatic, never more than one.
  Reach comes from being *early* (the unofficial-transcript window) and from the company name in
  plain text, which X's semantic retrieval already matches — not from tags.
- **First-person, measured, self-skeptical** — the Journal voice: "I", concrete numbers, plain
  language, honest about uncertainty, no hype, no emoji slop, no "🚀". Read a recent post in
  `concall-alpha/app/blog/posts/*.mdx` if you need to re-calibrate. See
  `[[feedback_journal_preserve_voice]]` — this is the user's public voice; don't make it sound
  AI-generated.
- **Insight first, number as support.** The interesting thing is the *tension* the concall
  surfaced (record sales but guidance refused; margin up but concentration rising), not the raw
  0–10. The score can appear, but it's the evidence, not the headline.
- **No overclaiming.** State what the documents said, not a price call or a conviction we don't
  hold (`[[project_overview_page_verdict_card]]` — we don't manufacture bullishness).

Present them as a numbered list. Under each, add a one-line **meta** the user can scan:
`— FCL Q1FY27 · 8.8→6.3 clean · unofficial (early read) · 241 chars`. Then ask which one(s) they
want, or whether to regenerate with a wider window / different companies.

### 4. Log to the posted ledger

Append one row per draft to `concall-alpha/data/x-posts/posted.jsonl` (schema in that dir's
README). **Append-only** — never rewrite past rows.

- Log all 5 as `status: "drafted"` at the end of the run, so the offer itself is on record.
- When the user says which they posted, append a `status: "posted"` row for those — that's what
  blocks a re-draft next time. Add the tweet `url` if they paste it; `null` is fine.
- Explicitly rejected hooks go in as `status: "skipped"` with the `angle`, so the same idea
  doesn't get re-pitched.

Write a real date into `posted_on` (today's, from the environment) — never a guessed one. Fill
`angle` with the *hook*, not a summary of the company: it's the field that decides future dedupe.

There is **no scraper for our own timeline** — X's unauthenticated syndication endpoint returns
empty for accounts under ~10k followers (`[[reference_unofficial_transcript_retrieval]]`'s sibling
constraint, documented in `data/external-takes/README.md`). The ledger is only as complete as what
gets written here, so don't skip this step.

## Output shape (example)

> **1.** Fineotex just posted 175% YoY revenue growth on the CCT acquisition — and that's exactly
> what I'm watching. 65% of revenue now rides on one acquired business and 77% is international.
> Fast top-line, thinner base. The Q1 concall read dropped from last quarter for this reason.
> `— FCL Q1FY27 · 8.8→6.3 clean · unofficial (early read) · 268 chars`

## Daily Desk mode

Use when the user asks for the **daily posting sheet** ("today's posts", "daily options") or when
`/results-season-run` chains here after its morning pass. This mode operationalises the approved
Twitter strategy (`~/.gstack/projects/story-of-a-stock-apps/ceo-plans/2026-07-31-twitter-distribution-strategy.md`);
the strategy file wins on any conflict.

### 1. Gather the sheet material

```bash
node scripts/x-post-candidates.mjs --daily --days 14
```

Emits the structured sheet: `lane1_speed` (top 2 by strategy selection order — largest clean
|QoQ| move → first-ever print → coverage rank — with `first_reply_link`, `provisional`,
`freshness`, and the overflow that rolls to tomorrow), `lane2_evidence` (days since last thread +
nudge + candidate topics), `lane3_dialogue` (fresh postable disagreements from the external-takes
ledger, already deduped against `reply_to` in the posted ledger), and the `conventions` block.
`--lane3-days N` widens the reply-freshness window (default 10).

### 2. Draft the sheet

All CLASSIC-mode rules apply (grounding, voice, provenance, ≤280 chars, no tags). On top:

- **Lane 1 (≤2 posts):** one draft per pick, plus one alternate angle each. Tweet text stays
  **link-free**; under each draft show the ready-to-paste **first reply** = `first_reply_link` +
  the `first_reply_disclaimer` from the sheet. `provisional: true` → the score must be framed
  "(early read, provisional)" — lead with what the documents said, score as support.
- **Lane 3 (cold-start co-primary — never silently skip):** for each candidate, a reply draft
  that engages the *specific claim* with our data. Peer tone, never adversarial — these accounts
  are the peer group. Honour the `recheck` note: verify the ledger's numbers against the current
  print before drafting. If empty, say so and suggest running `/external-take-tracker`.
- **Lane 2:** if `nudge: true`, surface it with the thread candidates — don't draft the whole
  thread unless asked (threads are a deliberate sit-down, not a morning-desk item).
- Present the whole sheet compactly: Lane 1 drafts first, Lane 3 replies second, Lane 2 nudge as
  a footer line. Ask which items are going out.

### 2b. Read the performance loop

The sheet's `recent_performance` block carries the latest per-tweet metrics for our own posted
tweets (views / likes / retweets / replies), fetched by:

```bash
node scripts/x-post-performance.mjs        # refresh — run before the sheet when posts went out recently
```

This works for ANY account size — it hydrates each posted tweet by its ledger `url` via
FxTwitter / the syndication tweet-result endpoint (the profile *page* is login-walled and the
*timeline* endpoint is empty under ~10k followers, so per-URL is the only honest path; that's why
logging the tweet URL at post time matters — the block lists any `posted_rows_missing_url`).
Snapshots append to `data/x-posts/performance.jsonl` (commit with the ledger), so growth over
time is visible.

**Use it to bias, not to obey:** lean toward angle *types* that pulled engagement (score-drop
tension vs guidance-note vs candor-read), and say which prior post motivated the choice. n is
tiny early on — treat it as a hint, never a rule, and never let it override grounding or
compliance. If `posted_rows_missing_url` is non-empty, ask the user to paste those tweet URLs.

### 3. Log with the extended fields

Same append-only ledger, three extra optional fields (schema in the README): `lane`
(`speed` | `evidence` | `dialogue`), `utm_campaign` (from the link), `reply_to` (the tweet URL a
dialogue reply answers — this is the dedupe key for Lane 3), and `dialog_candidate` (handle, only
when a real exchange developed — it feeds the weekly M1 count). End-of-day: commit
`data/x-posts/posted.jsonl` (ledger durability rule).

### Compliance (both modes, non-negotiable)

No buy/sell/hold/accumulate language, no target prices, no portfolio advice in replies. Posts
state what documents say and what our read did. The first-reply disclaimer rides every Lane 1
post. The quarterly self-audit thread and any public track-record framing are **gated on the
professional SEBI compliance read** (strategy constraint 1) — do not draft those until the user
confirms that consult happened.

## Guardrails

- **Never post on the user's behalf.** Output drafts; the user posts.
- **Everything traces to the payload.** No invented numbers, catalysts, or price targets.
- **Honour provenance** (unofficial hedge, provider-confound = level-only) — surfaced per draft.
- Char count each draft; trim anything over 280.
- **Never re-pitch a logged `posted` angle**, and always log the run's drafts back to
  `data/x-posts/posted.jsonl`. Append-only — the accumulated record is the point.
