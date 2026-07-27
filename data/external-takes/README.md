# External takes ledger

Durable record of what tracked X accounts are saying about companies **we cover**, and how
their take compared to our data-driven read at the time. Built by the `/external-take-tracker`
skill. The point is to accumulate an agree/disagree history so we can see, over time, whose
calls held up — and to catch the disagreements that make the best posts.

- `handles.txt` — accounts to scan (one handle per line, no `@`).
- `ledger.jsonl` — one JSON object per logged take. Append-only; never rewrite past rows.

## Row shape (`ledger.jsonl`)

```json
{
  "logged_on": "2026-07-26",
  "source": "equities_samjho",
  "tweet_date": "2025-10-28",
  "tweet_url": "https://x.com/equities_samjho/status/…",
  "company": "CARTRADE",
  "their_claim": "Stock is a 4x for them; 'unreal execution' in Q2 on a high base.",
  "their_stance": "bullish",              // bullish | bearish | neutral | mixed
  "our_quarter": "Q4FY26",
  "our_score": 6.3,
  "our_qoq": -1.6,
  "our_read": "Record FY26 profit, but concall read FELL 7.9→6.3 — guidance withheld, base high.",
  "verdict": "disagree",                  // agree | disagree | adds-new-info | too-early
  "theme": "auto-platforms",              // optional cluster tag: cdmo | peb | cables-wires | ...
  "corroboration": 1,                     // how many tracked accounts have a logged take on this company
  "note": "Their thesis is forward/price; our read is the quarter just filed. Classic gap-to-watch.",
  "postable": true
}
```

`tweet_date` is when they posted; `logged_on` is when we recorded it. `their_stance` is *their*
direction on the stock; `verdict` is how it sits against **our** read. `adds-new-info` = they
surfaced a forward catalyst our backward-looking score can't contain (e.g. the APAR
US-data-centre approval, or a governance/regulatory/competitive-entry item). `too-early` = can't
judge until the next quarter prints.

`theme` clusters takes across companies (a CDMO basket, PEB names, the cables-&-wires disruption)
so the ledger stays queryable by narrative. `corroboration` counts how many *distinct* tracked
accounts have a logged take on the same company — high corroboration + our score agreeing =
higher-conviction; high corroboration + our score disagreeing = the sharpest gap-to-watch. Both
optional; fill when known.
