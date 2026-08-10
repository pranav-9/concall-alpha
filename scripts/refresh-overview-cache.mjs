// Rebuild company_page_overview_cache rows in bulk.
//
// Why this exists: the cache stores its OWN copy of valuation_score /
// valuation_priced_as_of / valuation_stale, and readCompanyOverview serves a cached row
// whenever one exists — it only falls back to a live build when the row is MISSING, never
// when it is merely old. So a valuation promote is invisible on company pages until each
// row is rewritten. Worse, lib/company-overview-cache.ts does
//     valuationScore = stale ? null : toValuationScale(...)
// so a row cached while the fleet was stale stores null, and deriveOverviewRead then
// computes The Read from TWO legs instead of three until it is rebuilt.
//
// There is no batch endpoint — /api/admin/refresh-company-overview is one company per POST.
// This script is that loop. Auth uses the x-homepage-activity-refresh-secret header
// (HOMEPAGE_ACTIVITY_REFRESH_SECRET), which the route accepts as an alternative to the
// admin cookie, so no login round-trip is needed.
//
// Run from concall-alpha/:
//   node scripts/refresh-overview-cache.mjs                          # dry-run, default target set
//   node scripts/refresh-overview-cache.mjs --apply
//   node scripts/refresh-overview-cache.mjs ZAGGLE GRAVITA --apply
//   node scripts/refresh-overview-cache.mjs --all --apply
//   node scripts/refresh-overview-cache.mjs --apply --base https://concall-alpha.vercel.app
//
// Default target set (--needs-valuation): companies whose live valuation_check row is
// published + rateable + scored + priced inside the display window, but whose cache row
// still holds valuation_score = null. That is exactly the set a promote left behind.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(HERE, "..", ".env");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;
const SECRET = env.HOMEPAGE_ACTIVITY_REFRESH_SECRET;
if (!SUPA || !KEY) throw new Error("missing NEXT_PUBLIC_SUPABASE_* in .env");

// Mirrors VALUATION_STALE_AFTER_DAYS in lib/valuation-check/normalize.ts.
const STALE_AFTER_DAYS = 4;

// Flags that consume the following token — its value must never be mistaken for a
// company code (a bare `--limit 1` would otherwise try to refresh a company called "1").
const VALUE_FLAGS = new Set(["--base", "--delay", "--limit"]);
const argv = process.argv.slice(2);
const options = new Map();
const positional = [];
for (let i = 0; i < argv.length; i += 1) {
  const token = argv[i];
  if (VALUE_FLAGS.has(token)) {
    options.set(token.slice(2), argv[i + 1]);
    i += 1;
  } else if (token.startsWith("--")) {
    options.set(token.slice(2), true);
  } else {
    positional.push(token);
  }
}

const APPLY = options.get("apply") === true;
const ALL = options.get("all") === true;
const BASE = String(options.get("base") ?? "http://localhost:3000").replace(/\/$/, "");
const DELAY_MS = Number(options.get("delay") ?? 300);
const LIMIT = Number(options.get("limit") ?? 0);
const explicitCodes = positional.map((a) => a.toUpperCase());

async function fetchAll(pathAndQuery) {
  const out = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const res = await fetch(`${SUPA}/rest/v1/${pathAndQuery}`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Range: `${from}-${from + page - 1}`,
      },
    });
    if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < page) return out;
  }
}

