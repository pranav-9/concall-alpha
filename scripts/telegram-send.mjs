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
//
// Env (concall-alpha/.env, server-side only): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
// The bot must be a member (admin for a channel / "Updates" topic) of the chat.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const SEND = args.includes("--send");
const LOG_ONLY = args.includes("--log-only");
const CARD_ID = getArg("--card", null);
const FROM_CANDIDATES = getArg("--from-candidates", null);
const TEXT_FILE = getArg("--text-file", null);
const THREAD_ID_ARG = getArg("--thread-id", null); // forum topic id; defaults to TELEGRAM_UPDATES_THREAD_ID from .env

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = path.join(SCRIPT_DIR, "..", "data", "telegram-posts", "posted.jsonl");

const envPath = path.join(SCRIPT_DIR, "..", ".env");
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const THREAD_ID = THREAD_ID_ARG ?? (env.TELEGRAM_UPDATES_THREAD_ID || null);

// --- resolve the message ---
let text = null;
let meta = { card_id: CARD_ID, company: null, section: null, utm_campaign: null };
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
if (text.length > 4096) throw new Error(`message is ${text.length} chars; Telegram caps sendMessage at 4096`);

// --- refuse to double-post a card ---
if (meta.card_id && fs.existsSync(LEDGER_PATH)) {
  for (const line of fs.readFileSync(LEDGER_PATH, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let row;
    try { row = JSON.parse(t); } catch { continue; }
    if (row.card_id === meta.card_id && row.status === "posted") {
      throw new Error(`card ${meta.card_id} already posted on ${row.posted_on} (ledger). Not sending again.`);
    }
  }
}

function appendLedger(row) {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.appendFileSync(LEDGER_PATH, JSON.stringify(row) + "\n");
}

const base = {
  posted_on: new Date().toISOString().slice(0, 10),
  channel: "telegram",
  card_id: meta.card_id,
  company: meta.company,
  section: meta.section,
  utm_campaign: meta.utm_campaign,
  chars: text.length,
  text,
};

if (LOG_ONLY) {
  appendLedger({ ...base, status: "posted", chat_id: env.TELEGRAM_CHAT_ID || null, message_id: null, logged_by_hand: true });
  console.log(`logged (by hand) -> ${path.relative(process.cwd(), LEDGER_PATH)}`);
  process.exit(0);
}

if (!SEND) {
  console.log("── DRY RUN — nothing sent. Re-run with --send to post. ──\n");
  console.log(text);
  console.log(`\n(${text.length} chars, parse_mode=HTML, chat=${env.TELEGRAM_CHAT_ID || "<unset>"}${THREAD_ID ? `, thread=${THREAD_ID}` : ""})`);
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
if (THREAD_ID) body.message_thread_id = Number(THREAD_ID);

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
const out = await res.json();
if (!out.ok) {
  console.error("Telegram refused:", out.description || out);
  process.exit(1);
}
appendLedger({ ...base, status: "posted", chat_id: chatId, message_id: out.result?.message_id ?? null });
console.log(`sent message_id=${out.result?.message_id} -> logged in ${path.relative(process.cwd(), LEDGER_PATH)}`);
