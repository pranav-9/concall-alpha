import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { BlogPostMeta } from "../app/blog/posts";
import { GATE_CUT_TAG, gatePost, liftPoster, linksCompanyPage, nextReads, plainHeading, readMinutes } from "../app/blog/related";

const POSTS_DIR = join(__dirname, "../app/blog/posts");

const meta = (slug: string, over: Partial<BlogPostMeta> = {}): BlogPostMeta => ({
  slug, date: "2026-09-01", dateLabel: "1 September 2026", title: slug, summary: "", tags: [], ...over,
});
// Newest first, as getAllPostMeta returns.
const posts: BlogPostMeta[] = [
  meta("stltech-vs-hfcl", { category: "companies", company: "Sterlite Technologies", companyCode: "STLTECH", date: "2026-09-22" }),
  meta("hfcl-brickworks", { category: "companies", company: "HFCL", companyCode: "HFCL", date: "2026-09-21" }),
  meta("stltech-lease", { category: "companies", company: "Sterlite Tech", companyCode: "STLTECH", date: "2026-09-21" }),
  meta("ccl-toll-road", { category: "companies", company: "CCL Products", companyCode: "CCL", date: "2026-09-20" }),
  meta("market-voted", { category: "product", date: "2026-08-10" }),
  meta("price-assumes", { category: "product", date: "2026-08-10" }),
  meta("criteria", { category: "investing", date: "2026-06-08" }),
  meta("what-is-soas", { category: "product", date: "2026-05-19" }),
];
const bodies: Record<string, string> = {
  "stltech-vs-hfcl": "see [Sterlite](/company/STLTECH) and [HFCL](/company/HFCL)",
  "hfcl-brickworks": "[the HFCL page](/company/HFCL)",
  "stltech-lease": "[the Sterlite page](/company/STLTECH)",
  "ccl-toll-road": "[CCL](/company/CCL) and a stray /company/HFCLX mention",
};
const bodyLinks = (p: BlogPostMeta, code: string) => linksCompanyPage(bodies[p.slug] ?? "", code);

// A company story: own other stories first, then comparisons that link its page.
assert.deepEqual(nextReads(posts[2], posts, bodyLinks).map((p) => p.slug), ["stltech-vs-hfcl"], "Sterlite lease → the comparison (its own newer story)");
assert.deepEqual(nextReads(posts[1], posts, bodyLinks).map((p) => p.slug), ["stltech-vs-hfcl"], "HFCL → the comparison that links /company/HFCL; CCL's HFCLX mention is not a link");
assert.deepEqual(nextReads(posts[0], posts, bodyLinks).map((p) => p.slug), ["stltech-lease"], "comparison → the other Sterlite story, not itself");
assert.deepEqual(nextReads(posts[3], posts, bodyLinks), [], "CCL has no other story and no comparison");
// A Notebook post: the newest others in its category, capped at three.
assert.deepEqual(nextReads(posts[6], posts, bodyLinks), [], "the only investing post has nothing next");
assert.deepEqual(nextReads(posts[7], posts, bodyLinks).map((p) => p.slug), ["market-voted", "price-assumes"], "product → the newer product posts");
const many = [...posts, meta("p3", { category: "product" }), meta("p4", { category: "product" })];
assert.equal(nextReads(posts[7], many, bodyLinks).length, 3, "capped at NEXT_READ_MAX");
// A post without a category never gets a list.
assert.deepEqual(nextReads(meta("uncategorised"), posts, bodyLinks), []);

assert.equal(linksCompanyPage("[x](/company/HFCL)", "HFCL"), true);
assert.equal(linksCompanyPage("[x](/company/HFCL#guidance-history)", "HFCL"), true, "anchors count");
assert.equal(linksCompanyPage("[x](/company/HFCLX)", "HFCL"), false, "code boundary");
assert.equal(linksCompanyPage("plain /company/HFCL mention", "HFCL"), false, "a mention is not a link");
assert.equal(linksCompanyPage("[x](/company/HFCL)", ""), false);

assert.equal(readMinutes(""), 1, "never below one minute");
assert.equal(readMinutes(Array(400).fill("word").join(" ")), 2);
assert.equal(readMinutes('<figure className="x">\n<img src="a" alt="' + Array(300).fill("w").join(" ") + '" />\n</figure>\n' + Array(200).fill("word").join(" ")), 1, "JSX and alt text are not reading");

