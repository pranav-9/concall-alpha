// Sweep the whole watchlist (data/external-takes/handles.txt) in one pass and
// produce the two cross-account views a single-handle scan can't:
//
//   P1  overlap  — companies WE cover, with every tracked account that mentioned
//                  them + our current read, sorted by how many distinct accounts
//                  discuss each (corroboration). This is the "same company,
//                  different people, vs our score" view.
//   P2  funnel   — cashtags/hashtags these accounts use that do NOT resolve to a
//                  company we cover, ranked by mentions + account diversity.
//                  Names smart accounts keep talking about that we don't track =
//                  onboarding candidates. `in_db:false` = not even in our company
//                  table (strongest new-name signal).
//
// Run from concall-alpha/:  node scripts/sweep-external-takes.mjs [--days 120] [--handle a,b]
// Scans handles sequentially (rate-limit courtesy); missing/empty handles are skipped.
import { sbClient, loadCompanies, buildMatcher, ourRead, fetchTimeline, readHandles } from "./lib/take-lib.mjs";

const args = process.argv.slice(2);
const getArg = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DAYS = Number(getArg("--days", "120"));
const handleArg = getArg("--handle", null);
const handles = handleArg ? handleArg.split(",").map((h) => h.trim().replace(/^@/, "")) : readHandles();

const sb = sbClient();
const companies = await loadCompanies(sb);
const match = buildMatcher(companies);
const coveredCodes = new Set(companies.filter((c) => c.covered).map((c) => c.code));
const allCodesL = companies.map((c) => c.code.toLowerCase());
const coveredCodesL = companies.filter((c) => c.covered).map((c) => c.code.toLowerCase());
const cutoff = Date.now() - DAYS * 864e5;

// hashtags that are markets/jargon, not companies
const TAG_STOP = new Set(["nifty", "sensex", "banknifty", "nse", "bse", "stockmarket", "stocks",
  "stock", "sharemarket", "market", "markets", "investing", "investor", "trading", "trader",
  "multibagger", "portfolio", "ipo", "breakout", "smallcap", "midcap", "largecap", "smallcaps",
  "results", "earnings", "concall", "q1", "q2", "q3", "q4", "h1", "h2", "fy24", "fy25", "fy26",
  "fy27", "india", "nifty50", "sip", "mutualfunds", "dividend", "value", "growth", "pe", "roe",
  "cagr", "fii", "dii", "usdinr", "gold", "crude", "commodities", "learning", "thread", "analysis",
  "it", "learnings", "er", "ai", "esg", "capex", "management", "guidance", "orderbook", "psu"]);

const isCoveredTag = (t) => coveredCodesL.includes(t) || coveredCodesL.some((c) => c.length >= 4 && t.startsWith(c));
const inDbTag = (t) => allCodesL.includes(t) || allCodesL.some((c) => c.length >= 4 && t.startsWith(c));

const overlap = {};  // code -> { name, our_read, accounts: Map(handle -> {date,text,conf}) }
const funnel = {};   // tag  -> { count, accounts:Set, in_db, example }
const scanned = [], skipped = [];

const handleHealth = [];   // per-handle: how the HTML came back + how far the timeline reaches
for (const handle of handles) {
  let tweets;
  try { tweets = await fetchTimeline(handle); }
  catch (e) { handleHealth.push({ handle, source: "error", error: e.message.slice(0, 60) }); skipped.push(`${handle} (${e.message.slice(0, 40)})`); continue; }
  const newest = tweets[0]?.created_at || null;
  handleHealth.push({
    handle,
    source: tweets.fetchMeta?.source,
    stale_cache: tweets.fetchMeta?.stale_cache ?? null,
    cache_age_hours: tweets.fetchMeta?.cache_age_hours ?? null,
    fetched: tweets.length,
    newest_tweet_available: newest,
    // months-old newest tweet = the endpoint truncates for this handle; re-scanning won't help
    newest_tweet_age_days: newest ? Math.floor((Date.now() - Date.parse(newest)) / 864e5) : null,
  });
  const recent = tweets.filter((t) => t.ts >= cutoff);
  if (!recent.length) { skipped.push(`${handle} (0 in window)`); continue; }
  scanned.push(`${handle} (${recent.length})`);

  for (const tw of recent) {
    // P1: covered-company mentions
    for (const h of match(tw.text).filter((x) => coveredCodes.has(x.code))) {
      const o = (overlap[h.code] = overlap[h.code] || { name: h.name, accounts: new Map() });
      const prev = o.accounts.get(handle);
      if (!prev || tw.ts > prev.ts) // keep this account's most recent mention of this company
        o.accounts.set(handle, { ts: tw.ts, date: tw.created_at.slice(4, 10) + " " + tw.created_at.slice(26), conf: h.confidence, text: tw.text.replace(/\n+/g, " ").slice(0, 130) });
    }
    // P2: cashtags/hashtags that are NOT covered companies
    for (const m of tw.text.matchAll(/[#$]([A-Za-z][A-Za-z0-9]{1,})/g)) {
      const tag = m[1].toLowerCase();
      if (TAG_STOP.has(tag) || isCoveredTag(tag)) continue;
      const f = (funnel[tag] = funnel[tag] || { count: 0, accounts: new Set(), in_db: inDbTag(tag), example: tw.text.replace(/\n+/g, " ").slice(0, 90) });
      f.count++; f.accounts.add(handle);
    }
  }
}

// attach our read to overlap companies, shape output
const overlapRows = [];
for (const [code, o] of Object.entries(overlap)) {
  const read = await ourRead(sb, code);
  const mentions = [...o.accounts.entries()].map(([handle, v]) => ({ handle, date: v.date, confidence: v.conf, text: v.text }));
  overlapRows.push({
    code, name: o.name, accounts: o.accounts.size,
    high_conf_accounts: mentions.filter((m) => m.confidence === "high").length, // ticker/cashtag mentions — trust these
    our_read: read && { quarter: read.quarter, score: read.score, qoq_delta: read.qoq_delta, source_status: read.source_status },
    mentions,
  });
}
// rank by high-confidence corroboration first (review-only rows are likely noise),
// then total accounts, then size of our QoQ move (biggest gap-to-watch surfaces)
overlapRows.sort((a, b) =>
  b.high_conf_accounts - a.high_conf_accounts ||
  b.accounts - a.accounts ||
  (Math.abs(b.our_read?.qoq_delta || 0) - Math.abs(a.our_read?.qoq_delta || 0)));

const funnelRows = Object.entries(funnel)
  .map(([tag, f]) => ({ tag, mentions: f.count, accounts: f.accounts.size, in_db: f.in_db, example: f.example }))
  .filter((r) => r.accounts >= 1)
  .sort((a, b) => b.accounts - a.accounts || b.mentions - a.mentions);

console.log(JSON.stringify({
  window_days: DAYS,
  scanned, skipped,
  handle_health: handleHealth,
  handle_health_note: "source=cache-stale-after-error means a 429 was served from old cached HTML — those tweets predate this run. A large newest_tweet_age_days means X's syndication timeline is truncating for that handle; re-scanning won't help, use hydrate-tweet.mjs on pasted tweet URLs.",
  overlap_count: overlapRows.length,
  overlap: overlapRows,
  funnel_note: "cashtags/hashtags not matching a covered company. in_db:false = not in our company table at all (strongest new-name candidate). Eyeball before trusting — some are jargon the stoplist missed.",
  funnel: funnelRows.slice(0, 40),
}, null, 2));
