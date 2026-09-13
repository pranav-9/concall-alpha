# Posted-Telegram ledger

`posted.jsonl` — one JSON object per message that went into the Telegram group. Append-only;
never rewrite past rows. Written by `scripts/telegram-send.mjs` (on `--send`, or `--log-only`
when the message was pasted by hand). Read by `scripts/telegram-post-candidates.mjs` so a
Featured Read card is never sent twice.

Companion to `../x-posts/` (what we said on X) and `../external-takes/` (what others said).

## Row shape

```json
{
  "posted_on": "2026-09-13",
  "status": "posted",                       // only "posted" rows exist here; drafts are not logged
  "channel": "telegram",
  "chat_id": "-1001234567890",
  "message_id": 42,                         // null when logged_by_hand
  "card_id": "guidance-PAYTM-2027Q1",       // desk_featured_read.id — the dedupe key
  "company": "PAYTM",
  "section": "guidance",
  "utm_campaign": "guidance-paytm-2027q1",  // matches the link in the message; join to page_view_events.utm_campaign
  "chars": 812,
  "text": "<b>Paytm</b> …",                 // the HTML actually sent
  "logged_by_hand": true                    // optional; present only for --log-only rows
}
```

Ad-hoc messages (`--text-file`) log with `card_id: null` and are not deduped.