const figure = '<figure className="my-6">\n  <img\n    src="/blog/ccl-story-2026-09-20.png"\n    alt="One-page summary of CCL Products: a timeline."\n    className="h-auto w-full rounded-xl border border-border"\n  />\n</figure>\nThat\'s the whole story.';
assert.equal(liftPoster(figure), '<PostPoster src="/blog/ccl-story-2026-09-20.png" alt="One-page summary of CCL Products: a timeline." />\nThat\'s the whole story.', "the poster figure becomes the component");
const jpg = '<figure className="my-6">\n  <img\n    src="/blog/cartrade-story-2026-09-14.jpg"\n    alt="One-page summary of CarTrade Tech"\n    className="x"\n  />\n</figure>';
assert.equal(liftPoster(jpg), '<PostPoster src="/blog/cartrade-story-2026-09-14.jpg" alt="One-page summary of CarTrade Tech" />', "CarTrade's jpg counts");
const chart = '<figure className="my-6">\n  <img src="/blog/market-voted.png" alt="chart" />\n</figure>';
assert.equal(liftPoster(chart), chart, "a non-poster figure is left as written");
const svg = '<figure className="my-6">\n  <svg viewBox="0 0 1 1"></svg>\n</figure>';
assert.equal(liftPoster(svg), svg, "an inline chart is left as written");

// A company post with no companyCode has nothing to key on: no own stories, no comparisons.
assert.deepEqual(nextReads(meta("loose-co", { category: "companies", company: "Loose Co" }), posts, bodyLinks), [], "code-less company post → nothing next");
// Own stories come before comparisons, newest first, and the company list is capped too.
const crowded: BlogPostMeta[] = [
  meta("x-vs-y", { category: "companies", companyCode: "X", date: "2026-09-30" }),
  meta("y-vs-ccl", { category: "companies", companyCode: "Y", date: "2026-09-29" }),
  meta("x-vs-ccl", { category: "companies", companyCode: "X", date: "2026-09-28" }),
  meta("ccl-two", { category: "companies", companyCode: "CCL", date: "2026-09-27" }),
  meta("ccl-one", { category: "companies", companyCode: "CCL", date: "2026-09-26" }),
  meta("ccl-zero", { category: "companies", companyCode: "CCL", date: "2026-09-25" }),
  meta("essay", { category: "investing", date: "2026-09-24" }),
];
const crowdedBodies: Record<string, string> = {
  "x-vs-y": "[X](/company/X) [Y](/company/Y)",
  "y-vs-ccl": "[Y](/company/Y) [CCL](/company/CCL)",
  "x-vs-ccl": "[X](/company/X) [CCL](/company/CCL)",
  essay: "an essay that links [CCL](/company/CCL) is not a company story",
};
const asked: string[] = [];
const spyLinks = (p: BlogPostMeta, code: string) => {
  asked.push(p.slug);
  return linksCompanyPage(crowdedBodies[p.slug] ?? "", code);
};
assert.deepEqual(nextReads(crowded[4], crowded, spyLinks).map((p) => p.slug), ["ccl-two", "ccl-zero", "y-vs-ccl"], "own stories (newest first) before comparisons, capped at NEXT_READ_MAX");
assert.deepEqual(asked, ["x-vs-y", "y-vs-ccl", "x-vs-ccl"], "bodyLinks is asked only for other companies' posts — never own stories, never Notebook posts");
assert.equal(nextReads(crowded[4], crowded, spyLinks).some((p) => p.slug === "essay"), false, "a Notebook post that links the page is not a next read");

assert.equal(linksCompanyPage("[x](/company/HFCL2)", "HFCL"), false, "digit boundary");
assert.equal(linksCompanyPage("[x](/company/HFCL?tab=guidance)", "HFCL"), true, "a query string counts");
assert.equal(linksCompanyPage("[x](/company/ABCD)", "AB.D"), false, "regex specials in the code are literal");
assert.equal(linksCompanyPage("[x](/company/M&M)", "M&M"), true);

assert.equal(readMinutes(Array(299).fill("w").join(" ")), 1, "1.495 rounds down");
assert.equal(readMinutes(Array(300).fill("w").join(" ")), 2, "1.5 rounds up");
assert.equal(readMinutes(Array(50).fill("w").join(" ")), 1, "a short note clamps to one minute");

