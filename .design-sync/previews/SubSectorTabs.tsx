import { SubSectorTabs } from "concall-alpha";

// The Sub-sectors section's whole body. A covered company usually plays in more
// than one sub-sector, and each has its own competitive structure, so the tabs
// switch the WHOLE panel — introduction, market-share snapshot, capital cycle,
// supply-side evidence read — rather than just a heading.
//
// Shape rules that matter when building the entries:
//   · entries === 0 renders NOTHING (the section swaps in MissingSectionState
//     instead — see that component's card).
//   · entries === 1 drops the tab strip and prints the sub-sector name as a
//     title inside the panel instead.
//   · the small sky dot on a tab means that entry carries market-share players
//     or a supply-side evidence pack — depth, not just a description.
//   · stage / direction / player status are pipeline enums (snake_case); the
//     component title-cases them for display, so pass them raw.
//   · shareValue is a STRING, and shareIsEstimated is what marks our own
//     estimate versus a disclosed number. The bars are normalised to the
//     largest player, not to 100%.

const CDMO = {
  subSector: "Pharmaceutical CDMO / CRAMS",
  description:
    "Contract development and manufacturing for innovator pharma — project-shaped revenue early, annuity-shaped once the molecule is approved.",
  relevanceRationale:
    "Neuland's CMS block sits here and crossed half of consolidated revenue in FY26.",
  // No supplySideRead on this entry: the evidence pack below carries the read
  // instead, so the panel prints one bottom card rather than two. Every field is
  // independently nullable and the layout collapses around whatever is absent.
  capitalCycle: {
    stage: "capacity_addition",
    direction: "supply_tightening",
    supplySideRead: null,
  },
  marketShareSnapshot: {
    shareBasis: "Share of Indian CDMO revenue, FY26",
    dataVintage: "FY26 annual reports",
    players: [
      {
        playerName: "Divi's Laboratories",
        shareValue: "22%",
        playerStatus: "incumbent_leader",
        shareIsEstimated: false,
      },
      {
        playerName: "Syngene International",
        shareValue: "14%",
        playerStatus: "incumbent",
        shareIsEstimated: false,
      },
      {
        playerName: "Neuland Laboratories",
        shareValue: "4",
        playerStatus: "the_company",
        shareIsEstimated: true,
      },
      {
        playerName: "Sai Life Sciences",
        shareValue: "3%",
        playerStatus: "challenger",
        shareIsEstimated: true,
      },
    ],
  },
  supplySideEvidencePack: {
    interpretation:
      "Four of six announced brownfield expansions are peptide-capable, and three of those disclose no anchor customer — capacity built ahead of demand, the classic late-cycle tell.",
    evidenceConfidence: "moderate",
    evidenceWindowYears: 3,
    rows: [],
  },
};

const API = {
  subSector: "Generic API & intermediates",
  description:
    "Bulk active pharmaceutical ingredients supplied to formulators, competing largely on cost, regulatory filings and reliability of supply rather than on molecule exclusivity.",
  relevanceRationale:
    "The legacy half of the business and the source of the fixed-cost absorption the CMS block benefits from — margin here is the floor, not the story.",
  capitalCycle: {
    stage: "consolidation",
    direction: "supply_ample",
    supplySideRead:
      "Chinese capacity that came back online through FY25 has kept pricing capped in the older molecules. Filings, not plants, are the binding constraint for anyone trying to move up the value curve.",
  },
  marketShareSnapshot: {
    shareBasis: "Share of the company's top 12 molecules by revenue, FY26",
    dataVintage: "Q4 FY26 investor presentation",
    players: [
      {
        playerName: "Neuland Laboratories",
        shareValue: "31%",
        playerStatus: "the_company",
        shareIsEstimated: false,
      },
      {
        playerName: "Divi's Laboratories",
        shareValue: "27%",
        playerStatus: "incumbent_leader",
        shareIsEstimated: false,
      },
      {
        playerName: "Chinese merchant suppliers (aggregate)",
        shareValue: "24",
        playerStatus: "import_competition",
        shareIsEstimated: true,
      },
    ],
  },
  supplySideEvidencePack: null,
};

const PEPTIDES = {
  subSector: "Peptide APIs",
  description:
    "Synthetic peptide actives, currently the fastest-growing corner of the specialty API market on the back of GLP-1 volumes.",
  relevanceRationale:
    "Management has flagged a peptide block in the last three calls without quantifying the order book, so the sub-sector is relevant to the thesis but not yet to the numbers.",
  capitalCycle: null,
  marketShareSnapshot: null,
  supplySideEvidencePack: null,
};

/**
 * Canonical: three sub-sectors, the first one active. The dots on the first two
 * tabs say those entries carry real depth; Peptides is context only.
 */
export const MultipleSubSectors = () => (
  <SubSectorTabs entries={[CDMO, API, PEPTIDES]} />
);

/**
 * One sub-sector: no tab strip at all, and the name is printed as the panel's
 * title instead. Worth knowing — a single-entry company gets a visibly
 * different section, not a one-tab strip.
 */
export const SingleSubSector = () => <SubSectorTabs entries={[API]} />;

/**
 * Context-only entries: the sub-sector qualified for the company but no
 * market-share, capital-cycle or evidence work has been done on it yet. The
 * panel degrades to the introduction card alone — no empty scaffolding.
 */
export const ContextOnly = () => (
  <SubSectorTabs
    entries={[
      PEPTIDES,
      {
        subSector: "Contract research (discovery)",
        description:
          "Early-stage discovery chemistry sold as FTE capacity rather than per-molecule, adjacent to the CDMO block but with a different customer and a much shorter contract.",
        relevanceRationale:
          "Adjacent capability the company has not commercialised; tracked because entry here would change the revenue mix's shape.",
        capitalCycle: null,
        marketShareSnapshot: null,
        supplySideEvidencePack: null,
      },
    ]}
  />
);
