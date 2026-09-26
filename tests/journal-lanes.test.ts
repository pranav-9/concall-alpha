import assert from "node:assert/strict";

import { comparisonTitle, parseComparison } from "../app/blog/comparison";
import {
  MORE_STORIES_ROWS,
  companyJournal,
  deriveDesktopJournal,
  deriveJournalLanes,
  filterNotebook,
  moreStoriesView,
  notebookCatalog,
  pad,
  priorLinkLabel,
  priorStory,
  storyLabel,
} from "../app/blog/lanes";
import { getAllPostMeta, type BlogPostMeta } from "../app/blog/posts";

const mk = (
  slug: string,
  date: string,
  category: BlogPostMeta["category"],
  extra: Partial<BlogPostMeta> = {},
): BlogPostMeta => ({
  slug,
  title: slug,
  date,
  dateLabel: date,
  summary: "",
  tags: [],
  category,
  ...extra,
});

// Newest-first, as getAllPostMeta returns.
const posts: BlogPostMeta[] = [
  mk("n3", "2026-09-22", "companies", { company: "Neuland", companyCode: "NEULANDLAB" }),
  mk("p2", "2026-09-18", "product"),
  mk("n2", "2026-09-16", "companies", { company: "Neuland", companyCode: "NEULANDLAB" }),
  mk("c1", "2026-09-14", "companies", { company: "CarTrade", companyCode: "CARTRADE" }),
  mk("i1", "2026-08-28", "investing"),
  mk("p1", "2026-08-10", "product"),
  mk("n1", "2026-06-12", "companies", { company: "Neuland", companyCode: "NEULANDLAB" }),
  mk("nocode", "2026-06-01", "companies", { company: "Loose Co" }),
  mk("uncat", "2026-05-01", undefined),
];

// --- pad
assert.equal(pad(6), "06");
assert.equal(pad(15), "15");

// --- deriveJournalLanes
const lanes = deriveJournalLanes(posts);
assert.equal(lanes.featured?.slug, "n3", "featured = newest company story");
assert.equal(lanes.featured?.storyIndex, 3, "oldest = 1, so the third Neuland story is index 3");
assert.equal(lanes.featured?.storyTotal, 3);
assert.deepEqual(
  lanes.companyRest.map((s) => s.slug),
  ["n2", "c1", "n1", "nocode"],
  "rest = remaining company stories newest-first",
);
assert.equal(lanes.companyCount, 5);
assert.equal(lanes.companyNameCount, 3, "NEULANDLAB, CARTRADE, and the code-less Loose Co");
assert.deepEqual(
  lanes.notebook.map((p) => p.slug),
  ["p2", "i1", "p1"],
  "notebook = product + investing only; uncategorised posts drop out of both lanes",
);
// --- storyLabel / priorStory / priorLinkLabel
assert.equal(storyLabel(lanes.featured!), "Story 3 of 3");
assert.equal(storyLabel(lanes.companyRest[1]), "Story 1", "single-story company");
assert.equal(priorStory(lanes.featured!, lanes.companyRest)?.slug, "n2", "prior = index - 1 of the same company");
assert.equal(priorLinkLabel(lanes.featured!), "read the previous", "third story: the prior is not the first");
const n2 = lanes.companyRest[0];
assert.equal(priorStory(n2, lanes.companyRest.slice(1))?.slug, "n1");
assert.equal(priorLinkLabel(n2), "read the first", "second story: the prior IS the first");
assert.equal(priorStory(lanes.companyRest[1], lanes.companyRest), null, "single-story company has no prior");

// --- empty corpus
const empty = deriveJournalLanes([]);
assert.equal(empty.featured, null);
assert.deepEqual(empty.companyRest, []);
assert.equal(empty.companyCount + empty.notebook.length, 0, "phone empty-state key");

// --- notebookCatalog / filterNotebook
const cat = notebookCatalog(lanes.notebook);
assert.equal(cat.numberFor.get("p2"), "01");
assert.equal(cat.numberFor.get("i1"), "02");
assert.equal(cat.numberFor.get("p1"), "03", "numbers come from the unfiltered order");
assert.deepEqual(cat.categories, ["product", "investing"], "NOTEBOOK_CATEGORIES order");
assert.equal(cat.counts.product, 2);
assert.equal(cat.counts.investing, 1);
assert.deepEqual(filterNotebook(lanes.notebook, "all").map((p) => p.slug), ["p2", "i1", "p1"]);
assert.deepEqual(filterNotebook(lanes.notebook, "product").map((p) => p.slug), ["p2", "p1"]);
assert.equal(cat.numberFor.get("p1"), "03", "a filtered post keeps its No.");
const productOnly = notebookCatalog(lanes.notebook.filter((p) => p.category === "product"));
assert.deepEqual(productOnly.categories, ["product"], "a category with zero posts drops out of the chip strip");
assert.deepEqual(notebookCatalog([]).categories, [], "empty notebook → no chips");

