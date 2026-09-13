// Pure helpers shared by telegram-post-candidates.mjs and telegram-send.mjs.
// No I/O beyond the two read* helpers, no env access at import time — so
// tests/telegram-lib.test.ts can exercise every branch without Supabase or a
// bot token.
import fs from "node:fs";

/** Feature-weight floor the desk strip enforces (lib/desk-featured/data.ts
 *  MIN_FEATURE_WEIGHT). Mirrored here so the drafter never offers a card the
 *  portal itself hides. Keep the two in step. */
export const MIN_FEATURE_WEIGHT = 40;

/** Telegram's sendMessage text cap. */
export const TELEGRAM_MAX_CHARS = 4096;

// ── args ────────────────────────────────────────────────────────────────────

/** Value after `flag`, or `def`. A following token that is itself a flag
 *  (`--card --send`) is NOT a value.
 *  @param {string[]} args
 *  @param {string} flag
 *  @param {string|null} [def]
 *  @returns {string|null} */
export function getArg(args, flag, def = null) {
  const i = args.indexOf(flag);
  if (i < 0) return def;
  const v = args[i + 1];
  return v !== undefined && !v.startsWith("--") ? v : def;
}

/** Parse an integer flag value; throws a usage error instead of letting NaN
 *  or a negative number turn into a silent empty result. */
export function parseIntArg(value, name, { min = 0 } = {}) {
  if (value === null || value === undefined) return null;
  if (!/^-?\d+$/.test(String(value))) throw new Error(`${name} must be an integer, got "${value}"`);
  const n = Number(value);
  if (n < min) throw new Error(`${name} must be >= ${min}, got ${n}`);
  return n;
}

// ── .env ────────────────────────────────────────────────────────────────────

/** Minimal dotenv-compatible parser: `export KEY=`, single/double quotes,
 *  inline ` # comment` after an unquoted value, first `=` splits. Last write
 *  wins (as dotenv does) but duplicates are reported so the caller can warn —
 *  a stale second NEXT_PUBLIC_TELEGRAM_URL line is otherwise invisible. */
export function parseEnvText(text) {
  /** @type {Record<string, string>} */
  const env = {};
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const duplicates = [];
  for (const raw of String(text).split("\n")) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    const quote = val[0];
    if ((quote === '"' || quote === "'") && val.length >= 2 && val.endsWith(quote)) {
      val = val.slice(1, -1);
    } else {
      const hash = val.indexOf(" #");
      if (hash >= 0) val = val.slice(0, hash).trim();
    }
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
    env[key] = val;
  }
  return { env, duplicates };
}

export function readEnv(path) {
  return parseEnvText(fs.readFileSync(path, "utf8"));
}

// ── posted ledger ───────────────────────────────────────────────────────────

/** Read data/telegram-posts/posted.jsonl. Only `status: "posted"` rows with a
 *  card_id count for dedupe; blank or malformed lines are skipped. */
export function parseLedgerText(text) {
  /** @type {Map<string, any>} */
  const byCard = new Map();
  let rows = 0;
  let malformed = 0;
  for (const line of String(text).split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let row;
    try {
      row = JSON.parse(t);
    } catch {
      malformed += 1;
      continue;
    }
    rows += 1;
    if (row && row.card_id && row.status === "posted") byCard.set(row.card_id, row);
  }
  return { byCard, rows, malformed };
}

export function readLedger(path) {
  if (!fs.existsSync(path)) return { byCard: new Map(), rows: 0, malformed: 0 };
  return parseLedgerText(fs.readFileSync(path, "utf8"));
}

export function appendLedgerRow(path, row) {
  fs.mkdirSync(dirnameOf(path), { recursive: true });
  fs.appendFileSync(path, JSON.stringify(row) + "\n");
}

function dirnameOf(p) {
  const i = p.lastIndexOf("/");
  return i > 0 ? p.slice(0, i) : ".";
}

