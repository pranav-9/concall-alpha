import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

import DeskExchangeUpdates from "../app/desk/desk-exchange-updates";
import {
  buildImpactFacet,
  type ExchangeDeskData,
  type ExchangeUpdate,
} from "../lib/exchange-desk/types";

// Class contracts of the Exchange Desk feed per variant. "company" (the company
// page's Announcements tab) sits inside an already-padded SectionCard, so it
// drops the page furniture that "full" (/announcements) keeps; "compact" (the
// /desk teaser) is untouched. Rendered to static markup: on the server
// useMinWidth is null, so the phone tree and the desktop tree both render.

// tsconfig has jsx: "preserve" (Next compiles JSX itself), so under tsx the
// component's JSX uses the classic React.createElement transform and needs a
// React binding in scope.
(globalThis as { React?: typeof React }).React = React;

// ---------------------------------------------------------------------------
// Fixture — one row per recency bucket, one of them an absolute date (the
// company tab is full history, so most of its dates are absolute).
// ---------------------------------------------------------------------------
const update = (over: Partial<ExchangeUpdate> & Pick<ExchangeUpdate, "id">): ExchangeUpdate => ({
  companyCode: "ACME",
  companyName: "Acme Industries",
  category: "order_win",
  categoryLabel: "Order Wins",
  impact: "positive",
  summary:
    "Won a ₹240 crore order for transformer bushings from a state utility, executable over eighteen months, with an option for a follow-on tranche.",
  headline: "Order win",
  attachmentUrl: "https://www.bseindia.com/xml-data/corpfiling/AttachLive/acme.pdf",
  filedRaw: "2026-09-19T05:00:00Z",
  filedLabel: "4h ago",
  bucketKey: "today",
  ...over,
});
const updates = [
  update({ id: "a1" }),
  update({ id: "a2", impact: "negative", filedLabel: "3d ago", bucketKey: "week", attachmentUrl: null }),
  update({ id: "a3", impact: "transformative", filedLabel: "24 Sept 2025", bucketKey: "earlier" }),
];
const base = { updates, impacts: buildImpactFacet(updates), total: updates.length, windowDays: 35 };
// getCompanyExchangeDeskData always returns belowCut: [] — mirror it.
const companyData: ExchangeDeskData = { ...base, belowCut: [] };
const fullData: ExchangeDeskData = {
  ...base,
  belowCut: [update({ id: "b1", impact: "neutral", companyCode: "BETA", companyName: "Beta Forge", bucketKey: "week" })],
};

// ---------------------------------------------------------------------------
// Minimal tree over React's static markup (well-formed: text and attribute
// values arrive entity-escaped, so no raw < or > inside them).
// ---------------------------------------------------------------------------
type El = { tag: string; attrs: Record<string, string>; text: string; children: El[]; parent: El | null };
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function parse(html: string): El {
  const root: El = { tag: "#root", attrs: {}, text: "", children: [], parent: null };
  let cur = root;
  let last = 0;
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>/g)) {
    cur.text += decode(html.slice(last, m.index));
    last = m.index! + m[0].length;
    const [, closing, tag, attrText, selfClosing] = m;
    if (closing) {
      assert.equal(cur.tag, tag, `markup: </${tag}> closes <${cur.tag}>`);
      cur = cur.parent!;
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of attrText.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = decode(a[2] ?? "");
    const el: El = { tag, attrs, text: "", children: [], parent: cur };
    cur.children.push(el);
    if (!selfClosing && !VOID.has(tag)) cur = el;
  }
  assert.equal(cur, root, "markup: every element closed");
  return root;
}

const render = (variant: "company" | "full" | "compact", data: ExchangeDeskData) =>
  parse(renderToStaticMarkup(React.createElement(DeskExchangeUpdates, { data, variant })));

const cls = (el: El) => new Set((el.attrs.class ?? "").split(/\s+/).filter(Boolean));
const descendants = (el: El): El[] => el.children.flatMap((c) => [c, ...descendants(c)]);
const textOf = (el: El): string => el.text + el.children.map(textOf).join("");
const only = (list: El[], what: string) => {
  assert.equal(list.length, 1, `expected exactly one ${what}, found ${list.length}`);
  return list[0];
};
const feedSection = (tree: El, where: string) =>
  only(
    descendants(tree).filter((e) => e.tag === "section" && e.attrs["aria-label"] === "Company announcements"),
    `${where} feed section`,
  );

/** The phone tree (sm:hidden) and desktop tree (hidden sm:block) of a full/company render. */
function paints(doc: El) {
  const phone = only(doc.children.filter((c) => cls(c).has("sm:hidden")), "phone tree");
  const desktop = only(doc.children.filter((c) => cls(c).has("hidden") && cls(c).has("sm:block")), "desktop tree");
  const phoneSection = feedSection(phone, "phone");
  const chips = only(
    descendants(phoneSection).filter((e) => e.attrs.role === "group" && e.attrs["aria-label"] === "Filter by impact"),
    "phone chip strip",
  );
  assert.equal(phoneSection.children.length, 2, "phone feed = chip strip + one card");
  assert.equal(phoneSection.children[0], chips, "chip strip comes first");
  return { chips, card: phoneSection.children[1], desktopSection: feedSection(desktop, "desktop") };
}

