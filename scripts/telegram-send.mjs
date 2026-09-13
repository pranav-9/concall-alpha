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
// Exit codes: 0 sent/logged · 1 Telegram refused (nothing posted) · 2 ambiguous
// (may have landed — check, then --log-only) · 3 posted but the ledger write
// failed (row printed; append it by hand). Usage errors throw.
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
  isCandidate,
  ledgerPathFor,
  loadScriptEnv,
  parseIntArg,
  readLedger,
  todayInKolkata,
  withLedgerLock,
} from "./lib/telegram-lib.mjs";

const args = process.argv.slice(2);
const SEND = args.includes("--send");
const LOG_ONLY = args.includes("--log-only");
const FORCE = args.includes("--force");
const CARD_ID = getArg(args, "--card", null);
const FROM_CANDIDATES = getArg(args, "--from-candidates", null);
const TEXT_FILE = getArg(args, "--text-file", null);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = ledgerPathFor(SCRIPT_DIR);
const env = loadScriptEnv(SCRIPT_DIR, "telegram-send");

// --- flags that contradict each other are a usage error, never a guess ---
if (SEND && LOG_ONLY) throw new Error("--send and --log-only are mutually exclusive");
if (FROM_CANDIDATES && TEXT_FILE) throw new Error("give --from-candidates OR --text-file, not both");
if (TEXT_FILE && CARD_ID) throw new Error("--card only applies to --from-candidates; ad-hoc messages log with card_id null");

const threadArg = getArg(args, "--thread-id", null);
const THREAD_ID =
  threadArg !== null
    ? parseIntArg(threadArg, "--thread-id", { min: 1 })
    : parseIntArg(env.TELEGRAM_UPDATES_THREAD_ID || null, "TELEGRAM_UPDATES_THREAD_ID", { min: 1 });

// --- resolve the message ---
let text = null;
let meta = { card_id: null, company: null, section: null, utm_campaign: null };
if (FROM_CANDIDATES) {
  const payload = JSON.parse(fs.readFileSync(FROM_CANDIDATES, "utf8"));
  const list = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const pick = CARD_ID ? list.find((c) => c?.card_id === CARD_ID) : list[0];
  if (!pick) throw new Error(`no candidate ${CARD_ID ? `with card_id ${CARD_ID}` : "in file"}`);
  if (!isCandidate(pick)) throw new Error(`candidate ${pick.card_id ?? "<no id>"} is malformed — regenerate the file`);
  text = pick.text_html;
  meta = {
    card_id: pick.card_id,
    company: pick.company_code ?? null,
    section: pick.section ?? null,
    utm_campaign: pick.utm_campaign ?? null,
  };
} else if (TEXT_FILE) {
  text = fs.readFileSync(TEXT_FILE, "utf8").trim();
} else {
  throw new Error("give --from-candidates <json> [--card ID] or --text-file <path>");
}
if (!text) throw new Error("empty message");
if (text.length > TELEGRAM_MAX_CHARS) {
  throw new Error(`message is ${text.length} chars; Telegram caps sendMessage at ${TELEGRAM_MAX_CHARS}`);
}

const base = {
  posted_on: todayInKolkata(),
  channel: "telegram",
  card_id: meta.card_id,
  company: meta.company,
  section: meta.section,
  utm_campaign: meta.utm_campaign,
  thread_id: THREAD_ID,
  chars: text.length,
  text,
};

/** Refuse to double-post a card. A malformed ledger line means the dedupe
 *  record may be missing, so it is treated as corruption, not skipped. */
function assertNotAlreadyPosted() {
  if (!meta.card_id) return;
  const ledger = readLedger(LEDGER_PATH);
  if (ledger.malformed && !FORCE) {
    throw new Error(
      `${ledger.malformed} malformed line(s) in ${LEDGER_PATH} — a posted card may be missing its dedupe row. Repair the ledger, or pass --force.`
    );
  }
  const prior = ledger.byCard.get(meta.card_id);
  if (prior && !FORCE) {
    throw new Error(
      `card ${meta.card_id} already posted on ${prior.posted_on} (ledger). Not sending again; pass --force to override.`
    );
  }
}

/** Append, or hand the row back so it is never lost. Returns an outcome —
 *  never exits — because it runs under the ledger lock. */
function record(row) {
  try {
    appendLedgerRow(LEDGER_PATH, row);
    return { code: 0 };
  } catch (err) {
    return {
      code: 3,
      error: `could not write ledger (${err?.message || err}). Append this line to ${LEDGER_PATH}:\n${JSON.stringify(row)}`,
    };
  }
}

/** Every path under the lock RETURNS an outcome; the process exits only after
 *  withLedgerLock's finally has removed the lock file. */
async function sendUnderLock() {
  assertNotAlreadyPosted();
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing in .env");

  const body = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { prefer_small_media: true },
  };
  if (THREAD_ID) body.message_thread_id = THREAD_ID;

  // The send and the append are still two steps: a timeout or a non-JSON
  // reply AFTER Telegram delivered would leave no row, so anything ambiguous
  // is reported as "may have landed" for --log-only.
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
    return {
      code: 2,
      error:
        `Telegram request failed: ${err?.message || err}\n` +
        "The message MAY have landed. Check the group; if it is there, record it with --log-only. Nothing was written to the ledger.",
    };
  }
  if (!out.ok) {
    // A definitive refusal (ok:false) means nothing was posted.
    return { code: 1, error: `Telegram refused: ${out.description || JSON.stringify(out)}` };
  }
  const messageId = out.result?.message_id ?? null;
  const written = record({ ...base, status: "posted", message_id: messageId });
  if (written.code !== 0) return written;
  return { code: 0, message: `sent message_id=${messageId} -> logged in ${path.relative(process.cwd(), LEDGER_PATH)}` };
}

let outcome;
if (LOG_ONLY) {
  outcome = await withLedgerLock(LEDGER_PATH, async () => {
    assertNotAlreadyPosted();
    const written = record({ ...base, status: "posted", message_id: null, logged_by_hand: true });
    return written.code === 0
      ? { code: 0, message: `logged (by hand) -> ${path.relative(process.cwd(), LEDGER_PATH)}` }
      : written;
  });
} else if (!SEND) {
  assertNotAlreadyPosted();
  console.log("── DRY RUN — nothing sent. Re-run with --send to post. ──\n");
  console.log(text);
  console.log(
    `\n(${text.length} chars, parse_mode=HTML, chat=${env.TELEGRAM_CHAT_ID ? "<set>" : "<unset>"}${THREAD_ID ? `, thread=${THREAD_ID}` : ""})`
  );
  outcome = { code: 0 };
} else {
  outcome = await withLedgerLock(LEDGER_PATH, sendUnderLock);
}

if (outcome.message) console.log(outcome.message);
if (outcome.error) console.error(outcome.error);
process.exit(outcome.code);
