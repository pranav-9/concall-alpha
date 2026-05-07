"use client";

import * as React from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type SectionHelpfulnessFooterProps = {
  companyCode: string;
  companyName?: string | null;
  sectionId: string;
  sectionTitle: string;
};

type HelpfulnessAnswer = "yes" | "no";

const REQUEST_DEDUPE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function getStorageKey(companyCode: string, sectionId: string) {
  return `section-helpfulness:${companyCode}:${sectionId}`;
}

export function SectionHelpfulnessFooter({
  companyCode,
  companyName,
  sectionId,
  sectionTitle,
}: SectionHelpfulnessFooterProps) {
  const pathname = usePathname();
  const storageKey = React.useMemo(
    () => getStorageKey(companyCode, sectionId),
    [companyCode, sectionId],
  );
  const [submittingAnswer, setSubmittingAnswer] =
    React.useState<HelpfulnessAnswer | null>(null);
  const [submittedAnswer, setSubmittedAnswer] =
    React.useState<HelpfulnessAnswer | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        requestedAt?: number;
        answer?: HelpfulnessAnswer;
      } | null;
      const requestedAt =
        parsed && typeof parsed.requestedAt === "number" ? parsed.requestedAt : null;
      const answer = parsed?.answer === "yes" || parsed?.answer === "no" ? parsed.answer : null;

      if (!requestedAt || !answer) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      if (Date.now() - requestedAt > REQUEST_DEDUPE_WINDOW_MS) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      setSubmittedAnswer(answer);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const submitAnswer = async (answer: HelpfulnessAnswer) => {
    if (submittedAnswer || submittingAnswer) return;
    setSubmittingAnswer(answer);

    const sourcePath = `${pathname || `/company/${companyCode}`}#${sectionId}`;

    try {
      const response = await fetch("/api/user-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: answer === "yes" ? "feedback" : "section_improvement",
          subjectTarget: `${companyCode} - ${sectionTitle} usefulness`,
          sourcePath,
          message: [
            "One-click section usefulness feedback from company page.",
            "Feedback kind: section_helpfulness",
            `Answer: ${answer}`,
            `Company: ${companyName?.trim() || companyCode}`,
            `Code: ${companyCode}`,
            `Section: ${sectionTitle}`,
            `Section ID: ${sectionId}`,
          ].join("\n"),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error ?? "Unable to submit feedback.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ requestedAt: Date.now(), answer }),
        );
      }

      setSubmittedAnswer(answer);
      toast.success("Feedback submitted");
    } catch {
      toast.error("Unable to submit feedback.");
    } finally {
      setSubmittingAnswer(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/45 bg-background/60 px-3 py-2.5">
      <p className="text-[12px] font-medium text-muted-foreground">
        {submittedAnswer ? "Thanks for the section feedback." : "Was this section helpful?"}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant={submittedAnswer === "yes" ? "default" : "outline"}
          size="sm"
          className="h-7 rounded-full px-2.5 text-[11px]"
          disabled={Boolean(submittedAnswer) || Boolean(submittingAnswer)}
          onClick={() => submitAnswer("yes")}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {submittingAnswer === "yes" ? "Sending..." : "Yes"}
        </Button>
        <Button
          type="button"
          variant={submittedAnswer === "no" ? "default" : "outline"}
          size="sm"
          className="h-7 rounded-full px-2.5 text-[11px]"
          disabled={Boolean(submittedAnswer) || Boolean(submittingAnswer)}
          onClick={() => submitAnswer("no")}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          {submittingAnswer === "no" ? "Sending..." : "No"}
        </Button>
      </div>
    </div>
  );
}
