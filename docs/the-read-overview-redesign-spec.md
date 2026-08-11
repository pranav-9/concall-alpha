# "The Read" — Company Overview Redesign Spec

Build-ready spec for the company-page Overview ("Overall Read"), from the
2026-08-08 sketch, hardened by `/plan-design-review` + `/plan-eng-review`
(incl. Codex outside voice). Replaces the current `OverviewCard`
(`app/company/components/overview-card.tsx`) three-band scorecard.

**Locked direction (D2 → A):** "The Read" reuses the **existing composite**
(`lib/board-read.ts`) — the same number and descriptive label that rank the
leaderboard. **No new "Bullish" verdict** (that reverses the locked
descriptive-not-prescriptive stance; a CEO-review-level change, out of scope).

**Locked architecture (eng D1 → A + Codex):** build one **`OverviewReadModel`**
in the cache layer holding every leg + the computed read; the component renders
from it. The valuation leg (0–10) is **added to the cache** so the company-page
Read equals the leaderboard Read exactly. Derivations do not live in the
component.

---

## 1. What already exists (reuse, do not rebuild)

| Need | Source | Status |
|---|---|---|
| The Read number + label + tooltip | `lib/board-read.ts` `computeBoardComposite` / `classifyBoardRead` / `BOARD_READS[].label/textClass` | ✅ reuse verbatim |
| Valuation → 0–10 rescale | `lib/valuation-band` (leaderboard already does this per row) | ✅ reuse, wire into cache |
| Valuation staleness (age + price-move) | `lib/valuation-check/normalize.ts` | ✅ reuse at read time |
| ConcallScore / rank / percentile | overview cache `latest_score`, `quarter_rank/total/percentile` | ✅ cached |
| Growth score / rank / scenarios | cache `growth_score/rank/total`; `lib/growth-outlook` `base/upside/downside_growth_pct`, `NormalizedGrowthScenario` | 🟡 fetched in builder, not in stored row |
| Moat call + tier | cache `moat_label`, `moat_tier_label` | ✅ cached |
| Key variables count + lead | cache `key_variable_count`, `overview_takeaways.keyVariableLead` | ✅ cached |
| Business segment mix | cache `business_segment_mix` | ✅ cached |
| Score bands / colors | `lib/score-band`, `lib/growth-band`, `lib/valuation-band` | ✅ reuse (single color language, see §8) |
| Surface classes | `surface-tokens.ts` | ✅ reuse |
| Section scroll-nav (untouched) | `SECTION_MAP`, `buildSidebarSections`, `useCompanyPageNavigation` | ✅ do not modify |
| Route loading state | `app/company/[code]/loading.tsx` | ✅ this is the real loading surface (§5) |

## 2. NOT in scope (deferred, with reason)

- Directional "Bullish/Bearish" verdict — reverses a locked stance; `/plan-ceo-review` if ever revisited.
- A second page-only composite folding in moat + guidance — reopens the rank-vs-Read disagreement `board-read.ts` warns against.
- Live valuation re-pricing — Phase 12 keeps its own cadence; the page only reflects freshness.
- Guidance credibility verdict (`guidance_verdict_key`, still hardcoded `null`) — replaced by the hit-rate (§7), not revived.
- Sidebar nav / `SECTION_MAP` changes — untouched.

## 3. Information architecture

Two tiers: the **claim** (The Read) on top, the **receipts** below.

```
┌─ HEADER ──────────────────────────────────────────────────────────┐
│ [CODE]  Company Name        [Small cap] [Sector]        [+ Track]  │
└───────────────────────────────────────────────────────────────────┘
┌─ THE READ (verdict band) ─────────────────────────────────────────┐
│ THE READ · Q1 FY27                                                 │
│  8.0   Balanced          one-line thesis (moat headline)   ◯7.8 ◯8.1 ◌— │
│  ↑board composite  ↑classifyBoardRead label               QTR GROW VAL │
└───────────────────────────────────────────────────────────────────┘
  SUPPORTING EVIDENCE
┌ Business ┐ ┌ Moat ┐ ┌ Key Variables ┐ ┌ Guidance ┐   ← 4 thin cards
┌ ConcallScore (wide) ──────┐ ┌ Future Growth (wide) ────────────┐
│ 7.8 +0.3   sparkline         │ │ 8.1   bear|base|bull range slider │
│ Q Rank 14/64 · Top 80%    →  │ │ Growth Rank 35/100 · scenarios →  │
└──────────────────────────────┘ └───────────────────────────────────┘
```

