// Scan an X account's recent tweets, keep only ones about companies WE cover,
// and attach our current data-driven read so the tweet's take can be compared
// against our analysis. Ingestion uses X's unauthenticated syndication embed
// endpoint (no API key, no login) — the only reliable no-auth path since the
// 2023 API lockdown. It returns ~100 recent tweets per handle.
//
// Run from concall-alpha/:
//   node scripts/scan-external-takes.mjs --handle equities_samjho [--days 60] [--all]
// --all also prints unmatched tweets so you can eyeball missed companies.
import { sbClient, loadCompanies, buildMatcher, ourRead, fetchTimeline } from "./lib/take-lib.mjs";

const args = process.argv.slice(2);
const getArg = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const HANDLE = getArg("--handle", "equities_samjho").replace(/^@/, "");
const DAYS = Number(getArg("--days", "90"));
const SHOW_ALL = args.includes("--all");
const sb = sbClient();

// --- run ---
const cutoff = Date.now() - DAYS * 864e5;
const [tweets, companies] = await Promise.all([
  fetchTimeline(HANDLE, { cacheFile: getArg("--cache", null) }),
  loadCompanies(sb),
]);
const match = buildMatcher(companies);
const coveredCodes = new Set(companies.filter((c) => c.covered).map((c) => c.code));

const recent = tweets.filter((t) => t.ts >= cutoff);
const matched = [];
const unmatched = [];
for (const tw of recent) {
  const hits = match(tw.text).filter((h) => coveredCodes.has(h.code)); // only companies WE cover
  if (hits.length) matched.push({ ...tw, companies: hits });
  else unmatched.push(tw);
}

// attach our read for each matched company
for (const m of matched) {
  for (const co of m.companies) co.our_read = await ourRead(sb, co.code);
}

const out = {
  handle: HANDLE,
  window_days: DAYS,
  fetch: tweets.fetchMeta,
  // Newest tweet the endpoint served at all. If this is months old the timeline is
  // truncating and no re-scan will fix it — paste tweet URLs into hydrate-tweet.mjs.
  newest_tweet_available: tweets[0]?.created_at || null,
  fetched: tweets.length,
  in_window: recent.length,
  matched_covered: matched.length,
  takes: matched.map((m) => ({
    date: m.created_at, url: m.url, text: m.text,
    companies: m.companies,
  })),
};
if (SHOW_ALL) out.unmatched = unmatched.map((t) => ({ date: t.created_at, text: t.text.slice(0, 140) }));
console.log(JSON.stringify(out, null, 2));
