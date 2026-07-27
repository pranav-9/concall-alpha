---
name: valuepickr-comparison
description: Use when the user wants to compare ValuePickr forum discussion against our own analysis for the companies we cover — to find research gaps, sanity-check our scores, and surface candidate improvements to our extraction pipeline. Scrapes each company's dedicated VP (Discourse) thread's recent tail (no login), holds the community's bull/bear read against our ConcallScore + moat + key-variables + guidance, flags agree/disagree/new-info, and rolls up the recurring gaps into a system-improvement worklist. Triggers on "compare valuepickr vs ours", "what is VP saying about <names>", "scrape valuepickr for our companies", "where does the forum disagree with us", "any research gaps vs the forum", "refresh the VP comparison".
---

# ValuePickr comparison

Hold the ValuePickr crowd against our own read. The output has two halves:
1. **Per-company briefs** — VP's bull/bear thesis vs our substrates, where we agree/diverge, and what VP has that we don't (the research alpha).
2. **A rolled-up system-improvement worklist** — the gaps that recur across many names are the signal for what our pipeline structurally can't see. That's the "improve our own system" payoff.

VP's durable **edge** is reading the cash flow / balance sheet / ownership / regulatory events — things our concall-bound extraction misses. Our durable **edge** is freshness (VP threads for newly-listed names go stale fast) and structured guidance-lineage. Don't over-correct toward the forum. See the prior run: `docs/valuepickr-vs-ours-2026-07-26.md` and `[[project_valuepickr_comparison_2026_07_26]]`.

Reading public VP threads is fine — the [[project_valuepickr_ban]] blocks **posting/distribution**, not reading. Nothing in this skill posts.

Work from `concall-alpha/` with Node ≥18.18 (`nvm use 24`). The our-data pull uses `concall-alpha/.env`; the optional cash-quality dimension uses `python3` in `concallyser/`.

## What it can and can't do

- **Can:** resolve a company → its dedicated VP thread, pull the recent tail (~60 newest posts) with no API key, and hold it against our latest ConcallScore + rationale + moat + key-variables + guidance.
- **Can't (by design):** trust VP's precise *numbers*. The forum is high-signal on *direction and forensics* (earnings-quality, promoter/pledge events, plant incidents) but its figures need a primary-source pass before they enter any substrate — the last run had MCX's "NSE already ~20% gold share" **refuted** (garbled Jefferies revenue-CAGR) and TDPOWERSYS's "₹40cr Turkey LD" as an unsourced forum estimate. Verify before portal-visible.
- **Scale:** 19+ companies is a real fan-out. Do the per-company scrape+compare in parallel subagents (batches of ~4), then synthesize centrally — that's how the last run was done.

## Sequence

### 1. Pick the companies (default: the Portfolio watchlist)

The "Portfolio" watchlist lives only in Supabase (RLS — needs the service-role key):

```bash
set -a; source concall-alpha/.env; set +a
SRK="$SUPABASE_SERVICE_ROLE_KEY"; U="$NEXT_PUBLIC_SUPABASE_URL"
curl -s "$U/rest/v1/watchlists?select=name,watchlist_items(company_code)&name=eq.Portfolio" \
  -H "apikey: $SRK" -H "Authorization: Bearer $SRK" | jq .
# resolve names:
curl -s "$U/rest/v1/company?select=code,name&code=in.(CODE1,CODE2,...)" -H "apikey: $SRK" -H "Authorization: Bearer $SRK" | jq -r 'sort_by(.code)[]|"\(.code)\t\(.name)"'
```

Or take an explicit list the user names. Company **names** (not codes) drive VP thread matching.

### 2. Map threads + freshness pass

```bash
node scripts/scrape-valuepickr-thread.mjs --map "Neuland Laboratories,Gravita India,SAMHI Hotels,..."
```

Returns each thread's id, post count, and `last_posted_at`. Flag stale threads (>~3 months quiet) — for those, our read is likely the fresher asset. **Known thread-ids for the watchlist** (pass `--topic` to skip resolution / handle renamed names):

| Code | topic | Code | topic | Code | topic |
|---|---|---|---|---|---|
| ACUTAAS | 70483 | NEULANDLAB | 3680 | SAMHI | 136755 |
| SJS | 81564 | AARTIPHARM | 99098 | SHILPAMED | 210 |
| MCX | 326 | ENTERO | 199111 | SAILIFE | 206632 |
| NAVINFLUOR | 1691 | GRAVITA | 10324 | VENUSPIPES | 90194 |
| TDPOWERSYS | 2251 | TIMETECHNO | 6463 | JSLL | 106615 |
| SANSERA | 107060 | NH | 3849 | | |
| PRIVISCL | 76013 | NUVAMA | 144579 | | |

Renamed/demerged names the resolver needs help with: ACUTAAS=erst. **Ami Organics**, NUVAMA=erst. **Edelweiss Wealth**, AARTIPHARM=demerged from **Aarti Industries**, PRIVISCL=erst. **Privi Organics/Fairchem**. Pass `--company "<well-known name>"` or the `--topic` from the table.

### 3. Pull our read per company (sandbox to files)

