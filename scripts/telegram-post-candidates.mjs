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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const LOOKBACK_DAYS = Number(getArg("--days", "14"));
const INCLUDE_POSTED = args.includes("--include-posted");
const ONLY_CARD = getArg("--card", null);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = path.join(SCRIPT_DIR, "..", "data", "telegram-posts", "posted.jsonl");

// --- env (same .env REST pattern as x-post-candidates.mjs) ---
const envPath = path.join(SCRIPT_DIR, "..", ".env");
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
if (!URL || !KEY) throw new Error("missing Supabase env in .env");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const SITE_BASE = (env.NEXT_PUBLIC_SITE_URL || "https://concall-alpha.vercel.app").replace(/\/$/, "");

// --- posted ledger: never re-send a card that already went out ---
const postedByCard = new Map();
if (fs.existsSync(LEDGER_PATH)) {
  for (const line of fs.readFileSync(LEDGER_PATH, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let row;
    try { row = JSON.parse(t); } catch { continue; }
    if (row.card_id && row.status === "posted") postedByCard.set(row.card_id, row);
  }
}

async function fetchAll(pathAndQuery) {
  const res = await fetch(`${URL}/rest/v1/${pathAndQuery}`, { headers: H });
  if (!res.ok) throw new Error(`${pathAndQuery} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 864e5).toISOString();
const cards = await fetchAll(
  `desk_featured_read?select=*&status=eq.eligible&published_at=gte.${encodeURIComponent(cutoff)}&order=published_at.desc`
);

// --- formatting ---
const SECTION_LABEL = {
  guidance: "Guidance",
  growth: "Growth outlook",
  quarter: "Quarter read",
  valuation: "Valuation",
  business_snapshot: "Business snapshot",
  key_variables: "Key variables",
  moat: "Moat",
};
const CHANGE_LABEL = {
  new_coverage: "new coverage",
  upgraded: "re-read",
  refreshed: "refreshed",
};
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const stripLtd = (name) => String(name ?? "").replace(/\s+(Limited|Ltd\.?)$/i, "").trim();
const ymd = new Date().toISOString().slice(0, 10);

function sectionLink(card) {
  // UTM params must sit before the #fragment or the anchor breaks.
  const [pathPart, hash] = String(card.section_href || `/company/${card.company_code}`).split("#");
  const campaign = String(card.id).toLowerCase();
  const url = `${SITE_BASE}${pathPart}?utm_source=telegram&utm_medium=community&utm_campaign=${campaign}`;
  return { url: hash ? `${url}#${hash}` : url, campaign };
}

const DISCLAIMER =
  "Not investment advice or research — I read the filings and transcripts. How the scores work: " +
  SITE_BASE + "/how-scores-work";

function buildTexts(card) {
  const name = stripLtd(card.company_name);
  const section = SECTION_LABEL[card.section] || card.section;
  const kind = CHANGE_LABEL[card.change_kind] || card.change_kind;
  const { url, campaign } = sectionLink(card);
  const eyebrow = `${section} · ${kind}`;

  const html = [
    `<b>${esc(name)}</b> (${esc(card.company_code)}) · ${esc(eyebrow)}`,
    `<i>${esc(card.headline)}</i>`,
    "",
    esc(card.summary),
    "",
    `Full read: ${url}`,
    "",
    `<i>${esc(DISCLAIMER)}</i>`,
  ].join("\n");

  const plain = [
    `${name} (${card.company_code}) · ${eyebrow}`,
    card.headline,
    "",
    card.summary,
    "",
    `Full read: ${url}`,
    "",
    DISCLAIMER,
  ].join("\n");

  return { html, plain, campaign, url };
}

const candidates = [];
for (const card of cards) {
  if (ONLY_CARD && card.id !== ONLY_CARD) continue;
  const posted = postedByCard.get(card.id) || null;
  if (posted && !INCLUDE_POSTED) continue;
  const { html, plain, campaign, url } = buildTexts(card);
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

// Heaviest, freshest first — same editorial order the desk strip uses.
candidates.sort((a, b) => (b.feature_weight - a.feature_weight) || (b.published_at > a.published_at ? 1 : -1));

process.stdout.write(JSON.stringify({
  generated_on: ymd,
  site: SITE_BASE,
  lookback_days: LOOKBACK_DAYS,
  eligible_cards: cards.length,
  ledger: { path: path.relative(process.cwd(), LEDGER_PATH), posted_count: postedByCard.size },
  candidates,
}, null, 2) + "\n");
