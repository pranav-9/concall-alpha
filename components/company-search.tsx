"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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

export function CompanySearch({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, [pathname]);

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
    if (!trimmedQuery) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const timeout = setTimeout(async () => {
      try {
        fetchControllerRef.current?.abort();
        const controller = new AbortController();
        fetchControllerRef.current = controller;

        const res = await fetch(`/api/company-search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        const payload = (await res.json()) as SearchResponse;

        if (!res.ok || !payload.ok) {
          setResults([]);
          setError(payload.error ?? "Unable to load results");
          setOpen(true);
          setActiveIndex(-1);
          return;
        }

        setResults(payload.results ?? []);
        setOpen(true);
        setActiveIndex(payload.results?.length ? 0 : -1);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setResults([]);
        setError("Unable to load results");
        setOpen(true);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 230);

    return () => clearTimeout(timeout);
  }, [trimmedQuery]);

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
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
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
          className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-md border border-border bg-card shadow-lg"
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
                  <li key={item.code} role="presentation">
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
