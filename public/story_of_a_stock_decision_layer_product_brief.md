# Story of a Stock — Decision Layer Product Brief

**Purpose:**  
This document captures the product review and feature-direction discussion for **Story of a Stock / Concall Alpha**. It is intended to be fed into a builder agent responsible for designing and implementing the next set of features.

**Core conclusion:**  
The product has already built a meaningful **research generation layer**. The next major value unlock is not “more research sections,” but making the existing research more useful through a stronger **Decision Layer** and more believable through a stronger **Trust Layer**.

---

## 1. Product Context

Story of a Stock is a concall-driven Indian equity research portal. It converts company documents, concalls, management commentary, presentations, annual reports, and structured LLM outputs into company research pages.

Current product sections include, depending on company coverage:

- Company overview
- Industry context
- Sub-sector analysis
- Business snapshot
- Quarterly score
- Future growth / growth outlook
- Guidance history / guidance tracker
- Key variables
- Moat analysis
- Community comments
- Watchlist actions
- Request missing sections
- Leaderboards
- Sector views
- Score methodology page

The product is no longer just a demo or static research viewer. It has become a structured research product. The next challenge is turning the structured research into a clearer investor decision workflow.

---

## 2. Strategic Product Diagnosis

### Current product state

The product currently says:

> “Here is structured research on the company.”

The next version should say:

> “Here is what changed, why it matters, what to track next, and how much confidence to place in the story.”

That is the difference between a research archive and an investor workflow product.

### Main product insight

The product is strongest when it behaves like:

> **An investor’s research assistant**

rather than:

> **A framework-generated research archive**

The research framework is powerful, but the user should not have to manually synthesize every section. The product needs to surface the conclusion, the reason, the dependency, the tracking variables, and the confidence level.

---

## 3. Two Guiding Lights for Future Product Work

Future product improvements should fall under two major directions:

# 3.1 Decision Layer

The Decision Layer answers:

> **What should the investor make of this?**

It converts structured research into judgment.

Examples of Decision Layer outputs:

- Current investor read
- Why the score moved
- What to track next quarter
- Growth case classification
- Largest dependency
- Thesis state
- Guidance read-through
- Watch items
- Positive / negative inflections
- Growth fragility
- Decision snapshot

The Decision Layer improves **usefulness**.

---

# 3.2 Trust Layer

The Trust Layer answers:

> **Why should the investor believe this research/system?**

It makes the product more evidence-backed, transparent, auditable, and confidence-aware.

Examples of Trust Layer outputs:

- Source citations and excerpts
- Score breakdown
- Confidence labels
- Disclosure quality tags
- Guidance trails
- Coverage completeness
- Methodology explainers
- Evidence quality
- Management guidance delivery record

The Trust Layer improves **credibility**.

---

## 4. Simple Product Filter for Future Features

Every new feature should pass at least one of these two tests.

### Decision test

> Does this help the investor decide what changed, what matters, what to track, or how to interpret the company?

### Trust test

> Does this make the system more evidence-backed, transparent, auditable, or confidence-aware?

If a feature does neither, it is likely product clutter.

---

## 5. The Next Product Direction

The next major phase should focus first on:

# **Improving decision usefulness**

This should come before a homepage redesign, community expansion, full valuation module, or deep citation infrastructure.

Reason:

- It improves every company page.
- It uses much of the data already present.
- It creates immediate investor value.
- It turns the portal from structured research into an investor workflow.
- It makes the existing research modules feel more useful.

---

## 6. Decision Layer — 15 Possible Improvements

The following 15 elements were identified as possible Decision Layer features.

| # | Feature | Investor Value | Decision Impact | Build Priority | Overall Read |
|---:|---|---:|---:|---:|---|
| 1 | Investor Takeaway Card | 10 | 10 | 10 | Must-have |
| 2 | Why Score Moved | 9 | 9 | 9 | Must-have |
| 3 | What to Track Next Quarter | 10 | 10 | 9 | Must-have |
| 4 | Current Thesis State | 8 | 9 | 8 | Very useful |
| 5 | Growth Case Classification | 8.5 | 9 | 8.5 | Very useful |
| 6 | Largest Dependency | 9.5 | 10 | 9 | Must-have |
| 7 | Key Variable Dashboard | 9 | 9 | 8 | High value, needs good data design |
| 8 | Bull / Base / Bear Case Summary | 8 | 8.5 | 7 | Useful, but can become generic |
| 9 | Catalyst Progress Tracker | 9 | 9 | 8.5 | Strong differentiator |
| 10 | Thesis Fragility Indicator | 9 | 9.5 | 8.5 | Very high value |
| 11 | Guidance Read-Through | 9.5 | 9.5 | 9 | Must-have |
| 12 | Red Flag / Watch Item Card | 9 | 9 | 8.5 | Important for trust + decision quality |
| 13 | Positive Inflection Detector | 8.5 | 8.5 | 7.5 | Good opportunity-finder |
| 14 | Negative Inflection Detector | 9 | 9 | 8 | Very useful risk detector |
| 15 | Company Page Final Verdict | 7.5 | 8 | 6.5 | Useful, but overlaps with Takeaway Card |

