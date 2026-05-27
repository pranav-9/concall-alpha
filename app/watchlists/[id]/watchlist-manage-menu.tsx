"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WatchlistManageMenu({
  watchlistId,
  currentName,
}: {
  watchlistId: number;
  currentName: string;
}) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);

  const handleRename = async () => {
    const next = window.prompt("Rename this watchlist", currentName);
    const trimmed = next?.trim();
    if (!trimmed || trimmed === currentName) return;

    setIsWorking(true);
    try {
      const response = await fetch(`/api/watchlists/${watchlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        window.alert(payload?.error ?? "Unable to rename watchlist.");
        return;
      }

      router.refresh();
    } finally {
      setIsWorking(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${currentName}"? This removes the list and all its companies.`,
    );
    if (!confirmed) return;

    setIsWorking(true);
    try {
      const response = await fetch(`/api/watchlists/${watchlistId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        window.alert(payload?.error ?? "Unable to delete watchlist.");
        return;
      }

      router.replace("/watchlists");
      router.refresh();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isWorking}
          className="inline-flex items-center gap-1.5 rounded-full border-sky-200/50 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-sky-50 dark:border-sky-700/30 dark:bg-background/70 dark:hover:bg-sky-950/20"
          aria-label="Manage watchlist"
        >
          <MoreHorizontal className="h-4 w-4" />
          Manage
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={(event) => { event.preventDefault(); void handleRename(); }}>
          Rename…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => { event.preventDefault(); void handleDelete(); }}
        >
          Delete watchlist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
