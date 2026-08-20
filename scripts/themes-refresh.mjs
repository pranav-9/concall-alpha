// Hot Themes maintenance — health report, missing-linkage suggestions, gated
// membership promote, freshness touch, and seed regeneration.
//
// Themes carry NO stored score: the `theme` / `theme_membership` tables are pure
// editorial data, and every number joins live from the board at render
// (lib/themes/data.ts -> getOverallBoardRows). This script only maintains the two
// editorial tables. Scope is MEMBERSHIP ONLY — creating / benching / reordering /
// re-blurbing whole themes stays hand-SQL (see lib/supabase/hot_themes.sql).
//
// The board is built with getConcallData({ excludeLargeCaps: true, includeBelowCut:
// true }). So an admitted large-cap member is DROPPED at render (never on the board),
// while a below-cut member renders greyed. This script flags both.
//
// Run from concall-alpha/:
//   node scripts/themes-refresh.mjs                         # health report + write proposed.json
//   node scripts/themes-refresh.mjs --wide                  # widen suggestions to sector-level (noisier, opt-in)
//   node scripts/themes-refresh.mjs --stale-days 60         # tighter staleness threshold
//   node scripts/themes-refresh.mjs --driver-drift          # existing members whose CURRENT driver points elsewhere
//   node scripts/themes-refresh.mjs --un-themed             # discovery-listed non-members that may fit a theme
//   node scripts/themes-refresh.mjs --apply                 # dry-run the proposed.json adds
//   node scripts/themes-refresh.mjs --apply --yes           # actually upsert them
//   node scripts/themes-refresh.mjs --add ev-electrification:SONACOMS --apply --yes
//   node scripts/themes-refresh.mjs --remove ems:PGEL --yes
//   node scripts/themes-refresh.mjs --touch metals-mining-upcycle --yes    # whole theme
//   node scripts/themes-refresh.mjs --touch metals-mining-upcycle:GPIL --yes  # single member
//   node scripts/themes-refresh.mjs --dump-seed             # regenerate the seed .sql from live
//
// --driver-drift and --un-themed are READ-ONLY Stage-1 keyword triage. They over-flag
// ~7:1 by design — a flag is a candidate to WEB-CONFIRM (segment revenue mix + external
// order context), never an auto-move. See SKILL.md "driver-drift" for the 3-stage funnel.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const envPath = path.join(ROOT, ".env");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
// Writes to theme_membership are service-role only (RLS: public read, no write policy —
// hot_themes.sql). The anon key would silently no-op like valuation_check, so refuse it.
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA) throw new Error("missing NEXT_PUBLIC_SUPABASE_URL in .env");

const SANDBOX_DIR = "/tmp/sandbox_themes";
const PROPOSED_PATH = path.join(SANDBOX_DIR, "proposed.json");
const RUN_LOG = path.join(HERE, "themes_refresh_runs.md");
const MAX_SUGGESTIONS_PER_THEME = 6;

// --- args ---------------------------------------------------------------------
const VALUE_FLAGS = new Set(["--stale-days", "--add", "--remove", "--touch"]);
const argv = process.argv.slice(2);
const options = new Map();
for (let i = 0; i < argv.length; i += 1) {
  const token = argv[i];
  if (VALUE_FLAGS.has(token)) {
    options.set(token.slice(2), argv[i + 1]);
    i += 1;
  } else if (token.startsWith("--")) {
    options.set(token.slice(2), true);
  }
}
const STALE_DAYS = Number(options.get("stale-days") ?? 90);

// --- coverage predicates (mirror lib/coverage-policy.ts) ----------------------
const isAdmittedLargeCap = (c) => c?.market_cap_band_at_admission === "large";
const isBelowCoverageCut = (c) => c?.excluded_from_discovery === true;
const isDiscoveryListed = (c) => !!c && !isAdmittedLargeCap(c) && !isBelowCoverageCut(c);

