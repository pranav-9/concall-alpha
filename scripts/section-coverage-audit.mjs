// Section coverage audit: % of the covered-100 companies with data behind each
// visible company-page section, mirroring the portal's own queries (see
// concallyser/docs/section_backfill_worklist_2026-07-20.md).
// Run: node scripts/section-coverage-audit.mjs  (from concall-alpha/)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
if (!URL || !KEY) throw new Error("missing env");

async function fetchAll(pathAndQuery) {
  const out = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const res = await fetch(`${URL}/rest/v1/${pathAndQuery}`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Range: `${from}-${from + page - 1}`,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${pathAndQuery} -> ${res.status}: ${body.slice(0, 200)}`);
    }
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

const companies = await fetchAll(
  "company?select=code,name,market_cap_band_at_admission,excluded_from_discovery"
);
const covered = companies.filter(
  (c) => c.market_cap_band_at_admission !== "large" && c.excluded_from_discovery !== true
);
const coveredCodes = new Set(covered.map((c) => c.code));
const nameToCode = new Map(covered.map((c) => [c.name, c.code]));

console.log(`total company rows: ${companies.length}`);
console.log(`covered (isDiscoveryListed): ${covered.length}`);

const results = {};

async function codeSet(label, pathAndQuery, col, mapNames = false) {
  const rows = await fetchAll(pathAndQuery);
  const set = new Set();
  for (const r of rows) {
    let v = r[col];
    if (mapNames && v && !coveredCodes.has(v) && nameToCode.has(v)) v = nameToCode.get(v);
    if (v) set.add(v);
  }
  results[label] = set;
}

await codeSet("business_snapshot", "business_snapshot?select=company", "company");
await codeSet("moat_analysis", "moat_analysis?select=company_code", "company_code");
await codeSet(
  "quarterly_score",
  "concall_analysis?select=company_code&details-%3Escoring_meta=not.is.null",
  "company_code"
);
await codeSet("key_variables", "key_variables_snapshot?select=company_code", "company_code");
await codeSet("growth_outlook", "growth_outlook?select=company", "company", true);
await codeSet("guidance_snapshot", "guidance_snapshot?select=company_code", "company_code");
await codeSet("guidance_tracking", "guidance_tracking?select=company_code", "company_code");

// Guidance History section renders from snapshot OR legacy tracking rows
results["guidance_history_either"] = new Set([
  ...results.guidance_snapshot,
  ...results.guidance_tracking,
]);

console.log("");
for (const [label, set] of Object.entries(results)) {
  const have = covered.filter((c) => set.has(c.code));
  const missing = covered.filter((c) => !set.has(c.code)).map((c) => c.code).sort();
  const pct = ((have.length / covered.length) * 100).toFixed(1);
  console.log(`${label}: ${have.length}/${covered.length} (${pct}%)`);
  console.log(`  missing: ${missing.join(", ") || "none"}`);
}

// per-company gap matrix, sorted by gap count
const sections = ["business_snapshot", "moat_analysis", "key_variables", "guidance_history_either"];
const matrix = covered
  .map((c) => {
    const missing = sections.filter((s) => !results[s].has(c.code));
    return { code: c.code, missing };
  })
  .filter((r) => r.missing.length > 0)
  .sort((a, b) => b.missing.length - a.missing.length || a.code.localeCompare(b.code));
console.log("\n=== per-company gaps (of 4 backfillable sections) ===");
for (const r of matrix) {
  console.log(`${r.code}\t${r.missing.length}\t${r.missing.join(",")}`);
}
console.log(`companies with at least one gap: ${matrix.length}`);
