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
    <Button type="button" onClick={handleCreate} disabled={isSubmitting}>
      {isSubmitting ? "Creating..." : label}
    </Button>
  );
}
