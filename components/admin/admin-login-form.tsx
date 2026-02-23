"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.ok) {
        setError(payload?.error ?? "Unable to unlock admin panel.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-5">
      <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter passcode to view analytics.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="admin-passcode">Passcode</Label>
          <Input
            id="admin-passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter admin passcode"
            autoComplete="current-password"
            required
          />
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Unlocking..." : "Unlock Admin"}
        </Button>
      </form>
    </div>
  );
}
