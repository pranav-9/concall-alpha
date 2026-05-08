"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type RefreshResult = {
  ok: boolean;
  refreshed?: number;
  deletedStale?: number | null;
  error?: string;
};

export function RefreshHomepageActivityButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "success"; refreshed: number; deletedStale: number | null }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setStatus({ kind: "idle" });
          try {
            const res = await fetch("/api/admin/refresh-homepage-activity", {
              method: "POST",
            });
            const body = (await res.json().catch(() => ({}))) as RefreshResult;
            if (!res.ok || !body.ok) {
              setStatus({
                kind: "error",
                message: body.error ?? `Request failed (${res.status})`,
              });
              return;
            }
            setStatus({
              kind: "success",
              refreshed: body.refreshed ?? 0,
              deletedStale: body.deletedStale ?? null,
            });
            router.refresh();
          } catch (err) {
            setStatus({
              kind: "error",
              message: err instanceof Error ? err.message : "Request failed.",
            });
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Refreshing..." : "Refresh Latest Updates"}
      </Button>
      {status.kind === "success" ? (
        <span className="text-xs text-muted-foreground">
          Refreshed {status.refreshed}
          {status.deletedStale != null ? `, removed ${status.deletedStale} stale` : ""}.
        </span>
      ) : null}
      {status.kind === "error" ? (
        <span className="text-xs text-red-600 dark:text-red-400">{status.message}</span>
      ) : null}
    </div>
  );
}
