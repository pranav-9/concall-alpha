// X-post candidates: rank covered companies by how postable their most recent
// quarter update is, and surface the raw "why" material a draft needs.
//
// Signal (per the skill's design): freshest ConcallScore prints + QoQ score
// moves + new/changed guidance. Text-only drafts are written downstream in the
// user's own voice; this script only assembles ground-truth material so the
// draft never invents a number or a reason.
//
// Run from concall-alpha/:  node scripts/x-post-candidates.mjs [--days N] [--top N] [--include-excluded] [--exclude-posted]
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
  const prior = h.find((x) => !(x.fy === r.fy && x.qtr === r.qtr)); // next distinct quarter in desc order
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
    source_status: sm.source_status || "unknown", // official | unofficial
    provider: sm.provider || null,
    provider_mismatch_vs_prior: !!providerMismatch, // if true, QoQ delta is provider-confounded — do NOT frame as a "move"
    rescore_required: !!sm.rescore_required,
    rationale, // the ground-truth "why" — headings + details + direction, per v4 category
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

// --- rank: recency + move size + guidance freshness, discovery-listed first ---
const score = (c) => {
  let s = 0;
  const ageDays = (Date.now() - new Date(c.scored_at).getTime()) / 864e5;
  s += Math.max(0, 14 - ageDays); // fresher = higher
  if (c.qoq_delta != null && !c.provider_mismatch_vs_prior) s += Math.abs(c.qoq_delta) * 2.5; // bigger clean move = better hook
  if (c.guidance_update) s += 4;
  if (c.discovery_listed) s += 3;
  if (c.already_posted_this_quarter) s -= 100; // said publicly already — sink it
  return s;
};
candidates.sort((a, b) => score(b) - score(a));

const suppressed = candidates.filter((c) => c.already_posted_this_quarter);
const pool = EXCLUDE_POSTED
  ? candidates.filter((c) => !c.already_posted_this_quarter)
  : candidates;

console.log(
  JSON.stringify(
    {
      generated_for_window_days: LOOKBACK_DAYS,
      cutoff,
      candidate_count: pool.length,
      already_posted_count: suppressed.length,
      already_posted: suppressed.map((c) => `${c.code} ${c.quarter}`),
      candidates: pool.slice(0, TOP),
    },
    null,
    2
  )
);
