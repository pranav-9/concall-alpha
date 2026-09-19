import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Repo-wide guard for a trap that shipped once (the phone Announcements rows,
// fixed 2026-09-19): Tailwind v3 emits display utilities after line-clamp-*, so
// `line-clamp-2 block` on one element computes display:block and the clamp
// silently stops clamping. The same holds under a shared variant prefix
// (`sm:line-clamp-2 sm:block`). Scans every static class string in app/ and
// components/ for a line-clamp-N beside a display utility with the same prefix.
// Static strings only: classes split across cn() arguments aren't seen here.
// The compiled, rendered check for the Exchange Desk feed lives in
// desk-exchange-updates-skin.test.ts.

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DISPLAY = new Set([
  "block",
  "inline",
  "inline-block",
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
  "table",
  "contents",
  "flow-root",
]);

// Known offenders, burned down rather than hidden: each entry must still occur,
// so fixing one fails this test until its entry is removed.
const KNOWN = new Set([
  // shadcn primitive, class list written for Tailwind v4 (tracked in TODOS.md).
  "components/ui/select.tsx: *:data-[slot=select-value]:line-clamp-1 + *:data-[slot=select-value]:flex",
]);

function* tsxFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* tsxFiles(path);
    else if (path.endsWith(".tsx")) yield path;
  }
}

// "sm:hover:line-clamp-2" → ["sm:hover:", "line-clamp-2"]. Arbitrary variants
// can hold ":" inside brackets (data-[slot=x]:, [&_svg:not(...)]:), so split on
// the last colon outside them.
function splitVariant(cls: string): [string, string] {
  let depth = 0;
  for (let i = cls.length - 1; i >= 0; i -= 1) {
    const ch = cls[i];
    if (ch === "]" || ch === ")") depth += 1;
    else if (ch === "[" || ch === "(") depth -= 1;
    else if (ch === ":" && depth === 0) return [cls.slice(0, i + 1), cls.slice(i + 1)];
  }
  return ["", cls];
}

const found = new Set<string>();
let scanned = 0;
for (const dir of ["app", "components"]) {
  for (const file of tsxFiles(join(ROOT, dir))) {
    const rel = file.slice(ROOT.length);
    for (const m of readFileSync(file, "utf8").matchAll(/["'`]([^"'`\n]*\bline-clamp-\d[^"'`\n]*)["'`]/g)) {
      scanned += 1;
      const byPrefix = new Map<string, string[]>();
      for (const cls of m[1].split(/\s+/).filter(Boolean)) {
        const [prefix, base] = splitVariant(cls);
        byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), base]);
      }
      for (const [prefix, bases] of byPrefix) {
        const clamp = bases.find((b) => /^line-clamp-\d+$/.test(b));
        const display = bases.find((b) => DISPLAY.has(b));
        if (clamp && display) found.add(`${rel}: ${prefix}${clamp} + ${prefix}${display}`);
      }
    }
  }
}

assert.ok(scanned > 0, "the scan found line-clamp class strings (sanity: the walk reached the source)");
const offenders = [...found].filter((f) => !KNOWN.has(f));
assert.deepEqual(
  offenders,
  [],
  `line-clamp-N beside a display utility cancels the clamp (display is emitted later):\n${offenders.join("\n")}`,
);
for (const known of KNOWN) {
  assert.ok(found.has(known), `known offender no longer occurs, so drop it from KNOWN: ${known}`);
}
console.log(`line-clamp-display: all assertions passed (${scanned} clamp class strings scanned)`);
