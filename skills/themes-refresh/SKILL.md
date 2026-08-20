---
name: themes-refresh
description: Use when the Hot Themes editorial tables (`theme` / `theme_membership`, rendered on /themes and /desk) should be reviewed and updated — a health check for broken/stale/large-cap memberships, plus missing-linkage suggestions for who else belongs. Membership only. Triggers on "refresh the themes", "update hot themes", "themes health check", "any themes to update?", "which themes are stale?", "who's missing from a theme?", "add <CODE> to <theme>".
---

# Themes Refresh (Hot Themes editorial maintenance)

Keep the two editorial tables current. **Themes carry no stored score** — every number on `/themes` and `/desk` joins live from the board at render (`lib/themes/data.ts` → `getOverallBoardRows`), so this skill never touches scores. It only maintains *which themes are featured and who belongs*.

Work from `concall-alpha/`. Writes are **service-role only** (`SUPABASE_SERVICE_ROLE_KEY` in `.env`) — RLS is public-read / no-write, so the anon key silently no-ops (`lib/supabase/hot_themes.sql`). The one render rule that governs everything: the board is built `getConcallData({ excludeLargeCaps: true, includeBelowCut: true })`, so an **admitted large-cap member is dropped at render** (never appears) while a **below-cut member renders greyed**. The script refuses large-cap adds for exactly this reason.

## Scope

| Do | Don't |
|---|---|
| Add / remove theme members; flag broken, stale, and non-rendering memberships | Create, bench, feature, reorder (`sort`), or re-blurb whole themes — that's hand-SQL (`lib/supabase/hot_themes.sql`) |
| Suggest missing members by sub-sector adjacency, ranked by stored composite | Auto-add suggestions — they are proposals the user trims |
| Audit drift/gaps by CURRENT driver (`--driver-drift`, `--un-themed`), then web-confirm | Move a member on a keyword hit alone — web-confirm segment mix + order context first |
| Bump `last_reviewed_at` when a thesis is re-confirmed | Bump it on re-score — freshness is editor-driven, not score-driven |
| Regenerate the seed `.sql` so the repo mirrors live | Treat the seed as the source of truth — the live DB is |

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

## Step 1 — Review suggestions (STOP for approval)

Open `/tmp/sandbox_themes/proposed.json` and **trim it to the pairs you endorse**. The suggestions are sub-sector-adjacency noise until a human confirms the thesis fit — most will be dropped. This is the gate; don't promote the raw file.

## Step 2 — Promote approved adds

```bash
node scripts/themes-refresh.mjs --apply             # dry-run: prints what it would write
node scripts/themes-refresh.mjs --apply --yes       # writes the upsert
```

Reads the trimmed `proposed.json` (or pass `--add theme:CODE,theme:CODE` for a quick one-off). Upserts on `(theme_slug, company_code)` with `as_of_quarter` = current reporting quarter. Orphan and large-cap pairs are refused with a printed reason — they can't render. To drop a member: `--remove theme:CODE --yes`.

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
- **AMBIGUOUS-with-no-home is a valid outcome — hold, don't force.** Some drifted names have no existing theme that fits (BHAGYANGR copper VAP mid-demerger, SENORES US generics, JMFINANCIL lending, KDDL luxury watches, GALAPREC multi-sector precision). Leave them where they are (or nowhere); creating a new theme for them is hand-SQL, out of scope. Never move a name into a wrong theme just to clear a flag.
- **Theme lifecycle is out of scope.** Creating a theme, flipping `is_featured`, changing `sort` (featured 1–8 vs benched 101+), or editing title/blurb is hand-SQL in the Supabase editor — the `--dump-seed` output shows the exact upsert shape to copy. (When a wave of members drift into a theme past its blurb — e.g. DC-power names into `ai-datacentre-fibre` — widen the blurb by hand so the card copy stops misdescribing them.)
- **Never run a write with the anon key.** `theme_membership` has no write policy; an anon upsert returns success but writes nothing (same trap as `valuation_check`). The script guards this by requiring `SUPABASE_SERVICE_ROLE_KEY`.
