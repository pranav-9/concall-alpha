// X-post candidates: rank covered companies by how postable their most recent
// quarter update is, and surface the raw "why" material a draft needs.
//
// Signal (per the skill's design): freshest ConcallScore prints + QoQ score
// moves + new/changed guidance. Text-only drafts are written downstream in the
// user's own voice; this script only assembles ground-truth material so the
// draft never invents a number or a reason.
//
// Run from concall-alpha/:  node scripts/x-post-candidates.mjs [--days N] [--top N] [--include-excluded] [--exclude-posted] [--daily] [--lane3-days N] [--takes-days N]
//
// --daily emits the DAILY POSTING SHEET instead of the flat candidate list:
// Lane 1 (speed, cap 2, strategy selection order), Lane 2 nudge (evidence
// thread cadence), Lane 3 (dialogue candidates from the external-takes
// ledger), each with ready-made UTM links. Encodes the 2026-07-31 Twitter
// strategy (CEO plan: ceo-plans/2026-07-31-twitter-distribution-strategy.md).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const LOOKBACK_DAYS = Number(getArg("--days", "14"));
const TOP = Number(getArg("--top", "12"));
const INCLUDE_EXCLUDED = args.includes("--include-excluded");
const EXCLUDE_POSTED = args.includes("--exclude-posted");
const DAILY = args.includes("--daily");
const LANE3_DAYS = Number(getArg("--lane3-days", "10"));
const TAKES_DAYS = Number(getArg("--takes-days", "21"));

