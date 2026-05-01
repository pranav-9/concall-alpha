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
import { INNER_CARD } from "@/lib/design/shell";

type RequestType = "feedback" | "stock_addition" | "bug_report";

const subjectLabelByType: Record<RequestType, string> = {
  feedback: "Topic / Area",
  stock_addition: "Ticker / Company",
  bug_report: "Page / Module",
};

const FIELD_CARD_CLASS = `${INNER_CARD} p-3`;

const LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

const INPUT_CLASS =
  "h-11 rounded-xl border border-border/40 bg-background/80 px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-200/60 dark:focus-visible:ring-sky-800/50";

const TEXTAREA_CLASS =
  "min-h-[8rem] rounded-xl border border-border/40 bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground outline-none focus-visible:border-sky-300 focus-visible:ring-2 focus-visible:ring-sky-200/60 dark:focus-visible:ring-sky-800/50";

const ERROR_CLASS = "text-[11px] font-medium text-rose-500";

const SUBMIT_BUTTON_CLASS =
  "w-full rounded-full bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_24px_-18px_rgba(37,99,235,0.6)] hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 sm:w-auto";

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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={FIELD_CARD_CLASS + " space-y-2"}>
          <Label htmlFor="request-type" className={LABEL_CLASS}>
            Request Type
          </Label>
          <Select
            value={requestType}
            onValueChange={(value) => setRequestType(value as RequestType)}
          >
            <SelectTrigger id="request-type" className={INPUT_CLASS}>
              <SelectValue placeholder="Select request type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feedback">Feedback</SelectItem>
              <SelectItem value="stock_addition">Stock Addition</SelectItem>
              <SelectItem value="bug_report">Bug Report</SelectItem>
            </SelectContent>
          </Select>
          {errors.requestType && <p className={ERROR_CLASS}>{errors.requestType}</p>}
        </div>

        <div className={FIELD_CARD_CLASS + " space-y-2"}>
          <Label htmlFor="subject-target" className={LABEL_CLASS}>
            Stock / Topic / Module
          </Label>
          <Input
            id="subject-target"
            value={subjectTarget}
            onChange={(e) => setSubjectTarget(e.target.value)}
            placeholder={subjectLabel}
            maxLength={120}
            className={INPUT_CLASS}
          />
          {errors.subjectTarget && <p className={ERROR_CLASS}>{errors.subjectTarget}</p>}
        </div>
      </div>

      <div className={FIELD_CARD_CLASS + " space-y-2"}>
        <Label htmlFor="request-details" className={LABEL_CLASS}>
          Details (optional)
        </Label>
        <textarea
          id="request-details"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you'd like us to improve or add."
          rows={6}
          className={TEXTAREA_CLASS}
        />
      </div>

      {errors.submit && <p className={ERROR_CLASS}>{errors.submit}</p>}

      <Button type="submit" className={SUBMIT_BUTTON_CLASS} disabled={submitting}>
        {submitting ? "Sending..." : "Send Request"}
      </Button>
    </form>
  );
}
