// Hot Themes discovery — the research pass that decides what the themes ARE.
//
// Builds one evidence card per covered company from every demand substrate we
// hold, scores a transparent "demand heat" (0-10), clusters the cards against
// the theme signatures (existing + candidate), and writes a report the editor
// (the agent running /themes-refresh) reads before doing the theme CRUD.
//
// Substrates (all read-only here):
//   concall_analysis   latest print + prior print (score delta), cat_4 industry
//                      context + cat_2 forward guidance key points
//   growth_outlook     latest run: growth_score, top catalysts (ramping?)
//   guidance_snapshot  current_year_revenue_guidance.signal_trend (upgraded?)
//   bse_announcements  last N days: order wins (pct of mcap) + positive filings
//   broker ledger      data/external-takes/broker-reports.jsonl (covered reports,
//                      direction, claims) — the "research reports we have"
//   manifest           ../concallyser/data/research-reports/manifest.jsonl:
//                      sector_or_thematic captions = the street's theme language
//
// No LLM. Heat is additive and printed with its parts so it can be argued with.
//
// Run from concall-alpha/:
//   node scripts/themes-discover.mjs                 # 90-day window
//   node scripts/themes-discover.mjs --days 60
//   node scripts/themes-discover.mjs --company KRN  # one card, full evidence
//
// Writes /tmp/sandbox_themes/discover.json (every card + clusters) and prints
// the report. Pair with scripts/themes-refresh.mjs for the writes.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { DRIFT_SIGNATURES, CANDIDATE_SIGNATURES } from "./themes-signatures.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
if (!SUPA || !KEY) throw new Error("missing Supabase env in .env");

const LEDGER = path.join(ROOT, "data", "external-takes", "broker-reports.jsonl");
const MANIFEST = path.join(ROOT, "..", "concallyser", "data", "research-reports", "manifest.jsonl");
const OUT_DIR = "/tmp/sandbox_themes";
const OUT = path.join(OUT_DIR, "discover.json");

// --- args ---------------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = new Map();
for (let i = 0; i < argv.length; i += 1) {
  const t = argv[i];
  if (t === "--days" || t === "--company") { opt.set(t.slice(2), argv[i + 1]); i += 1; }
  else if (t.startsWith("--")) opt.set(t.slice(2), true);
}
const DAYS = Number(opt.get("days") ?? 90);
const ONLY = opt.get("company") ? String(opt.get("company")).toUpperCase() : null;
const SINCE = new Date(Date.now() - DAYS * 864e5);
const SINCE_ISO = SINCE.toISOString();
const SINCE_DAY = SINCE_ISO.slice(0, 10);

// --- coverage predicates (mirror lib/coverage-policy.ts) ----------------------
const isLarge = (c) => c?.market_cap_band_at_admission === "large";
const isBelowCut = (c) => c?.excluded_from_discovery === true;
const isListed = (c) => !!c && !isLarge(c) && !isBelowCut(c);

// --- helpers ------------------------------------------------------------------
const sb = createClient(SUPA, KEY);
const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const num = (n, d = 1) => (n == null || Number.isNaN(Number(n)) ? "—" : Number(n).toFixed(d));
const sum = (a) => a.reduce((x, y) => x + y, 0);
const mean = (a) => (a.length ? sum(a) / a.length : null);
const must = (r, label) => { if (r.error) throw new Error(`${label}: ${r.error.message}`); return r.data ?? []; };

async function pageAll(build, pageSize = 1000) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const r = await build().range(from, from + pageSize - 1);
    const rows = must(r, "page");
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

