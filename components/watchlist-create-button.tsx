"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function WatchlistCreateButton({
  label = "Create watchlist",
}: {
  label?: string;
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

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        window.alert(payload?.error ?? "Unable to create watchlist.");
        return;
      }

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="inline-flex items-center rounded-full border-sky-200/50 bg-background/80 px-4 py-2 text-sm font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] hover:bg-sky-50 dark:border-sky-700/30 dark:bg-background/70 dark:hover:bg-sky-950/20"
      onClick={handleCreate}
      disabled={isSubmitting}
    >
      {isSubmitting ? "Creating..." : label}
    </Button>
  );
}
