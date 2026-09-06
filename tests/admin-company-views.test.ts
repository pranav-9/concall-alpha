import assert from "node:assert/strict";

import {
  buildCompanyViewRows,
  buildRecentCompanyOpens,
  summarizeCompanyViews,
  type CompanyNameRow,
  type CompanyViewRpcRow,
  type RawCompanyOpenRow,
} from "../lib/admin-company-views";

const names: CompanyNameRow[] = [
  { code: "AAA", name: "Alpha Ltd" },
  { code: "BBB", name: "Beta Ltd" },
];

const OWN_HOSTS = ["storyofastock.in", "localhost"] as const;

// ── buildCompanyViewRows ─────────────────────────────────────────────────────

// 1. Name join hits; RPC popularity order is preserved.
{
  const rpc: CompanyViewRpcRow[] = [
    { company_code: "BBB", views: 9, last_viewed: "2026-09-01T00:00:00Z" },
    { company_code: "AAA", views: 4, last_viewed: "2026-09-02T00:00:00Z" },
  ];
  const out = buildCompanyViewRows(rpc, names);
  assert.deepEqual(out.map((r) => r.companyCode), ["BBB", "AAA"], "keeps RPC order");
  assert.equal(out[0].companyName, "Beta Ltd", "name join hit");
  assert.equal(out[0].opens, 9);
}

// 2. Name missing → null (renders as code fallback in the UI).
{
  const out = buildCompanyViewRows(
    [{ company_code: "CCC", views: 2, last_viewed: null }],
    names,
  );
  assert.equal(out[0].companyName, null, "unknown code → null name");
  assert.equal(out[0].companyCode, "CCC");
}

// 3. Null / junk codes are dropped.
{
  const out = buildCompanyViewRows(
    [
      { company_code: null, views: 5, last_viewed: null },
      { company_code: "bad code!", views: 5, last_viewed: null },
      { company_code: "AAA", views: 1, last_viewed: null },
    ],
    names,
  );
  assert.deepEqual(out.map((r) => r.companyCode), ["AAA"], "null/junk codes drop");
}

// 4. Duplicate codes are de-duped (first occurrence wins).
{
  const out = buildCompanyViewRows(
    [
      { company_code: "AAA", views: 3, last_viewed: null },
      { company_code: "aaa", views: 99, last_viewed: null },
    ],
    names,
  );
  assert.equal(out.length, 1, "case-insensitive de-dupe");
  assert.equal(out[0].opens, 3, "first occurrence wins");
}

// 5. Non-finite views coerce to 0.
{
  const out = buildCompanyViewRows(
    [{ company_code: "AAA", views: null, last_viewed: null }],
    names,
  );
  assert.equal(out[0].opens, 0, "null views → 0");
}

// 6. Empty input → [].
{
  assert.deepEqual(buildCompanyViewRows([], names), [], "empty in → empty out");
}

// ── summarizeCompanyViews (headline metrics over the FULL set) ────────────────

// 7. Companies Opened = row count; Total Opens = sum of views over the full set.
{
  const rows = buildCompanyViewRows(
    [
      { company_code: "AAA", views: 10, last_viewed: null },
      { company_code: "BBB", views: 5, last_viewed: null },
      { company_code: "CCC", views: 2, last_viewed: null },
    ],
    names,
  );
  const summary = summarizeCompanyViews(rows);
  assert.equal(summary.companiesOpened, 3, "distinct companies = row count");
  assert.equal(summary.totalOpens, 17, "total opens = sum of all views");
}

// 8. Empty set → zeroed metrics (no NaN).
{
  const summary = summarizeCompanyViews([]);
  assert.deepEqual(summary, { companiesOpened: 0, totalOpens: 0 });
}

// ── buildRecentCompanyOpens ──────────────────────────────────────────────────

const raw = (over: Partial<RawCompanyOpenRow> & { id: string }): RawCompanyOpenRow => ({
  company_code: "AAA",
  referrer: null,
  created_at: "2026-09-03T10:00:00Z",
  ...over,
});

// 9. Null referrer → "Direct".
{
  const out = buildRecentCompanyOpens([raw({ id: "1", referrer: null })], names, OWN_HOSTS);
  assert.equal(out[0].source, "Direct", "null referrer is Direct");
  assert.equal(out[0].companyName, "Alpha Ltd", "name join in feed");
}

// 10. Internal / own-host referrer → "Direct" (covers pre-2026-07-17 self-referrer rows).
{
  const out = buildRecentCompanyOpens(
    [
      raw({ id: "2", referrer: "https://storyofastock.in/company/AAA" }),
      raw({ id: "3", referrer: "https://story-of-a-stock.vercel.app/leaderboards" }),
    ],
    names,
    OWN_HOSTS,
  );
  assert.equal(out[0].source, "Direct", "own host is not acquisition → Direct");
  assert.equal(out[1].source, "Direct", "*.vercel.app self-referrer → Direct");
}

// 11. Genuine external referrer → host label.
{
  const out = buildRecentCompanyOpens(
    [raw({ id: "4", referrer: "https://twitter.com/someone/status/1" })],
    names,
    OWN_HOSTS,
  );
  assert.equal(out[0].source, "twitter.com", "external referrer → host");
}

// 12. Rows missing code or timestamp are dropped.
{
  const out = buildRecentCompanyOpens(
    [
      raw({ id: "5", company_code: null }),
      raw({ id: "6", created_at: null }),
      raw({ id: "7", company_code: "BBB" }),
    ],
    names,
    OWN_HOSTS,
  );
  assert.deepEqual(out.map((r) => r.id), ["7"], "drop rows without code/timestamp");
}

// 13. Limit is respected (feed is bounded).
{
  const rows = Array.from({ length: 5 }, (_, i) => raw({ id: `n${i}` }));
  const out = buildRecentCompanyOpens(rows, names, OWN_HOSTS, 3);
  assert.equal(out.length, 3, "must cap at limit");
}

// 14. Empty input → [].
{
  assert.deepEqual(buildRecentCompanyOpens([], names, OWN_HOSTS), [], "empty in → empty out");
}

console.log("admin-company-views: all assertions passed");