// --- loads --------------------------------------------------------------------
async function load() {
  const companies = must(await sb.from("company").select("code,name,sector,sub_sector,market_cap_band_at_admission,excluded_from_discovery,composite_score"), "company");
  const themes = must(await sb.from("theme").select("slug,title,blurb,is_featured,sort,hotness"), "theme");
  const memberships = must(await sb.from("theme_membership").select("theme_slug,company_code"), "theme_membership");

  // Concall prints — every scored row, thin projection (details is heavy).
  const prints = await pageAll(() => sb
    .from("concall_analysis")
    .select("company_code,quarter_label,score:details->score,scored_at:details->scoring_meta->>scored_at,industry:details->v4_categories->cat_4_industry_context->key_points,guidance:details->v4_categories->cat_2_forward_guidance->key_points")
    .not("details->scoring_meta", "is", null)
    .order("company_code"));

  // Growth — latest run per company (one row per run; take newest).
  const growth = await pageAll(() => sb
    .from("growth_outlook")
    .select("company,run_timestamp,growth_score,catalysts,summary_bullets")
    .order("run_timestamp", { ascending: false }));

  // Guidance trend — never select guidance_snapshot.details (13 MB fleet-wide).
  const guidance = must(await sb.from("guidance_snapshot").select("company_code,generated_at,cyg:current_year_revenue_guidance"), "guidance_snapshot");

  // Filings in the window: order wins + positive/transformative.
  const filings = await pageAll(() => sb
    .from("bse_announcements")
    .select("company_code,filed_at,category,impact,headline,summary,pct_of_mcap:details->classifier->order_size->pct_of_mcap,order_cr:details->order->value_cr,order_status:details->order->status")
    .gte("filed_at", SINCE_ISO)
    .or("category.eq.order_win,impact.eq.positive,impact.eq.transformative,impact.eq.negative,impact.eq.severe")
    .order("filed_at", { ascending: false }));

  const ledger = readJsonl(LEDGER).filter((r) => (r.report_date ?? "") >= SINCE_DAY);
  const manifest = readJsonl(MANIFEST).filter((r) => (r.date_ist ?? "") >= SINCE_DAY);
  return { companies, themes, memberships, prints, growth, guidance, filings, ledger, manifest };
}

// --- card build ---------------------------------------------------------------
function catalystText(c) {
  return [c.catalyst, c.what_is_changing, c.why_it_matters].filter(Boolean).join(" ");
}