Constraint-worship (only 3): **The Read number+label**, **the three gauges**,
**the two wide performance cards**.

**Reconciliation note (corrected).** The Read number is bounded by the quality
legs when valuation is missing/fair, so it sits *between* the two gauges (e.g.
8.0 between 7.8 and 8.1) — never above both. Do **not** render it as "the biggest
number on the card." The **label is not deterministic from valuation-presence**:
`classifyBoardRead` can return `Balanced`, `Outlook-led`, or `Peaking` with a null
valuation, and only the strong/strong or soft/soft branches with null valuation
return `No price read`. Render whatever the classifier returns; never hardcode a
label from "valuation missing."

## 4. Component specs

### 4.0 Data adapter (build first)
`OverviewReadModel` assembled in `lib/company-overview-cache.ts` (persisted +
read via `selectColumns`), shape:
```
{ quarterScore, quarterLabel, quarterSeries[], qoqDelta,
  growthScore, growthScenarios{bear,base,bull},
  valuationScore, valuationPricedAsOf, valuationStale,
  read: { score, key, label, description } }  // read = classifyBoardRead output
```
The component receives this model. No board-read math, no delta math, no
band lookups inside the component beyond mapping a band → token.

### 4.1 The Read verdict band
- **Number:** `read.score`, 1 decimal, IBM Plex Mono ~3rem, neutral foreground (label carries tone).
- **Label:** `read.label` + `BOARD_READS[read.key].textClass`; tooltip = `read.description`.
- **Freshness:** `THE READ · {quarterLabel}` — **new cache field** (`quarter_label` is fetched today but not stored). Never render the band without it.
- **Thesis:** `overview_takeaways.moatHeadline`, ≤120 chars, `line-clamp-2`; omit line if null.
- **Gauges:** Quarterly / Growth / Valuation ring dials, numeral centered. Ring fill = band color from the matching `*-band` lib. Valuation empty/stale → §5.

### 4.2–4.4 Evidence + wide cards
- Evidence shells reuse `nestedDetailClass`. **One interactive target per card** (§6): the card is a link/button to its section; there is no separate nested action link inside a button.
- Quarterly: `read.qoqDelta` pill (↑green/↓red/flat slate) + `quarterSeries` sparkline (reuse `chart.tsx`). Footer `Q Rank {rank}/{total} · Top {round(percentile)}%`. **Percentile convention (locked):** `Top X%` = the percentile the row sits at; higher = better; one formula everywhere.
- Growth: `growthScenarios` bear|base|bull slider, base band shaded, values labeled. Footer `Growth Rank {rank}/{total} · see scenarios →`.

## 5. Interaction states (corrected — server-fetched surface)

The overview is server-rendered from an already-awaited model, so **per-card
loading spinners are unreachable**. Loading is the **route** boundary
(`app/company/[code]/loading.tsx`), not per card.

