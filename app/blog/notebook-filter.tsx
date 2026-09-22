"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { BlogCategory } from "./categories";

export type NotebookFilter = BlogCategory | "all";

type Ctx = { filter: NotebookFilter; setFilter: (f: NotebookFilter) => void };

const NotebookFilterContext = createContext<Ctx | null>(null);

/**
 * The Notebook's filter, held ABOVE both Journal paints. viewport-gate's
 * contract: state a reader can change belongs in the shared parent, never in a
 * paint — a later crossing of `sm` (tablet rotation, resize) re-mounts the
 * other paint from scratch, and a filter held inside one would reset to All.
 */
export function NotebookFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<NotebookFilter>("all");
  return (
    <NotebookFilterContext.Provider value={{ filter, setFilter }}>
      {children}
    </NotebookFilterContext.Provider>
  );
}

export function useNotebookFilter(): Ctx {
  const ctx = useContext(NotebookFilterContext);
  if (!ctx) throw new Error("useNotebookFilter needs a NotebookFilterProvider above it");
  return ctx;
}
