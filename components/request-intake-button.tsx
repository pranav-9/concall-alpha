"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type RequestType = "feedback" | "stock_addition" | "bug_report";

type Props = {
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
};

const subjectLabelByType: Record<RequestType, string> = {
  feedback: "Topic / Area",
  stock_addition: "Ticker / Company",
  bug_report: "Page / Module",
};

export function RequestIntakeButton({
  triggerLabel = "Submit Request",
  triggerClassName,
  triggerVariant = "ghost",
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("feedback");
  const [subjectTarget, setSubjectTarget] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{
    requestType?: string;
    subjectTarget?: string;
    message?: string;
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
    const details = message.trim();
    if (details.length < 10 || details.length > 2000) {
      next.message = "Enter 10–2000 characters.";
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
      setOpen(false);
      reset();
      router.push(`/request-submitted?id=${encodeURIComponent(payload.id)}`);
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant={triggerVariant} className={triggerClassName}>
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 bg-gray-950 border-l border-gray-800 text-white"
      >
        <SheetHeader className="border-b border-gray-800">
          <SheetTitle className="text-white">
            Share Feedback or Request a Stock
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Anonymous submissions are reviewed by our team.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="request-type" className="text-gray-200">
              Request Type
            </Label>
            <Select
              value={requestType}
              onValueChange={(value) => setRequestType(value as RequestType)}
            >
              <SelectTrigger id="request-type" className="w-full bg-gray-900 border-gray-700 text-gray-100">
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="stock_addition">Stock Addition</SelectItem>
                <SelectItem value="bug_report">Bug Report</SelectItem>
              </SelectContent>
            </Select>
            {errors.requestType && (
              <p className="text-xs text-red-400">{errors.requestType}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject-target" className="text-gray-200">
              Stock / Topic / Module
            </Label>
            <Input
              id="subject-target"
              value={subjectTarget}
              onChange={(e) => setSubjectTarget(e.target.value)}
              placeholder={subjectLabel}
              className="bg-gray-900 border-gray-700 text-gray-100"
              maxLength={120}
            />
            {errors.subjectTarget && (
              <p className="text-xs text-red-400">{errors.subjectTarget}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request-details" className="text-gray-200">
              Details
            </Label>
            <textarea
              id="request-details"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you'd like us to improve or add."
              rows={6}
              maxLength={2000}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">10–2000 characters</p>
              <p className="text-xs text-gray-500">{message.trim().length}/2000</p>
            </div>
            {errors.message && <p className="text-xs text-red-400">{errors.message}</p>}
          </div>

          {errors.submit && (
            <p className="text-xs text-red-400">{errors.submit}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "Sending..." : "Send Request"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
