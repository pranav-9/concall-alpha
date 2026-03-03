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
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Logout
      </button>
    );
  }

  return <Button onClick={logout}>Logout</Button>;
}
