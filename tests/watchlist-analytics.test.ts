import assert from "node:assert/strict";

import type { AnnouncementStoryRead } from "../lib/announcement-story-read/types";
import type { ExchangeUpdate } from "../lib/exchange-desk/types";
import type { ProsConsItem } from "../lib/overview-pros-cons";
import { selectWatchlistFilings } from "../lib/watchlist-analytics/announcements";
import { buildChangeLedger, collectCompanyChanges, type CompanyChangeInputs } from "../lib/watchlist-analytics/changes";
import { buildDistribution, concentrationLine } from "../lib/watchlist-analytics/distribution";
import { aggregateProsCons } from "../lib/watchlist-analytics/pros-cons";
import type { WatchlistCompany } from "../lib/watchlist-analytics/types";

// ── 1. Where the list sits ───────────────────────────────────────────────────

const co = (code: string, sector: string | null, subSector: string | null = null): WatchlistCompany => ({
  code,
  name: `${code} Ltd`,
  sector,
  subSector,
});

{
  const companies = [
    co("HFCL", "Capital Goods", "Cables - Electricals"),
    co("STLTECH", "capital goods ", "cables - electricals"),
    co("KEI", "Capital Goods", "Cables - Electricals"),
    co("AZAD", "Capital Goods", "Aerospace & Defense"),
    co("NEULANDLAB", "Healthcare", "CDMO"),
    co("BLANK", null),
  ];
  const d = buildDistribution(
    companies,
    [
      { themeSlug: "defence", code: "azad" },
      { themeSlug: "defence", code: "HFCL" },
      { themeSlug: "defence", code: "NOTONLIST" },
      { themeSlug: "unfeatured", code: "KEI" },
      { themeSlug: "cdmo", code: "NEULANDLAB" },
    ],
    [
      { slug: "defence", title: "Defence", hotness: 4 },
      { slug: "cdmo", title: "CDMO", hotness: 5 },
    ],
    new Set(["capital goods"]),
  );

  assert.equal(d.total, 6);
  // Case/whitespace variants fold into one bucket, labelled as first stored.
  assert.deepEqual(
    d.sectors.map((s) => [s.label, s.count, s.codes]),
    [
      ["Capital Goods", 4, ["AZAD", "HFCL", "KEI", "STLTECH"]],
      ["Healthcare", 1, ["NEULANDLAB"]],
    ],
  );
  assert.equal(d.sectors[0].href, "/sector/capital-goods");
  // A sector without a page gets no link (a dead click is worse than none).
  assert.equal(d.sectors[1].href, null);
  assert.ok(Math.abs(d.sectors[0].share - 4 / 6) < 1e-9);
  assert.deepEqual(d.unclassified, ["BLANK"]);
  assert.deepEqual(
    d.subSectors.map((s) => [s.label, s.count]),
    [
      ["Cables - Electricals", 3],
      ["Aerospace & Defense", 1],
      ["CDMO", 1],
    ],
  );
  // Only featured themes, only list members; most members first, then hotness.
  assert.deepEqual(
    d.themes.map((t) => [t.slug, t.count, t.codes]),
    [
      ["defence", 2, ["AZAD", "HFCL"]],
      ["cdmo", 1, ["NEULANDLAB"]],
    ],
  );
  assert.equal(d.line, "Capital Goods is 67% of the list (4 of 6).");
}

assert.equal(concentrationLine(1, [{ label: "X", count: 1, share: 1, codes: ["A"], href: null }]), null);
assert.equal(
  concentrationLine(3, [{ label: "X", count: 3, share: 1, codes: [], href: null }]),
  "Every name on the list is X.",
);
assert.equal(
  concentrationLine(10, [
    { label: "X", count: 3, share: 0.3, codes: [], href: null },
    { label: "Y", count: 3, share: 0.3, codes: [], href: null },
    { label: "Z", count: 4, share: 0.4, codes: [], href: null },
  ]),
  // Caller passes buckets already sorted; the line reads the first.
  "Spread across 3 sectors; the largest, X, is 3 of 10.",
);

// ── 2. The good and the bad, across the list ─────────────────────────────────

const item = (id: string, side: ProsConsItem["side"], weight: number, claim: string, evidence: string | null = null): ProsConsItem => ({
  id,
  side,
  source: id.split(":")[0] as ProsConsItem["source"],
  weight,
  claim,
  evidence,
});