// --- current reporting quarter, no-space form (mirror lib/current-quarter) -----
function reportingQuarterCompact(today = new Date()) {
  const m = today.getUTCMonth();
  const y = today.getUTCFullYear();
  let fy;
  let qtr;
  if (m >= 3 && m <= 5) { fy = y; qtr = 4; }
  else if (m >= 6 && m <= 8) { fy = y + 1; qtr = 1; }
  else if (m >= 9 && m <= 11) { fy = y + 1; qtr = 2; }
  else { fy = y; qtr = 3; }
  const short = String((fy >= 2000 ? fy - 2000 : fy)).padStart(2, "0");
  return `Q${qtr}FY${short}`;
}

// --- data load ----------------------------------------------------------------
function sbClient(needsWrite) {
  const key = needsWrite ? SERVICE_KEY : (SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY);
  if (needsWrite && !key) {
    throw new Error("write requires SUPABASE_SERVICE_ROLE_KEY in .env (anon key silently no-ops on theme_membership)");
  }
  return createClient(SUPA, key);
}

async function loadAll(sb) {
  const [themesR, memR, cosR] = await Promise.all([
    sb.from("theme").select("slug,title,blurb,is_featured,sort").order("sort"),
    sb.from("theme_membership").select("theme_slug,company_code,rationale,as_of_quarter,last_reviewed_at"),
    sb.from("company").select("code,name,sector,sub_sector,market_cap_band_at_admission,excluded_from_discovery,composite_score"),
  ]);
  for (const [label, r] of [["theme", themesR], ["theme_membership", memR], ["company", cosR]]) {
    if (r.error) throw new Error(`${label} query failed: ${r.error.message}`);
  }
  const coByCode = new Map(cosR.data.map((c) => [String(c.code).toUpperCase(), c]));
  return { themes: themesR.data, memberships: memR.data, companies: cosR.data, coByCode };
}

// --- render helpers -----------------------------------------------------------
const num = (n) => (n == null ? "  —  " : Number(n).toFixed(2).padStart(5));

function renderStatus(c) {
  if (!c) return "ORPHAN — not in company (DROPPED at render)";
  if (isAdmittedLargeCap(c)) return "large-cap (DROPPED at render)";
  if (isBelowCoverageCut(c)) return "below-cut (renders greyed)";
  return "listed";
}

