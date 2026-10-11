// Topical axis for the Journal. No node deps so both the server page and the
// client list/filter can import it. Keys live in post frontmatter; labels are
// centralized so wording stays consistent and the filter bar stays in sync.
export type BlogCategory = "product" | "investing" | "sectors" | "companies";

// Order the filter pills appear in: product → thinking → sector maps → companies.
export const CATEGORY_ORDER: BlogCategory[] = [
  "product",
  "investing",
  "sectors",
  "companies",
];

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  product: "Product",
  investing: "How I invest",
  // A sector map holds a whole cohort against each other (the EMS chain,
  // 2026-10-11): too many names for a `comparison` block, no single
  // `companyCode`, so it files beside the essays, not the company stories.
  sectors: "Sector maps",
  companies: "Company write-ups",
};

// The Journal is split into two lanes. Company write-ups get their own elevated
// "Company Stories" section, so the Notebook feed's filter covers only these
// topical categories.
export const NOTEBOOK_CATEGORIES: BlogCategory[] = ["product", "investing", "sectors"];

export function asCategory(value: unknown): BlogCategory | undefined {
  return typeof value === "string" && value in CATEGORY_LABELS
    ? (value as BlogCategory)
    : undefined;
}