function buildCards(d) {
  const byCode = new Map(d.companies.map((c) => [String(c.code).toUpperCase(), c]));
  const themesOf = new Map();
  for (const m of d.memberships) {
    const code = String(m.company_code).toUpperCase();
    themesOf.set(code, [...(themesOf.get(code) ?? []), m.theme_slug]);
  }

  // Latest + prior concall print per company (by scored_at desc, distinct quarter).
  const printsBy = new Map();
  for (const p of d.prints) {
    const code = String(p.company_code).toUpperCase();
    printsBy.set(code, [...(printsBy.get(code) ?? []), p]);
  }
  const growthBy = new Map();
  for (const g of d.growth) {
    const code = String(g.company).toUpperCase();
    if (!growthBy.has(code)) growthBy.set(code, g); // first = newest
  }
  const guidanceBy = new Map(d.guidance.map((g) => [String(g.company_code).toUpperCase(), g]));
  const filingsBy = new Map();
  for (const f of d.filings) {
    const code = String(f.company_code).toUpperCase();
    filingsBy.set(code, [...(filingsBy.get(code) ?? []), f]);
  }
  const ledgerBy = new Map();
  for (const r of d.ledger) {
    const code = String(r.company).toUpperCase();
    ledgerBy.set(code, [...(ledgerBy.get(code) ?? []), r]);
  }

  const cards = [];
  for (const [code, c] of byCode) {
    if (ONLY && code !== ONLY) continue;
    const ps = (printsBy.get(code) ?? []).slice().sort((a, b) => String(b.scored_at ?? "").localeCompare(String(a.scored_at ?? "")));
    const latest = ps[0] ?? null;
    const prior = ps.find((p) => latest && p.quarter_label !== latest.quarter_label) ?? null;
    const g = growthBy.get(code) ?? null;
    const gd = guidanceBy.get(code) ?? null;
    const fs_ = filingsBy.get(code) ?? [];
    const orders = fs_.filter((f) => f.category === "order_win");
    const positives = fs_.filter((f) => f.impact === "positive" || f.impact === "transformative");
    const negatives = fs_.filter((f) => f.impact === "negative" || f.impact === "severe");
    const reps = ledgerBy.get(code) ?? [];
    const cats = (Array.isArray(g?.catalysts) ? g.catalysts : [])
      .slice()
      .sort((a, b) => (a?.priority?.selection_rank ?? 99) - (b?.priority?.selection_rank ?? 99))
      .slice(0, 3);

    // --- heat: additive, each part named so the report can show its working.
    const parts = [];
    const scoreNow = latest ? Number(latest.score) : null;
    const scorePrev = prior ? Number(prior.score) : null;
    const delta = scoreNow != null && scorePrev != null ? scoreNow - scorePrev : null;
    if (delta != null) {
      if (delta >= 0.5) parts.push(["concall print up ≥0.5", 2]);
      else if (delta > 0) parts.push(["concall print up", 1]);
      else if (delta <= -0.5) parts.push(["concall print down ≥0.5", -1]);
    }
    if (scoreNow != null && scoreNow >= 7) parts.push(["concall score ≥7", 1]);
    const trend = gd?.cyg?.signal_trend ?? null;
    if (trend === "upgraded") parts.push(["revenue guide upgraded", 2]);
    else if (trend === "moderated") parts.push(["revenue guide moderated", -1]);
    const orderPct = orders.map((o) => Number(o.pct_of_mcap) || 0);
    if (orders.length) {
      const big = Math.max(0, ...orderPct);
      const tot = sum(orderPct);
      if (big >= 5 || tot >= 10) parts.push([`order wins ${orders.length}, ${num(tot, 0)}% of mcap`, 2]);
      else parts.push([`order wins ${orders.length}`, 1]);
    }
    if (g && Number(g.growth_score) >= 7) parts.push(["growth score ≥7", 1]);
    if (cats.some((x) => /ramping|accelerat/i.test(String(x?.status_tag ?? "")))) parts.push(["catalyst ramping", 1]);
    const ups = reps.filter((r) => r.direction === "UPSIDE").length;
    const downs = reps.filter((r) => r.direction === "DOWNSIDE").length;
    if (reps.length >= 4) parts.push([`broker notes ${reps.length}`, 2]);
    else if (reps.length >= 2) parts.push([`broker notes ${reps.length}`, 1]);
    if (downs) parts.push([`broker downside ${downs}`, -1]);
    if (negatives.length) parts.push([`negative filings ${negatives.length}`, -1]);
    const heat = Math.max(0, Math.min(10, sum(parts.map((p) => p[1]))));

    // --- text for clustering: what management, the catalysts and the street say.
    const text = [
      c.sub_sector, c.sector,
      ...(Array.isArray(latest?.industry) ? latest.industry : []),
      ...(Array.isArray(latest?.guidance) ? latest.guidance : []),
      ...cats.map(catalystText),
      ...(Array.isArray(g?.summary_bullets) ? g.summary_bullets : []),
      ...reps.map((r) => r.their_claim ?? ""),
      ...orders.map((o) => `${o.headline ?? ""} ${o.summary ?? ""}`),
    ].join(" \n ").toLowerCase();

    const sigs = {};
    for (const [slug, kws] of Object.entries({ ...DRIFT_SIGNATURES, ...CANDIDATE_SIGNATURES })) {
      const hits = kws.filter((k) => text.includes(k));
      if (hits.length) sigs[slug] = { n: hits.length, hits };
    }

    cards.push({
      code, name: c.name, sector: c.sector, sub_sector: c.sub_sector,
      status: !isListed(c) ? (isLarge(c) ? "large-cap" : "below-cut") : "listed",
      composite: c.composite_score,
      themes: themesOf.get(code) ?? [],
      heat, parts,
      concall: latest ? { quarter: latest.quarter_label, score: scoreNow, prior: scorePrev, delta, scored_at: latest.scored_at, industry: latest.industry ?? [], guidance: latest.guidance ?? [] } : null,
      growth: g ? { score: g.growth_score, run: g.run_timestamp, catalysts: cats.map((x) => ({ catalyst: x.catalyst, status: x.status_tag, type: x.type, timing: x.timing })) } : null,
      guide_trend: trend,
      orders: orders.map((o) => ({ at: String(o.filed_at).slice(0, 10), cr: o.order_cr, pct: o.pct_of_mcap, status: o.order_status, headline: o.headline })),
      positives: positives.length, negatives: negatives.length,
      broker: { n: reps.length, up: ups, down: downs, notes: reps.map((r) => ({ at: r.report_date, src: r.source, dir: r.direction, upside: r.upside_pct, claim: String(r.their_claim ?? "").replace(/\s+/g, " ").slice(0, 140) })) },
      sigs,
    });
  }
  return cards;
}

