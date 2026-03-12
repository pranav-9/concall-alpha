"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type MissingSectionRequestButtonProps = {
  companyCode: string;
  companyName?: string | null;
  sectionId: string;
  sectionTitle: string;
  className?: string;
};

const REQUEST_DEDUPE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function getStorageKey(companyCode: string, sectionId: string) {
  return `missing-section-request:${companyCode}:${sectionId}`;
}

export function MissingSectionRequestButton({
  companyCode,
  companyName,
  sectionId,
  sectionTitle,
  className,
}: MissingSectionRequestButtonProps) {
  const pathname = usePathname();
  const storageKey = React.useMemo(
    () => getStorageKey(companyCode, sectionId),
    [companyCode, sectionId],
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [requested, setRequested] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { requestedAt?: number } | null;
      const requestedAt =
        parsed && typeof parsed.requestedAt === "number" ? parsed.requestedAt : null;

      if (!requestedAt) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      if (Date.now() - requestedAt > REQUEST_DEDUPE_WINDOW_MS) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      setRequested(true);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const handleClick = async () => {
    if (requested || submitting) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/user-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "missing_section",
          subjectTarget: `${companyCode} - ${sectionTitle}`,
          message: [
            "One-click missing section request from company page.",
            `Company: ${companyName?.trim() || companyCode}`,
            `Code: ${companyCode}`,
            `Section: ${sectionTitle}`,
            `Section ID: ${sectionId}`,
          ].join("\n"),
          sourcePath: pathname,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error ?? "Unable to submit request.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ requestedAt: Date.now() }),
        );
      }

      setRequested(true);
      toast.success(`${sectionTitle} requested`);
    } catch {
      toast.error("Unable to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      variant={requested ? "outline" : "default"}
      className={className}
      disabled={requested || submitting}
      onClick={handleClick}
    >
      {requested ? "Requested" : submitting ? "Requesting..." : "Request this"}
    </Button>
  );
}
