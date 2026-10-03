import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import postcss, { type Rule } from "postcss";

// `.house-tokens` = the house palette + ink WITHOUT the paper ground, for a
// house-skin component set inside a surface that paints its own background
// (the Exchange Desk feed inside the company page's Announcements SectionCard).
// The house custom properties are defined nowhere else, so these checks pin:
//   1. `.house` and `.house-tokens` share one palette (light AND dark) and can't
//      drift apart,
//   2. `.house-tokens` never paints a background, while `.house` still does,
//   3. every token the feed paints with resolves under that palette,
//   4. the company Announcements tab, which left the house skin on 2026-10-03,
//      reads no house token or class (it has no scope to resolve them in).

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const HOUSE = /\.house(?![\w-])/g; // the `house` class, not `house-block` etc.
const TOKENS = /\.house-tokens(?![\w-])/g;
const has = (re: RegExp, s: string) => new RegExp(re.source).test(s);
const norm = (selector: string) => selector.trim().replace(/\s+/g, " ");

const root = postcss.parse(read("app/globals.css"));
const rules: Rule[] = [];
root.walkRules((rule) => {
  rules.push(rule);
});
const selectorsOf = (rule: Rule) => rule.selectors.map(norm);
const decls = (rule: Rule) =>
  rule.nodes.flatMap((n) => (n.type === "decl" ? [{ prop: n.prop, value: n.value.trim() }] : []));
const customProps = (rule: Rule) =>
  new Set(decls(rule).filter((d) => d.prop.startsWith("--")).map((d) => d.prop));

// ---------------------------------------------------------------------------
// 1. One shared palette rule per theme, top-level, covering both classes.
// ---------------------------------------------------------------------------
const lightRules = rules.filter((r) => {
  const s = selectorsOf(r);
  return s.includes(".house") && s.includes(".house-tokens");
});
assert.equal(lightRules.length, 1, "exactly one light palette rule is shared by .house and .house-tokens");
const light = lightRules[0];
assert.equal(light.parent?.type, "root", "the light palette is top-level (not inside @media/@layer)");

const darkRules = rules.filter((r) => {
  const s = selectorsOf(r);
  return s.includes(".dark .house") && s.includes(".dark .house-tokens");
});
assert.equal(darkRules.length, 1, "exactly one dark palette rule is shared by .dark .house and .dark .house-tokens");
const dark = darkRules[0];
assert.equal(dark.parent?.type, "root", "the dark palette is top-level");

const lightTokens = customProps(light);
const darkTokens = customProps(dark);
assert.ok(lightTokens.size > 0, "the shared light rule carries the palette tokens");
assert.deepEqual(
  [...darkTokens].sort(),
  [...lightTokens].sort(),
  "dark must redeclare every light token, or that token stays light-valued in dark mode",
);
assert.ok(
  decls(light).some((d) => d.prop === "color" && d.value === "var(--ink)"),
  "the shared rule sets the house ink, so .house-tokens text reads in house ink",
);

// ---------------------------------------------------------------------------
// 2. Drift guard, both directions, over every rule in the file: any selector
//    that targets .house-tokens has its .house twin in the same rule, and any
//    .house rule that declares tokens has its .house-tokens twin. A token added
//    to one class alone would silently go missing on the other surface.
// ---------------------------------------------------------------------------
for (const rule of rules) {
  const sels = selectorsOf(rule);
  for (const s of sels) {
    if (has(TOKENS, s)) {
      const twin = s.replace(TOKENS, ".house");
      assert.ok(sels.includes(twin), `"${s}" has no "${twin}" twin in the same rule — palettes can drift`);
    }
    if (has(HOUSE, s) && customProps(rule).size > 0) {
      const twin = s.replace(HOUSE, ".house-tokens");
      assert.ok(sels.includes(twin), `"${s}" declares tokens without a "${twin}" twin — .house-tokens would miss them`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. .house-tokens never paints; .house still does (every existing house
//    surface — /, /desk, /announcements, the phone trees — relies on it).
// ---------------------------------------------------------------------------
for (const rule of rules.filter((r) => selectorsOf(r).some((s) => has(TOKENS, s)))) {
  const painted = decls(rule).filter((d) => d.prop.startsWith("background"));
  assert.deepEqual(
    painted,
    [],
    `"${selectorsOf(rule).join(", ")}" paints a background — .house-tokens must stay transparent inside its host card`,
  );
}
const housePaint = rules.filter((r) => selectorsOf(r).includes(".house"));
assert.ok(
  housePaint.some((r) => decls(r).some((d) => d.prop === "background" && d.value === "var(--paper)")),
  ".house keeps its paper ground",
);
assert.ok(
  housePaint.some((r) => decls(r).some((d) => d.prop === "color" && d.value === "var(--ink)")),
  ".house keeps its ink",
);

// ---------------------------------------------------------------------------
// 4. Every house token the feed paints with resolves under the shared palette
//    (this is what went blank on the company page before .house-tokens).
// ---------------------------------------------------------------------------
const FEED_SOURCES = [
  "app/desk/desk-exchange-updates.tsx",
  "components/mobile-card.tsx",
  "lib/exchange-desk/types.ts", // IMPACT_META badge classes
];
for (const path of FEED_SOURCES) {
  const used = new Set([...read(path).matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
  assert.ok(used.size > 0, `${path} references house tokens (sanity: the scan found them)`);
  for (const token of used) {
    assert.ok(lightTokens.has(token), `${path} uses ${token}, which the house palette does not define`);
  }
}

// ---------------------------------------------------------------------------
// 5. The company Announcements tab left the house skin on 2026-10-03: it now
//    paints with the portal's own tokens (like Overview and Industry) and has
//    no `.house-tokens` wrapper. So nothing on it may read a house custom
//    property, a house class, or IMPACT_META's house-token badge classes —
//    outside the scope they resolve to nothing and the pill paints blank.
// ---------------------------------------------------------------------------
const COMPANY_TAB_SOURCES = [
  "app/company/components/company-announcements-section.tsx",
  "app/company/components/announcement-tape.tsx",
  "app/company/components/announcement-tokens.ts",
];
for (const path of COMPANY_TAB_SOURCES) {
  const text = read(path);
  for (const [, token] of text.matchAll(/var\((--[\w-]+)/g)) {
    assert.ok(
      !lightTokens.has(token),
      `${path} reads ${token}, a house token, but the tab has no .house-tokens scope`,
    );
  }
  assert.ok(!/["'`\s]house(-[a-z]+)?["'`\s]/.test(text), `${path} uses a house class outside a house scope`);
  assert.ok(
    !/IMPACT_META\[[^\]]+\]\.className/.test(text),
    `${path} paints with IMPACT_META's house-token classes; use impactPillClass`,
  );
}

console.log("house-tokens: all assertions passed");
