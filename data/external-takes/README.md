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

## `broker-reports.jsonl` — sell-side research (different source class)

A sibling ledger for **sell-side broker research PDFs**, not X takes. Produced by
`concallyser/scripts/scan_research_reports.py`, which reads the daily Telegram
"Research Reports" manifest, resolves each report's company to a covered CODE
(**exact normalized-name match only** — zero false positives; sector words like
"Pharmaceuticals" and large caps we don't cover are left unmatched and printed in
the run summary), and appends one row per covered report. Append-only, idempotent
by `message_id`.

Row shape:

```json
{
  "logged_on": "2026-09-04",             // when scanned
  "source_type": "broker_research",
  "source": "Motilal Oswal",             // the broker
  "report_date": "2026-09-01",           // IST date the PDF was posted
  "company": "INDIGO",                   // covered CODE
  "company_name": "InterGlobe Aviation Limited",
  "note_type": "company_update",         // initiating_coverage | results_review | sector_or_thematic | ...
  "their_stance": "bullish",             // bullish | bearish | neutral — direction wins, else the rating word
  "stance": null,                        // raw BUY/SELL/HOLD/... only when set off as a rating (":"/"|"/"at Buy")
  "upside_pct": 27.0,
  "direction": "UPSIDE",                 // UPSIDE | DOWNSIDE
  "target_price": null,
  "their_claim": "Motilal Oswal sees 27% UPSIDE in InterGlobe Aviation- …",  // the caption
  "file": "2026-09-01/Motilal Oswal sees 27% UPSIDE in InterGlobe Aviation.pdf",  // rel. to concallyser/data/research-reports/
  "message_id": 102606
}
```

The PDF itself stays in `concallyser/data/research-reports/<date>/` (gitignored,
copyrighted — never re-host); this file keeps only the caption-derived metadata
and a relative path back to it.
