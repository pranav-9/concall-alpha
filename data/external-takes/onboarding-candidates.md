# Onboarding candidates from the take funnel

Names that **tracked X accounts discuss but we don't cover**, surfaced by the P2 funnel in
`sweep-external-takes.mjs` and triaged against the `company` table. Regenerate with:

```bash
node scripts/sweep-external-takes.mjs --days 800   # see the `funnel` array
```

**Caveat:** the cross-check matches by name/code and has abbreviation blind spots (e.g. `#tril`
is TARIL, which we already cover). Treat every row as *needs a 10-second eyeball*, not gospel.
Apply the mid/small-cap coverage mandate before onboarding — large caps below are out of scope by
policy, not oversight.

_Last swept: 2026-07-26 · watchlist: equities_samjho, ishmohit1, soicfinance, LearningEleven,
suru27, prabhakarkudva._

## Mid/small-cap candidates — fit the mandate, worth onboarding

| Name | Theme / why it surfaced | Notes |
|---|---|---|
| **Skipper** | T&D equipment | Sits on the transformer/TARIL theme the accounts already track |
| **Action Construction Equipment (ACE)** | Cranes / infra capex | |
| **Anant Raj** | Data-centre real estate | From LearningEleven's data-centre value-chain thread |
| **India Shelter Finance** | Affordable housing finance | |
| **Home First Finance** | Affordable housing finance | |
| **KPI Green Energy** | Solar / renewables | #kpigreen; Farukh Patel mgmt |
| **EPACK Durable** | EMS / contract manufacturing | #epack / #epackdurable |
| **Pennar Industries** | PEB / engineering | PEB theme (peer to covered INTERARCH) |
| **MB Engineering** | PEB / engineering | PEB theme |
| **Indo Count** | Home textiles | |
| **Welspun Living** | Home textiles | |
| **Sky Gold** | Jewellery (small-cap) | |
| **SG Mart** | Steel/building-material distribution | |
| **IEX (Indian Energy Exchange)** | Power exchange | Verify cap band |
| **Sammaan Capital** | Housing finance | Post-restructuring (ex-Indiabulls) — verify cap band, likely borderline |

## Already in our universe — not new (skip)

| Hashtag | In DB as | Status |
|---|---|---|
| #jmfinancial | JMFINANCIL | Covered |
| #kalyan | KALYANKJIL | Covered |
| #tril | TARIL | Covered (abbrev — matcher missed) |
| #pgelectroplast | PGEL | Excluded (below composite cut) |

## Out-of-scope large caps — skip (violate mid/small-cap mandate)

Titan · Tata Technologies · Tata Elxsi · KPIT · Motilal Oswal · IDFC First Bank · AU Small Finance
Bank · Equitas Small Finance Bank · Poonawalla Fincorp.

## Next step

Run the mid/small-cap shortlist through the onboarding workflow (scrape + all phases +
`compute_composite_score`) to see which clear the coverage bar. See
`[[project_new_company_onboarding_workflow]]` and `[[project_replacement_candidates_2026_06_26]]`.
