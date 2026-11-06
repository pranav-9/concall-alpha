"use client";

// The header's "Upcoming calls" button and the modal it opens: the season
// chart and the week's call calendar, both server-rendered and passed in as
// children. A native <dialog> (showModal) gives the focus trap, Esc to close
// and the top layer for free; a click on the backdrop closes it too.

import { CalendarDays, X } from "lucide-react";
import { useRef, type ReactNode } from "react";

export function UpcomingCallsDialog({
  thisWeek,
  summary,
  children,
}: {
  /** Calls dated in the upcoming week — the button's count. */
  thisWeek: number;
  /** "Q2 FY27 · 3 dated this week · 12 date TBA" */
  summary: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Where the press started: a drag that began inside (selecting text) and was
  // released over the backdrop still clicks the <dialog>, and must not close it.
  const downOnBackdrop = useRef(false);
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
        className="house-data inline-flex h-11 sm:h-9 shrink-0 items-center gap-2.5 rounded-[6px] border border-[var(--ink)] bg-[var(--paper-2)] px-3 text-[10px] uppercase tracking-[0.14em] text-[var(--ink)] transition-colors hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]"
      >
        <CalendarDays aria-hidden className="h-3.5 w-3.5" />
        Upcoming calls
        <span aria-hidden className="h-3.5 w-px bg-[var(--rule)]" />
        <span className="tabular-nums text-[var(--ink-soft)]">{thisWeek} this week</span>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="upcoming-dialog-title"
        onPointerDown={(event) => {
          downOnBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && downOnBackdrop.current) close();
        }}
        // The UA caps a modal at calc(100% - 2em - 6px); set the cap here so
        // the inner column (2px under it, for the border) never gets clipped.
        className="max-h-[calc(100dvh-1.5rem)] w-[min(960px,calc(100vw-1.5rem))] max-w-none overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] p-0 text-[var(--ink)] shadow-[0_24px_60px_-20px_rgba(10,16,15,0.45)] backdrop:bg-[rgba(18,26,24,0.32)] backdrop:backdrop-blur-[3px]"
      >
        <div className="flex max-h-[calc(100dvh-1.5rem-2px)] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--rule)] px-4 py-3 sm:px-5">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2
                id="upcoming-dialog-title"
                className="house-data flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ink)]"
              >
                <CalendarDays aria-hidden className="h-3.5 w-3.5 self-center" />
                Upcoming calls
              </h2>
              <span className="house-data text-[10.5px] text-[var(--ink-soft)]">{summary}</span>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="inline-flex h-11 w-11 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--rule)] text-[var(--ink)] transition-colors hover:border-[var(--ink-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto p-3 sm:p-4">{children}</div>
        </div>
      </dialog>
    </>
  );
}
