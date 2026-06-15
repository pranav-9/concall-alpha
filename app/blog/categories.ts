// Topical axis for the Journal. No node deps so both the server page and the
// client list/filter can import it. Keys live in post frontmatter; labels are
// centralized so wording stays consistent and the filter bar stays in sync.
export type BlogCategory = "product" | "investing" | "companies";

// Order the filter pills appear in: product → thinking → companies.
export const CATEGORY_ORDER: BlogCategory[] = [
  "product",
  "investing",
  "companies",
];

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  product: "Product",
  investing: "How I invest",
  companies: "Company write-ups",
};

export function asCategory(value: unknown): BlogCategory | undefined {
  return typeof value === "string" && value in CATEGORY_LABELS
    ? (value as BlogCategory)
    : undefined;
}