---

## 7. Recommended Decision Layer MVP

The first version should **not** include all 15. It should focus on the top five elements.

# Top 5 Decision-Layer Elements

| # | Element | Problem it solves | Investor value-add | Possible solution |
|---:|---|---|---|---|
| 1 | Investor Takeaway Card | Company pages have many sections, but the investor may not know the final read. | Gives an instant “what should I make of this?” answer. | Add a top overview card summarizing current read, thesis state, growth case, guidance credibility, key dependency, and confidence. |
| 2 | Why Score Moved | Scores can feel like black-box numbers unless the movement is explained. | Helps investor understand what changed this quarter and whether momentum improved or weakened. | Show previous score → latest score with positive and negative drivers. |
| 3 | What to Track Next Quarter | After reading the page, investor may not know what to monitor next. | Creates a repeat-use workflow and gives investor a focused tracking checklist. | Add 3–5 business-specific variables to track in next result/concall. |
| 4 | Largest Dependency | Growth stories often depend on one hidden assumption, but investors may not identify it. | Clarifies the single make-or-break factor in the thesis. | Add one mandatory field identifying the biggest dependency behind the forward case. |
| 5 | Guidance Read-Through | Guidance tracker shows management statements, but may not interpret what they imply. | Converts management commentary into a credibility and visibility judgment. | Summarize whether management guidance is credible, repeated, revised, at risk, or quietly weakening. |

---

## 8. Why These Five Are Enough for the First Version

Five is the right number because:

- Fewer than five may leave gaps in the decision workflow.
- More than five may slow implementation and dilute focus.
- These five are complementary.
- Together, they cover the complete investor loop.

The loop:

```text
What is the current read?
→ Why did the score change?
→ What should I track next?
→ What is the biggest dependency?
→ Can I trust management guidance?
```

This is a strong Decision Layer without overbuilding.

---

## 9. Detailed Top Five Feature Specifications

# 9.1 Investor Takeaway Card

## Problem

The company page has multiple useful sections, but the investor has to mentally synthesize everything:

- Quarterly score
- Business quality
- Growth outlook
- Guidance
- Key variables
- Moat
- Risks / watch items

This creates cognitive load.

## Value add

This becomes the decision summary of the page.

It answers:

> What is the current investor read on this company?

## Possible solution

Place this at the top of the company overview page.

Example object:

```json
{
  "current_read": "Strong execution, but forward growth depends on capacity ramp-up.",
  "thesis_state": "Improving",
  "growth_case": "Attractive but concentrated",
  "guidance_credibility": "Medium-high",
  "largest_dependency": "New capacity must ramp without margin dilution",
  "confidence": "Medium"
}
```

## Suggested UI

```text
Investor Takeaway

Current Read:
Strong operating momentum, but the forward case is dependent on one major catalyst.

Thesis State:
Improving

Growth Case:
Attractive but concentrated

Confidence:
Medium
```

---

# 9.2 Why Score Moved

## Problem

A quarterly score tells the investor what the score is, but not necessarily why it changed.

A score moving from 6.8 to 7.5 is useful only if the user knows whether the improvement came from:

- Revenue acceleration
- Margin improvement
- Guidance reiteration
- Working capital deterioration
- One-off gains
- Better business mix

## Value add

This makes the score interpretable and trustworthy.

It answers:

> Why did the score improve or deteriorate?

## Possible solution

For every quarter, show:

```json
{
  "previous_score": 6.8,
  "latest_score": 7.5,
  "score_direction": "Improved",
  "positive_drivers": [
    "Revenue growth accelerated",
    "EBITDA margin expanded",
    "Management reiterated FY26 growth guidance"
  ],
  "negative_drivers": [
    "Working capital worsened",
    "Export catalyst remains delayed"
  ]
}
```