{
  const clean = (w: number, ev: string) => item("forensics:clean", "good", w, "No red flags in the accounts", ev);
  const agg = aggregateProsCons(
    [
      { code: "A", name: "A Ltd", items: [clean(76, "Clean on all 9 checks we can run"), item("moat:wide_moat", "good", 86, "A wide competitive edge")] },
      { code: "B", name: "B Ltd", items: [clean(76, "Clean on all 7 checks we can run"), item("valuation:bad", "bad", 72, "Richly priced at today's price")] },
      { code: "C", name: "C Ltd", items: [clean(76, "Clean on all 8 checks we can run"), item("forensics:debt_load", "bad", 88, "Debt is heavy for what it earns", "Net debt / EBITDA 4.1×")] },
      // Same rule, the softer wording — its own row.
      { code: "D", name: "D Ltd", items: [item("forensics:debt_load", "bad", 36, "Debt is worth watching"), item("valuation:bad", "bad", 72, "Richly priced at today's price")] },
      { code: "E", name: "E Ltd", items: [] },
    ],
    2,
  );

  assert.equal(agg.total, 5);
  assert.equal(agg.readCount, 4);
  // Most companies first; a 3-company row beats a heavier 1-company row.
  assert.deepEqual(
    agg.good.map((g) => [g.label, g.count]),
    [
      ["No red flags in the accounts", 3],
      ["A wide competitive edge", 1],
    ],
  );
  assert.deepEqual(agg.good[0].companies.map((c) => c.code), ["A", "B", "C"]);
  assert.equal(agg.good[0].companies[1].evidence, "Clean on all 7 checks we can run");
  // Equal counts: heavier weight first. The two debt wordings are separate rows,
  // and the limit trims the lighter one.
  assert.deepEqual(
    agg.bad.map((g) => [g.label, g.count, g.weight]),
    [
      ["Richly priced at today's price", 2, 72],
      ["Debt is heavy for what it earns", 1, 88],
    ],
  );
  assert.equal(aggregateProsCons([], 5).good.length, 0);
}

// ── 3. Big filings ───────────────────────────────────────────────────────────

const NOW = new Date("2026-10-07T09:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const update = (
  id: string,
  code: string,
  impact: ExchangeUpdate["impact"],
  filedRaw: string,
  extra: Partial<ExchangeUpdate> = {},
): ExchangeUpdate => ({
  id,
  companyCode: code,
  companyName: `${code} Ltd`,
  category: "order_win",
  categoryLabel: "Order Wins",
  impact,
  orderSize: null,
  summary: `${id} summary`,
  headline: `${id} headline`,
  attachmentUrl: null,
  filedRaw,
  filedLabel: "",
  bucketKey: "earlier",
  ...extra,
});

const read = (id: string, score: number, headline?: string): AnnouncementStoryRead => ({
  announcement_id: id,
  company_code: "X",
  filed_at: daysAgo(1),
  generated_at: daysAgo(1),
  model: "test",
  prompt_version: "v1",
  checks: {
    stated_item: true,
    central_to_story: true,
    advances_or_secures: true,
    behind_stated_pace: false,
    beyond_run_rate: false,
    changes_mix_or_engine: false,
    durable: true,
    adverse: false,
  },
  score,
  story_effect: "confirms",
  headline,
  what: "What was filed, in a sentence long enough.",
  changes: "What it changes for the company, in a sentence long enough.",
  anchor: null,
  pdf_read: true,
});

{
  const updates = [
    update("t1", "A", "transformative", daysAgo(10)),
    update("p1", "B", "positive", daysAgo(2), { orderSize: { pctOfMcap: 12, softness: null } }),
    update("p2", "B", "positive", daysAgo(3), { orderSize: { pctOfMcap: 30, softness: null } }),
    update("p3", "B", "positive", daysAgo(4), { orderSize: { pctOfMcap: 2, softness: null } }),
    update("n1", "C", "negative", daysAgo(1)),
    update("r1", "D", "neutral", daysAgo(1)),
    update("old", "E", "transformative", daysAgo(40)),
    update("future", "F", "transformative", new Date(NOW.getTime() + 60_000).toISOString()),
    update("s1", "G", "severe", daysAgo(5), { category: "rating", categoryLabel: "Credit Rating" }),
  ];
  const reads = [read("p1", 6, "B wins a plant order"), read("p3", 9)];
  const f = selectWatchlistFilings(updates, reads, NOW);

  // Out-of-window and future-dated rows are gone; routine is counted, not listed.
  assert.equal(f.total, 7);
  assert.equal(f.good, 4);
  assert.equal(f.adverse, 2);
  assert.equal(f.routine, 1);
  assert.deepEqual(
    f.picks.map((p) => p.update.id),
    // tier 0 first (transformative/severe; order_win beats rating in category),
    // then tier 1 by read score (p3=9, p1=6), order size (p2 30%), negative last;
    // B is capped at two so p2 never lists.
    ["t1", "s1", "p3", "p1", "n1"],
  );
  assert.equal(f.hidden, 1);
  assert.equal(f.picks[3].headline, "B wins a plant order");
  // A read without a headline leaves the tape's own summary on the card.
  assert.equal(f.picks[2].headline, "p3 summary");
  assert.equal(f.picks[0].read, null);
  assert.deepEqual(
    f.picks.map((p) => p.rank),
    [1, 2, 3, 4, 5],
  );
}