// --- report -------------------------------------------------------------------
async function report(sb) {
  const { themes, memberships, companies, coByCode } = await loadAll(sb);
  const now = Date.now();
  const staleMs = STALE_DAYS * 24 * 60 * 60 * 1000;

  const membersByTheme = new Map();
  for (const m of memberships) {
    const list = membersByTheme.get(m.theme_slug) ?? [];
    list.push(m);
    membersByTheme.set(m.theme_slug, list);
  }
  const memberSetByTheme = new Map(
    [...membersByTheme].map(([slug, list]) => [slug, new Set(list.map((m) => String(m.company_code).toUpperCase()))]),
  );
  // Reverse index: which theme(s) each company already belongs to. A candidate
  // surfaced by sub-sector adjacency may already sit in a better-fitting theme
  // (e.g. an optical-fibre name in ai-datacentre-fibre showing up as a
  // cables-wires candidate) — flag it so the reviewer sees it's already placed.
  const themesByCode = new Map();
  for (const m of memberships) {
    const code = String(m.company_code).toUpperCase();
    const list = themesByCode.get(code) ?? [];
    list.push(m.theme_slug);
    themesByCode.set(code, list);
  }

  // Index companies by sub_sector (default) and sector (--wide) for the heuristic.
  const bySubSector = new Map();
  const bySector = new Map();
  for (const c of companies) {
    if (c.sub_sector) {
      const l = bySubSector.get(c.sub_sector) ?? [];
      l.push(c);
      bySubSector.set(c.sub_sector, l);
    }
    if (c.sector) {
      const l = bySector.get(c.sector) ?? [];
      l.push(c);
      bySector.set(c.sector, l);
    }
  }
  const WIDE = options.get("wide") === true;
  if (WIDE) console.log("\n(--wide: candidates matched at SECTOR level — broader, noisier; genuinely cross-sector members still stay human-only)");

  console.log(`=== HOT THEMES HEALTH — ${themes.length} themes, ${memberships.length} memberships ===`);
  console.log(`(reporting quarter for new adds: ${reportingQuarterCompact()}; staleness threshold: ${STALE_DAYS}d)\n`);

  // Integrity: orphans + large-cap members (both dropped at render).
  const dropped = [];
  for (const m of memberships) {
    const c = coByCode.get(String(m.company_code).toUpperCase());
    if (!c || isAdmittedLargeCap(c)) dropped.push({ m, c });
  }
  console.log("--- INTEGRITY (members that will NOT render) ---");
  if (dropped.length === 0) console.log("  ✓ none — every member resolves to a board-eligible company");
  else for (const { m, c } of dropped) console.log(`  ✗ ${m.theme_slug} / ${m.company_code}  — ${renderStatus(c)}`);

  // Staleness — per membership, so a single stale member is targetable with
  // --touch <theme>:<CODE> instead of falsely re-stamping the whole theme.
  const stale = memberships
    .map((m) => {
      const t = m.last_reviewed_at ? Date.parse(m.last_reviewed_at) : 0;
      const ageDays = t ? Math.floor((now - t) / 86400000) : null; // null = never reviewed
      return { m, ageDays, isStale: !t || now - t > staleMs };
    })
    .filter((x) => x.isStale)
    .sort((a, b) => (b.ageDays ?? Infinity) - (a.ageDays ?? Infinity)); // never-reviewed first
  console.log(`\n--- STALENESS (last_reviewed_at older than ${STALE_DAYS}d) ---`);
  if (stale.length === 0) console.log("  ✓ all memberships reviewed within threshold");
  else {
    console.log(`  ${stale.length} stale membership(s) — refresh with --touch <theme> (whole) or --touch <theme>:<CODE> (one):`);
    for (const { m, ageDays } of stale) {
      const age = ageDays == null ? "never reviewed" : `${ageDays}d old`;
      console.log(`    ⋯ ${m.theme_slug} / ${m.company_code}  (${age})`);
    }
  }

  // Per-theme summary + candidate suggestions.
  console.log("\n--- PER-THEME SUMMARY + MISSING-LINKAGE SUGGESTIONS (heuristic) ---");
  const proposed = [];
  for (const t of themes) {
    const list = membersByTheme.get(t.slug) ?? [];
    const memberCodes = memberSetByTheme.get(t.slug) ?? new Set();
    let scored = 0;
    let belowCut = 0;
    const subSectors = new Set();
    const sectors = new Set();
    for (const m of list) {
      const c = coByCode.get(String(m.company_code).toUpperCase());
      if (c?.composite_score != null) scored += 1;
      if (isBelowCoverageCut(c)) belowCut += 1;
      if (c?.sub_sector) subSectors.add(c.sub_sector);
      if (c?.sector) sectors.add(c.sector);
    }
    const band = t.is_featured ? `FEATURED sort=${t.sort}` : `benched  sort=${t.sort}`;
    console.log(`\n  [${band}] ${t.slug} — ${t.title}`);
    console.log(`    ${list.length} members · ${scored} scored · ${belowCut} below-cut`);
    // Print the thesis so the reviewer weighs fit against it, not just the coarse
    // sub_sector label (which lumps e.g. optical fibre with power cable).
    if (t.blurb) console.log(`    thesis: ${t.blurb}`);

    // Candidates: same sub_sector (or sector under --wide), not already a member.
    // Rank by composite desc.
    const buckets = WIDE ? sectors : subSectors;
    const byBucket = WIDE ? bySector : bySubSector;
    const seen = new Set();
    const candidates = [];
    for (const key of buckets) {
      for (const c of byBucket.get(key) ?? []) {
        const code = String(c.code).toUpperCase();
        if (memberCodes.has(code) || seen.has(code)) continue;
        seen.add(code);
        candidates.push(c);
      }
    }
    candidates.sort((a, b) => (b.composite_score ?? -Infinity) - (a.composite_score ?? -Infinity));
    const shown = candidates.slice(0, MAX_SUGGESTIONS_PER_THEME);
    if (shown.length) {
      console.log(`    candidates (by ${WIDE ? "sector" : "sub-sector"} adjacency; human judgment still owns cross-sector names):`);
      for (const c of shown) {
        const listed = isDiscoveryListed(c);
        const alreadyIn = (themesByCode.get(String(c.code).toUpperCase()) ?? []).filter((s) => s !== t.slug);
        const placedTag = alreadyIn.length ? `  << already in: ${alreadyIn.join(", ")} — verify thesis before moving` : "";
        const tag = listed ? placedTag : `  << ${renderStatus(c)} — skip`;
        console.log(`      ~ ${String(c.code).padEnd(12)} ${num(c.composite_score)}  [${c.sub_sector}]${tag}`);
        if (listed) proposed.push({ theme_slug: t.slug, company_code: String(c.code).toUpperCase(), composite: c.composite_score, sub_sector: c.sub_sector });
      }
    }
  }

  // Stage listed candidates for review.
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });
  fs.writeFileSync(PROPOSED_PATH, JSON.stringify(proposed, null, 2));
  console.log(`\n=== ${proposed.length} discovery-listed candidates staged at ${PROPOSED_PATH}`);
  console.log("Trim it to the pairs you endorse, then: node scripts/themes-refresh.mjs --apply --yes");
}