// --- comparison frontmatter
const CO = { category: "companies" };
const ok = { industry: "Optical fibre", a: { name: "Sterlite", code: "stltech" }, b: { name: "HFCL", code: "HFCL" } };
assert.equal(parseComparison(undefined, "f.mdx", CO), undefined, "no block = not a comparison");
assert.equal(parseComparison(null, "f.mdx", CO), undefined, "an empty `comparison:` key = not a comparison");
assert.deepEqual(
  parseComparison(ok, "f.mdx", { ...CO, companyCode: "STLTECH" })?.a,
  { name: "Sterlite", code: "STLTECH" },
  "codes upper-cased",
);
assert.equal(parseComparison(ok, "f.mdx", CO)?.b.code, "HFCL", "no companyCode → no a.code check");
assert.equal(
  parseComparison({ industry: "x", a: { name: "A", code: 543210 }, b: { name: "B", code: "B" } }, "f.mdx", CO)?.a.code,
  "543210",
  "an unquoted numeric BSE code is accepted",
);
assert.throws(
  () => parseComparison({ industry: "x", a: { name: "A" }, b: { name: "B", code: "B" } }, "f.mdx", CO),
  /f\.mdx.*missing a\.code/,
  "a partial block fails the build, naming the file and field",
);
assert.throws(() => parseComparison({ a: {}, b: {} }, "f.mdx", CO), /industry, a\.name, a\.code, b\.name, b\.code/);
assert.throws(() => parseComparison({ industry: " ", a: { name: "A", code: "A" }, b: { name: "B", code: "B" } }, "f.mdx", CO), /missing industry/, "blank = missing");
assert.throws(() => parseComparison({ industry: "x", a: "CCL", b: { name: "B", code: "B" } }, "f.mdx", CO), /missing a\.name, a\.code/, "a scalar side is missing its fields");
assert.throws(() => parseComparison("Optical fibre", "f.mdx", CO), /must be a mapping/);
assert.throws(() => parseComparison([], "f.mdx", CO), /must be a mapping/);
assert.throws(() => parseComparison(ok, "f.mdx", { category: "product" }), /only allowed on a `category: companies` post/);
assert.throws(() => parseComparison(ok, "f.mdx", {}), /only allowed/, "no category → rejected too");
assert.throws(
  () => parseComparison({ industry: "x", a: { name: "A", code: "A" }, b: { name: "A again", code: "a" } }, "f.mdx", CO),
  /compares A with itself/,
);
assert.throws(
  () => parseComparison({ industry: "x", a: { name: "B", code: "B" }, b: { name: "A", code: "A" } }, "f.mdx", { ...CO, companyCode: "A" }),
  /a\.code \(B\) must be the post's companyCode \(A\)/,
  "a = the post's primary company",
);

// --- comparisonTitle: drop the "A:" prefix, resolve the "It" that pointed at it
assert.equal(
  comparisonTitle("CCL Products: It has the kitchen. Vintage Coffee has the queue", "CCL Products"),
  "CCL Products has the kitchen. Vintage Coffee has the queue",
);
assert.equal(
  comparisonTitle("Sterlite Technologies: It and HFCL wired India's internet", "Sterlite Technologies"),
  "Sterlite Technologies and HFCL wired India's internet",
);
assert.equal(comparisonTitle("CCL Products: Two ways to sell coffee", "CCL Products"), "Two ways to sell coffee");
assert.equal(comparisonTitle("CCL Products: Its kitchen: bigger", "CCL Products"), "Its kitchen: bigger", "only a standalone 'It' is rewritten");
assert.equal(comparisonTitle("Same pipes, different bills: STL vs HFCL", "Sterlite"), "Same pipes, different bills: STL vs HFCL", "a colon without the company prefix is kept");
assert.equal(comparisonTitle("Why 3:1 matters", "CCL"), "Why 3:1 matters");
assert.equal(comparisonTitle("CCL:", "CCL"), "CCL:", "never empties a title");

