// Hydrate a SINGLE tweet by URL or ID, match it to a company we cover, and
// attach our current read. Complements scan-external-takes.mjs (which sweeps a
// timeline): use this when you paste one specific tweet, or for accounts the
// timeline endpoint can't read (sub-~10k-follower accounts return empty
// timelines unauthenticated — but a single tweet by ID still hydrates).
//
// Primary source: cdn.syndication.twimg.com/tweet-result (the endpoint Vercel's
// react-tweet reverse-engineered). Fallback: api.fxtwitter.com. Both unofficial,
// no key. Different rate bucket than the timeline endpoint.
//
// Run from concall-alpha/:  node scripts/hydrate-tweet.mjs <tweet-url-or-id>
import { sbClient, loadCompanies, buildMatcher, ourRead } from "./lib/take-lib.mjs";

const raw = process.argv[2];
if (!raw) { console.error("usage: node scripts/hydrate-tweet.mjs <tweet-url-or-id>"); process.exit(1); }
const id = (raw.match(/status(?:es)?\/(\d+)/) || raw.match(/^(\d+)$/) || [])[1];
if (!id) { console.error(`could not parse a tweet id from: ${raw}`); process.exit(1); }

const decode = (s) => (s || "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/https:\/\/t\.co\/\w+/g, "").trim();

// react-tweet's token derivation for the syndication tweet-result endpoint
const token = (n) => ((Number(n) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");

async function fromSyndication(id) {
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token(id)}`;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`syndication tweet-result -> ${r.status}`);
  const j = await r.json();
  if (!j || !j.text) throw new Error("syndication returned no text (deleted/protected/empty)");
  return {
    id, source_api: "cdn.syndication",
    author: j.user?.screen_name || null,
    created_at: j.created_at || null,
    text: decode(j.text),
  };
}

async function fromFx(id) {
  const r = await fetch(`https://api.fxtwitter.com/status/${id}`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`fxtwitter -> ${r.status}`);
  const j = await r.json();
  const t = j?.tweet;
  if (!t || !t.text) throw new Error("fxtwitter returned no tweet");
  return {
    id, source_api: "fxtwitter",
    author: t.author?.screen_name || null,
    created_at: t.created_at || null,
    text: decode(t.text),
  };
}

let tweet;
try { tweet = await fromSyndication(id); }
catch (e1) {
  try { tweet = await fromFx(id); }
  catch (e2) { console.error(`both sources failed:\n  cdn.syndication: ${e1.message}\n  fxtwitter: ${e2.message}`); process.exit(2); }
}

const sb = sbClient();
const companies = await loadCompanies(sb);
const match = buildMatcher(companies);
const coveredCodes = new Set(companies.filter((c) => c.covered).map((c) => c.code));

const hits = match(tweet.text).filter((h) => coveredCodes.has(h.code));
for (const h of hits) h.our_read = await ourRead(sb, h.code);

console.log(JSON.stringify({
  tweet_url: `https://x.com/${tweet.author || "i"}/status/${id}`,
  source_api: tweet.source_api,
  author: tweet.author,
  date: tweet.created_at,
  text: tweet.text,
  matched_covered: hits.length,
  companies: hits,
  note: hits.length ? undefined : "No covered company matched. If it's oblique (name only in prose), tell me the ticker and I'll compare manually.",
}, null, 2));
