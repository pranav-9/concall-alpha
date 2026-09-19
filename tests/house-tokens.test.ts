import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import postcss, { type Rule } from "postcss";
import ts from "typescript";

// `.house-tokens` = the house palette + ink WITHOUT the paper ground, for a
// house-skin component set inside a surface that paints its own background
// (the Exchange Desk feed inside the company page's Announcements SectionCard).
// The house custom properties are defined nowhere else, so these checks pin:
//   1. `.house` and `.house-tokens` share one palette (light AND dark) and can't
//      drift apart,
//   2. `.house-tokens` never paints a background, while `.house` still does,
//   3. every token the feed paints with resolves under that palette,
//   4. the company page wraps the feed AND both summary cards in `.house-tokens`
//      (and not in `.house`, which would drop an opaque paper block into the
//      card).

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
  "app/company/components/company-announcements-section.tsx",
];
for (const path of FEED_SOURCES) {
  const used = new Set([...read(path).matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
  assert.ok(used.size > 0, `${path} references house tokens (sanity: the scan found them)`);
  for (const token of used) {
    assert.ok(lightTokens.has(token), `${path} uses ${token}, which the house palette does not define`);
  }
}

// ---------------------------------------------------------------------------
// 5. Wiring: on the company page the feed sits inside `.house-tokens`, and no
//    ancestor is a painting `.house`. Read from the TSX AST (the section is an
//    async server component that fetches from Supabase, so it can't be
//    rendered here).
// ---------------------------------------------------------------------------
{
  const path = "app/company/components/company-announcements-section.tsx";
  const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const attr = (el: ts.JsxOpeningLikeElement, name: string) =>
    el.attributes.properties.find(
      (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText(source) === name,
    );
  // Static className tokens: a plain string, or every string literal inside a
  // {expression} (cn(...), a ternary) — enough to see whether a class is there.
  const classTokens = (el: ts.JsxOpeningLikeElement): string[] => {
    const init = attr(el, "className")?.initializer;
    if (!init) return [];
    const strings: string[] = [];
    const visit = (n: ts.Node) => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) strings.push(n.text);
      n.forEachChild(visit);
    };
    visit(init);
    return strings.flatMap((s) => s.split(/\s+/).filter(Boolean));
  };

  const usages = (name: string) => {
    const out: ts.JsxSelfClosingElement[] = [];
    const find = (n: ts.Node) => {
      if (ts.isJsxSelfClosingElement(n) && n.tagName.getText(source) === name) out.push(n);
      n.forEachChild(find);
    };
    find(source);
    return out;
  };
  const ancestorClasses = (el: ts.Node) => {
    const out: string[][] = [];
    for (let n: ts.Node | undefined = el.parent; n; n = n.parent) {
      if (ts.isJsxElement(n)) out.push(classTokens(n.openingElement));
    }
    return out;
  };

  const feeds = usages("DeskExchangeUpdates");
  assert.equal(feeds.length, 1, "the company section renders the Exchange Desk feed once");
  const variant = attr(feeds[0], "variant")?.initializer;
  assert.ok(variant && ts.isStringLiteral(variant) && variant.text === "company", 'the feed uses variant="company"');

  // The feed and both summary cards paint with house tokens (IMPACT_META pills,
  // --ink-soft labels, --signal hovers), so each one needs the scope. A card left
  // outside it renders its impact pill black beside the coloured feed row.
  for (const name of ["DeskExchangeUpdates", "LatestSignal", "SignalMix"]) {
    const [site, ...extra] = usages(name);
    assert.ok(site && extra.length === 0, `the company section renders <${name}> once`);
    const classes = ancestorClasses(site);
    assert.ok(
      classes.some((c) => c.includes("house-tokens")),
      `<${name}> must sit inside a .house-tokens wrapper, or its var(--ink-soft)/--rule/--signal are undefined`,
    );
    assert.ok(
      classes.every((c) => !c.includes("house")),
      `no .house ancestor on <${name}> — it paints an opaque paper block over the SectionCard`,
    );
  }
}

console.log("house-tokens: all assertions passed");
