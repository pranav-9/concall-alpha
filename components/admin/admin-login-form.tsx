"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { EYEBROW, HOUSE_BTN_PRIMARY, HOUSE_INPUT } from "./tokens";

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
        setError(payload?.error ?? "Unable to unlock the admin panel.");
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
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[1280px] items-start justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] p-5">
        <p className={EYEBROW}>Admin · Story of a Stock</p>
        <h1 className="house-display mt-1.5 text-[26px]">Unlock the panel</h1>
        <p className="mt-1.5 text-[13px] text-[var(--ink-soft)]">
          Visitors, accounts, companies, requests and pipeline health. Passcode only.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label htmlFor="admin-passcode" className={EYEBROW}>
            Passcode
          </label>
          <input
            id="admin-passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className={HOUSE_INPUT}
          />
          {error ? <p className="text-[13px] text-[var(--alarm)]">{error}</p> : null}
          <button type="submit" className={`${HOUSE_BTN_PRIMARY} w-full`} disabled={submitting}>
            {submitting ? "Unlocking…" : "Unlock"}
          </button>
        </form>
      </div>
    </main>
  );
}
