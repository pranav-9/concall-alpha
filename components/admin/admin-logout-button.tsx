"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await fetch("/api/admin/logout", { method: "POST" });
        } finally {
          router.refresh();
          setLoading(false);
        }
      }}
    >
      {loading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