// --- apply (add / remove memberships) -----------------------------------------
function parsePairArg(v) {
  // "theme:code" or "theme:code,theme:code"
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf(":");
      if (i < 0) throw new Error(`bad pair "${s}" — expected theme_slug:CODE`);
      return { theme_slug: s.slice(0, i), company_code: s.slice(i + 1).toUpperCase() };
    });
}

async function apply(sb, isWrite) {
  const { coByCode } = await loadAll(sb);
  let pairs;
  if (options.get("add")) {
    pairs = parsePairArg(options.get("add"));
  } else {
    if (!fs.existsSync(PROPOSED_PATH)) throw new Error(`no ${PROPOSED_PATH} — run a report first or pass --add`);
    pairs = JSON.parse(fs.readFileSync(PROPOSED_PATH, "utf8")).map((p) => ({
      theme_slug: p.theme_slug,
      company_code: String(p.company_code).toUpperCase(),
    }));
  }
  if (pairs.length === 0) { console.log("Nothing to add (empty set) — no-op."); return { n: 0, pairs: [] }; }

  // Refuse pairs that can't render: orphan or admitted large-cap.
  const ok = [];
  for (const p of pairs) {
    const c = coByCode.get(p.company_code);
    if (!c) { console.log(`  ✗ refuse ${p.theme_slug}/${p.company_code} — not in company table`); continue; }
    if (isAdmittedLargeCap(c)) { console.log(`  ✗ refuse ${p.theme_slug}/${p.company_code} — large-cap, would not render`); continue; }
    ok.push(p);
  }
  console.log(`${isWrite ? "APPLYING" : "DRY-RUN"} ${ok.length} add(s):`);
  for (const p of ok) console.log(`  + ${p.theme_slug} / ${p.company_code}`);
  if (!isWrite) { console.log("\n(add --yes to write)"); return { n: 0, pairs: [] }; }

  const nowIso = new Date().toISOString();
  const qtr = reportingQuarterCompact();
  const rows = ok.map((p) => ({ ...p, as_of_quarter: qtr, last_reviewed_at: nowIso, updated_at: nowIso }));
  const { data, error } = await sb.from("theme_membership").upsert(rows, { onConflict: "theme_slug,company_code" }).select();
  if (error) throw new Error(`upsert failed: ${error.message}`);
  console.log(`✓ upserted ${data.length} rows`);
  return { n: data.length, pairs: ok };
}

