"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const DEFAULT_CLASS =
  "inline-flex items-center rounded-full border-sky-200/50 bg-background/80 px-4 py-2 text-sm font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] hover:bg-sky-50 dark:border-sky-700/30 dark:bg-background/70 dark:hover:bg-sky-950/20";

export function WatchlistCreateButton({
  label = "Create watchlist",
  variant = "outline",
  className = DEFAULT_CLASS,
}: {
  label?: string;
  variant?: "outline" | "ghost" | "link";
  className?: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    const name = window.prompt("Name your watchlist", "My Watchlist");
    const trimmedName = name?.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; watchlistId?: number; error?: string }
        | null;

      if (!response.ok) {
        window.alert(payload?.error ?? "Unable to create watchlist.");
        return;
      }

      if (payload?.watchlistId) {
        router.push(`/watchlists/${payload.watchlistId}`);
      } else {
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={handleCreate}
      disabled={isSubmitting}
    >
      {isSubmitting ? "Creating..." : label}
    </Button>
  );
}