## Suggested UI

```text
Score moved: 6.8 → 7.5

Why it improved:
+ Revenue growth accelerated
+ Margin expanded
+ Guidance reiterated

Offsets:
- Working capital worsened
- One catalyst delayed
```

---

# 9.3 What to Track Next Quarter

## Problem

After reading research, the investor still needs to know:

> What should I watch in the next result or concall?

Without this, the product is useful once but not necessarily habit-forming.

## Value add

This creates the repeat usage loop.

The investor comes back after every quarter to check whether the key variables improved or worsened.

## Possible solution

Add a compact tracker with 3–5 variables.

```json
{
  "what_to_track_next": [
    {
      "variable": "Capacity utilization",
      "why_it_matters": "Main driver of FY26 revenue growth and margin leverage",
      "desired_direction": "Increase"
    },
    {
      "variable": "Gross margin",
      "why_it_matters": "Tests whether growth is margin-accretive",
      "desired_direction": "Stable or improving"
    },
    {
      "variable": "Management guidance repetition",
      "why_it_matters": "Shows confidence in FY26 target",
      "desired_direction": "Reiterated or upgraded"
    }
  ]
}
```

## Suggested UI

```text
Track Next Quarter

1. Capacity utilization — must improve for growth case to hold
2. Gross margin — should remain stable despite expansion
3. FY26 guidance — watch whether management reiterates or softens it
```

---

# 9.4 Largest Dependency

## Problem

Many growth stories sound attractive, but one assumption often carries most of the thesis.

Examples:

- New plant ramp-up
- Export order conversion
- Regulatory approval
- Margin sustainability
- Demand recovery
- Management execution
- Working capital normalization

If the investor does not know the main dependency, they may overestimate thesis robustness.

## Value add

This makes the growth case sharper and more honest.

It answers:

> What single thing can make or break the forward story?

## Possible solution

Add one mandatory field in the decision snapshot.

```json
{
  "largest_dependency": {
    "dependency": "New capacity ramp-up",
    "why_it_matters": "Majority of FY26–FY27 growth uplift depends on utilization of the expanded capacity",
    "risk_if_fails": "Growth normalizes to legacy segment rate and margin expansion may not materialize"
  }
}
```

## Suggested UI

```text
Largest Dependency

The forward growth case depends mainly on the new capacity ramp reaching commercial utilization by H2 FY26.

If this slips, the growth case becomes much less attractive.
```

---

# 9.5 Guidance Read-Through

## Problem

Guidance history can become a database of statements unless it is converted into interpretation.

The investor does not only want to know:

> What did management say?

They want to know:

> Should I trust it?

## Value add

This turns management commentary into an investor judgment system.

It answers:

- Is management specific or vague?
- Has guidance been repeated?
- Has it been revised?
- Is revenue guidance more credible than margin guidance?
- Are there quiet drops?
- Is management over-promising or under-promising?

## Possible solution

Add a guidance interpretation block derived from the guidance tracker.

```json
{
  "guidance_readthrough": {
    "summary": "Revenue guidance remains credible, but margin visibility is weaker.",
    "revenue_record": "Mostly delivered or reiterated",
    "current_status": "Revenue guidance on track; margin guidance not yet verifiable",
    "credibility": "Medium-high",
    "key_risk": "Margin guidance has not been repeated in recent calls"
  }
}
```

## Suggested UI

```text
Guidance Read-Through

Management has reiterated revenue growth guidance twice, suggesting reasonable topline visibility.

However, margin guidance has been less consistently repeated, so margin delivery should carry lower confidence than revenue delivery.

Credibility: Medium-high
```

---

## 10. Recommended MVP Data Object

The first implementation should use one clean object per company.

```json
{
  "company_code": "MCX",
  "decision_snapshot": {
    "current_read": "",
    "thesis_state": "Improving | Stable | Weakening | Unproven",
    "why_score_moved": {
      "previous_score": null,
      "latest_score": null,
      "positive_drivers": [],
      "negative_drivers": []
    },
    "what_to_track_next": [],
    "largest_dependency": {
      "dependency": "",
      "why_it_matters": "",
      "risk_if_fails": ""
    },
    "guidance_readthrough": {
      "summary": "",
      "credibility": "High | Medium | Low",
      "key_risk": ""
    },
    "confidence": "High | Medium | Low"
  }
}
```

