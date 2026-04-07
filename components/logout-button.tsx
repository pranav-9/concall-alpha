"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        Logout
      </button>
    );
  }

  return <Button onClick={logout}>Logout</Button>;
}
