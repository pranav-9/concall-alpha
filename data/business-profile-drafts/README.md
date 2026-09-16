# Business profile pilots — reviewed and published

Prepared and user-approved on 16 September 2026 for NEULANDLAB and CARTRADE.
These files preserve the exact reviewed draft envelopes (including their original
`review_status`) for audit; both backgrounds were promoted to Supabase that day.
They are not test fixtures or a production data override. The development-only route
`/dev/business-snapshot?company=NEULANDLAB` (or `CARTRADE`) renders them. No loader
or production company route imports them.

Scope: replace/review `about_company` only. Existing revenue breakdown, financial
history, moat and other analysis should not be overwritten with this draft
envelope. `about_sources`, source dates and review status are review metadata,
not new database columns. Preserve them in an audit trail at promotion time.

Both drafts were first written under `/tmp/sandbox_business_profile/`, checked
against `concallyser/schemas/business_profile.schema.json` and the producer's
Pydantic models, then copied here to make the preview durable. Content was read
from issuer source texts and checked against original PDF charts where required.

## Neuland

- Source: Q1 FY27 presentation dated 5 August 2026, and the 5 August call filed
  on 10 August. Citation slide numbers are the printed slide numbers (PDF page
  numbers include a one-page filing cover).
- Timeline: presentation slide 15, visually checked. Unit III acquisition in
  2018 is distinct from its 2021 commercialisation. The new peptide facility's
  2025 groundbreaking does not establish that it has commissioned.
- Customer concentration and mix: slide 9, visually checked. Overall top five
  = 70%, top ten = 77%; CMS top five = 96%. CMS share = 44% in Q1 FY26 and 67%
  in Q1 FY27. Rounded reported shares are not forced to sum to 100%.
- CMS commercial revenue and project count: slide 10. ₹120 crore → ₹418 crore
  is the Q1 year-on-year comparison, not sequential growth. 99 active projects
  includes 19 commercial API/intermediate projects, not 99 approved medicines.
- Footprint: slides 12/17; 256 + 389 + 581 = 1,226 kL. Capacity is not utilisation.
- Geography: 92% exports (slide 13) differs from the end-market basis on slide
  16 (Europe 50%, North America 42%). No implied geographic reconciliation.
- R&D: slide 18, with active US DMFs from slide 13. 406 people is the Q1 FY27
  R&D team, not the earlier 434 figure. DMF filings are not drug approvals.
- Expansion: call p. 7 says commissioning "next month" (September relative to
  the August call); slide 18 describes the future 140,000 sq ft R&D centre.
  The draft does not claim either opening has subsequently occurred.

## CarTrade

- Source: Q1 FY27 presentation dated 29 July 2026; 29 July call filed 5 August
  2026. The cached transcript filename says 1 August, but its actual filing cover
  says 5 August; the draft uses the document's dates.
- Timeline: official website's Key Milestones and Q4 FY24 presentation slide 3,
  visually checked. 2010 is labelled business launch, not legal incorporation.
  The SAMIL stake is described as control, avoiding the presentation's separate
  51% / 55.43% footnote bases. The OLX purchase price is omitted because this
  source set was not used to verify the screenshot's amount.
- 2026 milestones: Q1 presentation slides 10/12 explicitly report the Spinny
  announcement and new-auto AI Assist launch. These do not establish that all
  AI features or buyer monetisation plans are complete.
- Audience / traffic / footprint: slide 5. ~80 million is reported across
  platforms; no cross-brand deduplication is established. The 500+ network
  count has a different named scope from the 550+ abSure/Signature figure on
  slide 10, so those numbers are not combined or treated as a growth series.
- Monetisation: call pp. 5/8. Listing fees are established; transaction/margin
  sharing and the future move of all business buyers to paid products are
  distinguished from revenue already earned. No revenue forecast is inferred.

## Review boundaries

Only the two approved backgrounds were promoted. The promotion script backed up
the prior rows, guarded against concurrent changes, and verified that existing
financial blocks and generation dates were preserved. No all-company backfill
was performed. These profiles do not revalidate older stored financial tables. The pilot preview therefore shows the background being reviewed without
mixing it with synthetic financials or unreviewed older snapshot blocks.

Promotion: `concallyser/scripts/promote_business_profile.py`; local rollback
backup: `concallyser/data/analysis/business_profile_backups/pilots_20260916.json`.
Sources and review timestamp are recorded in `details.business_profile_review`.