async function remove(sb, isWrite) {
  const pairs = parsePairArg(options.get("remove"));
  console.log(`${isWrite ? "REMOVING" : "DRY-RUN remove"} ${pairs.length} membership(s):`);
  for (const p of pairs) console.log(`  - ${p.theme_slug} / ${p.company_code}`);
  if (!isWrite) { console.log("\n(add --yes to write)"); return { removed: [] }; }
  // .select() so we count rows ACTUALLY deleted — a delete on a non-existent
  // pair succeeds with zero rows, and reporting that as "removed" is a silent lie.
  const removed = [];
  for (const p of pairs) {
    const { data, error } = await sb
      .from("theme_membership")
      .delete()
      .eq("theme_slug", p.theme_slug)
      .eq("company_code", p.company_code)
      .select();
    if (error) throw new Error(`delete failed for ${p.theme_slug}/${p.company_code}: ${error.message}`);
    if (data.length === 0) console.log(`  ⚠ ${p.theme_slug}/${p.company_code} not found — nothing removed`);
    else removed.push(p);
  }
  console.log(`✓ removed ${removed.length} of ${pairs.length}`);
  return { removed };
}

async function touch(sb, isWrite) {
  // Accept whole-theme ("slug") or single-member ("slug:CODE"). Single-member
  // avoids falsely re-stamping the rest of a theme when only one row is stale.
  const raw = String(options.get("touch"));
  const colon = raw.indexOf(":");
  const slug = colon < 0 ? raw : raw.slice(0, colon);
  const code = colon < 0 ? null : raw.slice(colon + 1).toUpperCase();
  const target = code ? `${slug}/${code}` : `all members of ${slug}`;
  if (!isWrite) { console.log(`DRY-RUN touch ${target} (bump last_reviewed_at). Add --yes to write.`); return { n: 0 }; }
  const nowIso = new Date().toISOString();
  let q = sb.from("theme_membership").update({ last_reviewed_at: nowIso, updated_at: nowIso }).eq("theme_slug", slug);
  if (code) q = q.eq("company_code", code);
  const { data, error } = await q.select();
  if (error) throw new Error(`touch failed: ${error.message}`);
  if (data.length === 0) console.log(`  ⚠ touched 0 rows — no membership matches ${target} (typo?)`);
  else console.log(`✓ touched ${data.length} member(s) of ${slug}`);
  return { n: data.length };
}

// --- driver-drift + un-themed (Stage-1 keyword triage) ------------------------
// Membership should track a company's CURRENT earnings driver, not its sub_sector
// label or the theme it was first filed under. The report()'s suggestion engine only
// matches by sub_sector adjacency, so it structurally MISSES a member whose driver has
// migrated to a different theme (TDPS grid->data-centre, KSHINTL cables->grid, ACUTAAS
// specialty-chem->cdmo were all found this way). These two modes keyword-scan each
// company's latest concall + growth catalysts against every theme signature.
//
// HEURISTIC ONLY. This over-flags ~7:1 (a chem call says "contract manufacturing";
// "realisation" hits metals; an EMS name that serves auto trips auto-components). A flag
// is a prompt to WEB-CONFIRM the primary driver + segment mix, never an auto-move. Edit
// the signatures as themes evolve; a theme with no signature here is skipped (warned).
const DRIFT_SIGNATURES = {
  "ai-datacentre-fibre": ["data cent", "data-cent", "hyperscal", "optical fibre", "optic fiber", "fibre", "ai server", "ai system", "gpu", "compute", "genset", "gas engine", "gas turbine", "fuel cell", "switchgear", "liquid cooling", "behind-the-meter"],
  "transmission-grid-capex": ["transmission", "grid", "t&d", "transformer", "conductor", "substation", "power evacuation", "hvdc", "tariff-based"],
  "metals-mining-upcycle": ["ferro", "alloy", "base metal", "steel", "iron ore", "smelter", "recycl", "realisation", "realization", "tube", "pipe", "billet", "coil"],
  "specialty-chemicals-rebound": ["specialty chemical", "speciality chemical", "fluorine", "intermediate", "restock", "china +1", "china plus one", "agrochem", "pigment", "aroma"],
  "defence-order-inflows": ["defence", "defense", "mod ", "indigenis", "indigeniz", "missile", "radar", "shipbuild", "naval", "warship", "aerospace", "order finalis"],
  "cdmo-crams": ["cdmo", "crams", "crdmo", "contract research", "contract manufactur", "api", "oncology", "peptide", "molecule", "innovator", "filing"],
  "capital-markets-boom": ["folio", "aum", "wealth", "broking", "demat", "exchange", "amc", "mutual fund", "sip", "capital market", "depository"],
  "auto-components-premiumisation": ["auto", "vehicle", "content per vehicle", "premiumis", "premiumiz", "oem", "two-wheeler", "passenger vehicle", "forging"],
  "cables-wires": ["cable", "wire", "housing wire", "power cable", "wiring"],
  "travel-tourism": ["travel", "tourism", "hotel", "hospitality", "occupancy", "revpar", "adr", "booking", "mobility"],
  "jewellery-gold-retail": ["jewellery", "jewelry", "gold", "showroom", "wedding", "diamond", "studded"],
  "ev-electrification": ["electric vehicle", "electrification", "battery", "charging", "e-2w", "powertrain", "bev", "shunt"],
  "ems": ["ems", "electronic manufactur", "pcb", "box build", "odm", "order book"],
};

