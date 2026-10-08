import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Every /admin page must gate itself through adminPage() — a gate in
// app/admin/layout.tsx alone leaks the page's data, because Next renders the
// page alongside its layout and ships its output in the RSC payload even when
// the layout never places `children` (shipped 2026-10-07, fixed 2026-10-08).

const ADMIN_DIR = join(__dirname, "..", "app", "admin");

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return pageFiles(full);
    return entry === "page.tsx" || entry === "page.ts" ? [full] : [];
  });
}

const pages = pageFiles(ADMIN_DIR);
assert.ok(pages.length >= 8, `expected every admin section page, found ${pages.length}`);

for (const file of pages) {
  const source = readFileSync(file, "utf8");
  const rel = file.slice(file.indexOf("app/admin"));
  const defaults = source.match(/^export default /gm) ?? [];
  assert.equal(defaults.length, 1, `${rel}: exactly one default export`);
  assert.match(
    source,
    /^export default adminPage\(\w+\);$/m,
    `${rel}: the default export must be adminPage(<Page>) so the passcode check runs before any query`,
  );
  assert.match(source, /from "@\/components\/admin\/admin-page"/, `${rel}: imports adminPage`);
}

// The layout is skin only; a gate there gives false comfort.
const layout = readFileSync(join(ADMIN_DIR, "layout.tsx"), "utf8");
assert.doesNotMatch(layout, /hasAdminAccess|createAdminClient|lib\/admin\/queries/, "layout.tsx must not gate or fetch");

console.log(`admin-page-gate: ok (${pages.length} pages)`);
