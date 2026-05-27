"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

type WatchlistOption = {
  id: number;
  name: string;
};

export function WatchlistButton({
  companyCode,
  loginRedirectPath,
  initialIsAuthenticated,
  initialWatchlists,
  initialContainingIds,
}: {
  companyCode: string;
  loginRedirectPath: string;
  initialIsAuthenticated: boolean;
  initialWatchlists: WatchlistOption[];
  initialContainingIds: number[];
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);
  const [watchlists, setWatchlists] = useState<WatchlistOption[]>(initialWatchlists);
  const [containingIds, setContainingIds] = useState<Set<number>>(
    () => new Set(initialContainingIds),
  );
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const containingCount = containingIds.size;
  const isWorking = pendingIds.size > 0 || isCreating;

  const ensureAuthenticated = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAuthenticated(false);
      router.push(`/auth/login?next=${encodeURIComponent(loginRedirectPath)}`);
      return false;
    }

    setIsAuthenticated(true);
    return true;
  };

  const markPending = (id: number, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const setMembership = (id: number, isMember: boolean) => {
    setContainingIds((prev) => {
      const next = new Set(prev);
      if (isMember) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleMembership = async (watchlist: WatchlistOption, nextChecked: boolean) => {
    if (pendingIds.has(watchlist.id)) return;
    const ok = await ensureAuthenticated();
    if (!ok) return;

    const previousIsMember = containingIds.has(watchlist.id);
    setMembership(watchlist.id, nextChecked);
    markPending(watchlist.id, true);

    try {
      const response = await fetch("/api/watchlists/items", {
        method: nextChecked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, watchlistId: watchlist.id }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            added?: boolean;
            removed?: boolean;
            alreadyExists?: boolean;
            notFound?: boolean;
            error?: string;
            code?: string;
          }
        | null;

      if (!response.ok) {
        setMembership(watchlist.id, previousIsMember);
        if (payload?.code === "watchlist_missing") {
          window.alert("That watchlist no longer exists.");
          return;
        }
        window.alert(
          payload?.error ?? (nextChecked ? "Unable to add company." : "Unable to remove company."),
        );
        return;
      }

      router.refresh();
    } catch {
      setMembership(watchlist.id, previousIsMember);
      window.alert("Unable to update watchlist.");
    } finally {
      markPending(watchlist.id, false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (isCreating) return;
    const ok = await ensureAuthenticated();
    if (!ok) return;

    const name = window.prompt("Name your new watchlist", "My Watchlist");
    const trimmed = name?.trim();
    if (!trimmed) return;

    setIsCreating(true);
    try {
      const createResponse = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const createPayload = (await createResponse.json().catch(() => null)) as
        | { ok?: boolean; watchlistId?: number; name?: string; error?: string }
        | null;

      if (!createResponse.ok || !createPayload?.watchlistId) {
        window.alert(createPayload?.error ?? "Unable to create watchlist.");
        return;
      }

      const newList: WatchlistOption = {
        id: createPayload.watchlistId,
        name: createPayload.name ?? trimmed,
      };
      setWatchlists((prev) => [...prev, newList]);

      const addResponse = await fetch("/api/watchlists/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, watchlistId: newList.id }),
      });

      const addPayload = (await addResponse.json().catch(() => null)) as
        | { ok?: boolean; added?: boolean; alreadyExists?: boolean; error?: string }
        | null;

      if (!addResponse.ok) {
        window.alert(addPayload?.error ?? "Watchlist created but unable to add company.");
        return;
      }

      setMembership(newList.id, true);
      router.refresh();
    } finally {
      setIsCreating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          router.push(`/auth/login?next=${encodeURIComponent(loginRedirectPath)}`);
        }}
      >
        Add to Watchlist
      </Button>
    );
  }

  const triggerLabel =
    containingCount === 0
      ? "Add to Watchlist"
      : containingCount === 1
        ? "In 1 list"
        : `In ${containingCount} lists`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={containingCount > 0 ? "secondary" : "outline"}
          size="sm"
          disabled={isWorking}
          className="inline-flex items-center gap-1.5"
        >
          {triggerLabel}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Save to watchlists</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {watchlists.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            No watchlists yet. Create your first one below.
          </p>
        ) : (
          watchlists.map((list) => {
            const checked = containingIds.has(list.id);
            const pending = pendingIds.has(list.id);
            return (
              <DropdownMenuCheckboxItem
                key={list.id}
                checked={checked}
                disabled={pending}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={(value) => {
                  void toggleMembership(list, Boolean(value));
                }}
              >
                <span className="truncate">{list.name}</span>
              </DropdownMenuCheckboxItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isCreating}
          onSelect={(event) => {
            event.preventDefault();
            void handleCreateAndAdd();
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {isCreating ? "Creating…" : "Create new list…"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
