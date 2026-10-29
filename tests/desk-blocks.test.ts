import assert from "node:assert/strict";

import type { BlogPostMeta } from "../app/blog/posts";
import { initiationStory, selectDeskJournal } from "../lib/desk-journal";
import { computeMovers } from "../lib/desk-movers";
import { selectNewCoverage } from "../lib/desk-new-coverage";
import { buildWire } from "../lib/desk-wire";
import type { StoryPick } from "../lib/announcement-story-read/select";
import type { ExchangeUpdate } from "../lib/exchange-desk/types";

// The desk's 2026-10-29 blocks: Journal pick, new coverage, movers, the wire.

// --- Featured reads · from the Journal ---
const post = (slug: string, date: string, over: Partial<BlogPostMeta> = {}): BlogPostMeta => ({
  slug,
  date,
  dateLabel: date,
  title: slug,
  summary: `${slug} summary`,
  tags: [],
  ...over,
});
const story = (slug: string, date: string, code: string) =>
  post(slug, date, { category: "companies", companyCode: code, company: code });

const posts = [
  story("stl-2", "2026-10-23", "STLTECH"),
  post("market-voted", "2026-10-20", { category: "product" }),
  story("acutaas-2", "2026-10-28", "ACUTAAS"),
  story("acutaas-1", "2026-10-01", "ACUTAAS"),
  story("stl-1", "2026-09-10", "STLTECH"),
  post("how-i-size", "2026-09-01", { category: "investing" }),
];

{
  const { lead, side } = selectDeskJournal(posts);
  assert.equal(lead?.post.slug, "acutaas-2", "the newest company story leads, whatever the input order");
  assert.deepEqual(lead?.eyebrow, ["Company story", "Latest"]);
  assert.deepEqual(
    side.map((c) => c.post.slug),
    ["stl-2", "market-voted"],
    "the next story is another company's; the newest essay closes",
  );
  assert.deepEqual(side[0].eyebrow, ["Company story", "2 of 2"]);
  assert.deepEqual(side[1].eyebrow, ["Notebook", "Product"]);
  console.log("  ok  journal: newest story leads, another company's story, newest essay");
}

{
  const { lead, side } = selectDeskJournal(posts, "how-i-size");
  assert.equal(lead?.post.slug, "how-i-size", "a live pin takes the large card");
  assert.deepEqual(lead?.eyebrow, ["Notebook", "How I invest"]);
  assert.deepEqual(side.map((c) => c.post.slug), ["acutaas-2", "market-voted"]);
  assert.equal(selectDeskJournal(posts, "no-such-post").lead?.post.slug, "acutaas-2", "an unknown pin is ignored");
  console.log("  ok  journal: a pinned post leads; an unknown pin is ignored");
}

{
  const onlyStories = [story("a", "2026-10-02", "A"), story("a0", "2026-10-01", "A"), story("b", "2026-09-01", "B")];
  const { side } = selectDeskJournal(onlyStories);
  assert.deepEqual(side.map((c) => c.post.slug), ["b", "a0"], "no essay: another story holds the slot");
  assert.deepEqual(side[0].eyebrow, ["Company story", null], "a company's only story carries no 1 of 1");
  assert.deepEqual(selectDeskJournal([]), { lead: null, side: [] });
  const vs = post("a-vs-b", "2026-10-05", {
    category: "companies",
    companyCode: "A",
    comparison: { industry: "Cables", a: { name: "A", code: "A" }, b: { name: "B", code: "B" } },
  });
  assert.deepEqual(selectDeskJournal([story("c", "2026-10-06", "C"), vs]).side[0].eyebrow, ["Head to head", "Cables"]);
  console.log("  ok  journal: short shelves, single stories and comparisons");
}

{
  assert.equal(initiationStory(posts, "acutaas")?.slug, "acutaas-1", "the company's first story is its initiation");
  assert.equal(initiationStory(posts, "NEWCO"), null);
  console.log("  ok  journal: initiation story = the oldest of the company's own");
}