---

## 11. Suggested Implementation Strategy

### Recommended first sprint

Build only:

1. Investor Takeaway Card shell
2. Guidance Read-Through
3. Why Score Moved
4. What to Track Next
5. Largest Dependency

### Why this order?

| Order | Feature | Why this order |
|---:|---|---|
| 1 | Investor Takeaway Card shell | Creates the visible decision layer container |
| 2 | Guidance Read-Through | Uses existing guidance data; highest differentiation |
| 3 | Why Score Moved | Makes quarterly score explainable |
| 4 | What to Track Next | Creates repeat-use behavior |
| 5 | Largest Dependency | Makes growth case sharper and more honest |

---

## 12. Manual/Semi-Manual Pilot Before Full Automation

Before building a fully automated pipeline, populate the Decision Snapshot manually or semi-manually for 10 companies.

Suggested test companies:

```text
MCX
INDIGO
GRASIM
NETWEB
ADANIPORTS
MAXHEALTH
NH
TECHM
TCS
ZAGGLE
```

Reason:

These provide variety across:

- Exchanges
- Airlines
- Hospitals
- IT services
- Ports
- Diversified businesses
- High-growth technology / manufacturing-style stories
- Guidance-heavy companies
- Companies with strong and weak quarterly scores

This pilot will reveal whether the Decision Snapshot schema is sufficient.

---

## 13. Company Analysis Section Review

The existing company sections should be assessed based on:

- Investor value
- Decision usefulness
- Trust contribution
- Repeat-use value

| Section | Investor Value | Decision Usefulness | Trust Contribution | Repeat-Use Value | Overall Priority |
|---|---:|---:|---:|---:|---|
| Business Snapshot | 10 | 8 | 8 | 6 | Core foundation |
| Industry Context | 8 | 7 | 7.5 | 4 | Important, but not frequently revisited |
| Sub-Sector Analysis | 8.5 | 8 | 7.5 | 5 | Very useful for multi-engine companies |
| Quarterly Score | 9 | 9.5 | 8 | 9 | Very high priority |
| Key Variables | 9.5 | 10 | 8.5 | 10 | One of the highest-value sections |
| Future Growth | 10 | 10 | 8 | 8.5 | Highest-value forward section |
| Guidance History | 10 | 9.5 | 10 | 9 | Strongest trust + decision section |
| Moat Analysis | 8.5 | 7.5 | 8 | 5 | Important for long-term quality |
| Risks / Watch Items | 9 | 9 | 8.5 | 8 | Should be more prominent |
| Valuation / PEG Lens | 9 | 10 | 7 | 8 | High value, but needs guardrails |
| Community Comments | 6.5 | 5.5 | 5 | 7 | Useful later, not core yet |
| Source Evidence / Citations | 8 | 7 | 10 | 6 | Critical trust layer across all sections |

---

## 14. Section-by-Section Improvement Direction

# 14.1 Business Snapshot → Business Quality Verdict

Current job:

> What does this company do, and how does it make money?

Improvement:

```text
Business Quality Verdict:
The business mix is improving because the higher-margin segment is gaining share, but disclosure on unit-level margins remains partial.

Highest-confidence engine:
Segment A

Lowest-confidence area:
Segment B margin economics
```

---

# 14.2 Industry Context → Industry Implication

Current job:

> Is the industry structurally attractive or difficult?

Improvement:

```text
Industry Verdict:
Moderately attractive.

Why:
Demand tailwind is strong, but bargaining power sits with customers and margins are structurally capped.

Implication for company:
The company can grow with the sector, but margin expansion requires mix shift, not just industry growth.
```

---

# 14.3 Sub-Sector Analysis → Sub-Sector Attractiveness Card

Improvement:

| Sub-sector | Growth | Margin Pool | Competition | Company Fit | Verdict |
|---|---:|---:|---:|---:|---|
| A | High | High | Medium | Strong | Attractive |
| B | Medium | Low | High | Weak | Watch |

---

# 14.4 Quarterly Score → Why Score Moved

Improvement:

```text
Quarterly Score: 7.6 / 10
Previous Quarter: 6.8 / 10
Direction: Improving

Why it improved:
+ Revenue growth accelerated
+ Margin expanded
+ Management reiterated FY26 guidance

Offsets:
- Receivables worsened
- Export catalyst delayed
```

