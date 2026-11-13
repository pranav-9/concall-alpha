"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { analytics } from "@/lib/analytics";
import {
  dedupeCompanies,
  normalizeSearchQuery,
  searchCompanies,
  stripExchangeDecoration,
} from "@/lib/company-search-match";
import {
  formatRemovedOn,
  removedReasonLine,
  searchRemovedCompanies,
} from "@/lib/removed-from-coverage";
import { CoverageRequestButton } from "@/components/coverage-request-button";
import { cn } from "@/lib/utils";

type Result = {
  code: string;
  name: string | null;
};

type SearchResponse = {
  ok: boolean;
  results: Result[];
  error?: string;
};

const SEARCH_DEBOUNCE_MS = 180;
const MAX_CACHE_ENTRIES = 50;

function toResults(items: Result[]): Result[] {
  return dedupeCompanies(items).map((item) => ({ code: item.code.trim(), name: item.name }));
}

export function CompanySearch({
  className,
  onNavigate,
  instanceId,
  initialCompanies,
  autoFocus = false,
  inputClassName,
}: {
  className?: string;
  /** Merged over the input's default look — the house-skin desktop bar passes paper/ink tokens. */
  inputClassName?: string;
  onNavigate?: () => void;
  instanceId?: string;
  initialCompanies?: Result[];
  /** Focus the input on mount — the desk phone top bar's search button opens the menu straight into it. */
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const cacheRef = useRef<Map<string, Result[]>>(new Map());

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listId = `${instanceId ?? "company-search"}-results`;
  const trimmedQuery = query.trim();
  const localCompanies = useMemo(() => toResults(initialCompanies ?? []), [initialCompanies]);
  const hasLocalCompanies = localCompanies.length > 0;

  useEffect(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, [pathname]);

  useEffect(() => {
    return () => fetchControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;
    fetchControllerRef.current?.abort();
    fetchControllerRef.current = null;

    if (!trimmedQuery) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = normalizeSearchQuery(trimmedQuery);

    if (hasLocalCompanies) {
      const nextResults = searchCompanies(localCompanies, trimmedQuery);
      setResults(nextResults);
      setOpen(true);
      setLoading(false);
      setError(null);
      setActiveIndex(nextResults.length ? 0 : -1);
      return;
    }

    const cachedResults = cacheRef.current.get(cacheKey);
    if (cachedResults) {
      setResults(cachedResults);
      setOpen(true);
      setLoading(false);
      setError(null);
      setActiveIndex(cachedResults.length ? 0 : -1);
      return;
    }

    setLoading(true);
    setOpen(true);
    setError(null);
    const timeout = setTimeout(async () => {
      try {
        const controller = new AbortController();
        fetchControllerRef.current = controller;

        const res = await fetch(`/api/company-search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        const payload = (await res.json()) as SearchResponse;
        if (requestSeqRef.current !== requestId) return;

        if (!res.ok || !payload.ok) {
          setResults([]);
          setError(payload.error ?? "Unable to load results");
          setOpen(true);
          setActiveIndex(-1);
          return;
        }

        const nextResults = toResults(payload.results ?? []);
        cacheRef.current.set(cacheKey, nextResults);
        if (cacheRef.current.size > MAX_CACHE_ENTRIES) {
          const oldestKey = cacheRef.current.keys().next().value;
          if (oldestKey) cacheRef.current.delete(oldestKey);
        }

        setResults(nextResults);
        setOpen(true);
        setActiveIndex(nextResults.length ? 0 : -1);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        if (requestSeqRef.current !== requestId) return;
        setResults([]);
        setError("Unable to load results");
        setOpen(true);
        setActiveIndex(-1);
      } finally {
        if (requestSeqRef.current === requestId) {
          setLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      fetchControllerRef.current?.abort();
    };
  }, [hasLocalCompanies, localCompanies, trimmedQuery]);

  // One search_performed per *settled* query — fires ~700ms after the user stops
  // typing (and after any in-flight fetch resolves), rather than once per
  // keystroke, so counts and the zero_results coverage-demand signal aren't
  // inflated by intermediate prefixes. Resets on every query/result change.
  // A pick inside the 700ms used to cancel the timer and drop the search (about
  // two in five result clicks had no search_performed), which under-counted
  // successful searches and inflated the zero-result share — so `logSearch`
  // also runs on a pick, at most once per query.
  const loggedQueryRef = useRef<string | null>(null);
  const logSearch = (q: string, count: number) => {
    if (loggedQueryRef.current === q) return;
    loggedQueryRef.current = q;
    analytics.searchPerformed(q, count);
  };

  useEffect(() => {
    if (!trimmedQuery) {
      loggedQueryRef.current = null;
      return;
    }
    if (loading) return;
    const t = setTimeout(() => {
      // Plain call, not logSearch: a query re-settled after an edit
      // (neu → neul → neu) is counted again, as before.
      loggedQueryRef.current = trimmedQuery;
      analytics.searchPerformed(trimmedQuery, results.length);
    }, 700);
    return () => clearTimeout(t);
  }, [trimmedQuery, results, loading]);

  const pickResult = (result: Result | undefined, index: number) => {
    if (!result?.code) return;
    logSearch(trimmedQuery, results.length);
    analytics.searchResultClick(trimmedQuery, result.code, index);
    openResult(result);
  };

  const openResult = (result: Result | undefined) => {
    if (!result?.code) return;
    setOpen(false);
    setQuery("");
    onNavigate?.();
    router.push(`/company/${result.code}`);
  };

  const activeDescendant = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= results.length) return undefined;
    return `${listId}-item-${activeIndex}`;
  }, [activeIndex, listId, results.length]);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (trimmedQuery) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open) return;

            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((prev) => {
                if (!results.length) return -1;
                if (prev < 0) return 0;
                return Math.min(prev + 1, results.length - 1);
              });
            }

            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((prev) => {
                if (!results.length) return -1;
                if (prev <= 0) return 0;
                return prev - 1;
              });
            }

            if (e.key === "Enter") {
              e.preventDefault();
              const index = activeIndex >= 0 ? activeIndex : 0;
              pickResult(results[index], index);
            }

            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
          placeholder="Search company name or code"
          className={cn(
            "h-10 w-full rounded-2xl border border-border/60 bg-background/[0.82] pl-9 pr-3 text-base md:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/20",
            inputClassName,
          )}
          role="combobox"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-activedescendant={activeDescendant}
        />
      </div>

      {open && (
        <div
          id={listId}
          role={!loading && !error && results.length > 0 ? "listbox" : undefined}
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 min-w-[18rem] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_24px_50px_-35px_rgba(15,23,42,0.45)]"
        >
          {loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
          ) : error ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{error}</p>
          ) : results.length === 0 ? (
            <NotCoveredPanel query={trimmedQuery} onNavigate={onNavigate} />
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((item, idx) => {
                const active = idx === activeIndex;
                return (
                  <li key={`${item.code}-${idx}`} role="presentation">
                    <button
                      id={`${listId}-item-${idx}`}
                      role="option"
                      aria-selected={active}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => pickResult(item, idx)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left ${
                        active ? "bg-accent" : "hover:bg-accent/70"
                      }`}
                    >
                      <span className="truncate text-xs font-medium text-foreground">
                        {item.name ?? item.code}
                      </span>
                      <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {item.code}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Zero results. Most are companies we don't cover (ITC, HDFC Bank, a reader's
 * own small cap), so say why and take the request in one tap. A company we
 * dropped is named with the date and the reason instead.
 */
function NotCoveredPanel({ query: rawQuery, onNavigate }: { query: string; onNavigate?: () => void }) {
  const query = stripExchangeDecoration(rawQuery) || rawQuery;
  const removed = searchRemovedCompanies(query);

  return (
    <div className="space-y-2.5 px-3 py-3">
      {removed.length > 0 ? (
        <ul className="space-y-2">
          {removed.map((row) => (
            <li key={row.code} className="text-xs">
              <p className="text-foreground">
                <span className="font-medium">{row.name}</span>{" "}
                <span className="text-muted-foreground">({row.code})</span>
              </p>
              <p className="mt-0.5 text-muted-foreground">
                No longer covered since {formatRemovedOn(row.removedOn)}.{" "}
                {removedReasonLine(row.reason)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-foreground">
          We don&apos;t cover &ldquo;{query}&rdquo; yet.
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        We cover about 100 handpicked mid and small caps: no large caps, banks or NBFCs.{" "}
        <Link
          href="/coverage"
          onClick={onNavigate}
          className="font-medium text-foreground underline underline-offset-2"
        >
          How we choose
        </Link>
      </p>
      {removed.length === 0 && <CoverageRequestButton subject={query} surface="search" />}
    </div>
  );
}
