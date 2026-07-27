---
name: external-take-tracker
description: Use when the user wants to track what X/Twitter accounts (like @equities_samjho) are saying about companies we cover, and compare their take against our data-driven analysis. Scrapes an account's recent tweets (no API key needed), keeps only tweets about companies WE cover, attaches our current ConcallScore read, flags agree/disagree/adds-new-info, and logs it to a durable ledger. Feeds x-post-drafter when a disagreement is postable. Triggers on "what is <handle> saying", "track <handle>", "compare our view vs <handle>", "scan twitter takes", "any takes to compare", "add <handle> to the tracker".
---

# External take tracker

Track outside analysts' calls and hold them against our own read. The interesting output is the
**gap** — where a tracked account and our ConcallScore disagree, or where they surface a forward
catalyst our backward-looking score can't see. That gap is your Journal thesis in action
(`[[project_neuland_score_staircase]]` — the money was in disagreements) and it's prime post
material.

Work from `concall-alpha/` with Node ≥18.18 (`nvm use 24`). Ingestion needs **no X API key** —
it uses X's unauthenticated syndication embed endpoint.

## What it can and can't do

- **Can:** pull ~100 recent tweets per public handle (originals, replies/RTs dropped), match them
  to companies in our coverage with high precision, attach our latest score + QoQ + rationale.
  Also hydrate **one specific tweet by URL** (any account, any size).
- **Can't:** read protected accounts, or reach further back than the syndication window (~100
  tweets). The timeline endpoint also returns **empty for accounts under ~10k followers**
  (unauthenticated X won't serve their timeline) — that's a hard wall, not a per-account setting.
  For those, use the **single-tweet path** (§1b): paste the specific tweet URL and it still
  hydrates. The endpoint rate-limits fast (429) — the scan script disk-caches raw HTML for 6h;
  if you get a 429 with no cache, space requests out and retry.
- **Precision over recall by design:** a wrong "our read" pinned to someone else's take is worse
  than a miss. Matching fires only on ticker/cashtag or a contiguous company-name phrase — never
  scattered generic words. Expect some misses (a company named only obliquely); that's the trade.

## Sequence

### 1. Scan

```bash
node scripts/scan-external-takes.mjs --handle equities_samjho --days 90        # one account
node scripts/scan-external-takes.mjs --handle equities_samjho --days 90 --all  # + list unmatched tweets
```

Tracked accounts live in `data/external-takes/handles.txt` (one handle per line, no `@`) — scan
each in turn to sweep the whole watchlist. Add a handle there to start tracking it (any account,
tagged by source). Output is JSON: `takes[]`, each with the tweet, the matched `companies[]`
(`confidence: high` = ticker/cashtag, trust it; `review` = name-phrase, eyeball it), and our
`our_read` per company. **Rate-limit courtesy:** scan one handle at a time, not in parallel.

### 1a. Or sweep the whole watchlist at once (cross-account view)

```bash
node scripts/sweep-external-takes.mjs --days 120
```

Scans every handle in `handles.txt` sequentially and returns the two views a single-handle scan
can't:
- **`overlap`** — companies WE cover, each with every account that mentioned them + our read,
  ranked by **`high_conf_accounts`** (ticker/cashtag mentions — trust these first; review-only
  rows are likely contextual/noise). This is the "same company, different people, vs our score"
  view. High corroboration + our score agreeing = conviction; high corroboration + disagreeing =
  the sharpest gap-to-watch (e.g. the platform trio: bullish accounts vs our falling scores).
- **`funnel`** — cashtags/hashtags these accounts use that **don't** resolve to a company we
  cover, ranked by mentions + account diversity. `in_db:false` = not even in our `company` table
  = a genuinely new name smart accounts keep discussing → **onboarding candidate** (feeds the
  replacement-candidate work). Note the funnel also surfaces out-of-scope large caps (Titan,
  Tata Tech) and the odd jargon the stoplist missed — eyeball before acting.

Use the sweep for the periodic "what's the crowd on" pass; use §1 single-handle scan when you
care about one account, §1b when you have one specific tweet.

### 1b. Or hydrate a single tweet (paste-a-URL)

```bash
node scripts/hydrate-tweet.mjs "https://x.com/<handle>/status/<id>"
```

Use when the user pastes one specific tweet, or for **small accounts the timeline can't read**.
Fetches via `cdn.syndication.twimg.com/tweet-result` (FxTwitter fallback) — a different endpoint
and rate bucket than the timeline scan, so it works even when scans are throttled. Same output
shape (`companies[]` + `our_read`). Then go to step 2. This is the **paste-only** path for
sub-10k-follower accounts — don't add them to `handles.txt`; they'll just return empty scans.

### 2. Compare — this is the model's job, grounded in the payload

For each take, judge it against `our_read`. State plainly:
- **their_stance** — is the tweet bullish / bearish / neutral / mixed on the stock?
- **verdict vs our read** — `agree` (same direction), `disagree` (opposite — the valuable case:
  they're bullish while our score fell, or vice versa), `adds-new-info` (a forward catalyst our
  quarter-bound score can't contain — verify it's real before leaning on it), or `too-early`.
  - **Flag as `adds-new-info` even when our score looks fine** if the take is a
    **governance / regulatory / competitive-entry** item: a debarment or fraud allegation (e.g.
    TARIL's World Bank debarment), a new entrant threatening margins ("Adani enters cables &
    wires"), a large acquisition, a regulatory action. These were the highest-value signals in
    practice precisely *because* our backward-looking concall score can't see them yet. Don't let
    a healthy score talk you out of logging them.
- **the "why"** — cite our `rationale` headings and their claim. Never invent a number; if our
  `source_status` is `unofficial`/`rescore_required`, say the score may move.

Don't manufacture a disagreement for drama. Many takes will simply agree — log those too; the
track record is the point.

### 3. Log to the ledger

Append one row per take to `data/external-takes/ledger.jsonl` (schema in that dir's README).
Append-only — never rewrite past rows. Skip a row only if it's already logged (same
`tweet_url` + `company`). Use a real date for `logged_on`; `tweet_date` comes from the take.

### 4. Draft (optional)

When a take is `postable` (usually a clean `disagree` or a verified `adds-new-info`), hand off to
`[[x-post-drafter]]` — the "outside take vs our read" tension is a first-class post type. Same
rules: first-person Journal voice, text-only, ≤280 chars, everything traced to data, provenance
hedged. Never post on the user's behalf — draft, they post.

## Guardrails

- **No invented facts.** Their claim comes from the tweet; our read comes from the payload. A
  forward catalyst they mention is *theirs* and unverified — flag "verify before posting".
- **Honour provenance** (unofficial → score may move; provider-confounded QoQ → level-only, per
  `[[pipeline_provider_score_offset]]`).
- **Append-only ledger.** The value is the accumulated track record; don't clobber it.
- **Precision-first matching.** Trust `high`-confidence matches; verify `review` ones before logging.