const noAlt = '<figure className="my-6"><img src="/blog/hfcl-story-2026-09-21.png" className="x" /></figure>';
assert.equal(liftPoster(noAlt), '<PostPoster src="/blog/hfcl-story-2026-09-21.png" alt="" />', "a missing alt becomes an empty alt");
const noSrc = '<figure className="my-6"><img alt="poster" className="x" /></figure>';
assert.equal(liftPoster(noSrc), noSrc, "no src → left as written");
const reordered = '<figure>\n<img alt="Sterlite poster" className="x" src="/blog/stltech-story-2026-09-21.jpeg">\n</figure>\ntext\n<figure className="my-6"><img src="/blog/hfcl-story-2026-09-21.PNG" alt="HFCL poster"/></figure>';
assert.equal(liftPoster(reordered), '<PostPoster src="/blog/stltech-story-2026-09-21.jpeg" alt="Sterlite poster" />\ntext\n<PostPoster src="/blog/hfcl-story-2026-09-21.PNG" alt="HFCL poster" />', "every figure lifts: attributes in any order, not self-closing, jpeg, upper-case extension");
// A poster the lift cannot read fails the build instead of quietly shipping the full-width paint to phones.
const captioned = '<figure className="my-6"><img src="/blog/ccl-story-2026-09-20.png" alt="a" /><figcaption>Source: CCL</figcaption></figure>';
assert.throws(() => liftPoster(captioned), /was not lifted/, "a captioned poster figure throws");
const gtInAlt = '<figure className="my-6"><img src="/blog/ccl-story-2026-09-20.png" alt="growth > 20%" /></figure>';
assert.throws(() => liftPoster(gtInAlt), /was not lifted/, "a > inside alt throws rather than skipping the lift");
const exprAlt = '<figure className="my-6"><img src="/blog/ccl-story-2026-09-20.png" alt={"a"} /></figure>';
assert.throws(() => liftPoster(exprAlt), /double-quoted/, "alt={…} throws rather than lifting with an empty alt");
const dataAlt = '<figure className="my-6"><img data-alt="nope" src="/blog/ccl-story-2026-09-20.png" alt="real" /></figure>';
assert.equal(liftPoster(dataAlt), '<PostPoster src="/blog/ccl-story-2026-09-20.png" alt="real" />', "data-alt is not alt");
const fenced = 'Text.\n\n```mdx\n<figure className="my-6"><img src="/blog/ccl-story-2026-09-20.png" alt="a" /></figure>\n```\n\nMore.';
assert.equal(liftPoster(fenced), fenced, "a poster figure inside a code fence is a code sample, not a poster");
const chartOnly = '<figure className="my-6"><img src="/blog/market-voted.png" alt="chart > 1" /></figure>';
assert.equal(liftPoster(chartOnly), chartOnly, "a non-poster img with > in alt is left alone, no throw");

// Two posts with no known category never recommend each other (a frontmatter typo must not pair posts up).
assert.deepEqual(nextReads(meta("u1"), [meta("u1"), meta("u2")], bodyLinks), []);

assert.equal(linksCompanyPage("[x](/company/hfcl)", "HFCL"), true, "the portal route uppercases, so case does not matter");
assert.equal(linksCompanyPage("[x](/company/HFCL-ARCHIVE)", "HFCL"), false, "a hyphenated longer code is not this code");

const lonely = Array(20000).fill("< ").join("") + " " + Array(200).fill("w").join(" ");
const t0 = Date.now();
assert.equal(readMinutes(lonely) >= 1, true);
assert.ok(Date.now() - t0 < 500, "20k unclosed < must not be quadratic");
// ── Sign-up gate cut ────────────────────────────────────────────────────────
const doc = (...lines: string[]) => lines.join("\n");
const cutBefore = (source: string) => {
  const lines = source.split("\n");
  const i = lines.indexOf(GATE_CUT_TAG);
  return i === -1 ? null : lines[i + 2];
};

// 1. A company story: the takeaway and "At a glance" stay open; the cut is the first numbered section.
const story = doc("Intro.", "", "## The central takeaway", "", "t", "", "## At a glance", "", "- a", "",
  "## How both make money", "", "m", "", "## 1. It met **all three** guides", "", "x", "",
  "## 2. The [order book](/company/SHREEREF) fell", "", "y", "", "## 3. The lock", "", "## 4. Refill", "");
const storyGate = gatePost(story);
assert.ok(storyGate);
assert.equal(cutBefore(storyGate.source), "## 1. It met **all three** guides");
assert.deepEqual(storyGate.below, ["It met all three guides", "The order book fell", "The lock"], "next 3 headings, plain");
assert.equal(storyGate.source.replace(`${GATE_CUT_TAG}\n\n`, ""), story, "only the marker is added");

// 2. Unnumbered story: the heading after "At a glance".
const netweb = gatePost(doc("## The central takeaway", "", "## At a glance", "", "## Two promises", "", "## The backlog", ""));
assert.equal(netweb && cutBefore(netweb.source), "## Two promises");

// 3. A Notebook post: the second heading.
const notebook = gatePost(doc("Intro", "", "## Business Snapshot", "", "b", "", "## Quarterly Score", "", "## Guidance Tracker", ""));
assert.equal(notebook && cutBefore(notebook.source), "## Quarterly Score");
assert.deepEqual(notebook?.below, ["Quarterly Score", "Guidance Tracker"]);

// Too little structure → no gate; headings inside code fences don't count.
assert.equal(gatePost("Intro\n\n## Only one\n\ntext"), null);
assert.equal(gatePost("no headings at all"), null);
assert.equal(gatePost(doc("## One", "", "```", "## 1. not a heading", "```", "")), null);
assert.equal(plainHeading("12. `Code` and _em_"), "Code and em");

// Every live post: a gate, when there is one, leaves an opening and hides something.
for (const file of readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"))) {
  const body = readFileSync(join(POSTS_DIR, file), "utf8").replace(/^---[\s\S]*?\n---\n/, "");
  const gate = gatePost(body);
  if (!gate) continue;
  const at = gate.source.indexOf(GATE_CUT_TAG);
  assert.ok(at > 0 && gate.below.length > 0, file);
  assert.doesNotThrow(() => liftPoster(gate.source), file);
}

console.log("blog-related: ok");