{
  const f = selectWatchlistFilings([update("r1", "D", "neutral", daysAgo(1))], [], NOW);
  assert.equal(f.picks.length, 0);
  assert.equal(f.routine, 1);
}

// ── 4. Latest changes ────────────────────────────────────────────────────────

const inputs = (overrides: Partial<CompanyChangeInputs>): CompanyChangeInputs => ({
  code: "A",
  name: "A Ltd",
  quarterPrints: [],
  growthRuns: [],
  valuation: null,
  guidance: null,
  quality: null,
  moat: null,
  business: null,
  keyVariables: null,
  ...overrides,
});

{
  const changes = collectCompanyChanges(
    inputs({
      quarterPrints: [
        { label: "Q2 FY27", score: 7.4, scoredAt: daysAgo(2) },
        { label: "Q1 FY27", score: 6.8, scoredAt: daysAgo(3) }, // a re-score inside the window: its own line
        { label: "Q4 FY26", score: 7.0, scoredAt: daysAgo(100) },
        { label: "Q3 FY26", score: 7.9, scoredAt: null },
      ],
      growthRuns: [
        { score: 7.8, at: daysAgo(5) },
        { score: 7.5, at: daysAgo(60) },
      ],
    }),
    NOW,
    30,
  );
  assert.deepEqual(
    changes.map((c) => [c.kind, c.title, c.detail, c.tone]),
    [
      ["quarter", "ConcallScore 7.4 · Q2 FY27", "+0.6 vs Q1 FY27", "good"],
      ["quarter", "ConcallScore 6.8 · Q1 FY27", "−0.2 vs Q4 FY26", "muted"],
      ["growth", "Growth outlook 7.8", "+0.3 vs the previous read", "good"],
    ],
  );
  assert.equal(changes[0].href, "/company/A#sentiment-score");
  assert.notEqual(changes[0].id, changes[1].id);
}

{
  // First print ever, and a first growth read: no delta, muted.
  const changes = collectCompanyChanges(
    inputs({
      quarterPrints: [{ label: "Q2 FY27", score: 5.1, scoredAt: daysAgo(1) }],
      growthRuns: [{ score: 6.1, at: daysAgo(1) }],
    }),
    NOW,
    30,
  );
  assert.deepEqual(
    changes.map((c) => [c.detail, c.tone]),
    [
      ["First scored quarter", "muted"],
      ["First growth read", "muted"],
    ],
  );
}

{
  // Valuation: a re-pricing inside the same band is NOT a change …
  const same = collectCompanyChanges(
    inputs({
      valuation: {
        score: 6.4,
        pricedAsOf: "2026-10-05",
        history: [
          { pricedAsOf: "2026-09-25", score: 6.9 },
          { pricedAsOf: "2026-10-05", score: 6.4 },
        ],
      },
    }),
    NOW,
    30,
  );
  assert.equal(same.length, 0);
  // … a band change is, toned by the direction of the score …
  const moved = collectCompanyChanges(
    inputs({
      valuation: {
        score: 3.6,
        pricedAsOf: "2026-10-05",
        history: [
          { pricedAsOf: "2026-09-25", score: 6.9 },
          { pricedAsOf: "2026-10-05", score: 3.6 },
        ],
      },
    }),
    NOW,
    30,
  );
  assert.deepEqual(
    moved.map((c) => [c.title, c.detail, c.tone]),
    [["Valuation · Expensive", "Was undervalued at the previous pricing", "bad"]],
  );
  // … and the first pricing on record lists on its own.
  const first = collectCompanyChanges(
    inputs({ valuation: { score: 8.2, pricedAsOf: "2026-10-01", history: [{ pricedAsOf: "2026-10-01", score: 8.2 }] } }),
    NOW,
    30,
  );
  assert.deepEqual(
    first.map((c) => [c.title, c.detail, c.tone]),
    [["Valuation · Deep value", "First pricing on record", "muted"]],
  );
  // A pricing outside the window says nothing even if the band changed.
  const stale = collectCompanyChanges(
    inputs({ valuation: { score: 2, pricedAsOf: "2026-08-01", history: [{ pricedAsOf: "2026-07-01", score: 8 }] } }),
    NOW,
    30,
  );
  assert.equal(stale.length, 0);
}

