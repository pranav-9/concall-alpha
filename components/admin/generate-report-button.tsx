"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { RangeKey } from "@/lib/admin-analytics-report";

function parseFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return "admin-report.md";
  const match = contentDisposition.match(/filename="([^"]+)"/);
  return match?.[1] ?? "admin-report.md";
}

export function GenerateReportButton({ range }: { range: RangeKey }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await fetch(
              `/api/admin/generate-report?range=${encodeURIComponent(range)}`,
            );
            if (!res.ok) {
              const body = (await res
                .json()
                .catch(() => ({}))) as { error?: string };
              setError(body.error ?? `Request failed (${res.status})`);
              return;
            }
            const filename = parseFilename(res.headers.get("content-disposition"));
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Request failed.");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Generating..." : "Generate Report"}
      </Button>
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </div>
  );
}
