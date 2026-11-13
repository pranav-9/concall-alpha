"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { analytics } from "@/lib/analytics";
import {
  dedupeCompanies,
  displayCompanyName,
  listingExchange,
  matchRange,
  normalizeSearchQuery,
  searchCompanies,
  stripExchangeDecoration,
  type CompanySearchItem,
} from "@/lib/company-search-match";
import {
  clearRecentCompanies,
  readRecentCompanies,
  refreshRecentCompanies,
  rememberRecentCompany,
} from "@/lib/recent-companies";
import {
  formatRemovedOn,
  removedReasonLine,
  searchRemovedCompanies,
} from "@/lib/removed-from-coverage";
import { CompanyMark } from "@/components/company-logo";
import { CoverageRequestButton } from "@/components/coverage-request-button";
import { cn } from "@/lib/utils";

type Result = CompanySearchItem;

type SearchResponse = {
  ok: boolean;
  results: Result[];
  error?: string;
};

const SEARCH_DEBOUNCE_MS = 180;
const MAX_CACHE_ENTRIES = 50;

const EYEBROW = "house-data text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]";

function toResults(items: Result[]): Result[] {
  return dedupeCompanies(items).map((item) => ({ ...item, code: item.code.trim() }));
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const cacheRef = useRef<Map<string, Result[]>>(new Map());

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read from localStorage on focus only (never during render), so the server
  // paint and the first client paint always agree.
  const [recent, setRecent] = useState<Result[]>([]);

  const listId = `${instanceId ?? "company-search"}-results`;
  const trimmedQuery = query.trim();
  const localCompanies = useMemo(() => toResults(initialCompanies ?? []), [initialCompanies]);
  const hasLocalCompanies = localCompanies.length > 0;
  const recentRows = useMemo(
    () => refreshRecentCompanies(recent, localCompanies),
    [recent, localCompanies],
  );

  // Empty box = the Recent list; a query = its matches.
  const showingRecent = !trimmedQuery;
  const rows = showingRecent ? recentRows : results;
  const panelVisible = open && (!showingRecent || recentRows.length > 0);

  // Close on navigation — but not on mount: the phone menu mounts this with
  // autoFocus, whose onFocus has already opened the Recent list by the time
  // effects run, and a mount-time close would hide it again.
  const lastPathnameRef = useRef(pathname);
  useEffect(() => {
    if (lastPathnameRef.current === pathname) return;
    lastPathnameRef.current = pathname;
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
      // Leave `open` alone: clearing the box while it has focus falls back to
      // the Recent list; a pick closes the panel itself.
      setResults([]);
      setLoading(false);
      setError(null);
      setActiveIndex(-1);
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

  const openPanel = () => {
    setRecent(readRecentCompanies());
    setOpen(true);
  };

  const openCompany = (company: Result) => {
    setRecent(rememberRecentCompany(company));
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    onNavigate?.();
    router.push(`/company/${company.code}`);
  };

  const pickRow = (row: Result | undefined, index: number) => {
    if (!row?.code) return;
    if (showingRecent) {
      analytics.searchRecentClick(row.code, index);
    } else {
      logSearch(trimmedQuery, results.length);
      analytics.searchResultClick(trimmedQuery, row.code, index);
    }
    openCompany(row);
  };

  const clearRecent = () => {
    clearRecentCompanies();
    setRecent([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const activeDescendant = useMemo(() => {
    if (!panelVisible || activeIndex < 0 || activeIndex >= rows.length) return undefined;
    return `${listId}-item-${activeIndex}`;
  }, [activeIndex, listId, panelVisible, rows.length]);

  const listShown = panelVisible && !loading && !error && rows.length > 0;

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={openPanel}
          onClick={() => {
            // Still focused after a pick or Escape: a click reopens the panel.
            if (!open) openPanel();
          }}
          onKeyDown={(e) => {
            if (!panelVisible) return;

            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((prev) => {
                if (!rows.length) return -1;
                if (prev < 0) return 0;
                return Math.min(prev + 1, rows.length - 1);
              });
            }

            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((prev) => {
                if (!rows.length) return -1;
                if (prev <= 0) return 0;
                return prev - 1;
              });
            }

            if (e.key === "Enter") {
              e.preventDefault();
              // A query opens its top match on Enter; the Recent list only
              // opens a row the reader moved to.
              const index = activeIndex >= 0 ? activeIndex : showingRecent ? -1 : 0;
              if (index >= 0) pickRow(rows[index], index);
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
          aria-expanded={panelVisible}
          aria-activedescendant={activeDescendant}
        />
      </div>

      {panelVisible && (
        // house-tokens: the panel carries its own paper/ink/rule palette, so it
        // reads the same under the house navbar, the phone menu and plain pages.
        <div
          id={listId}
          role={listShown ? "listbox" : undefined}
          aria-label={listShown ? (showingRecent ? "Recent companies" : "Matching companies") : undefined}
          className="house-tokens absolute left-0 top-[calc(100%+8px)] z-50 w-full sm:min-w-[24rem] overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] text-[var(--ink)] shadow-[0_28px_60px_-28px_rgba(10,16,15,0.5)]"
        >
          {loading ? (
            <p className="px-3.5 py-3 text-xs text-[var(--ink-soft)]">Searching…</p>
          ) : error ? (
            <p className="px-3.5 py-3 text-xs text-[var(--ink-soft)]">{error}</p>
          ) : !showingRecent && results.length === 0 ? (
            <NotCoveredPanel query={trimmedQuery} onNavigate={onNavigate} />
          ) : (
            <>
              {showingRecent && (
                <div className="flex items-center justify-between px-3.5 pb-1.5 pt-3" role="presentation">
                  <span className={EYEBROW}>Recent</span>
                  <button
                    type="button"
                    onClick={clearRecent}
                    className={cn(EYEBROW, "rounded px-1 py-0.5 transition-colors hover:text-[var(--ink)]")}
                  >
                    Clear
                  </button>
                </div>
              )}
              <ul className="max-h-[min(26rem,60vh)] overflow-y-auto" role="presentation">
                {rows.map((item, idx) => (
                  <li
                    key={item.code}
                    role="presentation"
                    className="border-t border-[var(--rule)] first:border-t-0"
                  >
                    <CompanyRow
                      id={`${listId}-item-${idx}`}
                      item={item}
                      query={showingRecent ? "" : trimmedQuery}
                      active={idx === activeIndex}
                      onHover={() => setActiveIndex(idx)}
                      onPick={() => pickRow(item, idx)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Logo tile · name (match in bold) · code, exchange tag and sector underneath. */
function CompanyRow({
  id,
  item,
  query,
  active,
  onHover,
  onPick,
}: {
  id: string;
  item: Result;
  query: string;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  const name = displayCompanyName(item.name, item.code);
  const exchange = listingExchange(item.exchange);

  return (
    <button
      id={id}
      role="option"
      aria-selected={active}
      type="button"
      onMouseEnter={onHover}
      onClick={onPick}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors",
        // A lift toward ink reads in both modes (paper is the darker ground in dark mode).
        active
          ? "bg-[color-mix(in_srgb,var(--ink)_7%,var(--paper-2))]"
          : "hover:bg-[color-mix(in_srgb,var(--ink)_4%,var(--paper-2))]",
      )}
    >
      <CompanyMark
        code={item.code}
        name={name}
        className="h-9 w-9 rounded-lg"
        initialsClassName="house-data bg-[var(--paper)] text-[11px] tracking-[0.04em] text-[var(--ink-soft)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] leading-snug text-[var(--ink)]">
          <Matched text={name} query={query} />
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-tight text-[var(--ink-soft)]">
          <span className="house-data shrink-0 tracking-[0.04em]">
            <Matched text={item.code} query={query} plainWeight="font-normal" />
          </span>
          {exchange && (
            <span className="house-data shrink-0 rounded-[3px] border border-[var(--rule)] px-1 py-px text-[9px] uppercase tracking-[0.08em]">
              {exchange}
            </span>
          )}
          {item.sector && <span className="min-w-0 truncate">· {item.sector}</span>}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "house-data hidden shrink-0 text-[11px] text-[var(--ink-soft)] sm:inline",
          !active && "invisible",
        )}
      >
        ↵
      </span>
    </button>
  );
}

/**
 * The query's span in bold over regular text. With no query (the Recent list)
 * the whole text prints at `plainWeight`; with a query every row is regular, so
 * a code-only match doesn't read heavier than a name match.
 */
function Matched({
  text,
  query,
  plainWeight = "font-medium",
}: {
  text: string;
  query: string;
  plainWeight?: string;
}) {
  const range = query ? matchRange(text, query) : null;
  if (!range) return <span className={query ? "font-normal" : plainWeight}>{text}</span>;
  const [start, end] = range;
  return (
    <span className="font-normal">
      {text.slice(0, start)}
      <span className="font-semibold text-[var(--ink)]">{text.slice(start, end)}</span>
      {text.slice(end)}
    </span>
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
    <div className="space-y-2.5 px-3.5 py-3.5">
      {removed.length > 0 ? (
        <ul className="space-y-2.5">
          {removed.map((row) => (
            <li key={row.code} className="flex items-start gap-3">
              <CompanyMark
                code={row.code}
                name={row.name}
                className="h-9 w-9 rounded-lg opacity-60 grayscale"
                initialsClassName="house-data bg-[var(--paper)] text-[11px] text-[var(--ink-soft)]"
              />
              <div className="min-w-0 text-xs">
                <p className="text-[13px] text-[var(--ink)]">
                  <span className="font-medium">{row.name}</span>{" "}
                  <span className="house-data text-[11px] text-[var(--ink-soft)]">{row.code}</span>
                </p>
                <p className="mt-0.5 leading-relaxed text-[var(--ink-soft)]">
                  No longer covered since {formatRemovedOn(row.removedOn)}.{" "}
                  {removedReasonLine(row.reason)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-[var(--ink)]">
          We don&apos;t cover &ldquo;{query}&rdquo; yet.
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-[var(--ink-soft)]">
        We cover about 100 handpicked mid and small caps: no large caps, banks or NBFCs.{" "}
        <Link
          href="/coverage"
          onClick={onNavigate}
          className="font-medium text-[var(--ink)] underline underline-offset-2"
        >
          How we choose
        </Link>
      </p>
      {removed.length === 0 && <CoverageRequestButton subject={query} surface="search" tone="house" />}
    </div>
  );
}