Dump our substrates per code to `/tmp/vp_ourdata/<CODE>.json` so the compare is grounded in real data, not memory. Anon key is fine for these tables:

```bash
set -a; source concall-alpha/.env; set +a
U="$NEXT_PUBLIC_SUPABASE_URL"; K="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY"; H=(-H "apikey: $K" -H "Authorization: Bearer $K")
CODE=SANSERA
curl -s "$U/rest/v1/concall_analysis?select=quarter_label,fy,qtr,score,details&company_code=eq.$CODE&details->scoring_meta=not.is.null&order=fy.desc,qtr.desc&limit=1" "${H[@]}"  # latest ConcallScore (+rationale, score_breakdown, v4_categories)
curl -s "$U/rest/v1/moat_analysis?select=rating,tier,gatekeeper_answer,assessment_payload&company_code=eq.$CODE" "${H[@]}"
curl -s "$U/rest/v1/key_variables_snapshot?select=discovery_summary,section_synthesis,full_variable_list,deep_treatment&company_code=eq.$CODE" "${H[@]}"
curl -s "$U/rest/v1/business_snapshot?select=about_company,business_snapshot,revenue_engine,segment_profiles&company=eq.$CODE" "${H[@]}"   # NOTE key col = company, holds the CODE
curl -s "$U/rest/v1/guidance_snapshot?select=big_picture_growth_guidance,current_year_revenue_guidance,credibility_verdict,guidance_items&company_code=eq.$CODE" "${H[@]}"
```

**Always keep the `details->scoring_meta=not.is.null` filter** — rows without it are the retired pre-deterministic backlog and are hidden portal-wide.

### 4. Scrape the VP tail (per company)

```bash
node scripts/scrape-valuepickr-thread.mjs --topic 3680 --code NEULANDLAB --pages 3   # ~60 newest posts
node scripts/scrape-valuepickr-thread.mjs --company "Sansera Engineering" --pages 3  # resolve by name
```

For the full watchlist, fan out parallel subagents (~4 companies each): give each the `/tmp/vp_ourdata/<CODE>.json` path + the `--topic` id, and have it run the scraper and write the brief. Recent tail is where the current thesis lives; older deep-dives aren't re-read.

### 5. Compare — the model's job, grounded in both payloads

Per company, write a brief: **VP bull thesis / VP bear+risks / what VP fixates on (their key variables) / OUR read (score+moat+KVs+guidance) / AGREE / DISAGREE (with your judgment on who's better-informed) / NEW INFO VP has that we don't / CANDIDATE SYSTEM IMPROVEMENTS**. Cite post dates. Don't manufacture disagreement — many names simply agree; log those too.

### 6. Verify the highest-stakes claims before they go anywhere

Any claim that would change a score or land in a substrate (a rev-rec change, a plant incident, a market-share number, a promoter pledge) gets a primary-source pass — BSE/NSE filings, the AR, the actual concall, reputable news. Mark VERIFIED / PARTIAL / REFUTED. The forum's *forensics* are usually real; its *numbers* often aren't.

### 7. Roll up + write the doc

Rank the gaps by how many companies independently triggered them — that ordering is the system-improvement worklist. Write to `docs/valuepickr-vs-ours-<YYYY-MM-DD>.md` (don't overwrite a prior dated run): Part 1 ranked gaps, Part 2 per-company briefs, Part 3 where-we-win + thread map + verification table + caveats. Structure mirrors `docs/valuepickr-vs-ours-2026-07-26.md`.

### 8. Optional — the cash-quality dimension (build #1)

The #1 recurring gap from the last run (cash/earnings-quality) has a runnable classifier. It reproduces VP's cash-conversion concern deterministically from Screener financials:

```bash
cd concallyser && python3 scripts/scrape_screener_financials.py TDPOWERSYS ENTERO GRAVITA ...
```

Emits a `{ok,watch,poor}` flag per company (sandbox → `/tmp/sandbox_cashquality/`, no DB/score changes). A `poor` flag on a high ConcallScore is exactly the kind of divergence this skill exists to surface. Spec + acceptance test: `docs/build-1-cash-quality-substrate-spec.md`.

## Guardrails

- **Reading only.** Never post to VP ([[project_valuepickr_ban]]). This skill scrapes and compares; it does not publish.
- **VP numbers need a primary-source pass** before portal-visible; forensics/direction are the trustworthy layer, precise figures are not.
- **Honour our provenance** — unofficial scores may move; cross-provider levels aren't comparable ([[pipeline_provider_score_offset]]).
- **Don't over-correct toward the forum.** Our freshness + structured guidance-lineage genuinely beat stale/one-shot VP threads (NUVAMA, NAVINFLUOR last run). Note where *we* win.
- **Date the output doc** — each run is a dated snapshot, not an overwrite; the trail of gaps over time is the point.
- Throttle the scraper (built-in ~0.7s/request); don't parallelize requests against forum.valuepickr.com.

Related: `[[project_section_backfill_worklist]]` (our own coverage gaps), `[[external-take-tracker]]` (the X/Twitter sibling of this skill), `[[project_phase1_deterministic_scoring]]` (how the score we compare against is built).
