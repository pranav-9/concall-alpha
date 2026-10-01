import assert from "node:assert/strict";

import type { NormalizedIndustryValueChainLayer } from "../lib/company-industry-analysis/types";
import {
  companyLayerIndexes,
  latestCompanyMargin,
  marginBandPosition,
  marginReadShort,
  matchesCompany,
  moneyHeadline,
  pickPlayerLens,
  policySortKey,
  policyTally,
  policyTone,
  readLayerMargin,
  shortName,
  whereItSitsLine,
} from "../lib/company-industry-analysis/view";
import type { CompanyQualityV1 } from "../lib/company-quality/types";

// ---- margin bands ----------------------------------------------------------------
assert.equal(marginBandPosition(0), 0);
assert.equal(marginBandPosition(10), 1);
assert.equal(marginBandPosition(20), 2);
assert.equal(marginBandPosition(95), 3, "anything past the Rich band's top pins to it");

const thin = readLayerMargin("Thin");
assert.ok(thin && thin.tier === 0 && thin.pct === null);
assert.equal(marginReadShort(thin!), "Thin");

const span = readLayerMargin("Rich (aerospace/semiconductor primes) to Adequate (domestic defence)");
assert.ok(span && span.loTier === 1 && span.hiTier === 2);
assert.equal(marginReadShort(span!), "Adequate–Rich");

// Only EBITDA-family figures place by number — keyword first, in the same clause.
const ebitda = readLayerMargin("EBITDA 8-17% (Indian peers), 11-24% (Saudi peers), FY25");
assert.deepEqual(ebitda?.pct, { lo: 8, hi: 17 });
assert.equal(marginReadShort(ebitda!), "8–17%");
assert.deepEqual(readLayerMargin("PAT ~7.5%; EBITDA 11.5% (Bondada FY26)")?.pct, { lo: 11.5, hi: 11.5 });
assert.deepEqual(readLayerMargin("Op. margin 10.4% (L&T group, Q4 FY26)")?.pct, { lo: 10.4, hi: 10.4 });
assert.deepEqual(readLayerMargin("8–18% EBITDA margin")?.pct, { lo: 8, hi: 18 }, "figure-first when the label opens on it");
// Relative or other-metric figures never place.
assert.equal(readLayerMargin("+20-30% gross/EBITDA margin vs bulk"), null);
assert.equal(readLayerMargin("Typical trade margin 2–4% (RHP, FY23)"), null);
assert.equal(readLayerMargin("Project IRR 12-14% battery; 17-18% solar"), null);
assert.equal(readLayerMargin("Lease yield 9-12% NBV; ROE mid-single-digit"), null);
assert.equal(readLayerMargin("Not disclosed"), null);
assert.equal(readLayerMargin(null), null);
// A point value still gets a visible box.
const point = readLayerMargin("EBITDA 20%+")!;
assert.ok(point.hi - point.lo >= 0.14 - 1e-9);

// ---- company matching ---------------------------------------------------------------
assert.equal(matchesCompany("Vinyas Innovative Technologies (inferred)", "Vinyas Innovative Technologies Ltd", "VINYAS"), true);
assert.equal(matchesCompany("CarWale (CarTrade Tech)", "CarTrade Tech Limited", "CARTRADE"), true);
assert.equal(matchesCompany("Aragen Life Sciences", "Sai Life Sciences Limited", "SAILIFE"), false, "a later shared word is not the company");
assert.equal(matchesCompany("London Metal Exchange (LME)", "Multi Commodity Exchange of India Limited", "MCX"), false);
assert.equal(matchesCompany("Multi Commodity Exchange of India (MCX)", "Multi Commodity Exchange of India Limited", "MCX"), true);
assert.equal(matchesCompany("Tata Coffee", "Tata Steel Limited", "TATASTEEL"), false, "generic lead word needs the second word");
assert.equal(matchesCompany("SBI Life", "HDFC Life Insurance Company Limited", "HDFCLIFE"), false);

const layer = (name: string, participants: string[], connection: string | null = null): NormalizedIndustryValueChainLayer => ({
  layerName: name,
  revenueModel: null,
  topParticipants: participants.map((participant) => ({ name: participant, listedStatus: null, identifierClause: null })),
  marginReturnProfile: null,
  evidence: [],
  layerDescription: null,
  connectionToCompany: connection,
  structuralCharacteristic: null,
});

