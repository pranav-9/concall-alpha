// Builds the single stylesheet the design system ships (cfg.cssEntry).
//
// Three pieces, in this order, because CSS requires @import rules to precede
// every other rule:
//   1. ds-fonts.css  — the Google Fonts @import next/font would otherwise do
//   2. tailwind      — app/globals.css compiled through .design-sync/tailwind.ds.ts
//   3. ds-base.css   — the <body> font wiring app/layout.tsx applies in JSX
//
// Run from the concall-alpha package root.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = ".design-sync/build/ds.css";
mkdirSync(".design-sync/build", { recursive: true });

execFileSync(
  "npx",
  ["tailwindcss", "-c", ".design-sync/tailwind.ds.ts", "-i", "app/globals.css", "-o", ".design-sync/build/.tailwind.css"],
  { stdio: "inherit" },
);

const read = (p) => readFileSync(p, "utf8");
writeFileSync(
  OUT,
  [read(".design-sync/ds-fonts.css"), read(".design-sync/build/.tailwind.css"), read(".design-sync/ds-base.css")].join("\n"),
);

const kb = (readFileSync(OUT).length / 1024).toFixed(0);
console.error(`  ds.css: ${kb} KB (fonts + tailwind + base)`);
