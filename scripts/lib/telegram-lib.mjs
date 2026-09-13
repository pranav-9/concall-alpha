// Pure helpers shared by telegram-post-candidates.mjs and telegram-send.mjs.
// The only I/O lives in readEnv / readLedger / appendLedgerRow / withLedgerLock;
// nothing touches env or disk at import time, so tests/telegram-lib.test.ts can
// exercise every branch without Supabase or a bot token.
import fs from "node:fs";
import path from "node:path";

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

/** Parse an integer flag/env value; throws a usage error naming the source
 *  instead of letting NaN or a negative number turn into a silent empty result.
 *  @param {string|null|undefined} value
 *  @param {string} name what supplied the value (a flag or an env var)
 *  @returns {number|null} */
export function parseIntArg(value, name, { min = 0 } = {}) {
  if (value === null || value === undefined) return null;
  if (!/^-?\d+$/.test(String(value))) throw new Error(`${name} must be an integer, got "${value}"`);
  const n = Number(value);
  if (n < min) throw new Error(`${name} must be >= ${min}, got ${n}`);
  return n;
}

// ── .env ────────────────────────────────────────────────────────────────────

/** Minimal dotenv-compatible parser: `export KEY=`, single/double quotes
 *  (with or without a trailing ` # comment`), inline ` # comment` after an
 *  unquoted value, first `=` splits. Last write wins (as dotenv does) but
 *  duplicates are reported so the caller can warn — a stale second
 *  NEXT_PUBLIC_TELEGRAM_URL line is otherwise invisible. */
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
    const close = quote === '"' || quote === "'" ? val.indexOf(quote, 1) : -1;
    if (close > 0) {
      val = val.slice(1, close);
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

export function readEnv(envPath) {
  return parseEnvText(fs.readFileSync(envPath, "utf8"));
}

/** Both scripts bootstrap the same way: read ../.env relative to the script,
 *  warn about duplicate keys under the script's tag. */
export function loadScriptEnv(scriptDir, tag) {
  const { env, duplicates } = readEnv(path.join(scriptDir, "..", ".env"));
  for (const k of duplicates) console.error(`[${tag}] .env defines ${k} more than once — last line wins`);
  return env;
}

export function ledgerPathFor(scriptDir) {
  return path.join(scriptDir, "..", "data", "telegram-posts", "posted.jsonl");
}

// ── posted ledger ───────────────────────────────────────────────────────────

/** Parse data/telegram-posts/posted.jsonl. Only `status: "posted"` rows with a
 *  card_id count for dedupe. Blank lines are ignored; malformed lines are
 *  counted so the caller can decide whether that is a corruption signal. */
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
    if (row && typeof row.card_id === "string" && row.status === "posted") byCard.set(row.card_id, row);
  }
  return { byCard, rows, malformed };
}

export function readLedger(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) return { byCard: new Map(), rows: 0, malformed: 0 };
  return parseLedgerText(fs.readFileSync(ledgerPath, "utf8"));
}

export function appendLedgerRow(ledgerPath, row) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, JSON.stringify(row) + "\n");
}

/** Serialise check-then-send-then-append across concurrent invocations with
 *  an exclusive lock file next to the ledger. A stale lock (crashed run) is
 *  reported, not silently stolen. */
export async function withLedgerLock(ledgerPath, fn) {
  const lockPath = `${ledgerPath}.lock`;
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  let fd;
  try {
    fd = fs.openSync(lockPath, "wx");
  } catch (err) {
    if (err && err.code === "EEXIST") {
      throw new Error(`another send is in progress (or crashed) — remove ${lockPath} if no other process is running`);
    }
    throw err;
  }
  try {
    fs.writeSync(fd, String(process.pid));
    return await fn();
  } finally {
    fs.closeSync(fd);
    fs.rmSync(lockPath, { force: true });
  }
}

/** Calendar date the way the operator sees it (IST), so a late-night send
 *  is ledgered under the day it was posted, not the UTC day. */
export function todayInKolkata(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

// ── formatting ──────────────────────────────────────────────────────────────

/** Telegram parse_mode=HTML needs &, <, > escaped everywhere — including
 *  inside URLs we print as text. */
export const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const stripLtd = (name) => String(name ?? "").replace(/\s+(Limited|Ltd\.?)$/i, "").trim();

/** Keep in step with lib/desk-featured/types.ts (FEATURED_SECTIONS /
 *  CHANGE_KINDS) and /schemas/desk_featured_read_v1.json. A value missing here
 *  fails isPostableCard rather than being posted with a raw label. */
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

const REQUIRED_TEXT = ["id", "company_code", "company_name", "headline", "summary", "section_href"];

/** A site-relative path: one leading slash, not `//host` (protocol-relative)
 *  and not `/\host` (which WHATWG URL also treats as an authority). */
export function isSiteRelativeHref(href) {
  return typeof href === "string" && href.startsWith("/") && !/^\/[\/\\]/.test(href);
}

/** Is this desk_featured_read row something the desk would show and we can
 *  write a message from? Mirrors the portal's parse gate: eligible, above the
 *  strip's weight floor, known section/change_kind, the text fields present,
 *  and a site-relative deep link. */
export function isPostableCard(card) {
  if (!card || typeof card !== "object") return false;
  if (card.status !== "eligible") return false;
  if (typeof card.feature_weight !== "number" || card.feature_weight < MIN_FEATURE_WEIGHT) return false;
  if (!(card.section in SECTION_LABEL) || !(card.change_kind in CHANGE_LABEL)) return false;
  for (const k of REQUIRED_TEXT) {
    if (typeof card[k] !== "string" || !card[k].trim()) return false;
  }
  return isSiteRelativeHref(card.section_href);
}

const stripSlash = (s) => String(s).replace(/\/$/, "");

/** Deep link to the section with UTM params inserted BEFORE the #fragment,
 *  built through the URL API so a `?` already in section_href or an odd
 *  character in the card id can't corrupt the query. The result is asserted
 *  to stay on our origin — a poisoned href fails the row, never ships. */
export function buildSectionLink(card, siteBase) {
  const href = String(card.section_href || `/company/${card.company_code}`);
  if (!isSiteRelativeHref(href)) throw new Error(`section_href must be site-relative, got "${href}"`);
  const base = stripSlash(siteBase) + "/";
  const url = new URL(href, base);
  if (url.origin !== new URL(base).origin) {
    throw new Error(`section_href resolved off-site (${url.origin}), got "${href}"`);
  }
  const campaign = String(card.id).toLowerCase();
  url.searchParams.set("utm_source", "telegram");
  url.searchParams.set("utm_medium", "community");
  url.searchParams.set("utm_campaign", campaign);
  return { url: url.toString(), campaign };
}

export function disclaimerFor(siteBase) {
  return (
    "Not investment advice or research — I read the filings and transcripts. How the scores work: " +
    stripSlash(siteBase) +
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

/** Shape check for a row of the drafter's JSON before the sender trusts it. */
export function isCandidate(c) {
  return Boolean(
    c &&
      typeof c === "object" &&
      typeof c.card_id === "string" &&
      c.card_id.length > 0 &&
      typeof c.text_html === "string" &&
      c.text_html.length > 0 &&
      (c.company_code === undefined || typeof c.company_code === "string") &&
      (c.section === undefined || typeof c.section === "string") &&
      (c.utm_campaign === undefined || typeof c.utm_campaign === "string")
  );
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
