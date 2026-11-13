import type { CompanySearchItem } from "@/lib/company-search-match";

/**
 * Companies a reader opened from search, newest first, shown when they click
 * into an empty search box. Per-browser convenience only (localStorage): it
 * never leaves the device, and every read/write tolerates storage being
 * blocked, full, or holding junk — the box then simply shows no recents.
 */

export const RECENT_COMPANIES_KEY = "soas.search.recent.v1";
export const RECENT_COMPANIES_MAX = 6;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function clean(value: unknown): CompanySearchItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const code = typeof row.code === "string" ? row.code.trim().toUpperCase() : "";
  if (!code || code.length > 32) return null;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return { code, name: text(row.name), exchange: text(row.exchange), sector: text(row.sector) };
}

export function readRecentCompanies(store: Store | null = browserStore()): CompanySearchItem[] {
  if (!store) return [];
  try {
    const parsed: unknown = JSON.parse(store.getItem(RECENT_COMPANIES_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: CompanySearchItem[] = [];
    for (const item of parsed) {
      const row = clean(item);
      if (!row || seen.has(row.code)) continue;
      seen.add(row.code);
      out.push(row);
      if (out.length >= RECENT_COMPANIES_MAX) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Moves `company` to the front; returns the new list (what was saved, or the in-memory list if storage failed). */
export function rememberRecentCompany(
  company: CompanySearchItem,
  store: Store | null = browserStore(),
): CompanySearchItem[] {
  const row = clean(company);
  if (!row) return readRecentCompanies(store);
  const next = [row, ...readRecentCompanies(store).filter((r) => r.code !== row.code)].slice(
    0,
    RECENT_COMPANIES_MAX,
  );
  try {
    store?.setItem(RECENT_COMPANIES_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode — the list still works for this page view
  }
  return next;
}

export function clearRecentCompanies(store: Store | null = browserStore()): void {
  try {
    store?.removeItem(RECENT_COMPANIES_KEY);
  } catch {
    // nothing to do
  }
}

/**
 * Recents refreshed against the live list: current name / exchange / sector by
 * code, and a company no longer in the list (removed from coverage) dropped.
 * With no live list (the layout's read failed) the stored rows stand.
 */
export function refreshRecentCompanies(
  recent: readonly CompanySearchItem[],
  live: readonly CompanySearchItem[],
): CompanySearchItem[] {
  if (live.length === 0) return [...recent];
  const byCode = new Map(live.map((row) => [row.code.trim().toUpperCase(), row]));
  return recent.flatMap((row) => {
    const current = byCode.get(row.code);
    return current ? [current] : [];
  });
}