// ── formatting ──────────────────────────────────────────────────────────────

/** Telegram parse_mode=HTML needs &, <, > escaped everywhere — including
 *  inside URLs we print as text. */
export const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const stripLtd = (name) => String(name ?? "").replace(/\s+(Limited|Ltd\.?)$/i, "").trim();

export const SECTION_LABEL = {
  guidance: "Guidance",
  growth: "Growth outlook",
  quarter: "Quarter read",
  valuation: "Valuation",
  business_snapshot: "Business snapshot",
  key_variables: "Key variables",
  moat: "Moat",
};

export const CHANGE_LABEL = {
  new_coverage: "new coverage",
  upgraded: "re-read",
  refreshed: "refreshed",
};

/** Is this desk_featured_read row something the desk would show and we can
 *  write a message from? Mirrors the portal's parse gate loosely: the three
 *  text fields must be present and the weight must clear the strip's floor. */
export function isPostableCard(card) {
  if (!card || typeof card !== "object") return false;
  if (card.status !== "eligible") return false;
  if (typeof card.feature_weight !== "number" || card.feature_weight < MIN_FEATURE_WEIGHT) return false;
  for (const k of ["id", "company_code", "company_name", "headline", "summary", "section_href"]) {
    if (typeof card[k] !== "string" || !card[k].trim()) return false;
  }
  return card.section_href.startsWith("/");
}

/** Deep link to the section with UTM params inserted BEFORE the #fragment,
 *  built through the URL API so a `?` already in section_href or an odd
 *  character in the card id can't corrupt the query. */
export function buildSectionLink(card, siteBase) {
  const href = String(card.section_href || `/company/${card.company_code}`);
  if (!href.startsWith("/")) throw new Error(`section_href must be site-relative, got "${href}"`);
  const url = new URL(href, siteBase.replace(/\/$/, "") + "/");
  const campaign = String(card.id).toLowerCase();
  url.searchParams.set("utm_source", "telegram");
  url.searchParams.set("utm_medium", "community");
  url.searchParams.set("utm_campaign", campaign);
  return { url: url.toString(), campaign };
}

export function disclaimerFor(siteBase) {
  return (
    "Not investment advice or research — I read the filings and transcripts. How the scores work: " +
    siteBase.replace(/\/$/, "") +
    "/how-scores-work"
  );
}

/** The message in both Telegram-HTML and plain forms. Every line is the
 *  card's own headline/summary — nothing is invented here. */
export function buildTexts(card, siteBase) {
  const name = stripLtd(card.company_name);
  const section = SECTION_LABEL[card.section] || String(card.section ?? "");
  const kind = CHANGE_LABEL[card.change_kind] || String(card.change_kind ?? "");
  const { url, campaign } = buildSectionLink(card, siteBase);
  const eyebrow = `${section} · ${kind}`;
  const disclaimer = disclaimerFor(siteBase);

  const html = [
    `<b>${esc(name)}</b> (${esc(card.company_code)}) · ${esc(eyebrow)}`,
    `<i>${esc(card.headline)}</i>`,
    "",
    esc(card.summary),
    "",
    `Full read: ${esc(url)}`,
    "",
    `<i>${esc(disclaimer)}</i>`,
  ].join("\n");

  const plain = [
    `${name} (${card.company_code}) · ${eyebrow}`,
    card.headline,
    "",
    card.summary,
    "",
    `Full read: ${url}`,
    "",
    disclaimer,
  ].join("\n");

  return { html, plain, campaign, url };
}

/** Heaviest, then freshest; stable on full ties. */
export function compareCards(a, b) {
  const w = (b.feature_weight ?? 0) - (a.feature_weight ?? 0);
  if (w !== 0) return w;
  const pa = String(a.published_at ?? "");
  const pb = String(b.published_at ?? "");
  if (pa !== pb) return pa < pb ? 1 : -1;
  return String(a.id).localeCompare(String(b.id));
}
