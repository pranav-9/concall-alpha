"use client";

import * as React from "react";
import { Flag } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type BlockFeedbackButtonProps = {
  companyCode: string;
  companyName?: string | null;
  sectionId: string;
  sectionTitle: string;
  blockId: string;
  blockTitle: string;
};

const issueOptions = [
  "Wrong or stale data",
  "Missing important context",
  "Source is unclear",
  "Hard to understand",
] as const;

export function BlockFeedbackButton({
  companyCode,
  companyName,
  sectionId,
  sectionTitle,
  blockId,
  blockTitle,
}: BlockFeedbackButtonProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [issueType, setIssueType] = React.useState<(typeof issueOptions)[number]>(
    issueOptions[0],
  );
  const [details, setDetails] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async () => {
    if (submitted || submitting) return;
    setSubmitting(true);

    const sourcePath = `${pathname || `/company/${companyCode}`}#${sectionId}`;

    try {
      const response = await fetch("/api/user-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "section_improvement",
          subjectTarget: `${companyCode} - ${sectionTitle}: ${blockTitle}`.slice(0, 120),
          sourcePath,
          message: [
            "Inline block issue report from company page.",
            "Feedback kind: block_issue",
            `Issue type: ${issueType}`,
            `Company: ${companyName?.trim() || companyCode}`,
            `Code: ${companyCode}`,
            `Section: ${sectionTitle}`,
            `Section ID: ${sectionId}`,
            `Block: ${blockTitle}`,
            `Block ID: ${blockId}`,
            details.trim() ? `Details: ${details.trim()}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error ?? "Unable to submit report.");
        return;
      }

      setSubmitted(true);
      setOpen(false);
      toast.success("Issue reported");
    } catch {
      toast.error("Unable to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground"
          disabled={submitted}
        >
          <Flag className="h-3.5 w-3.5" />
          {submitted ? "Reported" : "Report issue"}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-full max-w-md">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle>Report Block Issue</DrawerTitle>
          <DrawerDescription>
            Flag a problem with this specific part of the analysis.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="rounded-xl border border-border/45 bg-muted/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Block
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{blockTitle}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[12px] font-medium text-foreground">What looks off?</p>
            <div className="grid grid-cols-1 gap-2">
              {issueOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-left text-[12px] transition-colors ${
                    issueType === option
                      ? "border-foreground bg-foreground text-background"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setIssueType(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`${blockId}-issue-details`}
              className="text-[12px] font-medium text-foreground"
            >
              Notes
            </label>
            <textarea
              id={`${blockId}-issue-details`}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              maxLength={600}
              placeholder="Optional context"
              className="min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/35"
            />
          </div>
        </div>

        <DrawerFooter className="border-t border-border">
          <Button type="button" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Sending..." : "Submit report"}
          </Button>
          <DrawerClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
