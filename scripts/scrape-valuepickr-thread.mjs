#!/usr/bin/env node
/**
 * scrape-valuepickr-thread.mjs — pull the RECENT TAIL of a company's ValuePickr
 * (Discourse) thread via the public JSON API. No login. Reading is fine — the VP ban
 * only blocks posting (see [[project_valuepickr_ban]]).
 *
 * Used by the /valuepickr-comparison skill. Two modes:
 *
 *   # 1) fetch one thread's recent tail (default ~3 pages ≈ 60 newest posts)
 *   node scripts/scrape-valuepickr-thread.mjs --company "Neuland Laboratories" --pages 3
 *   node scripts/scrape-valuepickr-thread.mjs --topic 3680 --code NEULANDLAB --pages 3
 *
 *   # 2) map-only: resolve threads + freshness for a comma list (the periodic staleness pass)
 *   node scripts/scrape-valuepickr-thread.mjs --map "Neuland Laboratories,Gravita India,SAMHI Hotels"
 *
 * Output is JSON on stdout. Discourse pages hold ~20 posts; we fetch the last N pages.
 * For renamed/demerged names, pass the well-known name (Acutaas→"Ami Organics",
 * Nuvama→"Edelweiss Wealth", Aarti Pharmalabs→"Aarti Pharma"), or pass --topic directly.
 */

const BASE = "https://forum.valuepickr.com";
const UA = "story-of-a-stock research (contact: pranavyadav996@gmail.com)";

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1] : (i > -1 ? true : def);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function j(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  await sleep(700); // polite throttle
  return res.json();
}

function stripHtml(cooked) {
  return (cooked || "")
    .replace(/<aside class="quote[\s\S]*?<\/aside>/g, " ") // drop quoted-reply blocks
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

const GENERIC = new Set(["limited", "ltd", "ltd.", "india", "of", "and", "the", "&"]);
function tokens(name) {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((w) => w.length >= 4 && !GENERIC.has(w));
}

/** Resolve the dedicated company thread. Returns {id, slug, title, posts_count} or null. */
async function resolveTopic(company) {
  const toks = tokens(company);
  const data = await j(`/search.json?q=${encodeURIComponent(company)}`);
  const topics = data.topics || [];
  const scored = topics.map((t) => {
    const title = (t.title || "").toLowerCase();
    const hits = toks.filter((w) => title.includes(w)).length;
    return { t, hits, posts: t.posts_count || 0 };
  }).filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits || b.posts - a.posts);
  if (!scored.length) return { candidates: topics.slice(0, 5).map((t) => ({ id: t.id, title: t.title })), picked: null };
  const top = scored[0].t;
  return {
    picked: { id: top.id, slug: top.slug, title: top.title, posts_count: top.posts_count || null },
    candidates: scored.slice(0, 4).map((s) => ({ id: s.t.id, title: s.t.title, posts: s.posts })),
  };
}

async function threadMeta(id) {
  const meta = await j(`/t/${id}.json`);
  return {
    id, slug: meta.slug, title: meta.title,
    highest_post_number: meta.highest_post_number,
    posts_count: meta.posts_count,
    last_posted_at: meta.last_posted_at,
    created_at: meta.created_at,
  };
}

async function tail(id, pages) {
  const meta = await threadMeta(id);
  // Discourse ?page=N paginates by STREAM POSITION (posts_count), not post_number —
  // post_numbers have gaps from deleted posts, so highest_post_number over-counts pages.
  const lastPage = Math.max(1, Math.ceil((meta.posts_count || meta.highest_post_number || 20) / 20));
  const wanted = [];
  for (let p = lastPage; p > 0 && wanted.length < pages; p--) wanted.push(p);
  const posts = [];
  for (const p of wanted) {
    const page = await j(`/t/${id}.json?page=${p}`);
    for (const post of page.post_stream?.posts || []) {
      posts.push({
        post_number: post.post_number,
        username: post.username,
        created_at: post.created_at,
        text: stripHtml(post.cooked),
      });
    }
  }
  posts.sort((a, b) => a.post_number - b.post_number);
  return { meta, posts };
}

async function main() {
  const pages = parseInt(arg("pages", "3"), 10) || 3;

  if (arg("map")) {
    const names = String(arg("map")).split(",").map((s) => s.trim()).filter(Boolean);
    const out = [];
    for (const name of names) {
      try {
        const r = await resolveTopic(name);
        if (!r.picked) { out.push({ company: name, thread: null, candidates: r.candidates }); continue; }
        const m = await threadMeta(r.picked.id);
        out.push({ company: name, thread: { id: m.id, title: m.title, posts: m.posts_count, last_posted_at: m.last_posted_at } });
      } catch (e) { out.push({ company: name, error: String(e.message) }); }
    }
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const code = arg("code", null);
  let topicId = arg("topic", null);
  const company = arg("company", null);
  let resolved = null;
  if (!topicId) {
    if (!company) { console.error("need --company or --topic"); process.exit(1); }
    resolved = await resolveTopic(company);
    if (!resolved.picked) {
      console.log(JSON.stringify({ code, company, thread: null, note: "no dedicated thread matched — try the well-known former name or pass --topic", candidates: resolved.candidates }, null, 2));
      return;
    }
    topicId = resolved.picked.id;
  }
  const { meta, posts } = await tail(topicId, pages);
  console.log(JSON.stringify({
    code, company: company || null,
    thread: { id: meta.id, slug: meta.slug, title: meta.title, posts: meta.posts_count, last_posted_at: meta.last_posted_at },
    other_candidates: resolved?.candidates?.filter((c) => c.id !== meta.id) || [],
    pages_fetched: pages, post_count_returned: posts.length,
    posts,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
