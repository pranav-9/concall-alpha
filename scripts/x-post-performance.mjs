// Fetch engagement metrics for OUR OWN posted tweets, using the posted ledger's
// tweet URLs. Works for any account size: the per-tweet endpoints
// (api.fxtwitter.com, cdn.syndication.twimg.com/tweet-result) hydrate single
// tweets even where the timeline endpoint returns empty (<~10k followers).
// The profile page itself is behind a login wall, so URL-by-URL is the honest
// path — which is why logging the tweet `url` in posted.jsonl matters.
//
// Appends snapshot rows to data/x-posts/performance.jsonl (append-only, one row
// per tweet per fetch day) so engagement growth over time is visible. The daily
// sheet (x-post-candidates.mjs --daily) reads the latest snapshot per tweet.
//
// Run from concall-alpha/:  node scripts/x-post-performance.mjs [--days N] [--force]
//   --days N   only tweets posted in the last N days (default 45)
//   --force    re-fetch even if a snapshot already exists for today
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEDGER = path.join(SCRIPT_DIR, "..", "data", "x-posts", "posted.jsonl");
const PERF = path.join(SCRIPT_DIR, "..", "data", "x-posts", "performance.jsonl");

const args = process.argv.slice(2);
const getArg = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DAYS = Number(getArg("--days", "45"));
const FORCE = args.includes("--force");
const today = new Date().toISOString().slice(0, 10);

const readJsonl = (p) => !fs.existsSync(p) ? [] :
  fs.readFileSync(p, "utf8").split("\n").map((l) => l.trim()).filter(Boolean).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  });

const posted = readJsonl(LEDGER).filter((r) => r.status === "posted");
const cutoff = new Date(Date.now() - DAYS * 864e5).toISOString().slice(0, 10);
const withUrl = [], missingUrl = [];
for (const r of posted) {
  if (r.posted_on && r.posted_on < cutoff) continue;
  const id = (String(r.url || "").match(/status(?:es)?\/(\d+)/) || [])[1];
  (id ? withUrl : missingUrl).push({ ...r, tweet_id: id });
}

const already = new Set(readJsonl(PERF).filter((s) => s.fetched_on === today).map((s) => s.tweet_id));

// FxTwitter first (has views); syndication tweet-result as fallback (likes+replies only).
const token = (n) => ((Number(n) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
async function metricsFor(id) {
  try {
    const r = await fetch(`https://api.fxtwitter.com/status/${id}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) throw new Error(`fxtwitter ${r.status}`);
    const t = (await r.json())?.tweet;
    if (!t) throw new Error("fxtwitter empty");
    return { source_api: "fxtwitter", likes: t.likes ?? null, retweets: t.retweets ?? null, replies: t.replies ?? null, views: t.views ?? null };
  } catch (e1) {
    const r = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token(id)}`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) throw new Error(`${e1.message}; syndication ${r.status}`);
    const j = await r.json();
    if (!j || j.text == null) throw new Error(`${e1.message}; syndication empty (deleted/protected?)`);
    return { source_api: "cdn.syndication", likes: j.favorite_count ?? null, retweets: null, replies: j.conversation_count ?? null, views: null };
  }
}

const snapshots = [], errors = [];
for (const r of withUrl) {
  if (!FORCE && already.has(r.tweet_id)) continue;
  try {
    const m = await metricsFor(r.tweet_id);
    snapshots.push({
      fetched_on: today, tweet_id: r.tweet_id, url: r.url,
      posted_on: r.posted_on, company: r.company, quarter: r.quarter,
      lane: r.lane ?? null, angle: r.angle, ...m,
    });
    await new Promise((res) => setTimeout(res, 800)); // be polite — shared rate bucket
  } catch (e) {
    errors.push({ tweet_id: r.tweet_id, company: r.company, error: e.message });
  }
}
if (snapshots.length) fs.appendFileSync(PERF, snapshots.map((s) => JSON.stringify(s)).join("\n") + "\n");

// summary: latest snapshot per tweet over the window (incl. earlier days)
const latest = new Map();
for (const s of readJsonl(PERF)) {
  if (s.posted_on && s.posted_on < cutoff) continue;
  const prev = latest.get(s.tweet_id);
  if (!prev || s.fetched_on >= prev.fetched_on) latest.set(s.tweet_id, s);
}
const rows = [...latest.values()].sort((a, b) => (b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0));
console.log(JSON.stringify({
  fetched_today: snapshots.length,
  skipped_already_fetched_today: withUrl.length - snapshots.length - errors.length,
  errors,
  posted_rows_missing_url: [...new Set(missingUrl.map((r) => `${r.company} ${r.quarter} (posted ${r.posted_on})`))].map((s) => `${s} — paste the tweet URL into the ledger to enable tracking`),
  window_days: DAYS,
  posts: rows.map((s) => ({
    company: s.company, quarter: s.quarter, lane: s.lane, posted_on: s.posted_on,
    views: s.views, likes: s.likes, retweets: s.retweets, replies: s.replies,
    angle: s.angle, url: s.url,
  })),
  by_lane: ["speed", "evidence", "dialogue", null].map((lane) => {
    const g = rows.filter((s) => (s.lane ?? null) === lane);
    if (!g.length) return null;
    const avg = (k) => { const v = g.map((s) => s[k]).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
    return { lane: lane ?? "unlabelled", posts: g.length, avg_views: avg("views"), avg_likes: avg("likes"), avg_replies: avg("replies") };
  }).filter(Boolean),
}, null, 2));
