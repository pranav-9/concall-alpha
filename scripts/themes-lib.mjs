// Shared plumbing for the Hot Themes scripts (themes-refresh.mjs, themes-discover.mjs):
// .env loading and the coverage predicates. One copy, so the mirror of
// lib/coverage-policy.ts cannot drift between the two scripts.

import fs from "node:fs";
import path from "node:path";

/** Parse `<root>/.env` into a plain object (KEY=VALUE lines; # comments ignored). */
export function loadEnv(root) {
  const envPath = path.join(root, ".env");
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

// --- coverage predicates (mirror lib/coverage-policy.ts) ----------------------
// NULL band = covered (fail-open) — the recurring mistake is treating it as excluded.
export const isAdmittedLargeCap = (c) => c?.market_cap_band_at_admission === "large";
export const isBelowCoverageCut = (c) => c?.excluded_from_discovery === true;
export const isDiscoveryListed = (c) => !!c && !isAdmittedLargeCap(c) && !isBelowCoverageCut(c);
