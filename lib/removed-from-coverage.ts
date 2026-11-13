import { normalizeSearchQuery, searchCompanies } from "@/lib/company-search-match";

/**
 * Companies that WERE covered and were hard-deleted from every table, so search
 * and `/company/<CODE>` can say "we stopped covering X" instead of a bare "no
 * matches". Search runs off the live `company` table, which no longer has them.
 *
 * Append a row on every `/coverage-cleanup` run (the backups under
 * ~/.gstack/projects/story-of-a-stock-apps/backups/<date>-coverage-cleanup/
 * hold the names). A restored company must come off this list.
 *
 * `reason` is shown to readers, so it is set only when the policy decided it:
 * large cap (AMFI top 100) or lender (bank / NBFC). Anything else stays null and
 * reads as a plain removal.
 */
export type RemovedCompanyReason = "large_cap" | "lender";

export type RemovedCompany = {
  code: string;
  name: string;
  removedOn: string; // YYYY-MM-DD
  reason: RemovedCompanyReason | null;
};

const NOV_6 = "2026-11-06";
const NOV_10 = "2026-11-10";

export const REMOVED_COMPANIES: readonly RemovedCompany[] = [
  // 2026-11-06 hygiene cleanup — large caps and banks/NBFCs.
  { code: "ADANIPORTS", name: "Adani Ports and SEZ", removedOn: NOV_6, reason: "large_cap" },
  { code: "APOLLOHOSP", name: "Apollo Hospitals Enterprise", removedOn: NOV_6, reason: "large_cap" },
  { code: "ASIANPAINT", name: "Asian Paints", removedOn: NOV_6, reason: "large_cap" },
  { code: "BEL", name: "Bharat Electronics", removedOn: NOV_6, reason: "large_cap" },
  { code: "BSE", name: "BSE", removedOn: NOV_6, reason: "large_cap" },
  { code: "CIPLA", name: "Cipla", removedOn: NOV_6, reason: "large_cap" },
  { code: "EICHERMOT", name: "Eicher Motors", removedOn: NOV_6, reason: "large_cap" },
  { code: "ETERNAL", name: "Eternal", removedOn: NOV_6, reason: "large_cap" },
  { code: "GRASIM", name: "Grasim Industries", removedOn: NOV_6, reason: "large_cap" },
  { code: "HDFCLIFE", name: "HDFC Life Insurance", removedOn: NOV_6, reason: "large_cap" },
  { code: "HINDALCO", name: "Hindalco Industries", removedOn: NOV_6, reason: "large_cap" },
  { code: "INDIGO", name: "InterGlobe Aviation (IndiGo)", removedOn: NOV_6, reason: "large_cap" },
  { code: "JIOFIN", name: "Jio Financial Services", removedOn: NOV_6, reason: "large_cap" },
  { code: "POLYCAB", name: "Polycab India", removedOn: NOV_6, reason: "large_cap" },
  { code: "POWERGRID", name: "Power Grid Corporation of India", removedOn: NOV_6, reason: "large_cap" },
  { code: "SBILIFE", name: "SBI Life Insurance", removedOn: NOV_6, reason: "large_cap" },
  { code: "SHRIRAMFIN", name: "Shriram Finance", removedOn: NOV_6, reason: "large_cap" },
  { code: "TATACONSUM", name: "Tata Consumer Products", removedOn: NOV_6, reason: "large_cap" },
  { code: "TATASTEEL", name: "Tata Steel", removedOn: NOV_6, reason: "large_cap" },
  { code: "TCS", name: "Tata Consultancy Services", removedOn: NOV_6, reason: "large_cap" },
  { code: "TECHM", name: "Tech Mahindra", removedOn: NOV_6, reason: "large_cap" },
  { code: "TMPV", name: "Tata Motors Passenger Vehicles", removedOn: NOV_6, reason: "large_cap" },
  { code: "TRENT", name: "Trent", removedOn: NOV_6, reason: "large_cap" },
  { code: "WIPRO", name: "Wipro", removedOn: NOV_6, reason: "large_cap" },
  { code: "ABCAPITAL", name: "Aditya Birla Capital", removedOn: NOV_6, reason: "lender" },
  { code: "ARMANFIN", name: "Arman Financial Services", removedOn: NOV_6, reason: "lender" },
  { code: "CSBBANK", name: "CSB Bank", removedOn: NOV_6, reason: "lender" },
  { code: "FEDFINA", name: "Fedbank Financial Services", removedOn: NOV_6, reason: "lender" },
  { code: "SGFIN", name: "SG Finserve", removedOn: NOV_6, reason: "lender" },
  // 2026-11-10 — removed by hand (/coverage-cleanup).
  { code: "ARVINDFASN", name: "Arvind Fashions", removedOn: NOV_10, reason: null },
  { code: "AVANTIFEED", name: "Avanti Feeds", removedOn: NOV_10, reason: null },
  { code: "BONDADA", name: "Bondada Engineering", removedOn: NOV_10, reason: null },
  { code: "CLEANMAX", name: "Clean Max Enviro Energy Solutions", removedOn: NOV_10, reason: null },
  { code: "ELLEN", name: "Ellenbarrie Industrial Gases", removedOn: NOV_10, reason: null },
  { code: "GAYAPROJ", name: "Gayatri Projects", removedOn: NOV_10, reason: null },
  { code: "GODAVARIB", name: "Godavari Biorefineries", removedOn: NOV_10, reason: null },
  { code: "INTERARCH", name: "Interarch Building Solutions", removedOn: NOV_10, reason: null },
  { code: "POWERMECH", name: "Power Mech Projects", removedOn: NOV_10, reason: null },
  { code: "RADICO", name: "Radico Khaitan", removedOn: NOV_10, reason: null },
  { code: "SDBL", name: "Som Distilleries & Breweries", removedOn: NOV_10, reason: null },
  { code: "SUZLON", name: "Suzlon Energy", removedOn: NOV_10, reason: null },
  { code: "WAAREEENER", name: "Waaree Energies", removedOn: NOV_10, reason: null },
];

const BY_CODE = new Map(REMOVED_COMPANIES.map((row) => [row.code, row]));

/** The removed company behind a `/company/<CODE>` URL, if any. Accepts decorated codes ("NSE:JIOFIN"). */
export function findRemovedCompany(code: string | null | undefined): RemovedCompany | null {
  const key = normalizeSearchQuery(code).toUpperCase();
  return key ? (BY_CODE.get(key) ?? null) : null;
}

/** Removed companies matching a search query, best first (same ranking as live search). */
export function searchRemovedCompanies(rawQuery: string, limit = 3): RemovedCompany[] {
  return searchCompanies(REMOVED_COMPANIES, rawQuery, limit);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "6 Nov 2026" — fixed format so server and client render the same text. */
export function formatRemovedOn(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Reader-facing reason line; null reason = plain removal. */
export function removedReasonLine(reason: RemovedCompanyReason | null): string {
  if (reason === "large_cap") return "It's a large cap, and we cover mid and small caps only.";
  if (reason === "lender") return "It's a bank or NBFC, and we don't cover lenders.";
  return "It was taken out of coverage.";
}
