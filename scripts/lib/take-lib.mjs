// Shared plumbing for the external-take tooling: Supabase access, the
// precision-first company matcher, and "our current read" for a company.
// Used by scan-external-takes.mjs (timeline sweep) and hydrate-tweet.mjs
// (single tweet by URL) so matching never drifts between them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const decodeTweet = (s) => (s || "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/https:\/\/t\.co\/\w+/g, "").trim();

// Pull + parse a handle's syndication timeline (originals only, newest first).
// Disk-caches raw HTML per handle (6h TTL) so retries/re-scans don't hammer the
// endpoint (429s fast). opts.cacheFile forces reading a specific cached HTML file.
export async function fetchTimeline(handle, opts = {}) {
  const cacheDir = "/tmp/external_takes_cache";
  const cacheFile = path.join(cacheDir, `${handle}.html`);
  const TTL = 6 * 3600 * 1000;
  let html;
  // How the HTML was obtained, so callers can tell a live fetch from a cache
  // replay. A silent stale-ok fallback used to make a 429 look like a clean scan.
  const cacheAgeHours = () =>
    fs.existsSync(cacheFile)
      ? Math.round(((Date.now() - fs.statSync(cacheFile).mtimeMs) / 36e5) * 10) / 10
      : null;
  let fetchMeta = { source: "live", stale_cache: false, cache_age_hours: null, http_status: null };
  if (opts.cacheFile) {
    html = fs.readFileSync(opts.cacheFile, "utf8");
    fetchMeta = { source: "cache-file", stale_cache: false, cache_age_hours: null, http_status: null };
  } else if (fs.existsSync(cacheFile) && Date.now() - fs.statSync(cacheFile).mtimeMs < TTL) {
    fetchMeta = { source: "cache-fresh", stale_cache: false, cache_age_hours: cacheAgeHours(), http_status: null };
    html = fs.readFileSync(cacheFile, "utf8");
  } else {
    const res = await fetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      if (fs.existsSync(cacheFile)) {
        // stale-ok fallback — flagged, not silent: these tweets predate this run
        fetchMeta = { source: "cache-stale-after-error", stale_cache: true, cache_age_hours: cacheAgeHours(), http_status: res.status };
        html = fs.readFileSync(cacheFile, "utf8");
      } else throw new Error(`syndication ${handle} -> ${res.status} (handle wrong / rate-limited; no cache to fall back on)`);
    } else {
      html = await res.text();
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, html);
    }
  }
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  if (!m) throw new Error("no __NEXT_DATA__ (endpoint shape changed)");
  const entries = JSON.parse(m[1]).props?.pageProps?.timeline?.entries || [];
  const tweets = entries.filter((e) => e.type === "tweet").map((e) => e.content?.tweet).filter(Boolean)
    .filter((t) => !t.in_reply_to_screen_name && !t.retweeted_status)
    .map((t) => ({
      id: t.id_str,
      url: `https://x.com/${handle}/status/${t.id_str}`,
      created_at: t.created_at,
      ts: Date.parse(t.created_at),
      text: decodeTweet(t.full_text || t.text),
    }))
    .filter((t) => Number.isFinite(t.ts))
    .sort((a, b) => b.ts - a.ts);
  // Non-enumerable so existing callers that iterate/serialize the array are unaffected.
  Object.defineProperty(tweets, "fetchMeta", { value: fetchMeta, enumerable: false });
  return tweets;
}

// Read the tracked-account watchlist (data/external-takes/handles.txt).
export function readHandles() {
  const p = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "external-takes", "handles.txt");
  return fs.readFileSync(p, "utf8").split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.replace(/^@/, ""));
}

export function sbClient() {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".env");
  const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8").split("\n").filter((l) => l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
  );
  const URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
  if (!URL || !KEY) throw new Error("missing Supabase env in .env");
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
  return async (q) => {
    const r = await fetch(`${URL}/rest/v1/${q}`, { headers: H });
    if (!r.ok) throw new Error(`${q} -> ${r.status}: ${(await r.text()).slice(0, 160)}`);
    return r.json();
  };
}

export async function loadCompanies(sb) {
  const companies = await sb("company?select=code,name,market_cap_band_at_admission,excluded_from_discovery");
  for (const c of companies)
    c.covered = c.market_cap_band_at_admission !== "large" && c.excluded_from_discovery !== true;
  return companies;
}

