# Posted-Telegram ledger

`posted.jsonl` — one JSON object per message that went into the Telegram group. Append-only;
never rewrite past rows. Written by `scripts/telegram-send.mjs` (on `--send`, or `--log-only`
when the message was pasted by hand). Read by `scripts/telegram-post-candidates.mjs` so a
Featured Read card is never sent twice, and by the sender itself, which refuses to re-post a
card id unless `--force` is passed.

Companion to `../x-posts/` (what we said on X) and `../external-takes/` (what others said).
Pure parsing/formatting lives in `scripts/lib/telegram-lib.mjs` (tested in
`tests/telegram-lib.test.ts`).

## Row shape

```json
{
  "posted_on": "2026-09-13",              // IST calendar date (Asia/Kolkata), not UTC
  "status": "posted",                       // only "posted" rows exist here; drafts are not logged
  "channel": "telegram",
  "card_id": "guidance-PAYTM-2027Q1",       // desk_featured_read.id — the dedupe key
  "company": "PAYTM",
  "section": "guidance",
  "utm_campaign": "guidance-paytm-2027q1",  // matches the link in the message; join to page_view_events.utm_campaign
  "thread_id": 2,                           // forum topic the message went to (null = General)
  "message_id": 42,                         // null when logged_by_hand
  "chars": 812,
  "text": "<b>Paytm</b> …",                 // the HTML actually sent
  "logged_by_hand": true                    // optional; present only for --log-only rows
}
```

The chat id is deliberately not stored — it is constant and lives in `.env`, and this repo is
public. Ad-hoc messages (`--text-file`) log with `card_id: null` and are not deduped.

If a `--send` fails ambiguously (timeout, non-JSON reply) the sender writes nothing and says
so: check the group, and if the message landed, record it with `--log-only`.