function scoreDriverText(text) {
  const t = (text || "").toLowerCase();
  const out = {};
  for (const [slug, kws] of Object.entries(DRIFT_SIGNATURES)) {
    let s = 0;
    for (const k of kws) if (t.includes(k)) s += 1;
    out[slug] = s;
  }
  return out;
}

// Latest concall details + growth catalysts for one company. concall_analysis keys on
// `company_code`; growth_outlook keys on `company` (not company_code) — a known asymmetry.
async function fetchDriverText(sb, code) {
  const [caR, goR] = await Promise.all([
    sb.from("concall_analysis").select("quarter_label,details,updated_at").eq("company_code", code).order("updated_at", { ascending: false }).limit(1),
    sb.from("growth_outlook").select("catalysts,summary_bullets,run_timestamp").eq("company", code).order("run_timestamp", { ascending: false }).limit(1),
  ]);
  const ca = caR.data && caR.data[0];
  const go = goR.data && goR.data[0];
  const caTxt = ca ? JSON.stringify(ca.details ?? {}) : "";
  const goTxt = go ? `${JSON.stringify(go.catalysts ?? [])} ${JSON.stringify(go.summary_bullets ?? [])}` : "";
  return { quarter: ca ? ca.quarter_label : "?", text: `${caTxt} ${goTxt}`, hasData: !!(ca || go) };
}

async function driverDrift(sb) {
  const { themes, memberships, coByCode } = await loadAll(sb);
  const known = new Set(themes.map((t) => t.slug));
  const missingSig = [...known].filter((s) => !DRIFT_SIGNATURES[s]);
  if (missingSig.length) console.log(`(⚠ no keyword signature for: ${missingSig.join(", ")} — those themes are not scanned; add them to DRIFT_SIGNATURES)\n`);

  // Which theme(s) each company is filed in (a member can be dual-homed).
  const filedByCode = new Map();
  for (const m of memberships) {
    const code = String(m.company_code).toUpperCase();
    const list = filedByCode.get(code) ?? [];
    list.push(m.theme_slug);
    filedByCode.set(code, list);
  }

  console.log("=== DRIVER-DRIFT SCAN (Stage-1 keyword triage — READ ONLY) ===");
  console.log(`(${filedByCode.size} distinct members; over-flags ~7:1 — WEB-CONFIRM each flag before moving)\n`);

  const rows = [];
  for (const [code, filed] of filedByCode) {
    const { quarter, text, hasData } = await fetchDriverText(sb, code);
    const sc = scoreDriverText(text);
    const own = Math.max(0, ...filed.map((s) => sc[s] ?? 0));
    const others = Object.entries(sc).filter(([s]) => !filed.includes(s)).sort((a, b) => b[1] - a[1]);
    const [bestT, bestS] = others[0] ?? [null, 0];
    rows.push({ code, filed, own, bestT, bestS, quarter, hasData, drift: bestS > own && bestS >= 2 });
  }
  rows.sort((a, b) => (b.bestS - b.own) - (a.bestS - a.own));

  console.log("--- FLAGGED (latest driver keywords point harder at another theme) ---");
  const flagged = rows.filter((r) => r.drift);
  if (!flagged.length) console.log("  ✓ none");
  else for (const r of flagged) {
    console.log(`  ${r.code.padEnd(12)} [${r.quarter}]  filed=${r.filed.join("+")} (${r.own})  -->  ${r.bestT} (${r.bestS})`);
  }
  const noData = rows.filter((r) => !r.hasData);
  if (noData.length) {
    console.log(`\n--- NO DRIVER DATA (no concall/growth rows — can't scan; inspect by hand) ---`);
    for (const r of noData) console.log(`  ${r.code.padEnd(12)} filed=${r.filed.join("+")}`);
  }
  console.log(`\n${flagged.length} flagged of ${rows.length}. Next: web-confirm each ("<name> Q1 results growth driver"), then --add/--remove the confirmed moves.`);
}

