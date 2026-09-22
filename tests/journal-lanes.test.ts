import assert from "node:assert/strict";

import {
  deriveJournalLanes,
  filterNotebook,
  notebookCatalog,
  pad,
  priorLinkLabel,
  priorStory,
  storyLabel,
} from "../app/blog/lanes";
import type { BlogPostMeta } from "../app/blog/posts";

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
assert.deepEqual(
  lanes.ledger.map((l) => [l.code, l.name, l.count, l.latestSlug]),
  [
    ["NEULANDLAB", "Neuland", 3, "n3"],
    ["CARTRADE", "CarTrade", 1, "c1"],
    ["", "Loose Co", 1, "nocode"],
  ],
  "ledger: one row per company, newest-story-first, code-less companies keep an empty code",
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

console.log("journal-lanes: ok");