// Precision >> recall: a wrong "our read" pinned to someone else's take is worse
// than a miss. Match only on ticker/cashtag or a CONTIGUOUS name phrase — never
// scattered generic words ("financial", "wealth management", "exchange"...).
export function buildMatcher(companies) {
  const STOP = new Set(["limited", "ltd", "india", "indian", "and", "the", "of", "pvt",
    "private", "company", "co"]);
  const GENERIC = new Set(["technologies", "industries", "enterprises", "corporation",
    "management", "financial", "finance", "solutions", "engineering", "engineers",
    "international", "exchange", "chemicals", "pharmaceuticals", "healthcare", "services",
    "products", "systems", "capital", "wealth", "asset", "power", "energy", "motors",
    "building", "buildings", "infrastructure", "projects", "prepaid", "ocean",
    "development", "developers", "logistics", "sciences", "lifesciences", "hotels",
    "resorts", "laboratories", "pharmaceutical", "electronics", "consultancy"]);
  // Tickers that are also everyday English words. Bare lowercase prose ("high beta",
  // "on time", "power sector") must NOT match these — require a $/# cashtag or an
  // all-caps ticker-style mention. Extend as collisions surface. (Company-name
  // mentions like "Beta Drugs" still match via the name-phrase path.)
  const AMBIGUOUS = new Set(["beta", "time", "care", "best", "power", "arm", "map",
    "all", "one", "zen", "key", "dish", "just", "info", "force", "action", "happy",
    "safari", "pure", "relief", "route", "orient", "bata", "asian", "gail"]);
  const entries = companies.map((c) => {
    const toks = (c.name || "").toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.has(w));
    const lead = toks.slice(0, 2);
    const phrase = lead.length >= 2 ? lead.join(" ") : null;
    const strongSolo = toks.find((w) => w.length >= 8 && !GENERIC.has(w));
    return { code: c.code, name: c.name, covered: c.covered, codeL: c.code.toLowerCase(), phrase, strongSolo };
  });
  return (text) => {
    const norm = " " + (text || "").toLowerCase().replace(/[^\w\s#$]/g, " ").replace(/\s+/g, " ") + " ";
    const tags = [...(text || "").matchAll(/[#$]([a-z0-9]+)/gi)].map((m) => m[1].toLowerCase());
    const hits = [];
    for (const e of entries) {
      const cashtag = tags.some((t) => t === e.codeL || (e.codeL.length >= 4 && t.startsWith(e.codeL)));
      // ambiguous codes need a cashtag or an all-caps ticker mention in the raw text;
      // everything else can match the code as a bare word (case-insensitive)
      const codeWord = AMBIGUOUS.has(e.codeL)
        ? new RegExp(`\\b${e.code}\\b`).test(text || "")
        : new RegExp(`[\\s#$]${e.codeL}\\b`, "i").test(norm);
      if (codeWord || cashtag) {
        hits.push({ code: e.code, name: e.name, covered: e.covered, via: cashtag ? "cashtag" : "code", confidence: "high" });
        continue;
      }
      if (e.phrase && norm.includes(" " + e.phrase)) {
        hits.push({ code: e.code, name: e.name, covered: e.covered, via: `phrase:${e.phrase}`, confidence: "review" });
      } else if (e.strongSolo && new RegExp(`\\b${e.strongSolo}\\b`).test(norm)) {
        hits.push({ code: e.code, name: e.name, covered: e.covered, via: `token:${e.strongSolo}`, confidence: "review" });
      }
    }
    return [...new Map(hits.map((h) => [h.code, h])).values()];
  };
}

export async function ourRead(sb, code) {
  const rows = await sb(
    `concall_analysis?select=quarter_label,fy,qtr,score,details->rationale,details->scoring_meta` +
    `&company_code=eq.${code}&details->scoring_meta=not.is.null&order=fy.desc,qtr.desc&limit=2`
  );
  if (!rows.length) return null;
  const [cur, prior] = rows;
  const sm = cur.scoring_meta || {};
  return {
    quarter: cur.quarter_label,
    score: cur.score,
    prior_quarter: prior?.quarter_label || null,
    prior_score: prior?.score ?? null,
    qoq_delta: prior ? Number((cur.score - prior.score).toFixed(1)) : null,
    source_status: sm.source_status || "unknown",
    rescore_required: !!sm.rescore_required,
    rationale: (cur.rationale || []).map((r) => ({ heading: r.heading, direction: r.direction, detail: r.detail })),
  };
}