async function unThemed(sb) {
  const { themes, memberships, companies } = await loadAll(sb);
  const themed = new Set(memberships.map((m) => String(m.company_code).toUpperCase()));
  const missingSig = themes.map((t) => t.slug).filter((s) => !DRIFT_SIGNATURES[s]);
  if (missingSig.length) console.log(`(⚠ no keyword signature for: ${missingSig.join(", ")} — cannot match candidates to those)\n`);

  // Candidate pool: not already a member, and not admitted large-cap (large-caps are
  // DROPPED at render — no point suggesting them). Below-cut names ARE eligible (they
  // render greyed) but get annotated so the reviewer weighs the lower-value add.
  const pool = companies
    .filter((c) => !themed.has(String(c.code).toUpperCase()) && !isAdmittedLargeCap(c))
    .sort((a, b) => (b.composite_score ?? -Infinity) - (a.composite_score ?? -Infinity));

  console.log("=== UN-THEMED COVERAGE-GAP SCAN (Stage-1 keyword triage — READ ONLY) ===");
  console.log(`(${pool.length} non-member non-large-cap companies; most have NO theme fit — that's expected)\n`);

  const hits = [];
  for (const c of pool) {
    const code = String(c.code).toUpperCase();
    const { quarter, text, hasData } = await fetchDriverText(sb, code);
    if (!hasData) continue;
    const sc = scoreDriverText(text);
    const [bestT, bestS] = Object.entries(sc).sort((a, b) => b[1] - a[1])[0];
    if (bestS >= 3) hits.push({ code, name: c.name, bestT, bestS, quarter, composite: c.composite_score, greyed: isBelowCoverageCut(c), sub: c.sub_sector });
  }
  hits.sort((a, b) => b.bestS - a.bestS || (b.composite ?? 0) - (a.composite ?? 0));

  console.log("--- PLAUSIBLE FITS (best-matching theme scored >=3; human + web-confirm owns the call) ---");
  if (!hits.length) console.log("  ✓ none clear the threshold");
  else for (const h of hits) {
    const tag = h.greyed ? "  << below-cut (would render greyed)" : "";
    console.log(`  ${h.code.padEnd(12)} ${num(h.composite)} [${h.quarter}]  ~ ${h.bestT} (${h.bestS})  [${h.sub}]${tag}`);
  }
  console.log(`\n${hits.length} candidate(s). Keyword adjacency ONLY — web-confirm the primary driver before --add. Names with no theme (edtech, hospitals, dairy) correctly don't appear.`);
}

// --- seed regeneration --------------------------------------------------------
const sq = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