{
  const changes = collectCompanyChanges(
    inputs({
      guidance: { generatedAt: daysAgo(4), liveCount: 1, tierLabel: "High trust" },
      quality: { generatedAt: daysAgo(6), tally: { clean: 7, watch: 1, flag: 0, assessed: 8 } },
      moat: { updatedAt: daysAgo(8), label: "Narrow · mid" },
      business: { generatedAt: daysAgo(31) }, // just outside
      keyVariables: { generatedAt: null },
    }),
    NOW,
    30,
  );
  assert.deepEqual(
    changes.map((c) => [c.kind, c.title, c.detail]),
    [
      ["guidance", "Guidance track refreshed", "1 live target · High trust"],
      ["quality", "Quality read refreshed", "7 of 8 checks clean"],
      ["moat", "Moat re-read", "Narrow · mid"],
    ],
  );
}

{
  // The ledger: newest first across companies, bucketed by IST day, capped.
  const todayIst = new Date("2026-10-07T03:30:00Z"); // 09:00 IST on the 7th
  const ledger = buildChangeLedger(
    [
      inputs({ code: "A", quarterPrints: [{ label: "Q2 FY27", score: 7, scoredAt: "2026-10-07T02:00:00Z" }] }), // 07:30 IST today
      inputs({ code: "B", quarterPrints: [{ label: "Q2 FY27", score: 6, scoredAt: "2026-10-06T19:30:00Z" }] }), // 01:00 IST today
      inputs({ code: "C", growthRuns: [{ score: 6, at: "2026-10-03T10:00:00Z" }] }),
      inputs({ code: "D", moat: { updatedAt: "2026-09-20T10:00:00Z", label: "Wide · strong" } }),
      inputs({ code: "E", moat: { updatedAt: "2026-08-20T10:00:00Z", label: "None" } }), // out of window
    ],
    todayIst,
    { limit: 3 },
  );
  assert.equal(ledger.total, 4);
  assert.equal(ledger.shown, 3);
  assert.deepEqual(
    ledger.buckets.map((b) => [b.key, b.items.map((i) => i.code)]),
    [
      ["today", ["A", "B"]],
      ["week", ["C"]],
    ],
  );
}

{
  // A refresh run rewrites several sections of one company within minutes:
  // one line naming them, newest timestamp, not five. Another company's lone
  // refresh and a score print the same day stay as they are.
  const ledger = buildChangeLedger(
    [
      inputs({
        code: "A",
        quarterPrints: [{ label: "Q2 FY27", score: 7, scoredAt: "2026-10-01T06:00:00Z" }],
        guidance: { generatedAt: "2026-10-01T05:00:00Z", liveCount: 8, tierLabel: "Mixed" },
        quality: { generatedAt: "2026-10-01T05:02:00Z", tally: { clean: 7, watch: 2, flag: 0, assessed: 9 } },
        moat: { updatedAt: "2026-10-01T05:04:00Z", label: "Narrow · mid" },
        business: { generatedAt: "2026-10-01T05:01:00Z" },
        keyVariables: { generatedAt: "2026-10-02T05:00:00Z" }, // next day: its own line
      }),
      inputs({ code: "B", business: { generatedAt: "2026-10-01T05:00:00Z" } }),
    ],
    NOW,
  );
  const items = ledger.buckets.flatMap((b) => b.items);
  assert.deepEqual(
    items.map((c) => [c.code, c.kind, c.title, c.detail]),
    [
      ["A", "key_variables", "Key variables refreshed", null],
      ["A", "quarter", "ConcallScore 7.0 · Q2 FY27", "First scored quarter"],
      ["A", "sections", "4 sections refreshed", "business · guidance · quality · moat"],
      ["B", "business", "Business snapshot refreshed", null],
    ],
  );
  assert.equal(items[2].at, "2026-10-01T05:04:00Z");
  assert.equal(items[2].href, "/company/A#overview");
  assert.equal(ledger.total, 4);
}

console.log("watchlist-analytics: ok");