// --- already-posted ledger (data/x-posts/posted.jsonl) ---
// We never re-pitch a company/quarter we've already said something about publicly.
// Rows with status "posted" block; "drafted"/"skipped" are history only.
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_PATH = path.join(SCRIPT_DIR, "..", "data", "x-posts", "posted.jsonl");
const postedHistory = new Map(); // company code -> rows[]
if (fs.existsSync(LEDGER_PATH)) {
  for (const line of fs.readFileSync(LEDGER_PATH, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let row;
    try {
      row = JSON.parse(t);
    } catch {
      console.error(`[x-post-candidates] skipping malformed ledger line: ${t.slice(0, 80)}`);
      continue;
    }
    if (!row.company) continue;
    if (!postedHistory.has(row.company)) postedHistory.set(row.company, []);
    postedHistory.get(row.company).push(row);
  }
}

// --- external-takes ledger (data/external-takes/ledger.jsonl) ---
// What tracked peer accounts are saying about companies we cover, written by
// /external-take-tracker. Shared by both modes: classic candidates carry the
// fresh rows per company (chatter = the closest thing we have to "trending"),
// daily mode filters the same rows down to Lane 3 dialogue candidates.
const EXT_LEDGER = path.join(SCRIPT_DIR, "..", "data", "external-takes", "ledger.jsonl");
const extTakes = [];
let extNewestLoggedOn = null;
if (fs.existsSync(EXT_LEDGER)) {
  for (const line of fs.readFileSync(EXT_LEDGER, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let row;
    try { row = JSON.parse(t); } catch { continue; }
    if (!row.company) continue;
    extTakes.push(row);
    if (!extNewestLoggedOn || (row.logged_on || "") > extNewestLoggedOn) extNewestLoggedOn = row.logged_on;
  }
}
const extLedgerAgeDays = extNewestLoggedOn
  ? Math.floor((Date.now() - new Date(extNewestLoggedOn).getTime()) / 864e5)
  : null;
const takeAgeDays = (row) => {
  const d = row.tweet_date || row.logged_on;
  return d ? (Date.now() - new Date(d).getTime()) / 864e5 : Infinity;
};
// logged_on only says when WE recorded a take — a run that logs year-old tweets
// makes the ledger look fresh while the chatter is stale (X's syndication timeline
// truncates: on 2026-08-03 three tracked handles served nothing newer than Nov 2025).
// Age the CHATTER by tweet_date, which is what the signal actually depends on.
const extNewestTweetDate = extTakes.reduce(
  (newest, r) => (r.tweet_date && (!newest || r.tweet_date > newest) ? r.tweet_date : newest),
  null
);
const extChatterAgeDays = extNewestTweetDate
  ? Math.floor((Date.now() - new Date(extNewestTweetDate).getTime()) / 864e5)
  : null;
const extFreshByCompany = new Map(); // company -> fresh rows (tweet within TAKES_DAYS)
for (const row of extTakes) {
  if (takeAgeDays(row) > TAKES_DAYS) continue;
  if (!extFreshByCompany.has(row.company)) extFreshByCompany.set(row.company, []);
  extFreshByCompany.get(row.company).push(row);
}

const envPath = path.join(SCRIPT_DIR, "..", ".env");
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
if (!URL || !KEY) throw new Error("missing Supabase env in .env");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function fetchAll(pathAndQuery) {
  const out = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const res = await fetch(`${URL}/rest/v1/${pathAndQuery}`, {
      headers: { ...H, Range: `${from}-${from + page - 1}` },
    });
    if (!res.ok) throw new Error(`${pathAndQuery} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 864e5).toISOString();

// --- coverage universe (mirror isDiscoveryListed) ---
const companies = await fetchAll(
  "company?select=code,name,market_cap_band_at_admission,excluded_from_discovery"
);
const meta = new Map(companies.map((c) => [c.code, c]));
const isDiscoveryListed = (code) => {
  const c = meta.get(code);
  return c && c.market_cap_band_at_admission !== "large" && c.excluded_from_discovery !== true;
};

// --- fresh scored prints in the window ---
const fresh = await fetchAll(
  `concall_analysis?select=company_code,quarter_label,fy,qtr,score,created_at,details` +
    `&details->scoring_meta=not.is.null&created_at=gte.${cutoff}&order=created_at.desc`
);

// candidate companies = discovery-listed (unless overridden) with a fresh print
const candCodes = [...new Set(
  fresh.map((r) => r.company_code).filter((c) => INCLUDE_EXCLUDED || isDiscoveryListed(c))
)];
if (!candCodes.length) {
  console.log(JSON.stringify({ window_days: LOOKBACK_DAYS, candidates: [], note: "no fresh scored prints in window" }, null, 2));
  process.exit(0);
}

// --- full score history for QoQ, only for candidate companies ---
const inList = `(${candCodes.map((c) => `"${c}"`).join(",")})`;
const hist = await fetchAll(
  `concall_analysis?select=company_code,quarter_label,fy,qtr,score,details->scoring_meta->>source_status,details->scoring_meta->>provider` +
    `&company_code=in.${inList}&details->scoring_meta=not.is.null&order=fy.desc,qtr.desc`
);
const histByCode = new Map();
for (const r of hist) {
  if (!histByCode.has(r.company_code)) histByCode.set(r.company_code, []);
  histByCode.get(r.company_code).push(r);
}

// --- recent guidance updates ---
const guid = await fetchAll(
  `guidance_snapshot?select=company_code,generated_at,big_picture_growth_guidance,current_year_revenue_guidance,credibility_verdict` +
    `&company_code=in.${inList}&order=generated_at.desc`
);
const guidByCode = new Map();
for (const g of guid) if (!guidByCode.has(g.company_code)) guidByCode.set(g.company_code, g);

// --- assemble one candidate per company (its newest fresh print) ---
const seen = new Set();
const candidates = [];
for (const r of fresh) {
  if (seen.has(r.company_code)) continue;
  if (!candCodes.includes(r.company_code)) continue;
  seen.add(r.company_code);

  const h = histByCode.get(r.company_code) || [];
  // next distinct quarter in desc order — exclude same (fy,qtr) AND same label, so
  // a duplicate row for THIS quarter (e.g. an un-superseded unofficial score sitting
  // beside the official one, with drifted fy/qtr encoding) can't masquerade as the
  // prior quarter and fabricate a QoQ "move" (the HFCL -3.8 phantom, 2026-08-07).
  const prior = h.find(
    (x) => x.quarter_label !== r.quarter_label && !(x.fy === r.fy && x.qtr === r.qtr)
  );
  const delta = prior ? Number((r.score - prior.score).toFixed(1)) : null;
  const sm = r.details?.scoring_meta || {};
  const providerMismatch = prior && sm.provider && prior.provider && sm.provider !== prior.provider;

  const rationale = (r.details?.rationale || []).map((x) => ({
    heading: x.heading,
    detail: x.detail,
    direction: x.direction,
    category: x.category,
  }));

  const g = guidByCode.get(r.company_code);
  const guidanceFresh = g && new Date(g.generated_at).toISOString() >= cutoff;

  const history = postedHistory.get(r.company_code) || [];
  const postedThisQuarter = history.some(
    (h) => h.status === "posted" && h.quarter === r.quarter_label
  );

  candidates.push({
    code: r.company_code,
    name: meta.get(r.company_code)?.name || r.company_code,
    discovery_listed: isDiscoveryListed(r.company_code),
    quarter: r.quarter_label,
    // already_posted_this_quarter: we've publicly said something about this exact
    // company+quarter. posted_history carries the angles so a genuinely different
    // hook can still be pitched deliberately rather than by accident.
    already_posted_this_quarter: postedThisQuarter,
    posted_history: history.map((h) => ({
      posted_on: h.posted_on,
      status: h.status,
      quarter: h.quarter,
      angle: h.angle,
      url: h.url ?? null,
    })),
    score: r.score,
    prior_quarter: prior?.quarter_label || null,
    prior_score: prior?.score ?? null,
    qoq_delta: delta,
    scored_at: sm.scored_at || r.created_at,
    source_status: sm.source_status || "official", // no marker on a scoring_meta row = official (a cleared rescore reads as official, not "unknown")
    provider: sm.provider || null,
    provider_mismatch_vs_prior: !!providerMismatch, // if true, QoQ delta is provider-confounded — do NOT frame as a "move"
    rescore_required: !!sm.rescore_required,
    rationale, // the ground-truth "why" — headings + details + direction, per v4 category
    // fresh peer chatter about this company (tweet within --takes-days). A draft
    // that lands in an active conversation travels further; a "disagree" row is
    // also a Lane-3 reply candidate — consider replying instead of posting cold.
    external_takes: (extFreshByCompany.get(r.company_code) || []).map((t) => ({
      source: t.source,
      tweet_date: t.tweet_date,
      tweet_url: t.tweet_url,
      their_stance: t.their_stance,
      their_claim: t.their_claim,
      verdict: t.verdict,
      our_read: t.our_read,
    })),
    guidance_update: guidanceFresh
      ? {
          generated_at: g.generated_at,
          big_picture: g.big_picture_growth_guidance,
          current_year_revenue: g.current_year_revenue_guidance,
          credibility: g.credibility_verdict,
        }
      : null,
  });
}

// --- backfill guard (shared by both modes) --------------------------------------
// A candidate whose "prior" quarter is NOT strictly earlier than its own is not a
// real QoQ move: either the sweep walked backwards and scored an old quarter
// (prior chronologically LATER), or a duplicate row for the SAME quarter slipped
// through (prior EQUAL). Both fabricate a delta. Never a Lane 1 pick, and dropped
// from the CLASSIC list too (both observed 2026-07-xx / 2026-08-07).
const qKey = (label) => {
  const m = /^Q([1-4])FY(\d{2})$/.exec(label || "");
  return m ? Number(m[2]) * 4 + Number(m[1]) : null;
};
const isBackfill = (c) => {
  const cur = qKey(c.quarter);
  const prev = qKey(c.prior_quarter);
  return cur != null && prev != null && prev >= cur;
};

// --- Lane 2 pattern radar: shared drivers across the whole season quarter ---------
// The platform's edge is spotting one macro force refracted across companies that
// share no sector. Scan the ENTIRE current-season quarter (not just the 14-day
// candidate window), cluster each row's rationale by recurring theme, and report
// clusters of >=2 companies with the score spread — the divergence between who the
// force lifted and who it sank. Hand-derived every run before this (2026-08-07).
const seasonQuarter = (() => {
  const counts = new Map();
  for (const c of candidates) counts.set(c.quarter, (counts.get(c.quarter) || 0) + 1);
  let best = null, n = -1;
  for (const [q, k] of counts) if (k > n) { best = q; n = k; }
  return best;
})();
let lane2Patterns = [];
let guidanceWatch = null;
{
  const m = /^Q([1-4])FY(\d{2})$/.exec(seasonQuarter || "");
  if (m) {
    const seasonFy = 2000 + Number(m[2]); // stored as e.g. 2027
    const seasonQtr = Number(m[1]);
    let seasonRows = [];
    try {
      seasonRows = await fetchAll(
        `concall_analysis?select=company_code,score,details->rationale,details->scoring_meta` +
          `&fy=eq.${seasonFy}&qtr=eq.${seasonQtr}&details->scoring_meta=not.is.null`
      );
    } catch { /* pattern radar is best-effort — never block the sheet */ }
    // curated macro drivers we keep seeing quarter to quarter — reliable, named.
    const THEMES = [
      { theme: "West Asia / geopolitical supply shock", re: /middle east|west asia|hormuz|red sea|jebel ali|geopolit|gulf (?:war|conflict|scrap)|strait of/i },
      { theme: "AI data-centre buildout", re: /data cent|data center|hyperscale|liquid cool/i },
      { theme: "Capex expansion cycle", re: /capex.{0,40}(?:doubl|increas|rais|up (?:from|to))|greenfield|brownfield expansion|doubling.{0,20}capacity/i },
      { theme: "Customer / molecule concentration", re: /top \d+.{0,30}(?:customer|molecule)|customer concentration|molecule concentration|single (?:customer|client|molecule|fuel cell)/i },
      { theme: "US tariffs / trade friction", re: /tariff|anti-dumping|section 232|non-chinese|china\s*\+\s*1|import substitut/i },
      { theme: "Management evasive on numbers", re: /declined to (?:provide|quantify|disclose|give)|refused to|would not (?:provide|break|quantify)|evasi|deflect|not (?:break|disclose|analyze)[^.]{0,15}numbers|no (?:specific|numerical|concrete) (?:number|guidance|projection)/i },
      // "raised" may sit up to ~3 words from "guidance/target" ("Raised distribution
      // volume guidance" — AEGISLOG Q1FY27 slipped through the tighter form)
      { theme: "Guidance raised with conviction", re: /guidance raised|raised (?:[\w&-]+ ){0,3}(?:target|guidance)|target raised|(?:target|guidance) (?:revised|lifted) up|definitely beat|upgraded guidance/i },
    ];
    const byTheme = new Map();
    for (const row of seasonRows) {
      const rat = Array.isArray(row.rationale) ? row.rationale : [];
      const text = rat.map((x) => `${x?.heading || ""} ${x?.detail || ""}`).join(" ");
      for (const t of THEMES) {
        if (!t.re.test(text)) continue;
        const hit = rat.find((x) => t.re.test(`${x?.heading || ""} ${x?.detail || ""}`));
        if (!byTheme.has(t.theme)) byTheme.set(t.theme, []);
        byTheme.get(t.theme).push({ code: row.company_code, score: row.score, direction: hit?.direction ?? null });
      }
    }
    lane2Patterns = [...byTheme.entries()]
      .map(([theme, cos]) => {
        const scores = cos.map((c) => c.score).filter((s) => s != null);
        const lo = scores.length ? Math.min(...scores) : null;
        const hi = scores.length ? Math.max(...scores) : null;
        return {
          theme,
          company_count: cos.length,
          score_min: lo,
          score_max: hi,
          score_spread: lo != null ? Number((hi - lo).toFixed(1)) : null,
          companies: cos.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
        };
      })
      .filter((p) => p.company_count >= 2)
      .sort((a, b) => b.company_count - a.company_count);

    // --- guidance-raise watch: INDIVIDUAL post candidates, season-wide ---
    // The user's preferred post type (2026-08-15). Same regex as the lane-2
    // "Guidance raised with conviction" cluster, but emitted per company with
    // provenance and ledger dedupe so each raise is draftable as a standalone
    // post the day it prints — not only as thread material.
    const RAISE_RE = THEMES.find((t) => t.theme === "Guidance raised with conviction").re;
    const seenGw = new Set();
    const gwFresh = [];
    const gwPosted = [];
    for (const row of seasonRows) {
      if (seenGw.has(row.company_code)) continue; // one entry per company
      const rat = Array.isArray(row.rationale) ? row.rationale : [];
      const hits = rat.filter((x) => RAISE_RE.test(`${x?.heading || ""} ${x?.detail || ""}`));
      if (!hits.length) continue;
      seenGw.add(row.company_code);
      const sm = row.scoring_meta || {};
      const posted = (postedHistory.get(row.company_code) || []).some(
        (r) => r.status === "posted" && r.quarter === seasonQuarter
      );
      const entry = {
        code: row.company_code,
        name: meta.get(row.company_code)?.name ?? null,
        quarter: seasonQuarter,
        score: row.score,
        scored_at: sm.scored_at ?? null,
        source_status: sm.source_status ?? "official",
        rescore_required: sm.rescore_required === true,
        discovery_listed: isDiscoveryListed(row.company_code),
        // the matched rationale rows — the ground truth the draft must trace to
        guidance_hits: hits.map((x) => ({ heading: x?.heading, detail: x?.detail, direction: x?.direction })),
        has_positive_hit: hits.some((x) => x?.direction === "positive"),
      };
      if (posted) gwPosted.push(`${entry.code} ${seasonQuarter}`);
      else gwFresh.push(entry);
    }
    gwFresh.sort((a, b) => (b.scored_at || "").localeCompare(a.scored_at || ""));
    guidanceWatch = {
      season_quarter: seasonQuarter,
      note:
        "regex screen over the season's rationale — false positives possible (an 'expense guidance raised' row is not a conviction raise; a 'raised to X' line with no prior figure can't carry an old->new peek). Ground every draft in guidance_hits + the full rationale; direction!=positive hits need extra scrutiny.",
      fresh: gwFresh,
      already_posted: gwPosted,
    };
  }
}

// --- rank: recency + move size + guidance freshness + peer chatter, discovery-listed first ---
const score = (c) => {
  let s = 0;
  const ageDays = (Date.now() - new Date(c.scored_at).getTime()) / 864e5;
  s += Math.max(0, 14 - ageDays); // fresher = higher
  if (c.qoq_delta != null && !c.provider_mismatch_vs_prior) s += Math.abs(c.qoq_delta) * 2.5; // bigger clean move = better hook
  if (c.guidance_update) s += 4;
  if (c.discovery_listed) s += 3;
  // active peer conversation = tailwind; a disagreement is the sharpest hook of
  // all. Kept below the move-size weight so chatter biases, never overrides.
  if (c.external_takes.length) s += 3;
  if (c.external_takes.some((t) => t.verdict === "disagree")) s += 2;
  if (c.already_posted_this_quarter) s -= 100; // said publicly already — sink it
  return s;
};
candidates.sort((a, b) => score(b) - score(a));

const suppressed = candidates.filter((c) => c.already_posted_this_quarter);
const pool = EXCLUDE_POSTED
  ? candidates.filter((c) => !c.already_posted_this_quarter)
  : candidates;

if (!DAILY) {
  // drop phantom-move backfills here too (not just in --daily) — this is where the
  // HFCL -3.8 duplicate surfaced as the #1 ranked candidate on 2026-08-07.
  const classicDropped = pool.filter(isBackfill).map((c) => `${c.code} ${c.quarter} (prior ${c.prior_quarter}, Δ${c.qoq_delta ?? "n/a"})`);
  const classicPool = pool.filter((c) => !isBackfill(c));
  console.log(
    JSON.stringify(
      {
        generated_for_window_days: LOOKBACK_DAYS,
        cutoff,
        external_takes_meta: {
          ledger_newest_logged_on: extNewestLoggedOn,
          ledger_age_days: extLedgerAgeDays,
          chatter_newest_tweet_date: extNewestTweetDate,
          chatter_age_days: extChatterAgeDays,
          fresh_take_companies: extFreshByCompany.size,
          takes_window_days: TAKES_DAYS,
          note:
            extLedgerAgeDays == null
              ? "external-takes ledger empty — run /external-take-tracker first for the chatter signal"
              : extLedgerAgeDays > 7
                ? "ledger older than 7 days — run /external-take-tracker before trusting the chatter signal"
                : extChatterAgeDays != null && extChatterAgeDays > TAKES_DAYS
                  ? `ledger was refreshed ${extLedgerAgeDays}d ago but its NEWEST TWEET is ${extChatterAgeDays}d old — no chatter inside the ${TAKES_DAYS}d window. Re-running /external-take-tracker will NOT help if the syndication timeline is truncating; use hydrate-tweet.mjs on pasted tweet URLs instead.`
                  : null,
        },
        candidate_count: classicPool.length,
        already_posted_count: suppressed.length,
        already_posted: suppressed.map((c) => `${c.code} ${c.quarter}`),
        dropped_backfills: classicDropped,
        lane2_patterns: lane2Patterns,
        guidance_watch: guidanceWatch,
        candidates: classicPool.slice(0, TOP),
      },
      null,
      2
    )
  );
  process.exit(0);
}

// ============================ DAILY POSTING SHEET ============================
// Strategy rules (CEO plan 2026-07-31): Lane 1 cap 2/day with selection order
// largest clean |QoQ| move -> first-ever print -> better coverage rank; link
// goes in the FIRST REPLY (tweet text stays link-free); unofficial scores are
// provisional; Lane 3 is co-primary during cold-start; Lane 2 is ~1 thread/week.

const today = new Date();
const ymd = today.toISOString().slice(0, 10);
const ymdCompact = ymd.replaceAll("-", "");
const SITE_BASE = (env.NEXT_PUBLIC_SITE_URL || "https://concall-alpha.vercel.app").replace(/\/$/, "");
const utmLink = (pagePath, lane, slug) =>
  `${SITE_BASE}${pagePath}?utm_source=twitter&utm_medium=social&utm_campaign=${lane}-${slug.toLowerCase()}-${ymdCompact}`;

// coverage rank (third tie-break). Optional column — fail soft if absent.
const coverageRank = new Map();
try {
  const ranks = await fetchAll("company?select=code,coverage_rank");
  for (const r of ranks) if (r.coverage_rank != null) coverageRank.set(r.code, r.coverage_rank);
} catch {
  console.error("[daily] company.coverage_rank unavailable — tie-break falls back to rank order");
}

const ageDays = (c) => (Date.now() - new Date(c.scored_at).getTime()) / 864e5;
const lane1Order = (a, b) => {
  const cleanAbs = (c) =>
    c.qoq_delta != null && !c.provider_mismatch_vs_prior ? Math.abs(c.qoq_delta) : -1;
  if (cleanAbs(b) !== cleanAbs(a)) return cleanAbs(b) - cleanAbs(a); // 1. largest clean move
  const firstPrint = (c) => (c.prior_quarter == null ? 1 : 0);
  if (firstPrint(b) !== firstPrint(a)) return firstPrint(b) - firstPrint(a); // 2. first-ever print
  const rank = (c) => coverageRank.get(c.code) ?? 9999;
  return rank(a) - rank(b); // 3. better coverage rank
};

// qKey / isBackfill are hoisted above (shared with CLASSIC mode).
const unposted = pool.filter((c) => !c.already_posted_this_quarter);
const backfills = unposted.filter(isBackfill).map((c) => `${c.code} ${c.quarter} (prior ${c.prior_quarter})`);
const lane1Eligible = unposted.filter((c) => !isBackfill(c));
const todayPool = lane1Eligible.filter((c) => ageDays(c) <= 2).sort(lane1Order);
const rolloverPool = lane1Eligible.filter((c) => ageDays(c) > 2).sort(lane1Order);
const lane1Picks = [...todayPool, ...rolloverPool].slice(0, 2).map((c) => ({
  ...c,
  freshness: ageDays(c) <= 2 ? "today" : "rollover",
  provisional: c.source_status === "unofficial" || c.rescore_required,
  first_reply_link: utmLink(`/company/${c.code}`, "speed", c.code),
}));
const lane1Overflow = [...todayPool, ...rolloverPool]
  .slice(2, 7)
  .map((c) => `${c.code} ${c.quarter} (Δ${c.qoq_delta ?? "n/a"}${c.provider_mismatch_vs_prior ? " provider-confounded" : ""})`);

// --- Lane 3: dialogue candidates from the external-takes ledger (parsed once, up top) ---
const repliedUrls = new Set();
for (const rows of postedHistory.values())
  for (const r of rows) if (r.reply_to) repliedUrls.add(r.reply_to);
const lane3 = [];
let lane3Stale = 0;
{
  for (const row of extTakes) {
    if (!row.postable) continue;
    if (row.tweet_url && repliedUrls.has(row.tweet_url)) continue;
    const tweetAge = row.tweet_date ? (Date.now() - new Date(row.tweet_date).getTime()) / 864e5 : Infinity;
    if (tweetAge > LANE3_DAYS) { lane3Stale++; continue; }
    lane3.push({
      source: row.source,
      company: row.company,
      tweet_date: row.tweet_date,
      // reply speed is the whole game in Lane 3 — a reply rides the original
      // tweet's engagement window, which closes within hours-to-a-day
      reply_urgency: tweetAge <= 1 ? "hot — reply this morning" : tweetAge <= 3 ? "warm — still worth it today" : "cooling — low reach, only if the point is strong",
      tweet_url: row.tweet_url,
      their_stance: row.their_stance,
      their_claim: row.their_claim,
      verdict: row.verdict,
      // disagree = engage the claim; agree/adds-new-info = presence reply. The measured
      // reach winner (2026-08-13) was a presence reply, not a disagreement — don't
      // reserve the lane for disagreements.
      reply_mode: row.verdict === "disagree"
        ? "engage the specific claim with our data"
        : "add our datapoint to their thread (presence reply)",
      our_read: row.our_read,
      our_score: row.our_score,
      note: row.note,
      first_reply_link: utmLink(`/company/${row.company}`, "dialogue", row.company),
      recheck: "ledger numbers may be stale — verify against the current print before replying",
    });
  }
}
lane3.sort((a, b) => (a.verdict === "disagree" ? -1 : 0) - (b.verdict === "disagree" ? -1 : 0));

// --- recent performance: latest snapshot per posted tweet (written by
// scripts/x-post-performance.mjs — this block only READS the file, no network) ---
const PERF_PATH = path.join(SCRIPT_DIR, "..", "data", "x-posts", "performance.jsonl");
const perfLatest = new Map();
if (fs.existsSync(PERF_PATH)) {
  for (const line of fs.readFileSync(PERF_PATH, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let s;
    try { s = JSON.parse(t); } catch { continue; }
    const prev = perfLatest.get(s.tweet_id);
    if (!prev || s.fetched_on >= prev.fetched_on) perfLatest.set(s.tweet_id, s);
  }
}
const perfRows = [...perfLatest.values()]
  .sort((a, b) => (b.posted_on || "").localeCompare(a.posted_on || ""))
  .slice(0, 8);
const postedNoUrl = [];
for (const rows of postedHistory.values())
  for (const r of rows) if (r.status === "posted" && !r.url) postedNoUrl.push(`${r.company} ${r.quarter}`);
const topPerf = [...perfLatest.values()].sort((a, b) => (b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0))[0];

// --- Lane 3 cadence: replies in the last 7 days (symmetric to the Lane 2 thread
// nudge — the lane is co-primary by strategy but drifted to 2 replies in 17 days
// on the first campaign, 2026-08-13 audit) ---
let repliesLast7 = 0;
for (const rows of postedHistory.values())
  for (const r of rows)
    if (
      r.status === "posted" &&
      (r.lane === "dialogue" || r.reply_to) &&
      r.posted_on &&
      (Date.now() - new Date(r.posted_on).getTime()) / 864e5 <= 7
    )
      repliesLast7++;

// --- Lane 2 nudge: ~1 evidence thread/week ---
let lastThreadOn = null;
for (const rows of postedHistory.values())
  for (const r of rows)
    if (r.lane === "evidence" && r.status === "posted")
      if (!lastThreadOn || r.posted_on > lastThreadOn) lastThreadOn = r.posted_on;
const daysSinceThread = lastThreadOn
  ? Math.floor((Date.now() - new Date(lastThreadOn).getTime()) / 864e5)
  : null;
let threadCandidates = [];
try {
  threadCandidates = fs
    .readdirSync(path.join(SCRIPT_DIR, "..", "app", "blog", "posts"))
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .reverse()
    .slice(0, 3);
} catch { /* posts dir unavailable — nudge still fires */ }

console.log(
  JSON.stringify(
    {
      sheet_date: ymd,
      strategy: "ceo-plans/2026-07-31-twitter-distribution-strategy.md",
      conventions: {
        link_placement: "tweet text stays link-free; first_reply_link + disclaimer go in the first reply",
        first_reply_disclaimer: "Not investment advice or research — I read the filings and transcripts. How the scores work: " + SITE_BASE + "/how-scores-work",
        cold_start: "Lane 1 and Lane 3 are co-primary until ~500 followers; Lane 2 drops first under time pressure",
        provisional_rule: "provisional: true => label the score '(early read, provisional)' — official transcript may move it",
        posting_window: "originals 18:00-21:00 IST; midday slots are for replies only (measured 2026-08-13: every original >150 views went out 16:30-21:15 IST, all four midday originals died — n small, bias not rule)",
      },
      lane1_speed: {
        cap: 2,
        suggested_timing: "draft in the morning, post 18:00-21:00 IST same day — still days ahead of the official transcript; the market-open slot measured dead for originals (2026-08-13)",
        picks: lane1Picks,
        overflow_rolls_to_tomorrow: lane1Overflow,
        backfills_excluded: backfills,
      },
      lane2_evidence: {
        suggested_timing: "weekend morning sit-down — pair with the weekly /external-take-tracker scan and the M1 measurement read",
        days_since_last_thread: daysSinceThread,
        nudge: daysSinceThread == null || daysSinceThread > 6,
        thread_candidates: threadCandidates,
        // shared drivers across this quarter's concalls — the cross-company thread
        // material. Lead with the highest company_count / widest score_spread.
        season_quarter: seasonQuarter,
        patterns: lane2Patterns,
      },
      guidance_watch: guidanceWatch,
      lane3_dialogue: {
        suggested_timing: "reply within hours of the source tweet — see per-candidate reply_urgency",
        candidates: lane3,
        stale_skipped: lane3Stale,
        replies_last_7_days: repliesLast7,
        nudge: repliesLast7 === 0,
        note: lane3.length === 0 ? "no fresh postable takes — run /external-take-tracker to rescan" : null,
      },
      recent_performance: {
        note: perfRows.length === 0
          ? "no performance snapshots yet — run `node scripts/x-post-performance.mjs` after logging posted tweet URLs"
          : "latest per-tweet metrics (refresh with `node scripts/x-post-performance.mjs`); use angles that pulled engagement to bias today's drafts",
        posts: perfRows.map((s) => ({
          company: s.company, quarter: s.quarter, lane: s.lane, posted_on: s.posted_on,
          views: s.views, likes: s.likes, retweets: s.retweets, replies: s.replies, angle: s.angle,
        })),
        top_performer: topPerf
          ? { company: topPerf.company, views: topPerf.views, likes: topPerf.likes, angle: topPerf.angle }
          : null,
        posted_rows_missing_url: [...new Set(postedNoUrl)],
      },
      ledger_reminder: "log every draft/post to data/x-posts/posted.jsonl (lane, utm_campaign, reply_to, dialog_candidate fields) and commit the ledger this evening",
    },
    null,
    2
  )
);
