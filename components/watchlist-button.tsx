"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function WatchlistButton({
  companyCode,
  loginRedirectPath,
  initialIsAuthenticated,
  initialHasWatchlist,
  initialIsInWatchlist,
  initialWatchlistName,
}: {
  companyCode: string;
  loginRedirectPath: string;
  initialIsAuthenticated: boolean;
  initialHasWatchlist: boolean;
  initialIsInWatchlist: boolean;
  initialWatchlistName?: string | null;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);
  const [hasWatchlist, setHasWatchlist] = useState(initialHasWatchlist);
  const [isInWatchlist, setIsInWatchlist] = useState(initialIsInWatchlist);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthenticated(false);
        router.push(`/auth/login?next=${encodeURIComponent(loginRedirectPath)}`);
        return;
      }

      setIsAuthenticated(true);

      if (isInWatchlist) {
        const removeResponse = await fetch("/api/watchlists/items", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ companyCode }),
        });

        const removePayload = (await removeResponse.json().catch(() => null)) as
          | { ok?: boolean; removed?: boolean; notFound?: boolean; error?: string; code?: string }
          | null;

        if (!removeResponse.ok) {
          if (removePayload?.code === "watchlist_missing") {
            window.alert("Create a watchlist first.");
            return;
          }
          window.alert(removePayload?.error ?? "Unable to remove company from watchlist.");
          return;
        }

        if (removePayload?.removed || removePayload?.notFound) {
          setIsInWatchlist(false);
          router.refresh();
        }
        return;
      }

      if (!hasWatchlist) {
        const watchlistName = window.prompt(
          "Name your watchlist",
          initialWatchlistName?.trim() || "My Watchlist",
        );
        const trimmedName = watchlistName?.trim();
        if (!trimmedName) return;

        const createResponse = await fetch("/api/watchlists", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: trimmedName }),
        });

        if (!createResponse.ok) {
          const payload = (await createResponse.json().catch(() => null)) as { error?: string } | null;
          window.alert(payload?.error ?? "Unable to create watchlist.");
          return;
        }

        setHasWatchlist(true);
      }

      const addResponse = await fetch("/api/watchlists/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyCode }),
      });

      const addPayload = (await addResponse.json().catch(() => null)) as
        | { ok?: boolean; added?: boolean; alreadyExists?: boolean; error?: string; code?: string }
        | null;

      if (!addResponse.ok) {
        if (addPayload?.code === "watchlist_missing") {
          window.alert("Create a watchlist first.");
          return;
        }
        window.alert(addPayload?.error ?? "Unable to add company to watchlist.");
        return;
      }

      if (addPayload?.added || addPayload?.alreadyExists) {
        setIsInWatchlist(true);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isSubmitting}
      >
        Add to Watchlist
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={isInWatchlist ? "destructive" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isSubmitting}
    >
      {isInWatchlist ? (isSubmitting ? "Removing..." : "Remove from Watchlist") : isSubmitting ? "Saving..." : "Add to Watchlist"}
    </Button>
  );
}