async function dumpSeed(sb) {
  const { themes, memberships } = await loadAll(sb);
  const today = new Date().toISOString().slice(0, 10);
  const fname = `hot_themes_seed_${today.replace(/-/g, "_")}.sql`;
  const out = [];
  out.push(`-- Hot Themes seed — regenerated from live tables ${today} by scripts/themes-refresh.mjs.`);
  out.push("--");
  out.push("-- Idempotent: re-running upserts (no dupes). Scores/Trend are NOT seeded —");
  out.push("-- they join live from the leaderboard by company_code. This file only sets");
  out.push("-- which themes are featured and who belongs. Mirror of live; apply-by-hand only");
  out.push("-- if rebuilding (the live DB is edited directly via service role).");
  out.push("");
  out.push("begin;");
  out.push("");
  out.push("insert into theme (slug, title, blurb, is_featured, sort) values");
  out.push(
    themes
      .map((t) => `  (${sq(t.slug)}, ${sq(t.title)}, ${sq(t.blurb)}, ${t.is_featured}, ${t.sort})`)
      .join(",\n"),
  );
  out.push("on conflict (slug) do update");
  out.push("  set title = excluded.title,");
  out.push("      blurb = excluded.blurb,");
  out.push("      is_featured = excluded.is_featured,");
  out.push("      sort = excluded.sort,");
  out.push("      updated_at = now();");
  out.push("");
  out.push("insert into theme_membership (theme_slug, company_code, as_of_quarter) values");
  const bySlug = new Map();
  for (const m of memberships) {
    const list = bySlug.get(m.theme_slug) ?? [];
    list.push(m);
    bySlug.set(m.theme_slug, list);
  }
  const memLines = [];
  for (const t of themes) {
    for (const m of (bySlug.get(t.slug) ?? []).sort((a, b) => a.company_code.localeCompare(b.company_code))) {
      memLines.push(`  (${sq(m.theme_slug)}, ${sq(m.company_code)}, ${sq(m.as_of_quarter)})`);
    }
  }
  out.push(memLines.join(",\n"));
  out.push("on conflict (theme_slug, company_code) do update");
  out.push("  set as_of_quarter = excluded.as_of_quarter,");
  out.push("      last_reviewed_at = now(),");
  out.push("      updated_at = now();");
  out.push("");
  out.push("commit;");
  out.push("");
  out.push("-- Integrity check — any row returned is a code the data layer drops at render:");
  out.push("-- select tm.theme_slug, tm.company_code from theme_membership tm");
  out.push("--   left join company c on upper(c.code) = upper(tm.company_code)");
  out.push("--   where c.code is null order by tm.theme_slug;");
  out.push("-- notify pgrst, 'reload schema';");
  out.push("");
  const dest = path.join(ROOT, "lib", "supabase", fname);
  fs.writeFileSync(dest, out.join("\n"));
  console.log(`✓ wrote ${dest} (${themes.length} themes, ${memberships.length} memberships)`);
}

function logRun(line) {
  const stamp = new Date().toISOString().slice(0, 10);
  const header = fs.existsSync(RUN_LOG) ? "" : "# Hot Themes refresh run log\n\n";
  fs.appendFileSync(RUN_LOG, `${header}${stamp} | THEMES | ${line}\n`);
}

// --- main ---------------------------------------------------------------------
const isWrite = options.get("yes") === true;

const pairList = (pairs) => pairs.map((p) => `${p.theme_slug}:${p.company_code}`).join(",");

if (options.get("dump-seed")) {
  await dumpSeed(sbClient(false));
} else if (options.get("driver-drift")) {
  await driverDrift(sbClient(false));
} else if (options.get("un-themed")) {
  await unThemed(sbClient(false));
} else if (options.get("touch")) {
  const r = await touch(sbClient(isWrite), isWrite);
  if (isWrite) logRun(`touched=${options.get("touch")} rows=${r.n}`);
} else if (options.get("remove")) {
  const r = await remove(sbClient(isWrite), isWrite);
  if (isWrite) logRun(`removed=${r.removed.length} [${pairList(r.removed)}]`);
} else if (options.get("apply") || options.get("add")) {
  const r = await apply(sbClient(isWrite), isWrite);
  if (isWrite) logRun(`adds=${r.n} [${pairList(r.pairs)}]`);
} else {
  await report(sbClient(false));
}