const daysSince = (isoDate) => {
  if (!isoDate) return null;
  const then = new Date(`${String(isoDate).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(then.getTime())) return null;
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((today - then) / 86400000);
};

const valuations = await fetchAll(
  "valuation_check?select=company_code,score,priced_as_of,rateable,verdict,valuation_published",
);
const cache = await fetchAll(
  "company_page_overview_cache?select=company_code,valuation_score,valuation_priced_as_of,refreshed_at",
);
const cacheByCode = new Map(cache.map((r) => [r.company_code, r]));

let targets;
let reason;
if (explicitCodes.length) {
  targets = explicitCodes;
  reason = "explicit codes";
} else if (ALL) {
  targets = cache.map((r) => r.company_code).sort();
  reason = "every cached company";
} else {
  targets = valuations
    .filter(
      (v) =>
        v.valuation_published &&
        v.rateable &&
        v.verdict != null &&
        v.score != null &&
        daysSince(v.priced_as_of) !== null &&
        daysSince(v.priced_as_of) <= STALE_AFTER_DAYS,
    )
    .filter((v) => {
      const c = cacheByCode.get(v.company_code);
      // Rebuild when the cache disagrees with the live row: no cache row at all, a null
      // valuation leg, or a stored priced_as_of that has since moved on.
      if (!c) return true;
      if (c.valuation_score == null) return true;
      return String(c.valuation_priced_as_of ?? "").slice(0, 10) !== String(v.priced_as_of).slice(0, 10);
    })
    .map((v) => v.company_code)
    .sort();
  reason = `live valuation is fresh (<=${STALE_AFTER_DAYS}d) but the cache leg is null or out of date`;
}

if (LIMIT > 0) targets = targets.slice(0, LIMIT);

const nullLegs = cache.filter((c) => c.valuation_score == null).length;
console.log(`base            : ${BASE}`);
console.log(`cache rows      : ${cache.length}  (valuation_score null on ${nullLegs})`);
console.log(`target set      : ${targets.length}  — ${reason}`);
console.log(`mode            : ${APPLY ? "APPLY" : "DRY-RUN (pass --apply to write)"}`);
console.log("");

if (!targets.length) {
  console.log("Nothing to do.");
  process.exit(0);
}

if (!APPLY) {
  const preview = targets.slice(0, 40);
  console.log(preview.join(" "));
  if (targets.length > preview.length) console.log(`… and ${targets.length - preview.length} more`);
  console.log("\nDry run — nothing written.");
  process.exit(0);
}

if (!SECRET) {
  console.error(
    "HOMEPAGE_ACTIVITY_REFRESH_SECRET is not in .env — the route would reject every POST.\n" +
      "Set it (and make sure the same value is set on the deployment you are targeting).",
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0;
const failed = [];

for (const [i, code] of targets.entries()) {
  let done = false;
  for (let attempt = 1; attempt <= 2 && !done; attempt += 1) {
    try {
      const res = await fetch(`${BASE}/api/admin/refresh-company-overview`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-homepage-activity-refresh-secret": SECRET,
        },
        body: JSON.stringify({ companyCode: code }),
      });
      if (res.ok) {
        ok += 1;
        done = true;
      } else if (res.status >= 500 && attempt === 1) {
        await sleep(1000);
      } else {
        failed.push(`${code} (HTTP ${res.status}: ${(await res.text()).slice(0, 120)})`);
        done = true;
      }
    } catch (err) {
      if (attempt === 2) failed.push(`${code} (${err.message})`);
      else await sleep(1000);
    }
  }
  if ((i + 1) % 10 === 0 || i === targets.length - 1) {
    console.log(`  ${i + 1}/${targets.length}  ok=${ok} failed=${failed.length}`);
  }
  await sleep(DELAY_MS);
}

console.log(`\nAPPLIED: ${ok} ok, ${failed.length} failed`);
for (const f of failed) console.log(`  FAIL ${f}`);

// Verify against the DB rather than trusting the HTTP 200s.
const after = await fetchAll(
  "company_page_overview_cache?select=company_code,valuation_score,valuation_priced_as_of",
);
const afterByCode = new Map(after.map((r) => [r.company_code, r]));
const stillNull = targets.filter((c) => (afterByCode.get(c)?.valuation_score ?? null) == null);
console.log(
  `\nverify: ${targets.length - stillNull.length}/${targets.length} targets now carry a valuation leg`,
);
if (stillNull.length) {
  console.log(
    "  still null (expected for unrateable/structural names, or a >10% price move since pricing):",
  );
  console.log(`  ${stillNull.join(" ")}`);
}
