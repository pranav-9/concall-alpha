import assert from "node:assert/strict";

import type { BlogPostMeta } from "../app/blog/posts";
import { liftPoster, linksCompanyPage, nextReads, readMinutes } from "../app/blog/related";

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
console.log("blog-related: ok");
