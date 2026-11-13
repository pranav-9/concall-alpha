"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { analytics, type CoverageRequestSurface } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// Requests already sent this page session, so reopening the search dropdown on
// the same query shows "Requested" instead of inviting a duplicate.
const requestedThisSession = new Set<string>();

type Status = "idle" | "sending" | "done" | "error";

/**
 * One tap files a stock-addition request (same `/api/user-requests` row the
 * /requests form writes, no sign-in needed). Used where a reader hits a company
 * we don't cover: a zero-result search and the not-covered company page.
 * Renders nothing for a subject the API would reject (under 2 or over 120 chars).
 */
export function CoverageRequestButton({
  subject,
  surface,
  className,
}: {
  subject: string;
  surface: CoverageRequestSurface;
  className?: string;
}) {
  const pathname = usePathname();
  const trimmed = subject.trim();
  const key = trimmed.toLowerCase();
  const [status, setStatus] = useState<Status>(() =>
    requestedThisSession.has(key) ? "done" : "idle",
  );

  if (trimmed.length < 2 || trimmed.length > 120) return null;

  const isDone = status === "done" || requestedThisSession.has(key);

  const submit = async () => {
    if (isDone || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/user-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "stock_addition",
          subjectTarget: trimmed,
          message: "",
          sourcePath: `${pathname ?? ""}#${surface}`,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !payload?.ok) {
        setStatus("error");
        return;
      }
      requestedThisSession.add(key);
      analytics.requestIntakeSubmit(trimmed, 0, surface);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (isDone) {
    return (
      <p
        role="status"
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400",
          className,
        )}
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        Requested. Thanks.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={submit}
        disabled={status === "sending"}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {status === "sending" ? "Sending…" : <>Ask us to cover &ldquo;{trimmed}&rdquo;</>}
      </button>
      {status === "error" && (
        <span role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">
          Couldn&apos;t send. Try again.
        </span>
      )}
    </div>
  );
}
