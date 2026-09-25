"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { BlogCategory } from "./categories";

export type NotebookFilter = BlogCategory | "all";

type Ctx = {
  filter: NotebookFilter;
  setFilter: (f: NotebookFilter) => void;
  /**
   * Company Stories archive fold, shared by the phone rows (PHONE_STORY_ROWS)
   * and the desktop "More stories" (MORE_STORIES_ROWS).
   */
  storiesExpanded: boolean;
  setStoriesExpanded: (v: boolean) => void;
};

const JournalViewContext = createContext<Ctx | null>(null);

/**
 * Reader-changeable view state for the Journal index, held ABOVE both paints.
 * viewport-gate's contract: state a reader can change (filters, show-all
 * toggles) belongs in the shared parent, never in a paint — a later crossing
 * of `sm` (tablet rotation, resize) re-mounts the other paint from scratch,
 * and state held inside one would silently reset.
 */
export function JournalViewProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<NotebookFilter>("all");
  const [storiesExpanded, setStoriesExpanded] = useState(false);
  return (
    <JournalViewContext.Provider
      value={{ filter, setFilter, storiesExpanded, setStoriesExpanded }}
    >
      {children}
    </JournalViewContext.Provider>
  );
}

function useJournalView(): Ctx {
  const ctx = useContext(JournalViewContext);
  if (!ctx) throw new Error("Journal view hooks need a JournalViewProvider above them");
  return ctx;
}

export function useNotebookFilter(): Pick<Ctx, "filter" | "setFilter"> {
  const { filter, setFilter } = useJournalView();
  return { filter, setFilter };
}

export function useStoriesExpanded(): Pick<Ctx, "storiesExpanded" | "setStoriesExpanded"> {
  const { storiesExpanded, setStoriesExpanded } = useJournalView();
  return { storiesExpanded, setStoriesExpanded };
}
