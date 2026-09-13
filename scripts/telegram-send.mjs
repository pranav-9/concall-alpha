// Send one message to the Telegram group through the bot, and record it in the
// posted ledger. DRY RUN BY DEFAULT — nothing leaves the machine without --send.
// Publishing is outward-facing; the user is always the one who decides to send.
//
// Run from concall-alpha/:
//   node scripts/telegram-post-candidates.mjs --card guidance-PAYTM-2027Q1 > /tmp/c.json
//   node scripts/telegram-send.mjs --from-candidates /tmp/c.json --card guidance-PAYTM-2027Q1          # preview
//   node scripts/telegram-send.mjs --from-candidates /tmp/c.json --card guidance-PAYTM-2027Q1 --send   # post + log
//   node scripts/telegram-send.mjs --text-file msg.html --send                                       # ad-hoc HTML message
//   node scripts/telegram-send.mjs --from-candidates /tmp/c.json --card ID --log-only                # posted by hand; just record it
//   … --force                                                                                        # re-send a card the ledger says went out
//
// Env (concall-alpha/.env, server-side only): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
// optional TELEGRAM_UPDATES_THREAD_ID (forum topic; --thread-id overrides).
// The bot must be a member (admin for a channel / "Updates" topic) of the chat.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  TELEGRAM_MAX_CHARS,
  appendLedgerRow,
  getArg,
  parseIntArg,
  readEnv,
  readLedger,
} from "./lib/telegram-lib.mjs";

const args = process.argv.slice(2);
const SEND = args.includes("--send");
const LOG_ONLY = args.includes("--log-only");
const FORCE = args.includes("--force");
const CARD_ID = getArg(args, "--card", null);
const FROM_CANDIDATES = getArg(args, "--from-candidates", null);
const TEXT_FILE = getArg(args, "--text-file", null);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = path.join(SCRIPT_DIR, "..", "data", "telegram-posts", "posted.jsonl");

const { env, duplicates } = readEnv(path.join(SCRIPT_DIR, "..", ".env"));
for (const k of duplicates) console.error(`[telegram-send] .env defines ${k} more than once — last line wins`);
const THREAD_ID = parseIntArg(
  getArg(args, "--thread-id", null) ?? (env.TELEGRAM_UPDATES_THREAD_ID || null),
  "--thread-id",
  { min: 1 }
);

// --- resolve the message (exactly one input) ---
if (FROM_CANDIDATES && TEXT_FILE) throw new Error("give --from-candidates OR --text-file, not both");
if (TEXT_FILE && CARD_ID) throw new Error("--card only applies to --from-candidates; ad-hoc messages log with card_id null");

let text = null;
let meta = { card_id: null, company: null, section: null, utm_campaign: null };
if (FROM_CANDIDATES) {
  const payload = JSON.parse(fs.readFileSync(FROM_CANDIDATES, "utf8"));
  const list = payload.candidates || [];
  const pick = CARD_ID ? list.find((c) => c.card_id === CARD_ID) : list[0];
  if (!pick) throw new Error(`no candidate ${CARD_ID ? `with card_id ${CARD_ID}` : "in file"}`);
  text = pick.text_html;
  meta = { card_id: pick.card_id, company: pick.company_code, section: pick.section, utm_campaign: pick.utm_campaign };
} else if (TEXT_FILE) {
  text = fs.readFileSync(TEXT_FILE, "utf8").trim();
} else {
  throw new Error("give --from-candidates <json> [--card ID] or --text-file <path>");
}
if (!text) throw new Error("empty message");
if (text.length > TELEGRAM_MAX_CHARS) {
  throw new Error(`message is ${text.length} chars; Telegram caps sendMessage at ${TELEGRAM_MAX_CHARS}`);
}

// --- refuse to double-post a card (unless --force) ---
if (meta.card_id) {
  const prior = readLedger(LEDGER_PATH).byCard.get(meta.card_id);
  if (prior && !FORCE) {
    throw new Error(
      `card ${meta.card_id} already posted on ${prior.posted_on} (ledger). Not sending again; pass --force to override.`
    );
  }
}

const base = {
  posted_on: new Date().toISOString().slice(0, 10),
  channel: "telegram",
  card_id: meta.card_id,
  company: meta.company,
  section: meta.section,
  utm_campaign: meta.utm_campaign,
  thread_id: THREAD_ID,
  chars: text.length,
  text,
};

if (LOG_ONLY) {
  appendLedgerRow(LEDGER_PATH, { ...base, status: "posted", message_id: null, logged_by_hand: true });
  console.log(`logged (by hand) -> ${path.relative(process.cwd(), LEDGER_PATH)}`);
  process.exit(0);
}

if (!SEND) {
  console.log("── DRY RUN — nothing sent. Re-run with --send to post. ──\n");
  console.log(text);
  console.log(
    `\n(${text.length} chars, parse_mode=HTML, chat=${env.TELEGRAM_CHAT_ID || "<unset>"}${THREAD_ID ? `, thread=${THREAD_ID}` : ""})`
  );
  process.exit(0);
}

const token = env.TELEGRAM_BOT_TOKEN;
const chatId = env.TELEGRAM_CHAT_ID;
if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing in .env");

const body = {
  chat_id: chatId,
  text,
  parse_mode: "HTML",
  link_preview_options: { is_disabled: false, prefer_small_media: true },
};
if (THREAD_ID) body.message_thread_id = THREAD_ID;

// The send and the ledger append are not one transaction. A timeout or a
// non-JSON reply AFTER Telegram delivered would otherwise leave the ledger
// empty and the next --send would post the card twice — so anything ambiguous
// is reported as "may have landed" and the user reconciles with --log-only.
let out;
try {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await res.text();
  try {
    out = JSON.parse(raw);
  } catch {
    throw new Error(`non-JSON reply (HTTP ${res.status}): ${raw.slice(0, 120)}`);
  }
} catch (err) {
  console.error(`Telegram request failed: ${err?.message || err}`);
  console.error("The message MAY have landed. Check the group; if it is there, record it with --log-only. Nothing was written to the ledger.");
  process.exit(2);
}

if (!out.ok) {
  // A definitive refusal (400/403 with ok:false) means nothing was posted.
  console.error("Telegram refused:", out.description || out);
  process.exit(1);
}
appendLedgerRow(LEDGER_PATH, { ...base, status: "posted", message_id: out.result?.message_id ?? null });
console.log(`sent message_id=${out.result?.message_id} -> logged in ${path.relative(process.cwd(), LEDGER_PATH)}`);