// Arbitrary grid template → tracks ("3.25rem_minmax(0,1.5fr)" → ["3.25rem", "minmax(0,1.5fr)"]).
function tracks(el: El, prefix: "sm" | "md"): string[] | null {
  const hits = [...cls(el)].filter((c) => c.startsWith(`${prefix}:grid-cols-`));
  if (hits.length === 0) return null;
  assert.equal(hits.length, 1, `one ${prefix}:grid-cols-* per row`);
  const inner = hits[0].match(/^\w+:grid-cols-\[(.+)\]$/)?.[1];
  assert.ok(inner, `${hits[0]} is an arbitrary track list`);
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of inner) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "_" && depth === 0) {
      out.push(current);
      current = "";
    } else current += ch;
  }
  return [...out, current];
}
const toPx = (track: string) => {
  const m = track.match(/^([\d.]+)(rem|px)$/);
  return m ? Number(m[1]) * (m[2] === "rem" ? 16 : 1) : NaN;
};
const gridRows = (section: El) => descendants(section).filter((e) => cls(e).has("sm:grid"));

const company = render("company", companyData);
const full = render("full", fullData);
const compact = render("compact", fullData);

// ---------------------------------------------------------------------------
// Company tab, phone: no page furniture inside the (already padded) SectionCard.
// ---------------------------------------------------------------------------
{
  const { chips, card } = paints(company);
  const c = cls(chips);
  assert.ok(c.has("pb-1") && c.has("flex") && c.has("overflow-x-auto"), "company chip strip keeps the scroller + bottom pad");
  assert.ok(!c.has("px-4"), "company chip strip drops the 16px page gutter (px-4)");
  assert.ok(!c.has("pt-3.5"), "company chip strip drops the page top pad (pt-3.5)");
  assert.equal(
    chips.children.filter((b) => b.tag === "button").length,
    1 + companyData.impacts.length,
    "every chip still renders: All + one per impact tier",
  );

  const k = cls(card);
  assert.deepEqual(
    [...k].filter((x) => /^-?m[xlr]-/.test(x)),
    ["mx-0"],
    "company card: mx-0 must replace MOBILE_CARD's mx-4 (not sit beside it — .mx-4 is emitted later and would win)",
  );
  for (const keep of ["mt-2.5", "overflow-hidden", "rounded-xl", "border", "bg-[var(--paper-2)]"]) {
    assert.ok(k.has(keep), `company card keeps the card shell (${keep})`);
  }
}

// ---------------------------------------------------------------------------
// Company tab, desktop: no page-level section rule; date column fits an
// absolute date from md; the grid template matches the cells it lays out.
// ---------------------------------------------------------------------------
{
  const { desktopSection } = paints(company);
  assert.ok(!cls(desktopSection).has("house-block"), "company desktop feed drops house-block (the card is the frame)");

  const rows = gridRows(desktopSection);
  assert.equal(rows.length, updates.length, "one desktop grid row per filing");
  rows.forEach((row, i) => {
    const sm = tracks(row, "sm");
    const md = tracks(row, "md");
    assert.ok(sm && md, "company rows carry both an sm and an md template");
    assert.equal(row.children.length, 5, "company row = date, impact, category, summary, filing (no company column)");
    assert.equal(sm.length, row.children.length, "sm template has one track per cell");
    assert.equal(md.length, row.children.length, "md template has one track per cell");
    assert.equal(textOf(row.children[0]).trim(), updates[i].filedLabel, "track 0 is the filed date");
    assert.deepEqual(md.slice(1), sm.slice(1), "from md only the date track changes");
    assert.ok(toPx(md[0]) > toPx(sm[0]), "from md the date track is wider than at sm");
    // The longest label is en-IN's "24 Sept 2025" (formatRelativeActivityTime
    // writes September as "Sept"): 88.8px in house-micro, so the track needs
    // 89px (see the comment on UpdateRow).
    assert.ok(toPx(md[0]) >= 89, `md date track ${md[0]} fits the longest absolute date (89px) on one line`);
  });
}

