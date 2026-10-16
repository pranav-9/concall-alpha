// Keyword signatures for Hot Themes — shared by scripts/themes-refresh.mjs
// (--driver-drift / --un-themed) and scripts/themes-discover.mjs.
//
// HEURISTIC ONLY. A hit is a candidate to confirm against the evidence card
// and the broker corpus, never a decision. Edit as themes evolve: a theme with
// no signature is skipped by the scans (and warned about).

/** Signatures of themes that EXIST in the `theme` table (slug-keyed). */
export const DRIFT_SIGNATURES = {
  "ai-datacentre-fibre": ["data cent", "data-cent", "hyperscal", "optical fibre", "optic fiber", "fibre", "ai server", "ai system", "gpu", "compute", "genset", "gas engine", "gas turbine", "fuel cell", "switchgear", "liquid cooling", "behind-the-meter"],
  "transmission-grid-capex": ["transmission", "grid", "t&d", "transformer", "conductor", "substation", "power evacuation", "hvdc", "tariff-based", "bushing", "reactor"],
  "metals-mining-upcycle": ["ferro", "alloy", "base metal", "steel", "iron ore", "smelter", "recycl", "realisation", "realization", "tube", "pipe", "billet", "coil"],
  "specialty-chemicals-rebound": ["specialty chemical", "speciality chemical", "fluorine", "intermediate", "restock", "china +1", "china plus one", "agrochem", "pigment", "aroma"],
  "defence-order-inflows": ["defence", "defense", "mod ", "indigenis", "indigeniz", "missile", "radar", "shipbuild", "naval", "warship", "aerospace", "order finalis"],
  "cdmo-crams": ["cdmo", "crams", "crdmo", "contract research", "contract manufactur", "api", "oncology", "peptide", "molecule", "innovator", "filing"],
  "capital-markets-boom": ["folio", "aum", "wealth", "broking", "demat", "exchange", "amc", "mutual fund", "sip", "capital market", "depository"],
  "auto-components-premiumisation": ["auto", "vehicle", "content per vehicle", "premiumis", "premiumiz", "oem", "two-wheeler", "passenger vehicle", "forging"],
  "cables-wires": ["cable", "wire", "housing wire", "power cable", "wiring"],
  "travel-tourism": ["travel", "tourism", "hotel", "hospitality", "occupancy", "revpar", "adr", "booking", "mobility"],
  "jewellery-gold-retail": ["jewellery", "jewelry", "gold", "showroom", "wedding", "diamond", "studded"],
  "ev-electrification": ["electric vehicle", "electrification", "battery", "charging", "e-2w", "powertrain", "bev", "shunt"],
  "ems": ["ems", "electronic manufactur", "pcb", "box build", "odm", "order book"],
  // created 2026-10-16 by the first --discover pass (SUZLON, WAAREEENER, BONDADA, CLEANMAX, ADVAIT)
  "renewables-build-out": ["solar", "wind", "renewable", "green hydrogen", "bess", "energy storage", "pv module", "inverter", "round-the-clock", "open access"],
};

/**
 * Signatures of themes that do NOT exist yet — demand drivers the street writes
 * sector notes on. --discover scores every covered company against these too, so
 * a cluster of 3+ discovery-listed names with real heat surfaces as a
 * "create this theme" proposal. Promote a key here into DRIFT_SIGNATURES when
 * the theme is created (same slug).
 */
export const CANDIDATE_SIGNATURES = {
  "semiconductor-ecosystem": ["semiconductor", "semicon", "osat", "chip", "wafer", "fab ", "ats ", "packaging and test"],
  "drones-unmanned": ["drone", "uav", "unmanned", "counter-drone", "loitering"],
  "railways-metro-capex": ["railway", "rail ", "metro", "vande bharat", "rolling stock", "wagon", "signalling", "kavach", "mahsr", "high-speed rail"],
  "water-infra": ["water", "jal jeevan", "desalination", "irrigation", "wastewater", "sewage"],
  "aluminium-copper-vap": ["aluminium", "aluminum", "copper", "value-added", "rod", "busbar"],
  "textiles-cycle": ["textile", "garment", "apparel", "spinning", "yarn", "fabric", "uk fta", "eu fta"],
  "hospitals-healthcare-delivery": ["hospital", "bed addition", "occupancy", "arpob", "diagnostic", "oncology centre"],
  "us-generics-export": ["us generic", "anda", "usfda", "us market", "complex generic", "injectable"],
  "building-materials-housing": ["cement", "tiles", "plywood", "pipes and fittings", "housing demand", "real estate launch", "mdf"],
  "aerospace-supply-chain": ["aerospace", "aero-structure", "aerostructure", "boeing", "airbus", "engine components", "precision machin", "wire harness"],
  "power-generation-thermal": ["thermal", "btg", "boiler", "turbine", "power plant", "ppa", "captive power", "coal"],
  "quick-commerce-logistics": ["quick commerce", "last-mile", "logistics", "warehous", "3pl", "express"],
  "insurance-distribution": ["insurance", "premium growth", "apegrowth", "vnb", "combined ratio"],
};
