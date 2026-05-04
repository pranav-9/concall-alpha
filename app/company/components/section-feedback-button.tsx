"use client";

import * as React from "react";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

type SectionFeedbackButtonProps = {
  companyCode: string;
  companyName?: string | null;
  sectionId: string;
  sectionTitle: string;
};

const REQUEST_DEDUPE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function getStorageKey(companyCode: string, sectionId: string) {
  return `section-feedback-request:${companyCode}:${sectionId}`;
}

export function SectionFeedbackButton({
  companyCode,
  companyName,
  sectionId,
  sectionTitle,
}: SectionFeedbackButtonProps) {
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

    const sourcePath = `${pathname || `/company/${companyCode}`}#${sectionId}`;

    try {
      const response = await fetch("/api/user-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "section_improvement",
          subjectTarget: `${companyCode} - ${sectionTitle}`,
          sourcePath,
          message: [
            "One-click section improvement request from company page.",
            `Company: ${companyName?.trim() || companyCode}`,
            `Code: ${companyCode}`,
            `Section: ${sectionTitle}`,
            `Section ID: ${sectionId}`,
          ].join("\n"),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        const message = payload?.error ?? "Unable to submit feedback.";
        toast.error(message);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ requestedAt: Date.now() }),
        );
      }

      setRequested(true);
      toast.success("Feedback submitted");
    } catch {
      toast.error("Unable to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      variant={requested ? "outline" : "default"}
      size="sm"
      className="h-8 rounded-full px-2.5 text-[11px] font-medium shadow-sm sm:px-3"
      disabled={requested || submitting}
      onClick={handleClick}
    >
      <MessageSquarePlus className="h-3.5 w-3.5" />
      <span>
        {requested ? "Feedback sent" : submitting ? "Sending..." : "Improve this section"}
      </span>
    </Button>
  );
}