// ---------------------------------------------------------------------------
// /announcements ("full"): unchanged — page gutters, house-block, 6-column rows.
// ---------------------------------------------------------------------------
{
  const { chips, card, desktopSection } = paints(full);
  const c = cls(chips);
  for (const keep of ["px-4", "pb-1", "pt-3.5"]) {
    assert.ok(c.has(keep), `/announcements chip strip keeps ${keep}`);
  }
  assert.deepEqual(
    [...cls(card)].filter((x) => /^-?m[xlr]-/.test(x)),
    ["mx-4"],
    "/announcements card keeps the 16px page gutter",
  );
  assert.ok(cls(desktopSection).has("house-block"), "/announcements desktop feed keeps house-block");

  const rows = gridRows(desktopSection);
  assert.equal(rows.length, updates.length);
  for (const row of rows) {
    const sm = tracks(row, "sm");
    assert.ok(sm, "full rows carry an sm template");
    assert.equal(tracks(row, "md"), null, "full rows get no md override (layout unchanged from md up)");
    assert.equal(row.children.length, 6, "full row = date, company, impact, category, summary, filing");
    assert.equal(sm.length, row.children.length, "sm template has one track per cell");
    assert.equal(row.children[1].attrs.href, "/company/ACME", "track 1 is the company link");
  }
}

// ---------------------------------------------------------------------------
// /desk teaser ("compact"): unchanged.
// ---------------------------------------------------------------------------
{
  const section = only(compact.children, "compact section");
  assert.equal(section.attrs["aria-labelledby"], "desk-exchange");
  assert.ok(cls(section).has("house-block"), "desk teaser keeps house-block");
  for (const row of gridRows(section)) {
    assert.equal(tracks(row, "md"), null, "desk teaser rows get no md override");
    assert.equal(tracks(row, "sm")?.length, row.children.length, "desk teaser sm template has one track per cell");
  }
}

// ---------------------------------------------------------------------------
// Line clamps actually clamp. line-clamp-N is display:-webkit-box + overflow +
// box-orient + line-clamp; any other class on the same element that re-declares
// one of those and is emitted later (e.g. `block`, which Tailwind emits after
// line-clamp-*) silently cancels the clamp. Resolved against the project's own
// Tailwind, per element, in emission order.
// ---------------------------------------------------------------------------
const PRE_FIX = "mt-[5px] line-clamp-2 block pl-[39px] text-xs leading-[1.45] text-[var(--ink-soft)] [text-wrap:pretty]";

async function main() {
  const clamped = [company, full, compact].flatMap((doc) =>
    descendants(doc).filter((e) => [...cls(e)].some((c) => /^line-clamp-\d+$/.test(c))),
  );
  // company: 3 phone rows + 3 desktop-row phone summaries; full adds the
  // below-cut row to each; compact: 3 desktop-row phone summaries.
  assert.equal(clamped.length, 6 + 8 + 3, "every rendered summary clamp is checked");

  const classLists = [...new Set([...clamped.map((e) => e.attrs.class), PRE_FIX])];
  const html = classLists.map((c) => `<span class="${c}"></span>`).join("\n");
  // Minimal config: the project's tailwind.config.ts only extends colours and
  // radii and adds tailwindcss-animate — nothing that emits display/overflow.
  const out = await postcss([
    tailwindcss({ content: [{ raw: html, extension: "html" }], corePlugins: { preflight: false } }),
  ]).process("@tailwind utilities;", { from: undefined });

  // Root-level, single-class (no variant / pseudo / media) declarations in order.
  const emitted: { cls: string; prop: string; value: string; important: boolean }[] = [];
  postcss.parse(out.css).each((node) => {
    if (node.type !== "rule") return;
    for (const selector of node.selectors) {
      const m = selector.trim().match(/^\.((?:\\.|[\w-])+)$/);
      if (!m) continue;
      const name = m[1].replace(/\\(.)/g, "$1");
      node.walkDecls((d) => {
        emitted.push({ cls: name, prop: d.prop, value: d.value, important: d.important });
      });
    }
  });
  const winner = (classes: Set<string>, prop: string) => {
    const hits = emitted.filter((d) => classes.has(d.cls) && d.prop === prop);
    const important = hits.filter((d) => d.important);
    return (important.length ? important : hits).at(-1) ?? null;
  };
  const assertClamps = (classes: Set<string>) => {
    const clampClass = [...classes].find((c) => /^line-clamp-\d+$/.test(c))!;
    const own = emitted.filter((d) => d.cls === clampClass);
    assert.ok(own.some((d) => d.prop === "display" && d.value === "-webkit-box"), `${clampClass} emits -webkit-box`);
    for (const d of own) {
      const w = winner(classes, d.prop);
      assert.ok(
        w?.cls === clampClass || w?.value === d.value,
        `"${[...classes].join(" ")}": .${w?.cls} overrides ${d.prop} (${w?.value}) — the clamp is cancelled`,
      );
    }
  };

  for (const el of clamped) assertClamps(cls(el));

  // The harness catches the FINDING-004 regression: with `block` re-added, the
  // clamp loses (Tailwind emits .block after .line-clamp-2).
  assert.throws(
    () => assertClamps(new Set(PRE_FIX.split(" "))),
    /\.block overrides display \(block\)/,
    "the pre-fix class list must fail the clamp check",
  );

  console.log("desk-exchange-updates-skin: all assertions passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
