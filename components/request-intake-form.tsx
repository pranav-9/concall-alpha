"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RequestType = "feedback" | "stock_addition" | "bug_report";

const subjectLabelByType: Record<RequestType, string> = {
  feedback: "Topic / Area",
  stock_addition: "Ticker / Company",
  bug_report: "Page / Module",
};

export function RequestIntakeForm() {
  const pathname = usePathname();
  const router = useRouter();
  const [requestType, setRequestType] = useState<RequestType>("feedback");
  const [subjectTarget, setSubjectTarget] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{
    requestType?: string;
    subjectTarget?: string;
    submit?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const subjectLabel = useMemo(() => subjectLabelByType[requestType], [requestType]);

  const reset = () => {
    setRequestType("feedback");
    setSubjectTarget("");
    setMessage("");
    setErrors({});
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!["feedback", "stock_addition", "bug_report"].includes(requestType)) {
      next.requestType = "Select a valid request type.";
    }
    const subject = subjectTarget.trim();
    if (subject.length < 2 || subject.length > 120) {
      next.subjectTarget = "Enter 2–120 characters.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});

    try {
      const res = await fetch("/api/user-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          subjectTarget: subjectTarget.trim(),
          message: message.trim(),
          sourcePath: pathname,
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload?.ok || !payload?.id) {
        setErrors({ submit: payload?.error ?? "Unable to submit. Please try again." });
        return;
      }

      reset();
      router.push(`/request-submitted?id=${encodeURIComponent(payload.id)}`);
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="request-type">Request Type</Label>
        <Select
          value={requestType}
          onValueChange={(value) => setRequestType(value as RequestType)}
        >
          <SelectTrigger id="request-type" className="w-full">
            <SelectValue placeholder="Select request type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="feedback">Feedback</SelectItem>
            <SelectItem value="stock_addition">Stock Addition</SelectItem>
            <SelectItem value="bug_report">Bug Report</SelectItem>
          </SelectContent>
        </Select>
        {errors.requestType && (
          <p className="text-xs text-red-500">{errors.requestType}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subject-target">Stock / Topic / Module</Label>
        <Input
          id="subject-target"
          value={subjectTarget}
          onChange={(e) => setSubjectTarget(e.target.value)}
          placeholder={subjectLabel}
          maxLength={120}
        />
        {errors.subjectTarget && (
          <p className="text-xs text-red-500">{errors.subjectTarget}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="request-details">Details (optional)</Label>
        <textarea
          id="request-details"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you'd like us to improve or add."
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {errors.submit && (
        <p className="text-xs text-red-500">{errors.submit}</p>
      )}

      <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
        {submitting ? "Sending..." : "Send Request"}
      </Button>
    </form>
  );
}