assert.deepEqual(
  companyLayerIndexes([layer("Components", ["Murata"]), layer("EMS", ["Laurus Labs"]), layer("OEMs", ["BEL"])], "Laurus Labs Limited", "LAURUSLABS"),
  [1],
);
// Legacy rows carry a linkage on every layer — that is not "operates here".
assert.deepEqual(
  companyLayerIndexes([layer("A", [], "linkage"), layer("B", [], "linkage")], "HDFC Life Insurance", "HDFCLIFE"),
  [],
);
assert.deepEqual(companyLayerIndexes([layer("A", [], "role"), layer("B", [])], null, "XYZ"), [0]);

const lens = pickPlayerLens(
  [
    { dimensionName: "Scale", dimensionExplanation: null, players: [], categories: [{ categoryName: "Global", categoryDescription: null, playerExamples: ["Foxconn"] }] },
    {
      dimensionName: "End market",
      dimensionExplanation: null,
      players: [],
      categories: [
        { categoryName: "Industrial", categoryDescription: null, playerExamples: ["Dixon"] },
        { categoryName: "Defence", categoryDescription: null, playerExamples: ["Centum", "Vinyas Innovative Technologies"] },
      ],
    },
  ],
  "Vinyas Innovative Technologies",
  "VINYAS",
);
assert.deepEqual(lens, { index: 1, matched: [1] }, "leads with the lens the company is named in");

// ---- policy ------------------------------------------------------------------------
assert.equal(policyTone("positive"), "helps");
assert.equal(policyTone("negative"), "hurts");
assert.equal(policyTone("mixed"), "mixed");
assert.equal(policyTone("uncertain"), "unclear");
const periods = ["2026", "FY25", null, "2023", "FY26-FY27"];
assert.deepEqual(
  periods.slice().sort((a, b) => policySortKey(a) - policySortKey(b)),
  ["2023", "FY25", "FY26-FY27", "2026", null],
);
assert.deepEqual(
  policyTally(["helps", "helps", "mixed", "hurts"]).map((item) => item.text),
  ["2 help", "1 mixed", "1 hurts"],
);

// ---- templated lines --------------------------------------------------------------
assert.equal(shortName("Original Equipment Manufacturers (OEMs)"), "Original Equipment Manufacturers");
assert.equal(
  moneyHeadline(
    [
      { name: "Component Suppliers", read: readLayerMargin("Thin") },
      { name: "EMS Providers", read: readLayerMargin("Adequate") },
      { name: "Original Equipment Manufacturers (OEMs)", read: readLayerMargin("Rich") },
    ],
    "VINYAS",
    [1],
  ),
  "Money pools at Original Equipment Manufacturers; margins are thinnest at Component Suppliers. VINYAS operates in EMS Providers.",
);
assert.equal(
  moneyHeadline([{ name: "A", read: readLayerMargin("Adequate") }, { name: "B", read: readLayerMargin("Adequate") }], "X", []),
  "Margins sit in the same adequate band all along the chain.",
);
assert.equal(moneyHeadline([{ name: "A", read: readLayerMargin("Rich") }, { name: "B", read: null }], "X", []), null);

assert.equal(
  whereItSitsLine({ layerRead: readLayerMargin("Thin"), companyMargin: 26, cycleStage: "early_upcycle", tailwinds: 6, headwinds: 4 }),
  "Out-earns its thin-margin layer, early in an upcycle, more tailwinds than headwinds.",
);
assert.equal(
  whereItSitsLine({ layerRead: readLayerMargin("EBITDA 37.4% (Azad, FY26)"), companyMargin: 37, cycleStage: null, tailwinds: 2, headwinds: 2 }),
  "Earns inside its layer's range, tailwinds and headwinds evenly split.",
  "a rounded company margin within a point of the range is inside it",
);
assert.equal(
  whereItSitsLine({ layerRead: readLayerMargin("EBITDA 26-38%"), companyMargin: null, cycleStage: "mid_upcycle", tailwinds: 0, headwinds: 0 }),
  "Works a rich-margin layer, mid-way through an upcycle.",
);
assert.equal(whereItSitsLine({ layerRead: null, companyMargin: null, cycleStage: null, tailwinds: 0, headwinds: 0 }), null);

// ---- company margin -----------------------------------------------------------------
const quality = (model: "industrial" | "financial", margins: (number | null)[]) =>
  ({
    statement_model: model,
    fiscal_years: margins.map((margin, index) => ({ label: `FY2${index}`, ebitda_margin_pct: margin, opm_pct: null })),
  }) as unknown as CompanyQualityV1;
assert.deepEqual(latestCompanyMargin(quality("industrial", [12, 15, null])), { pct: 15, label: "FY21" });
assert.equal(latestCompanyMargin(quality("financial", [12])), null, "bank/NBFC statements carry no EBITDA margin");
assert.equal(latestCompanyMargin(null), null);

console.log("industry-view: ok");