// --- New to coverage ---
{
  const now = Date.parse("2026-10-29T12:00:00Z");
  const co = (code: string, createdAt: string | null) => ({ code, name: code, sector: null, createdAt });
  const picked = selectNewCoverage(
    [
      co("OLD", "2026-08-01T00:00:00Z"),
      co("ZED", "2026-10-16T05:45:54Z"),
      co("ABC", "2026-10-16T05:45:54Z"),
      co("NULL", null),
      co("BAD", "soon"),
      co("FUTURE", "2026-11-01T00:00:00Z"),
      co("MID", "2026-10-20T00:00:00Z"),
    ],
    now,
  );
  assert.deepEqual(
    picked.map((c) => c.code),
    ["MID", "ABC", "ZED"],
    "newest first; a batch's shared instant breaks on name; old, missing, unreadable and future dates drop",
  );
  assert.equal(selectNewCoverage([co("A", "2026-10-28T00:00:00Z")], now, { limit: 0 }).length, 0);
  console.log("  ok  new coverage: newest admissions inside the window");
}

// --- Leaderboard movers ---
{
  const companies = [
    { code: "UP", name: "Up", latestScore: 7.1 },
    { code: "UPMORE", name: "Up more", latestScore: 6.2 },
    { code: "DOWN", name: "Down", latestScore: null },
    { code: "FLAT", name: "Flat", latestScore: 6 },
    { code: "NEW", name: "New", latestScore: 6 },
    { code: "up", name: "Up again", latestScore: 1 },
  ];
  const { climbing, slipping } = computeMovers({
    latest: { UP: 10, UPMORE: 5, DOWN: 60, FLAT: 30, NEW: 2, CUT: 1 },
    prior: { UP: 20, UPMORE: 15, DOWN: 19, FLAT: 30, CUT: 90 },
    companies,
  });
  assert.deepEqual(
    climbing.map((m) => [m.code, m.delta]),
    [["UPMORE", 10], ["UP", 10]],
    "equal climbs go to the better current rank; a newcomer, a flat line and an unlisted code never show",
  );
  assert.deepEqual(slipping.map((m) => [m.code, m.delta, m.priorRank, m.rank]), [["DOWN", -41, 19, 60]]);
  assert.equal(climbing.length + slipping.length, 3, "a duplicate code counts once");
  assert.deepEqual(computeMovers({ latest: {}, prior: {}, companies }), { climbing: [], slipping: [] });
  console.log("  ok  movers: places moved between snapshots, listed companies only");
}

// --- The wire ---
{
  const now = Date.parse("2026-10-29T12:00:00Z");
  const upd = (id: string, code: string, impact: ExchangeUpdate["impact"], filedRaw: string): ExchangeUpdate => ({
    id,
    companyCode: code,
    companyName: `${code} Ltd`,
    category: "order_win",
    categoryLabel: "Order win",
    impact,
    orderSize: null,
    summary: `${id} summary`,
    headline: `${id} raw headline`,
    attachmentUrl: null,
    filedRaw,
    filedLabel: "1d ago",
    bucketKey: "week",
  });
  const tape = [
    upd("n1", "AAA", "neutral", "2026-10-28T00:00:00Z"),
    upd("p1", "BBB", "positive", "2026-10-28T00:00:00Z"),
    upd("t1", "CCC", "transformative", "2026-10-25T00:00:00Z"),
    upd("p2", "BBB", "positive", "2026-10-29T00:00:00Z"),
    upd("old", "DDD", "severe", "2026-10-10T00:00:00Z"),
  ];

  const fallback = buildWire([], tape, now);
  assert.deepEqual(
    fallback.map((w) => w.id),
    ["t1", "p2"],
    "no story picks: strongest impact, then newest, one per company; routine and out-of-week filings drop",
  );
  assert.equal(fallback[0].headline, "t1 summary");
  assert.equal(fallback[0].dek, null);

  const pick = {
    rank: 1,
    update: tape[1],
    belowCut: true,
    read: { headline: "A naval order", changes: "Multi-year deliveries lift revenue visibility." },
  } as unknown as StoryPick;
  const [item] = buildWire([pick], tape, now);
  assert.equal(item.headline, "A naval order");
  assert.equal(item.dek, "Multi-year deliveries lift revenue visibility.");
  assert.equal(item.belowCut, true);
  const noHeadline = { ...pick, read: { changes: "Something changes here for sure." } } as unknown as StoryPick;
  assert.equal(buildWire([noHeadline], tape, now)[0].headline, "p1 summary", "no producer headline: the tape summary");
  console.log("  ok  wire: Top 5 picks first, else the week's strongest filings");
}

console.log("All desk block tests passed.");
