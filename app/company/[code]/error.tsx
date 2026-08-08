"use client";

import { useEffect } from "react";

// Route error boundary for a company page. Before this, a throw while building
// "The Read" (or any section) had no boundary and blanked the page. Now the
// reader gets a recoverable state.

export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Company page error:", error);
  }, [error]);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 px-4 py-16 text-center sm:px-8">
      <p className="text-lg font-semibold text-foreground">
        Something went wrong loading this company.
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        The page hit an error while assembling its analysis. This is usually
        transient — try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-1 inline-flex h-9 items-center rounded-full border border-border/60 bg-background/95 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        Try again
      </button>
    </div>
  );
}