---

# 14.5 Key Variables → Key Variable Dashboard

Improvement:

| Variable | Current Status | Direction | Why It Matters | Next Trigger |
|---|---|---|---|---|
| Capacity utilization | 62% | Improving | Drives operating leverage | Should cross 70% |
| Gross margin | 31% | Stable | Tests mix quality | Watch for compression |
| Order book | ₹2,500 Cr | Improving | Revenue visibility | Book-to-bill >1.2x |

This section has very high repeat-use potential.

---

# 14.6 Future Growth → Growth Case Verdict

Improvement:

```text
Growth Case:
Attractive but concentrated

Largest driver:
New capacity ramp-up

Largest dependency:
Utilization must cross 70% by H2 FY26

Fragility:
Medium-high

If the largest catalyst is delayed:
2–3 year CAGR drops materially.
```

---

# 14.7 Guidance History → Guidance Read-Through + Trail

Improvement:

```text
Management Credibility:
Medium-high

Revenue guidance:
2 beats, 1 in-line, 1 miss

Current active guidance:
3 on track, 1 at risk, 1 not verifiable
```

Trail visualization:

```text
First guided → Reiterated → Revised → Latest status → Achieved / Missed
```

Read-through:

```text
Revenue guidance remains credible, but margin guidance has been less consistently repeated. Future revenue guidance should carry more weight than margin guidance.
```

---

# 14.8 Moat Analysis → Moat Source + Replication Test

Improvement:

```text
Moat Verdict:
Narrow moat, medium confidence

Source:
Distribution lock-in and switching costs in the core segment

Replication test:
A competitor would need 5–7 years of relationships and service history to replicate the customer base.

Weakness:
No strong pricing power; moat is relationship-led, not brand-led.
```

The replication test is the most valuable part.

---

# 14.9 Risks → Watch Items

Improvement:

```text
Watch Items:
1. Revenue growth is strong, but receivable days are worsening.
2. Margin expansion is partly input-cost led, not clearly structural.
3. Management has stopped repeating earlier export guidance.
```

Watch Items should appear near the top of the page because they keep the analysis balanced.

---

# 14.10 Valuation / PEG Lens → Valuation Sanity Check

Do not start with a full price target. Use a valuation sanity check.

Improvement:

```text
Valuation Read:
The stock trades at a premium to its historical range, but the premium is partly supported by higher growth visibility and margin expansion.

PEG View:
Forward PEG appears reasonable only if FY26 growth guidance is delivered.

Key valuation risk:
If growth normalizes below 15%, current multiple looks stretched.
```

This is decision-useful without pretending to know intrinsic value precisely.

---

# 14.11 Community → Structured Discussion Prompts

Improvement:

```text
Discussion prompts:
1. What is the key variable you are tracking?
2. Do you trust management guidance?
3. Which growth catalyst matters most?
4. What is the biggest risk you see?
```

Community should be guided toward the product’s research framework.

---

# 14.12 Source Evidence → Expandable Claim Evidence

Improvement:

```text
Claim:
Management reiterated FY26 revenue guidance.

Source:
Q3 FY26 concall, page 8

Excerpt:
“We continue to expect...”

Interpretation:
This is a reiteration, not an upgrade.
```

This is part of the Trust Layer and should eventually cut across all sections.

---

## 15. Current Value-Add by Section Based on Live Portal Review

The portal currently provides the strongest visible value in:

1. Quarterly execution signal
2. Forward growth score
3. Management guidance summary
4. Moat label / durability score
5. Business mix snapshot where populated

The current weakness is that many sections expose a label, score, or status, but not yet enough decision interpretation.

Example current mode:

```text
This company has a 9.2 quarterly score, 8.7 growth score, 2 guidance items, and some sections ready.
```

Desired mode:

```text
This company’s story is improving because of X, forward growth depends on Y, management credibility is Z, and the investor should track A/B/C next quarter.
```

---

## 16. Current Section Maturity

# Already high value

| Rank | Section | Current read |
|---:|---|---|
| 1 | Guidance Tracker | Strongest differentiated feature; already shows specific guidance + credibility labels |
| 2 | Quarterly Score | Strong execution signal; high repeat-use value |
| 3 | Future Growth | Strong forward lens with rankings; needs dependency/fragility layer |
| 4 | Moat Analysis | Good durability label; needs visible reasoning |
| 5 | Business Snapshot | Very useful where populated; coverage uneven |