// --- street themes from thematic captions ------------------------------------
function streetThemes(manifest) {
  const thematic = manifest.filter((r) => r.note_type === "sector_or_thematic" || r.note_type === "top_picks");
  const all = { ...DRIFT_SIGNATURES, ...CANDIDATE_SIGNATURES };
  const bySig = new Map();
  const unmatched = [];
  for (const r of thematic) {
    const cap = String(r.caption ?? "").toLowerCase();
    let any = false;
    for (const [slug, kws] of Object.entries(all)) {
      if (kws.some((k) => cap.includes(k))) { any = true; bySig.set(slug, [...(bySig.get(slug) ?? []), r]); }
    }
    if (!any) unmatched.push(r);
  }
  return { thematic, bySig, unmatched };
}

// --- report -------------------------------------------------------------------
function clusterReport(cards, themes) {
  const listed = cards.filter((k) => k.status === "listed");
  const all = { ...DRIFT_SIGNATURES, ...CANDIDATE_SIGNATURES };
  const clusters = [];
  for (const slug of Object.keys(all)) {
    const exists = !!DRIFT_SIGNATURES[slug];
    const hitCards = cards.filter((k) => (k.sigs[slug]?.n ?? 0) >= 2).sort((a, b) => b.heat - a.heat || (b.sigs[slug].n - a.sigs[slug].n));
    const members = hitCards.filter((k) => k.themes.includes(slug));
    const nonMembers = hitCards.filter((k) => !k.themes.includes(slug));
    const hotListed = hitCards.filter((k) => k.status === "listed" && k.heat >= 4);
    clusters.push({ slug, exists, hit: hitCards.length, members: members.length, non_members: nonMembers.map((k) => k.code), hot_listed: hotListed.length, mean_heat_listed: mean(hitCards.filter((k) => k.status === "listed").map((k) => k.heat)), cards: hitCards.map((k) => ({ code: k.code, heat: k.heat, status: k.status, n: k.sigs[slug].n, in: k.themes })) });
  }
  // Existing theme roster health
  const rosters = themes.map((t) => {
    const mem = cards.filter((k) => k.themes.includes(t.slug));
    const l = mem.filter((k) => k.status === "listed");
    return { slug: t.slug, featured: t.is_featured, hotness: t.hotness, n: mem.length, listed: l.length, mean_heat: mean(l.map((k) => k.heat)), hot: l.filter((k) => k.heat >= 5).map((k) => k.code), cold: l.filter((k) => k.heat <= 1).map((k) => k.code), suggested_hotness: l.length ? Math.max(1, Math.min(5, Math.round((mean(l.map((k) => k.heat)) ?? 0) / 1.6))) : null };
  });
  return { clusters, rosters, listedCount: listed.length };
}

