---
name: themes-refresh
description: Use when the Hot Themes editorial tables (`theme` / `theme_membership`, rendered on /themes and /desk) should be brought up to date — an AUTONOMOUS research pass over every demand substrate we hold (concall industry-context and guidance notes, growth catalysts, guidance trend, order wins, the broker research-report archive) that finds where demand is unusually strong across several covered companies, then does the theme CRUD itself (create / feature / bench / reorder / re-blurb / hotness) and the membership adds, with the user informed, not gated. Also the plain health check and one-off member or lifecycle edits. Triggers on "check hot themes", "refresh the themes", "update hot themes", "what themes are hot", "find new themes", "run the themes research", "themes health check", "any themes to update?", "who's missing from a theme?", "add <CODE> to <theme>", "create a theme for <X>", "feature / bench <theme>", "reorder the themes", "rewrite the blurb on <theme>", "set hotness on <theme>".
---

# Themes Refresh (Hot Themes editorial maintenance)

Keep the two editorial tables current. **Themes carry no stored score** — every number on `/themes` and `/desk` joins live from the board at render (`lib/themes/data.ts` → `getOverallBoardRows`), so this skill never touches scores. It only maintains *which themes are featured and who belongs*.

Work from `concall-alpha/`. Writes are **service-role only** (`SUPABASE_SERVICE_ROLE_KEY` in `.env`) — RLS is public-read / no-write, so the anon key silently no-ops (`lib/supabase/hot_themes.sql`). The one render rule that governs everything: the board is built `getConcallData({ excludeLargeCaps: true, includeBelowCut: true })`, so an **admitted large-cap member is dropped at render** (never appears) while a **below-cut member renders greyed**. The script refuses large-cap adds for exactly this reason.

**Operating principle (user decision 2026-10-16): the skill owns theme selection.** The user does not want to pick themes or members. Run the research pass (Step R), make the calls by the rules in Step 1, do the writes (dry-run echo, then `--yes`), and report what changed with the evidence per theme. Ask only when a write is destructive (`--theme-delete`) or the evidence is genuinely contradictory. Never hand back a menu.

## The loop

1. **Step R — research**: `node scripts/themes-discover.mjs` → evidence cards + clusters + the street's thematic notes. Read it; pull a broker PDF from R2 when a cluster needs confirming.
2. **Step 0 — health**: `node scripts/themes-refresh.mjs` → integrity / staleness / sub-sector adjacency.
3. **Step 1 — decide** by the rules below (create / feature / bench / hotness / members / blurbs).
4. **Steps 2–2b — write**: each change dry-run, then `--yes`. **Step 3** touch what you re-confirmed. **Step 4** `--dump-seed`. **Step 5** verify + report.

## Scope

| Do | Don't |
|---|---|
| Add / remove theme members; flag broken, stale, and non-rendering memberships | Write to `theme_membership` by hand-SQL — the script is the one path, and it logs every write |
| Create, feature, bench, reorder, re-blurb, set hotness on, or delete whole themes (Step 2b: `--theme-create`, `--feature`, `--bench`, `--reorder`, `--theme-set`, `--theme-delete`) | Skip the dry-run, or delete a theme that still has members (the script refuses; `--remove` them or `--bench` instead) |
| Research where demand is unusually strong (`themes-discover.mjs`) and decide the themes and members yourself | Hand the user a list to pick from — the decision and its rationale are the deliverable |
| Suggest missing members by sub-sector adjacency, ranked by stored composite | Add a sub-sector-adjacency suggestion without a demand read in its evidence card |
| Audit drift/gaps by CURRENT driver (`--driver-drift`, `--un-themed`), then web-confirm | Move a member on a keyword hit alone — web-confirm segment mix + order context first |
| Bump `last_reviewed_at` when a thesis is re-confirmed | Bump it on re-score — freshness is editor-driven, not score-driven |
| Regenerate the seed `.sql` so the repo mirrors live | Treat the seed as the source of truth — the live DB is |

## Step R — Research pass (`themes-discover.mjs`, no writes)

```bash
node scripts/themes-discover.mjs                 # 90-day window; --days N; --company CODE prints one full card
```

