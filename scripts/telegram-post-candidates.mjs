// Telegram post candidates: turn recent Featured Read cards (Supabase
// `desk_featured_read`, the producer-authored "what changed" cards) into
// ready-to-send Telegram messages, with UTM links back to the section and the
// standing disclaimer. Nothing here is invented — every line is the card's own
// headline/summary, which the producer skill wrote at promote time and which is
// already descriptive-only by schema (SEBI RA guardrail).
//
// Run from concall-alpha/:  node scripts/telegram-post-candidates.mjs [--days N] [--include-posted] [--card ID]
//
//   --days N            how far back to look for eligible cards (default 14)
//   --include-posted    keep cards already in data/telegram-posts/posted.jsonl
//   --card ID           only this card id (e.g. guidance-PAYTM-2027Q1)
//
// Output: JSON on stdout. Pipe a candidate's `text_html` into
// scripts/telegram-send.mjs (dry-run by default; --send to post; the ledger
// row is appended there, not here).
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MIN_FEATURE_WEIGHT,
  buildTexts,
  compareCards,
  getArg,
  isPostableCard,
  parseIntArg,
  readEnv,
  readLedger,
  stripLtd,
} from "./lib/telegram-lib.mjs";

const args = process.argv.slice(2);
const LOOKBACK_DAYS = parseIntArg(getArg(args, "--days", "14"), "--days", { min: 1 });
const INCLUDE_POSTED = args.includes("--include-posted");
const ONLY_CARD = getArg(args, "--card", null);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = path.join(SCRIPT_DIR, "..", "data", "telegram-posts", "posted.jsonl");

// --- env (same .env REST pattern as x-post-candidates.mjs) ---
const { env, duplicates } = readEnv(path.join(SCRIPT_DIR, "..", ".env"));
for (const k of duplicates) console.error(`[telegram-post-candidates] .env defines ${k} more than once — last line wins`);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
if (!URL_BASE || !KEY) throw new Error("missing Supabase env in .env");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const SITE_BASE = (env.NEXT_PUBLIC_SITE_URL || "https://concall-alpha.vercel.app").replace(/\/$/, "");

// --- posted ledger: never re-send a card that already went out ---
const ledger = readLedger(LEDGER_PATH);
if (ledger.malformed) console.error(`[telegram-post-candidates] ${ledger.malformed} malformed ledger line(s) skipped`);

async function fetchAll(pathAndQuery) {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathAndQuery}`, {
    headers: H,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${pathAndQuery} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 864e5).toISOString();
const cards = await fetchAll(
  `desk_featured_read?select=*&status=eq.eligible&feature_weight=gte.${MIN_FEATURE_WEIGHT}` +
    `&published_at=gte.${encodeURIComponent(cutoff)}&order=published_at.desc`
);

const ymd = new Date().toISOString().slice(0, 10);
const candidates = [];
let skippedUnpostable = 0;
for (const card of cards) {
  if (ONLY_CARD && card.id !== ONLY_CARD) continue;
  if (!isPostableCard(card)) {
    skippedUnpostable += 1;
    continue;
  }
  const posted = ledger.byCard.get(card.id) || null;
  if (posted && !INCLUDE_POSTED) continue;
  const { html, plain, campaign, url } = buildTexts(card, SITE_BASE);
  candidates.push({
    card_id: card.id,
    company_code: card.company_code,
    company_name: stripLtd(card.company_name),
    sector: card.sector,
    section: card.section,
    change_kind: card.change_kind,
    feature_weight: card.feature_weight,
    published_at: card.published_at,
    age_days: Math.floor((Date.now() - new Date(card.published_at).getTime()) / 864e5),
    already_posted: Boolean(posted),
    posted_on: posted?.posted_on ?? null,
    utm_campaign: campaign,
    link: url,
    chars: plain.length,
    text_html: html,
    text_plain: plain,
  });
}

candidates.sort(compareCards);

process.stdout.write(
  JSON.stringify(
    {
      generated_on: ymd,
      site: SITE_BASE,
      lookback_days: LOOKBACK_DAYS,
      eligible_cards: cards.length,
      skipped_unpostable: skippedUnpostable,
      ledger: { path: path.relative(process.cwd(), LEDGER_PATH), posted_count: ledger.byCard.size },
      candidates,
    },
    null,
    2
  ) + "\n"
);