function print(cards, d, cr, st) {
  console.log(`=== THEMES DISCOVERY — ${cards.length} companies (${cr.listedCount} discovery-listed), window ${DAYS}d since ${SINCE_DAY} ===`);
  console.log(`substrates: ${d.prints.length} concall prints · ${d.growth.length} growth runs · ${d.guidance.length} guidance snapshots · ${d.filings.length} flagged filings · ${d.ledger.length} covered broker notes · ${st.thematic.length} street sector/thematic notes`);
  console.log("heat = concall delta/level + guide trend + order wins (% mcap) + growth/catalysts + broker notes − downside/negatives, clamped 0-10\n");

  console.log("--- EXISTING THEMES: roster heat (listed members only) ---");
  for (const r of cr.rosters.sort((a, b) => (b.featured - a.featured) || ((b.mean_heat ?? -1) - (a.mean_heat ?? -1)))) {
    console.log(`  [${r.featured ? "FEATURED" : "benched "} hot=${r.hotness ?? "—"} → suggest ${r.suggested_hotness ?? "—"}] ${r.slug.padEnd(32)} ${String(r.listed).padStart(2)}/${String(r.n).padStart(2)} listed  mean heat ${num(r.mean_heat)}  hot: ${r.hot.join(",") || "—"}  cold: ${r.cold.join(",") || "—"}`);
  }

  console.log("\n--- CLUSTERS: companies whose evidence hits a signature ≥2 times (heat-sorted; `in:` = current themes) ---");
  for (const c of cr.clusters.sort((a, b) => b.hot_listed - a.hot_listed || (b.mean_heat_listed ?? -1) - (a.mean_heat_listed ?? -1))) {
    if (!c.hit) continue;
    const tag = c.exists ? "exists " : "NEW?   ";
    console.log(`\n  [${tag}] ${c.slug}  hits=${c.hit}  hot-listed=${c.hot_listed}  mean heat(listed)=${num(c.mean_heat_listed)}${c.exists ? `  members-hit=${c.members}` : ""}`);
    for (const k of c.cards.slice(0, 14)) {
      const flag = k.status !== "listed" ? ` [${k.status}]` : "";
      console.log(`      ${k.code.padEnd(12)} heat ${String(k.heat).padStart(2)}  sig×${k.n}${flag}  in: ${k.in.join("+") || "—"}`);
    }
  }

  console.log("\n--- HOTTEST 25 (any theme or none) ---");
  for (const k of cards.filter((k) => k.status === "listed").sort((a, b) => b.heat - a.heat).slice(0, 25)) {
    console.log(`  ${k.code.padEnd(12)} heat ${String(k.heat).padStart(2)}  [${k.sub_sector}]  in: ${k.themes.join("+") || "—"}  — ${k.parts.map((p) => `${p[0]} ${p[1] > 0 ? "+" : ""}${p[1]}`).join("; ")}`);
  }

  console.log(`\n--- STREET: ${st.thematic.length} sector/thematic broker notes in window, by signature ---`);
  for (const [slug, rows] of [...st.bySig].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${slug.padEnd(32)} ${String(rows.length).padStart(2)}  e.g. ${rows.slice(0, 2).map((r) => `${r.date_ist} ${String(r.caption).replace(/\s+/g, " ").slice(0, 70)}`).join(" | ")}`);
  }
  console.log(`  (unmatched thematic notes: ${st.unmatched.length} — in discover.json → street.unmatched; read them for themes we have no signature for)`);

  if (ONLY) {
    console.log("\n--- FULL CARD ---");
    console.log(JSON.stringify(cards[0], null, 2));
  }
}

// --- main ---------------------------------------------------------------------
const d = await load();
const cards = buildCards(d);
const cr = clusterReport(cards, d.themes);
const st = streetThemes(d.manifest);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  generated_at: new Date().toISOString(), days: DAYS, since: SINCE_DAY,
  rosters: cr.rosters, clusters: cr.clusters, cards,
  street: { by_signature: Object.fromEntries([...st.bySig].map(([s, r]) => [s, r.map((x) => ({ date: x.date_ist, broker: x.broker, caption: x.caption, file: x.file }))])), unmatched: st.unmatched.map((x) => ({ date: x.date_ist, broker: x.broker, caption: x.caption, file: x.file })) },
}, null, 2));
print(cards, d, cr, st);
console.log(`\n=== written ${OUT}`);