Builds one **evidence card** per covered company (227 on 2026-10-16) from every demand substrate we hold, scores a transparent **demand heat 0–10** with its parts printed, clusters the cards against the theme signatures (`scripts/themes-signatures.mjs`: `DRIFT_SIGNATURES` for themes that exist, `CANDIDATE_SIGNATURES` for ones that don't yet), and writes `/tmp/sandbox_themes/discover.json`.

| Substrate | What the card takes | Heat |
|---|---|---|
| `concall_analysis` (latest print vs prior) | score delta, `cat_4_industry_context` + `cat_2_forward_guidance` key points | up ≥0.5 +2 · up +1 · down ≥0.5 −1 · score ≥7 +1 |
| `guidance_snapshot.current_year_revenue_guidance` | `signal_trend` | upgraded +2 · moderated −1 |
| `bse_announcements` (window) | order wins with `pct_of_mcap`, positive / negative filings | any order +1 · one ≥5% or total ≥10% of mcap +2 · negatives −1 |
| `growth_outlook` (latest run) | growth score, top-3 catalysts by selection rank | score ≥7 +1 · a `ramping` catalyst +1 |
| broker ledger `data/external-takes/broker-reports.jsonl` | covered notes in window, direction, claims | ≥2 notes +1 · ≥4 +2 · any DOWNSIDE −1 |
| manifest `../concallyser/data/research-reports/manifest.jsonl` | `sector_or_thematic` captions = the street's theme language | (report only) |

The report prints: **roster heat per existing theme** (mean heat of listed members, hot / cold members, a suggested hotness), **clusters** (every company whose card hits a signature ≥2 times, heat-sorted, with its current themes — `NEW?` = a candidate signature), the **hottest 25**, and the **street's thematic notes by signature** plus the unmatched ones (read those: a recurring unmatched sector note is a theme we have no vocabulary for — add a `CANDIDATE_SIGNATURES` entry).

**Reading it honestly.** Heat is a prompt, not a verdict: a stale latest print (SUZLON / WAAREEENER were still on Q2 FY26 on 2026-10-16) caps heat at ~3 even when the street and the filings say the demand is there, so read the card's `industry` / `guidance` lines and the order list, not just the number. Keyword clusters over-flag (`chip` trips a chemicals call; `api` trips everything) — the card's `sigs` shows which words hit, so you can discount. When a cluster is new and would be featured, **confirm it against the archive**: pick the most-read `sector_or_thematic` notes on the driver from the manifest, `resolve_report(file)` from `concallyser/app/research_reports/r2_store.py` (R2 → local cache), `pdftotext -l 4 -layout`, and read the first pages. The report fetch (`/research-reports-refresh` Step 1) should be current; run it first when the manifest's last date is more than a week old.

## Step 0 — Health report (no writes)

```bash
node scripts/themes-refresh.mjs            # add --stale-days N to tighten the threshold (default 90)
```

Reads `theme`, `theme_membership`, `company` and prints:
- **Integrity** — members that will NOT render: orphans (code not in `company`) and admitted large-caps. Zero is the healthy state.
- **Staleness** — each membership whose `last_reviewed_at` is older than the threshold, listed individually as `theme / CODE (Nd old)` (never-reviewed first), so a single stale member is targetable with `--touch <theme>:<CODE>` instead of re-stamping the whole theme.
- **Per-theme summary** — member / scored / below-cut counts, featured vs benched.
- **Missing-linkage suggestions** — same-sub-sector non-members ranked by stored `composite_score`, each annotated `listed` / `below-cut (greyed)` / `large-cap (DROPPED)`. Heuristic: it catches same-sub-sector names, **not** cross-sector thematic members (NETWEB in AI-datacentre, GPIL/WELCORP in metals) — those stay human judgment.

Listed candidates are staged to `/tmp/sandbox_themes/proposed.json`.

## Step 0b — Driver-drift + coverage-gap audit (periodic, deeper than Step 0)

Step 0's suggestion engine only matches by **sub_sector adjacency**, so it structurally misses two things: (1) an existing member whose **current earnings driver has migrated to a different theme** (TDPS `transmission-grid`→`ai-datacentre`, KSHINTL `cables`→`grid`, ACUTAAS `specialty-chem`→`cdmo` were all found this way — none would ever surface in Step 0), and (2) an un-themed covered company that now **fits an existing theme** (SHREEREF→`defence`). Run these when you want a thorough pass, not just the health check.

```bash
node scripts/themes-refresh.mjs --driver-drift   # existing members: is the CURRENT driver still this theme?
node scripts/themes-refresh.mjs --un-themed      # non-members: does anyone now fit a theme?
```

Both keyword-scan each company's latest `concall_analysis` + `growth_outlook` catalysts against every theme's signature (`DRIFT_SIGNATURES` in the script). **They are Stage-1 triage that over-flags ~7:1** — a chem call trips "contract manufacturing"; an EMS name that serves auto trips auto-components; stale source data (an old `quarter_label`) throws junk hits. A flag is a *candidate to confirm*, never a move.

**The membership decision runs on a three-stage funnel — this is the proven method:**
1. **Internal scan (free, above).** Narrows the fleet to a handful of suspects. Prune hard.
2. **Web-confirm (the decisive step).** For each surviving suspect, web-search `"<name> Q1FY27 results growth driver 2026"`. **Web is what actually makes the call** because membership turns on *segment-revenue mix* + *external order/demand context* — data our own extraction doesn't reliably carry (TDPS's INNIO 1.1GW DC order and "93% export" split; NAVINFLUOR's Specialty-still-largest-vs-CDMO-fastest segment mix). Fan out parallel agents for a whole-fleet pass. Cross-check hype against our filings (TDPS mgmt: "no India hyperscaler demand" — nuance the bullish articles omit).
3. **Human gate.** DRIFT with a clear alt theme → move (`--remove` old + `--add` new). AMBIGUOUS with no clean home → hold (don't move to a wrong theme just to clear the flag). A name legitimately driven by two themes it's filed in → dual-home (`--add` the second, keep the first). Never auto-move on a keyword hit.

## Step 1 — Decide (the editor's rules; no approval gate)

Make every call from the Step R cards + Step 0 health, write the rationale into the run report, then write. The rules, in the order they were set (2026-10-16 first autonomous pass — created `renewables-build-out` (featured) and `semiconductor-supply-chain` (benched), featured `jewellery-gold-retail` and `ems`, benched `metals-mining-upcycle` and `auto-components-premiumisation`, re-set hotness across the board, added AEROFLEX / ETHOSLTD / the renewables and semiconductor rosters). **Re-run Step R after a script fix before acting on it** — the first pass picked each company's latest print by scoring date and read SUZLON on a year-old quarter; the (fy, qtr) fix moved its true print to Q1 FY27 at 5.4 and changed the renewables call from hotness 3 to 2.

- **Create a theme** when ≥3 **discovery-listed** names share one demand driver that no existing theme covers, at least two show real evidence (an upgraded guide, order wins ≥5% of mcap, a print up ≥0.5, or the street initiating on the driver), and the archive confirms the sector story. One hot name is a company story, not a theme. Create it **featured** when those bars are met; benched when the names are there but the evidence is thin. Add a `DRIFT_SIGNATURES` entry under the same slug in `scripts/themes-signatures.mjs` in the same change.
- **Feature a benched theme** when its listed members' mean heat is ≥ the weakest featured theme's and it has ≥3 listed members with a current driver. **Bench a featured theme** when no listed member is hot (heat ≥5), the mean is ≤2.5, and the blurb itself describes a cooling cycle — the section is for unusually strong demand, not for marking time. Benching clears nothing; members stay.
- **Hotness (1–5)** is hand-set from the roster's evidence, roughly mean heat ÷ 1.6, bounded by judgement: 5 only for the theme where most members print upgrades and orders at once (ai-datacentre-fibre on 2026-10-16); 2 for a theme carried by one or two names. It is the PRIMARY board key, so set it before you reorder. Benched themes carry `none`.
- **Members**: add an un-themed listed name whose card's industry / guidance lines name the theme's driver as its own (AEROFLEX's liquid-cooling skids → ai-datacentre-fibre), dual-home a name legitimately driven by two themes (ADVAIT grid + renewables), hold a hot name whose driver has no theme (DEEDEV thermal piping, KMEW ports, COFORGE, INTERARCH industrial sheds on 2026-10-16 — list them in the report as "no home yet" so the next pass sees them). Never move a well-placed name on adjacency; never remove a member for a cold print alone — membership is about the driver, heat is about the quarter.
- **Blurbs** are the one-line "why now": dated numbers from the cards (a guide, an install figure, an order as % of mcap), the roster's mechanism, and the one thing to watch. One to three sentences. Re-write a featured theme's blurb whenever its hotness moves or a wave of members changes what it describes.
- **Stories** (`data/themes/stories.json`, schema `/schemas/theme_story_v1.json`) are the card's DRIVING FACTOR + up to three KPI tiles, each a sourced macro figure from the evidence cards' `industry` lines (a hyperscaler capex estimate, an installs run-rate, an order book in years) with an optional short series (actuals, then estimates — never padded). Every featured theme should have one; write it when you create or feature a theme, refresh a tile when a newer call restates the figure, and cite the call in `source.note`. They ship in the repo (a PR), not through the script — `tests/theme-story.test.ts` rejects an invalid entry at build time.
- **Order**: hotness desc, then `--reorder` inside each band by mean heat. The warning that hotness differs is expected.
- **Report** (the user reads only this): per theme changed — what, the two or three evidence lines that decided it, and what would reverse it; the no-home list; the next pass's open questions (stale prints to refresh, a candidate signature to add).

## Step 2 — Write the approved adds

```bash
node scripts/themes-refresh.mjs --apply             # dry-run: prints what it would write
node scripts/themes-refresh.mjs --apply --yes       # writes the upsert
```

Pass `--add theme:CODE,theme:CODE` with the pairs Step 1 decided (the sub-sector `proposed.json` from Step 0 is a candidate list, not a worklist — only pairs with a demand read in their card go in). Upserts on `(theme_slug, company_code)` with `as_of_quarter` = current reporting quarter. Orphan and large-cap pairs are refused with a printed reason — they can't render. To drop a member: `--remove theme:CODE --yes`.

## Step 2b — Theme lifecycle (create / feature / bench / reorder / re-blurb / hotness / delete)

All lifecycle commands are **dry-run by default**; `--yes` writes with the service role and appends to the run log. Only **featured** themes render anywhere (`lib/themes/data.ts` filters `is_featured = true`). Board order on `/themes` and `/desk` is **`hotness` desc (nulls last), then `sort`** — so `sort` only breaks ties inside one hotness band. To move a theme up the board, set its hotness; to settle order among equals, reorder. Convention: featured themes sit at `sort` 1..N, benched at 101+.

```bash
node scripts/themes-refresh.mjs --list-themes                       # render order, member counts, hotness — start here

# create (benched by default; add --featured to publish at once). Then --add members.
node scripts/themes-refresh.mjs --theme-create dc-cooling --title "Data-centre cooling" \
  --blurb "Liquid-cooling and HVAC names guiding to hyperscaler-led demand." --hotness 3 --yes
node scripts/themes-refresh.mjs --add dc-cooling:AEROFLEX --yes

# publish / unpublish — picks the next slot (featured 1..N / benched 101+) unless --sort is given
node scripts/themes-refresh.mjs --feature dc-cooling --yes
node scripts/themes-refresh.mjs --bench cables-wires --yes

# order among the featured — must list EVERY featured slug, position = sort
node scripts/themes-refresh.mjs --reorder ai-datacentre-fibre,defence-order-inflows,metals-mining-upcycle,... --yes

# re-blurb / retitle / hotness (1-5 or "none") / explicit sort
node scripts/themes-refresh.mjs --theme-set metals-mining-upcycle --blurb "..." --yes
node scripts/themes-refresh.mjs --theme-set ems --hotness 4 --yes

# delete — refused while the theme has members (the FK cascade would drop them silently)
node scripts/themes-refresh.mjs --theme-delete dc-cooling --yes
```

Guards the script applies: slug must be `[a-z0-9-]`; a duplicate slug on create is refused; `--feature` on a 0-member theme warns (it renders as an empty block); `--reorder` warns when hotness differs across the list (the order will not hold across bands); `--theme-set --sort >= 100` on a featured theme warns (use `--bench`); `--theme-create` reminds you to add a `DRIFT_SIGNATURES` entry so `--driver-drift` / `--un-themed` can scan the new theme. After a lifecycle write, run `--dump-seed` (Step 4) — the seed carries `hotness` too.

**Blurbs are the one-line "why now" claim.** Keep them to one or two sentences, dated by the quarter they describe, and re-check them against the street each season (the 2026-09-12 audit found 7 of 13 contradicted). When a wave of members drift into a theme past its blurb (DC-power names into `ai-datacentre-fibre`), widen it with `--theme-set <slug> --blurb "..."` so the card copy stops misdescribing them.

## Step 3 — Re-confirm stale themes

When a theme's thesis still holds but its `last_reviewed_at` is old, bump it without adding members. Touch a whole theme, or a single member when only one row is stale (touching the theme would falsely re-stamp the fresh ones):

```bash
node scripts/themes-refresh.mjs --touch <theme-slug> --yes          # whole theme
node scripts/themes-refresh.mjs --touch <theme-slug>:<CODE> --yes   # one member
```

A no-match slug/code warns `touched 0 rows` rather than silently succeeding.

## Step 4 — Regenerate the seed

```bash
node scripts/themes-refresh.mjs --dump-seed
```

Writes `lib/supabase/hot_themes_seed_<YYYY_MM_DD>.sql` from live in the existing idempotent-upsert format. The live DB is already changed by Steps 2–3 (service role); the seed is documentation / rebuild path, applied by hand only if reconstructing. No `notify pgrst` needed for data-only writes — that's a DDL concern.

## Step 5 — Verify + run log

`/themes` and `/desk` render per request (no ISR cache), so a hard reload shows the change immediately. Confirm a newly-added member appears (and is not greyed unless it's below-cut). The script appends a line to `scripts/themes_refresh_runs.md` on every write.

## Known potholes

- **Large-cap members render nowhere.** BSE, POLYCAB, POWERGRID, BEL, TATASTEEL are archetypal for their themes but are large-cap — the board excludes them, so they'd silently vanish. Never "fix a gap" by adding one; the script refuses them.
- **The sub-sector heuristic is noisy and incomplete.** It over-suggests (auto-components pulls in generic "Industrial Products" names) and under-suggests (misses cross-sector members). It's a prompt for human review, not a worklist. `--wide` widens matching to the `sector` level (catches same-sector, different-sub_sector names, e.g. Heavy Electrical + Cables under a grid theme) at the cost of more noise — genuinely cross-sector members (a defence name in a metals theme) still stay human-only. Opt-in; default stays sub_sector.
- **Match the theme's *thesis*, not the sub_sector *label*.** The candidate list ranks by `sub_sector`, but one label lumps distinct theses: `"Cables - Electricals"` covers optical-fibre names (HFCL, STLTECH) *and* power-cable names (KEI, RRKABEL), while `cables-wires` is specifically a power-cable/grid thesis and those fibre names belong in `ai-datacentre-fibre`. The report prints each theme's `thesis:` line above its candidates for exactly this reason — read it and reject candidates that fail the thesis even when the label matches.
- **A candidate flagged `already in: <theme>` is usually already correctly placed — don't move it.** The report annotates any candidate that's a member of another theme. This is almost always the *right* home surfacing as adjacency noise elsewhere (HFCL/STLTECH in `ai-datacentre-fibre` appearing under `cables-wires`; VINYAS/AIMTRON in `ems` appearing under metals). Before proposing an add, check membership: don't re-add a name to a theme it's already in (a silent no-op), and don't move a well-placed name on sub-sector adjacency alone.
- **Judge candidates against the theme's *actual roster*, not just its label or blurb — themes are built broader than their names.** `metals-mining-upcycle` holds steel-tube/pipe converters (APLAPOLLO, SAMBHV, WELCORP, VENUSPIPES), not only integrated miners; `cdmo-crams` holds integrated API+formulations names (LAURUSLABS, GLAND, SHILPAMED), not only pure CRAMS; `ai-datacentre-fibre` now spans a full **DC supply chain** — fibre + compute + **power** (TDPS gensets, MTARTECH Bloom fuel cells, SCHNEIDER switchgear) and DC **cooling** is emerging (AEROFLEX). Pull the roster (`--driver-drift` prints each member's filed themes) before rejecting a candidate for "not matching the thesis."
- **AMBIGUOUS-with-no-home is a valid outcome — hold, don't force.** Some drifted names have no existing theme that fits (BHAGYANGR copper VAP mid-demerger, SENORES US generics, JMFINANCIL lending, KDDL luxury watches, GALAPREC multi-sector precision). Leave them where they are (or nowhere). A new theme (`--theme-create`, benched) is only worth it once three or more covered names share the driver — one name is a company story, not a theme. Never move a name into a wrong theme just to clear a flag.
- **Lifecycle writes are editorial, not mechanical — dry-run, read the echo, then `--yes`.** Featuring publishes a block to `/themes` and `/desk` on the next request (no ISR); benching removes it the same way. `hotness` is the primary ordering key and is hand-set per results season — never derive it from scores. A delete is only reversible from the last seed file, so prefer `--bench`. `theme.updated_at` is the date the In Focus meter prints as "Updated …" — the script bumps it only on a hotness change, never on a blurb / sort / feature edit. Lifecycle used to be hand-SQL in the Supabase editor; the `--dump-seed` output shows the upsert shape if you ever need to rebuild.
- **Never run a write with the anon key.** `theme_membership` has no write policy; an anon upsert returns success but writes nothing (same trap as `valuation_check`). The script guards this by requiring `SUPABASE_SERVICE_ROLE_KEY`.
