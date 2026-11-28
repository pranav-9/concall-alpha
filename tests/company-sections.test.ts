import assert from "node:assert/strict";

import { buildCompanySections, SECTION_MAP, SECTIONS, type CompanySectionsInput } from "../app/company/constants";

// The company page's tab list (R9). With the Broker Notes flag off the list must be
// exactly what page.tsx built inline before the extraction: same ids, same order, same
// badges. SECTION_MAP is positional, so every existing key must keep its id.

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}`);
    throw err;
  }
};

const base: CompanySectionsInput = {
  hasJournal: false,
  brokerNotesEnabled: false,
  latestScore: 7.2,
  growthScore: 6.1,
  valuationScore: 4.5,
  valuationStale: false,
};
const ids = (input: Partial<CompanySectionsInput>) => buildCompanySections({ ...base, ...input }).map((s) => s.id);

// Hard-coded from app/company/[code]/page.tsx buildSidebarSections as of origin/main 2acc0cd.
const TODAY_WITHOUT_JOURNAL = [
  "overview",
  "business-overview",
  "industry-context",
  "quality",
  "sentiment-score",
  "key-variables",
  "future-growth",
  "valuation-check",
  "guidance-history",
  "company-announcements",
];
const TODAY_WITH_JOURNAL = [
  "overview",
  "business-overview",
  "industry-context",
  "quality",
  "sentiment-score",
  "key-variables",
  "future-growth",
  "valuation-check",
  "guidance-history",
  "company-journal",
  "company-announcements",
];

test("flag off: today's ids in today's order, with and without the Journal", () => {
  assert.deepEqual(ids({}), TODAY_WITHOUT_JOURNAL);
  assert.deepEqual(ids({ hasJournal: true }), TODAY_WITH_JOURNAL);
  assert.ok(!ids({ hasJournal: true }).includes("broker-notes"));
});

test("flag off: labels and badges unchanged", () => {
  const sections = buildCompanySections({ ...base, hasJournal: true });
  const byId = new Map(sections.map((s) => [s.id, s]));
  assert.deepEqual(byId.get("sentiment-score")?.meta, { kind: "score", score: 7.2, scoreKind: "quarterly" });
  assert.deepEqual(byId.get("future-growth")?.meta, { kind: "score", score: 6.1, scoreKind: "growth" });
  assert.deepEqual(byId.get("valuation-check")?.meta, { kind: "score", score: 4.5, scoreKind: "valuation" });
  for (const section of sections) {
    if (!["sentiment-score", "future-growth", "valuation-check"].includes(section.id)) {
      assert.equal(section.meta, undefined, `${section.id} carries no badge`);
    }
  }
  assert.equal(byId.get("valuation-check")?.label, "Valuation Check");
  assert.equal(byId.get("company-journal")?.label, "Journal");
});

test("flag off: null scores and a stale valuation show no badge", () => {
  const sections = buildCompanySections({
    ...base,
    latestScore: null,
    growthScore: null,
    valuationScore: 4.5,
    valuationStale: true,
  });
  for (const section of sections) assert.equal(section.meta, undefined, section.id);
});

test("flag on: broker-notes sits right after valuation-check, everything else unchanged", () => {
  for (const hasJournal of [false, true]) {
    const on = ids({ hasJournal, brokerNotesEnabled: true });
    const off = ids({ hasJournal, brokerNotesEnabled: false });
    const at = on.indexOf("valuation-check");
    assert.equal(on[at + 1], "broker-notes");
    assert.deepEqual(
      on.filter((id) => id !== "broker-notes"),
      off,
    );
  }
  const tab = buildCompanySections({ ...base, brokerNotesEnabled: true }).find((s) => s.id === "broker-notes");
  assert.deepEqual(tab, { id: "broker-notes", label: "Broker Notes" }, "label only: no count pill (D3)");
});

test("SECTION_MAP: every existing key keeps its id; broker-notes is appended last", () => {
  const expected: Record<string, string> = {
    overview: "overview",
    companyAnnouncements: "company-announcements",
    industryContext: "industry-context",
    subSector: "sub-sector",
    businessSnapshot: "business-overview",
    keyVariables: "key-variables",
    concallScore: "sentiment-score",
    futureGrowth: "future-growth",
    guidanceHistory: "guidance-history",
    quality: "quality",
    community: "community",
    topBusinessStrategies: "competitive-strategy",
    walkTheTalk: "walk-the-talk",
    valuationCheck: "valuation-check",
    companyJournal: "company-journal",
    brokerNotes: "broker-notes",
  };
  assert.deepEqual(
    Object.fromEntries(Object.entries(SECTION_MAP).map(([key, section]) => [key, section.id])),
    expected,
  );
  assert.equal(SECTIONS[SECTIONS.length - 1].id, "broker-notes");
  assert.equal(new Set(SECTIONS.map((s) => s.id)).size, SECTIONS.length, "section ids are unique");
});