# High potential but needs better surfacing

| Rank | Section | Current read |
|---:|---|---|
| 6 | Key Variables | Huge potential, but overview only shows variable count |
| 7 | Sub-sector Analysis | Good classification; needs attractiveness verdict |
| 8 | Industry Context | Useful sector rank; needs company-level implication |
| 9 | Score Methodology | Good global trust layer; needs company-level score breakdown |
| 10 | Sector / Leaderboard Views | Useful discovery layer; needs confidence weighting |

# Supporting / later

| Rank | Section | Current read |
|---:|---|---|
| 11 | Community | Present, but not yet core to investment workflow |
| 12 | Requests / Missing Sections | Good feedback loop, but more product-ops than investor insight |

---

## 17. Recommended Company Page Hierarchy

The product should display analysis in investor decision order, not necessarily framework generation order.

Recommended order:

```text
1. Investor Takeaway / Decision Snapshot
2. What Changed This Quarter
3. What to Track Next
4. Future Growth Case
5. Guidance Credibility
6. Key Variables
7. Business Snapshot
8. Moat
9. Industry / Sub-Sector Context
10. Risks / Watch Items
11. Source Evidence
12. Community
```

---

## 18. Product Roles by Section

| Role | Sections |
|---|---|
| Decision sections | Future Growth, Guidance, Quarterly Score, Key Variables, Watch Items |
| Understanding sections | Business Snapshot, Industry Context, Sub-Sector Analysis, Moat |
| Trust sections | Source Evidence, Score Breakdown, Guidance Trail, Coverage Completeness |
| Engagement sections | Comments, Watchlist, Requests |

The highest product value will come from making the Decision sections sharper and making the Trust layer visible across all sections.

---

## 19. Recommended Prioritized Roadmap

# Phase 1 — Decision Snapshot MVP

Build first:

1. Investor Takeaway Card
2. Guidance Read-Through
3. Why Score Moved
4. What to Track Next
5. Largest Dependency

This is the most important immediate upgrade.

---

# Phase 2 — Improve strongest modules

After the Decision Snapshot is live:

6. Growth Case Verdict
7. Key Variable Dashboard
8. Guidance Trail Visualization

---

# Phase 3 — Add trust and confidence layer

Then:

9. Score Breakdown
10. Source Evidence Expansion
11. Coverage Completeness
12. Confidence Labels
13. Disclosure Quality Tags

---

# Phase 4 — Later product improvements

Later:

14. Homepage redesign
15. Community prompts
16. Full valuation / PEG sanity check
17. Company comparison
18. Sector confidence weighting
19. Alerts for watchlist score changes

---

## 20. What Not to Start With

Do not start with these:

| Feature | Why not first |
|---|---|
| Homepage redesign | Less important than company-page usefulness |
| Community comments | Needs user density first |
| Full valuation module | High-risk; can create false precision |
| Deep industry rewrite | Important, but lower repeat-use value |
| Full source-citation engine | Important for trust, but slower and less immediately visible |
| Bull/base/bear scenarios | Useful later, but can become generic |

---

## 21. Final Recommendation

The first execution sprint should be:

# **Sprint 1: Decision Snapshot on Company Overview**

Build only these five:

1. Investor Takeaway Card
2. Guidance Read-Through
3. Why Score Moved
4. What to Track Next
5. Largest Dependency

This directly upgrades the product from:

> Structured research portal

to:

> **Investor decision assistant**

---

## 22. Builder-Agent Instruction Summary

The builder agent should treat this as the core implementation mandate:

1. Add a new `decision_snapshot` object for company pages.
2. Build a top-of-page UI card to surface this object.
3. Start with 10 pilot companies before automating across all companies.
4. Use existing research data first: quarterly scores, growth scores, guidance tracker, moat labels, key variables, and business snapshot.
5. Do not add more research sections initially.
6. Convert existing research outputs into concise investor judgments.
7. Keep the language decision-oriented, not promotional.
8. Always include confidence where possible.
9. Keep the Decision Snapshot compact enough to be read in under 30 seconds.
10. Treat the Decision Snapshot as the bridge between research modules and investor action.

---

## 23. Final North Star

The product should evolve toward this promise:

> **Story of a Stock helps investors understand what changed, what matters, what to track next, and how much confidence to place in management’s story — using structured concall-driven evidence.**

That is the next product identity.

