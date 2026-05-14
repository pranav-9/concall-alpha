"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";

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

function dedupeResults(items: Result[]) {
  const seen = new Set<string>();
  const out: Result[] = [];

  items.forEach((item) => {
    const code = item.code?.trim();
    if (!code) return;
    const key = code.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ code, name: item.name });
  });

  return out;
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function scoreResult(row: Result, query: string) {
  const q = query.toLowerCase();
  const code = normalize(row.code);
  const name = normalize(row.name);

  if (code === q) return 0;
  if (code.startsWith(q)) return 1;
  if (name.startsWith(q)) return 2;
  if (code.includes(q)) return 3;
  if (name.includes(q)) return 4;
  return Number.POSITIVE_INFINITY;
}

function searchLocalCompanies(items: Result[], query: string) {
  return items
    .map((row) => ({ row, rank: scoreResult(row, query) }))
    .filter((item) => Number.isFinite(item.rank))
    .sort((a, b) => {
      const rank = a.rank - b.rank;
      if (rank !== 0) return rank;

      const aName = normalize(a.row.name || a.row.code);
      const bName = normalize(b.row.name || b.row.code);
      return aName.localeCompare(bName);
    })
    .map((item) => item.row)
    .slice(0, 8);
}

export function CompanySearch({
  className,
  onNavigate,
  instanceId,
  initialCompanies,
}: {
  className?: string;
  onNavigate?: () => void;
  instanceId?: string;
  initialCompanies?: Result[];
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
  const localCompanies = useMemo(
    () => dedupeResults(initialCompanies ?? []),
    [initialCompanies],
  );
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

    const cacheKey = trimmedQuery.toLowerCase();

    if (hasLocalCompanies) {
      const nextResults = searchLocalCompanies(localCompanies, trimmedQuery);
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

        const nextResults = dedupeResults(payload.results ?? []);
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
              const item = activeIndex >= 0 ? results[activeIndex] : results[0];
              openResult(item);
            }

            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
          placeholder="Search company name or code"
          className="h-10 w-full rounded-2xl border border-border/60 bg-background/82 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/20"
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
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_24px_50px_-35px_rgba(15,23,42,0.45)]"
        >
          {loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
          ) : error ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{error}</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
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
                      onClick={() => openResult(item)}
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
