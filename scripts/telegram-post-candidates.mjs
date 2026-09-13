// Telegram post candidates: turn recent Featured Read cards (Supabase
// `desk_featured_read`, the producer-authored "what changed" cards) into
// ready-to-send Telegram messages, with UTM links back to the section and the
// standing disclaimer. Nothing here is invented — every line is the card's own
// headline/summary, which the producer skill wrote at promote time and which is
// already descriptive-only by schema (SEBI RA guardrail).
//
// Run from concall-alpha/:  node scripts/telegram-post-candidates.mjs [--days N] [--include-posted] [--card ID] [--site URL]
//
//   --days N            how far back to look for eligible cards (default 14)
//   --include-posted    keep cards already in data/telegram-posts/posted.jsonl
//   --card ID           only this card id (e.g. guidance-PAYTM-2027Q1); fetched directly,
//                       so the lookback window does not apply — the reason it is not
//                       postable (if any) is reported under `skipped`
//   --site URL          origin for the links; defaults to NEXT_PUBLIC_SITE_URL, then the
//                       Vercel production host (with a warning — set the env var on the
//                       machine that sends so UTM attribution lands on the real domain)
//
// Output: JSON on stdout. Pipe a candidate's `text_html` into
// scripts/telegram-send.mjs (dry-run by default; --send to post; the ledger
// row is appended there, not here).
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHANGE_LABEL,
  MIN_FEATURE_WEIGHT,
  SECTION_LABEL,
  buildTexts,
  compareCards,
  getArg,
  isPostableCard,
  isSiteRelativeHref,
  ledgerPathFor,
  loadScriptEnv,
  parseIntArg,
  readLedger,
  stripLtd,
} from "./lib/telegram-lib.mjs";

const TAG = "telegram-post-candidates";
const args = process.argv.slice(2);
const LOOKBACK_DAYS = parseIntArg(getArg(args, "--days", "14"), "--days", { min: 1 });
const INCLUDE_POSTED = args.includes("--include-posted");
const ONLY_CARD = getArg(args, "--card", null);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = ledgerPathFor(SCRIPT_DIR);
const env = loadScriptEnv(SCRIPT_DIR, TAG);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
if (!URL_BASE || !KEY) throw new Error("missing Supabase env in .env");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// --- site origin: validate once, up front, naming the source ---
const FALLBACK_SITE = "https://concall-alpha.vercel.app";
const siteArg = getArg(args, "--site", null);
const siteSource = siteArg ? "--site" : env.NEXT_PUBLIC_SITE_URL ? "NEXT_PUBLIC_SITE_URL" : "fallback";
const siteRaw = siteArg || env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE;
let SITE_BASE;
try {
  const u = new URL(siteRaw);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("not http(s)");
  SITE_BASE = u.origin;
} catch {
  throw new Error(`${siteSource} must be an absolute http(s) origin like https://storyofastock.in, got "${siteRaw}"`);
}
if (siteSource === "fallback") {
  console.error(`[${TAG}] NEXT_PUBLIC_SITE_URL unset — links point at ${FALLBACK_SITE}; pass --site or set the env var`);
}

// --- posted ledger: never re-send a card that already went out ---
const ledger = readLedger(LEDGER_PATH);
if (ledger.malformed) console.error(`[${TAG}] ${ledger.malformed} malformed ledger line(s) skipped — repair before sending`);

/** PostgREST caps a response at 1000 rows; page with Range like x-post-candidates.mjs. */
async function fetchAll(pathAndQuery) {
  const out = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const res = await fetch(`${URL_BASE}/rest/v1/${pathAndQuery}`, {
      headers: { ...H, Range: `${from}-${from + page - 1}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`${pathAndQuery} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

// A named card is fetched directly (no window, no floor) so the reason it is
// not postable can be reported instead of a silent empty list.
const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 864e5).toISOString();
const cards = ONLY_CARD
  ? await fetchAll(`desk_featured_read?select=*&id=eq.${encodeURIComponent(ONLY_CARD)}`)
  : await fetchAll(
      `desk_featured_read?select=*&status=eq.eligible&feature_weight=gte.${MIN_FEATURE_WEIGHT}` +
        `&published_at=gte.${encodeURIComponent(cutoff)}&order=published_at.desc`
    );

/** Human reason a row failed isPostableCard — for the `skipped` list. */
function whyNotPostable(card) {
  if (card.status !== "eligible") return `status is "${card.status}", not eligible`;
  if (typeof card.feature_weight !== "number" || card.feature_weight < MIN_FEATURE_WEIGHT) {
    return `feature_weight ${card.feature_weight} is below the desk floor ${MIN_FEATURE_WEIGHT}`;
  }
  if (!(card.section in SECTION_LABEL)) return `unknown section "${card.section}"`;
  if (!(card.change_kind in CHANGE_LABEL)) return `unknown change_kind "${card.change_kind}"`;
  for (const k of ["id", "company_code", "company_name", "headline", "summary", "section_href"]) {
    if (typeof card[k] !== "string" || !card[k].trim()) return `missing ${k}`;
  }
  if (!isSiteRelativeHref(card.section_href)) return `section_href is not site-relative: "${card.section_href}"`;
  return "not postable";
}

const ymd = new Date().toISOString().slice(0, 10);
const candidates = [];
const skipped = [];
for (const card of cards) {
  if (!isPostableCard(card)) {
    skipped.push({ card_id: card.id ?? null, reason: whyNotPostable(card) });
    continue;
  }
  const posted = ledger.byCard.get(card.id) || null;
  if (posted && !INCLUDE_POSTED) {
    if (ONLY_CARD) skipped.push({ card_id: card.id, reason: `already posted on ${posted.posted_on} (pass --include-posted)` });
    continue;
  }
  let texts;
  try {
    texts = buildTexts(card, SITE_BASE);
  } catch (err) {
    skipped.push({ card_id: card.id, reason: err?.message || String(err) });
    continue;
  }
  const { html, plain, campaign, url } = texts;
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
if (ONLY_CARD && cards.length === 0) skipped.push({ card_id: ONLY_CARD, reason: "no such card in desk_featured_read" });

candidates.sort(compareCards);

process.stdout.write(
  JSON.stringify(
    {
      generated_on: ymd,
      site: SITE_BASE,
      site_source: siteSource,
      lookback_days: ONLY_CARD ? null : LOOKBACK_DAYS,
      eligible_cards: cards.length,
      skipped,
      ledger: { path: path.relative(process.cwd(), LEDGER_PATH), posted_count: ledger.byCard.size, malformed: ledger.malformed },
      candidates,
    },
    null,
    2
  ) + "\n"
);