| Element | Loading (route) | Empty / not-scored | Stale | Error |
|---|---|---|---|---|
| The Read band | route skeleton | `<2` scored legs → number hidden, label "No read", thesis omitted | freshness tag shows the quarter | page throws → route `error.tsx` (add one) |
| Quarterly card | route skeleton | "Not scored yet" + `MissingSectionRequestButton` | unofficial-quarter chip kept | route error boundary |
| Growth card | route skeleton | "Not scored yet" | one-call-behind: show, no flag | — |
| Valuation gauge | route skeleton | **"—" + "Not priced"** | `valuationStale` (age or price-move, assessed at read time) → dashed ring + "Stale" | dashed ring |
| Evidence card | route skeleton | quiet **"Not scored yet"** in-shell, never blank (fixes today's hollow tiles) | — | muted note |

Add `app/company/[code]/error.tsx` — today an overview throw has no boundary.

## 6. Responsive & a11y

- **≥1024:** as drawn. **768–1023:** gauges inline, evidence 2×2, wide cards stack. **≤767:** Read number+label full-width; gauges a **horizontal 3-up ring row** (not stacked); evidence 1-up; wide cards 1-up. Re-flow, don't shrink.
- Touch targets ≥44px. **One interactive element per card** — no `<button>`-inside-`<button>` / link-inside-button (invalid + double focus stop). Card shell is the link/button.
- Gauges `role="img"` + `aria-label="Quarterly 7.8 of 10"`. Color never the only encoding: numerals on rings, text labels on the slider, ↑/↓ glyph on the delta. Meets 4.5:1.

## 7. Data sources & derivations

| Signal | Derivation | Priority |
|---|---|---|
| The Read # + label | `classifyBoardRead(quarterScore, growthScore, valuationScore)` in the cache builder | P1 |
| **Valuation 0–10** | fetch + `valuation-band` rescale in `buildCompanyPageOverviewCacheRow`; store `valuation_score`, `valuation_priced_as_of` | **P1 (was the blocker)** |
| Freshness quarter | store `quarter_label` (fetched, not stored today) | **P1** |
| QoQ delta + sparkline | from the 12 quarters already fetched; store `qoq_delta`, `quarter_series` | **P1** |
| Growth bear/base/bull | store `growth_scenarios` (fetched in builder, not in row) | **P1** |
| **Guidance "Resolved N · met M"** | dedup `guidance_tracking` by `guidance_key` (latest row per key); `resolved` = status in {met,missed,delayed,revised,dropped}, `met` = status `met`; exclude `active`/`not_yet_clear` from resolved. Store both counts. | 🔴 net-new, product-defined |

**Every new field must be added to the DDL, to `selectColumns` (cache.ts:665),
and to `CompanyPageOverviewCacheRow` — the page reads only `selectColumns`.**
Then `notify pgrst, 'reload schema'`. This is the data contract, and it is P1,
not polish.

**Guidance label:** "Resolved N · met M" (not "Guided/hit" — an active item isn't
a miss). If useful, show open count separately.

## Implementation Tasks
P1 blocks ship; P2 same branch; P3 follow-up.

- [ ] **T1 (P1, human: ~4h / CC: ~20min)** — cache — Build `OverviewReadModel` + DDL for `valuation_score`, `valuation_priced_as_of`, `quarter_label`, `qoq_delta`, `quarter_series`, `growth_scenarios`; add all to `selectColumns` + row type; `notify pgrst`.
  - Surfaced by: Eng arch D1 + Codex — page reads only `selectColumns`. Files: `lib/company-overview-cache.ts`, `docs/migrations/`. Verify: fields non-null after refresh for 3 companies.
- [ ] **T2 (P1, human: ~1d / CC: ~30min)** — `overview-the-read.tsx` — Verdict band (number + `read.label` + freshness + thesis + 3 ring gauges) rendering from the model.
  - Verify: renders 8.0 · classifier label for a no-valuation company; number between gauges.
- [ ] **T3 (P1, human: ~1d / CC: ~30min)** — cards — 4 thin + 2 wide (sparkline+delta, bear/base/bull). One interactive target per card.
  - Verify: no nested interactive controls; delta sign + percentile convention correct.
- [ ] **T4 (P1, human: ~4h / CC: ~20min)** — states — route `loading.tsx` reuse + new `error.tsx`; "Not scored yet" per card; valuation stale/empty; read-time staleness.
  - Verify: null-guidance company shows a note, not a blank tile; a thrown overview hits `error.tsx`.
- [ ] **T5 (P1, human: ~4h / CC: ~20min)** — responsive/a11y — mobile 3-up gauge row, 44px targets, `role="img"` labels, single color language.
  - Verify: 390px no horizontal scroll; one tab stop per card.
- [ ] **T6 (P1, human: ~3h / CC: ~20min)** — tests — assert page Read == `classifyBoardRead` for shared inputs (no re-impl); unit-test the guidance dedup+count derivation; QoQ-delta sign test. Extend `tests/board-read.test.ts` pattern.
- [ ] **T-DATA-1 (P3, DEFERRED 2026-08-08) — pipeline** — "Resolved N · met M" derivation + cache column, dedup by `guidance_key`.
  - Deferred by user 2026-08-08. v1 ships the Guidance evidence card with today's "N items" count; the hit-rate signal is a follow-up. Verify (when built): counts match a hand-count for 3 companies via unit test.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 1 | issues_found | 11 findings, all folded into spec |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_open | 4 issues (1 P1 arch, 3 P2), 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | score 5/10 → 8/10, 1 decision |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **CODEX:** confirmed the valuation-leg blocker; added the data-contract-is-P1 finding (page reads only `selectColumns`), the false "No price read" reconciliation, unreachable per-card loading, invalid nested controls, and the `OverviewReadModel` view-model architecture. All folded in.
- **CROSS-MODEL:** no tension — Codex extended the eng review, no contradictions.
- **VERDICT:** ENG + DESIGN reviewed, direction and architecture locked (reuse composite; view-model; valuation in cache). Guidance hit-rate deferred to a follow-up (2026-08-08). T1–T6 ready to implement.

NO UNRESOLVED DECISIONS
