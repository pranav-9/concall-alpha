"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { HOUSE_BTN } from "./tokens";

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className={HOUSE_BTN}
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
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