// --- deriveDesktopJournal: comparisons leave Company Stories for Head to head
const vs = mk("n-vs-c", "2026-09-23", "companies", {
  company: "Neuland",
  companyCode: "NEULANDLAB",
  comparison: { industry: "Pharma", a: { name: "Neuland", code: "NEULANDLAB" }, b: { name: "CarTrade", code: "CARTRADE" } },
});
const desk = deriveDesktopJournal([vs, ...posts]);
assert.deepEqual(desk.headToHead.map((p) => p.slug), ["n-vs-c"]);
assert.ok(!desk.stories.some((s) => s.slug === "n-vs-c"), "no duplicate in Company Stories");
assert.equal(desk.stories[0].slug, "n3");
assert.equal(storyLabel(desk.stories[0]), "Story 3 of 3", "story numbering ignores the comparison");
assert.equal(desk.companyNameCount, 3);
assert.deepEqual(desk.notebook.map((p) => p.slug), ["p2", "i1", "p1"]);
const untagged = deriveDesktopJournal([{ ...vs, comparison: undefined }, ...posts]);
assert.deepEqual(untagged.headToHead, [], "untagged → back in Company Stories");
assert.equal(storyLabel(untagged.stories[0]), "Story 4 of 4");
assert.equal(deriveJournalLanes([vs, ...posts]).featured?.slug, "n-vs-c", "phone lanes unchanged: comparisons stay in");
assert.equal(desk.hasPosts, true);
assert.deepEqual(
  deriveDesktopJournal([]),
  { stories: [], headToHead: [], notebook: [], companyNameCount: 0, hasPosts: false },
  "empty corpus → desktop empty state",
);
assert.equal(deriveDesktopJournal([vs]).hasPosts, true, "a lone comparison still counts as a post");

// --- moreStoriesView: row limit first, then week groups (today = Fri 25 Sep 2026)
const TODAY = "2026-09-25";
const row = (slug: string, date: string) =>
  deriveDesktopJournal([mk(slug, date, "companies", { companyCode: slug.toUpperCase() })]).stories[0];
const archive = [
  row("a", "2026-09-24"),
  row("b", "2026-09-22"),
  row("c", "2026-09-19"),
  row("d", "2026-09-15"),
  row("e", "2026-09-10"),
  row("f", "2026-09-01"),
];
assert.equal(MORE_STORIES_ROWS, 5);
const folded = moreStoriesView(archive, TODAY, false);
assert.equal(folded.canFold, true);
assert.equal(folded.expanded, false);
assert.deepEqual(
  folded.groups.map((g) => [g.key, g.rows.map((r) => r.slug)]),
  [["this", ["a", "b"]], ["last", ["c", "d"]], ["earlier", ["e"]]],
  "5 rows, grouped after the cut",
);
const open = moreStoriesView(archive, TODAY, true);
assert.deepEqual(open.groups.at(-1)?.rows.map((r) => r.slug), ["e", "f"], "expanded shows every row");
const five = moreStoriesView(archive.slice(0, 5), TODAY, false);
assert.equal(five.canFold, false, "exactly MORE_STORIES_ROWS → no toggle");
assert.equal(five.expanded, true);
assert.deepEqual(
  moreStoriesView(archive.slice(4), TODAY, false).groups.map((g) => g.key),
  ["earlier"],
  "empty week groups are dropped",
);
assert.deepEqual(moreStoriesView([], TODAY, false).groups, []);

// --- companyJournal: one company's stories + every head-to-head naming it
{
  const vs = (a: string, b: string) => ({
    industry: "Coffee",
    a: { name: a, code: a },
    b: { name: b, code: b },
  });
  const set: BlogPostMeta[] = [
    mk("ccl-3", "2026-09-24", "companies", { companyCode: "CCL" }),
    mk("vin-vs-ccl", "2026-09-23", "companies", { companyCode: "VINCOFE", comparison: vs("VINCOFE", "CCL") }),
    mk("ccl-vs-vin", "2026-09-21", "companies", { companyCode: "CCL", comparison: vs("CCL", "VINCOFE") }),
    mk("vin-1", "2026-09-20", "companies", { companyCode: "VINCOFE" }),
    mk("ccl-1", "2026-09-18", "companies", { companyCode: "CCL" }),
    mk("note", "2026-09-17", "product", { companyCode: "CCL" }),
  ];
  const ccl = companyJournal(set, "ccl");
  assert.deepEqual(ccl.stories.map((s) => [s.slug, storyLabel(s)]), [
    ["ccl-3", "Story 2 of 2"],
    ["ccl-1", "Story 1 of 2"],
  ], "own stories only, numbered without comparisons or non-company posts");
  assert.deepEqual(
    ccl.headToHead.map((p) => p.slug),
    ["vin-vs-ccl", "ccl-vs-vin"],
    "comparisons match on either side",
  );
  const vin = companyJournal(set, "VINCOFE");
  assert.deepEqual(vin.stories.map((s) => s.slug), ["vin-1"]);
  assert.equal(vin.headToHead.length, 2);
  assert.deepEqual(companyJournal(set, "NOPE"), { stories: [], headToHead: [] });
  assert.deepEqual(companyJournal(set, "  "), { stories: [], headToHead: [] });
}

// --- the real corpus: every post parses, and exactly the tagged ones are comparisons
const corpus = getAllPostMeta();
assert.deepEqual(
  corpus.filter((p) => p.comparison).map((p) => p.slug).sort(),
  ["ccl-vs-vintage", "e2e-vs-netweb", "stltech-vs-hfcl"],
);
const realDesk = deriveDesktopJournal(corpus);
assert.ok(!realDesk.stories.some((s) => s.comparison), "no comparison in Company Stories");

console.log("journal-lanes: ok");
