"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  POLL_STATUSES,
  QUESTION_TYPES,
  type PollStatus,
  type QuestionType,
} from "@/lib/feedback-polls/types";

const textareaClass = cn(
  "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

type OptionEntry = { key: string; label: string };

const DEFAULT_OPTIONS: OptionEntry[] = [
  { key: "option_a", label: "Option A" },
  { key: "option_b", label: "Option B" },
];

function parseOptionsBlock(raw: string): OptionEntry[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, ...rest] = line.split("|");
      return {
        key: (key ?? "").trim(),
        label: rest.join("|").trim() || (key ?? "").trim(),
      };
    });
}

function toLocalInputValue(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    value.getFullYear() +
    "-" +
    pad(value.getMonth() + 1) +
    "-" +
    pad(value.getDate()) +
    "T" +
    pad(value.getHours()) +
    ":" +
    pad(value.getMinutes())
  );
}

export function PollCreateForm() {
  const router = useRouter();
  const now = React.useMemo(() => new Date(), []);
  const defaultEnd = React.useMemo(
    () => new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    [now],
  );

  const [slug, setSlug] = React.useState("");
  const [questionText, setQuestionText] = React.useState("");
  const [questionType, setQuestionType] = React.useState<QuestionType>("single_choice");
  const [optionsText, setOptionsText] = React.useState(
    DEFAULT_OPTIONS.map((o) => `${o.key}|${o.label}`).join("\n"),
  );
  const [maxSelections, setMaxSelections] = React.useState(2);
  const [status, setStatus] = React.useState<PollStatus>("draft");
  const [startsAt, setStartsAt] = React.useState(toLocalInputValue(now));
  const [endsAt, setEndsAt] = React.useState<string>(toLocalInputValue(defaultEnd));
  const [submitting, setSubmitting] = React.useState(false);

  const requiresOptions = questionType !== "rating_1_5";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const startsIso = new Date(startsAt).toISOString();
      const endsIso = endsAt ? new Date(endsAt).toISOString() : null;

      let optionsPayload: unknown = null;
      if (questionType === "single_choice") {
        optionsPayload = { entries: parseOptionsBlock(optionsText) };
      } else if (questionType === "multi_select") {
        optionsPayload = {
          entries: parseOptionsBlock(optionsText),
          max_selections: maxSelections,
        };
      }

      const response = await fetch("/api/admin/feedback-polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          question_text: questionText,
          question_type: questionType,
          options: optionsPayload,
          starts_at: startsIso,
          ends_at: endsIso,
          status,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error ?? "Unable to create poll.");
        return;
      }

      toast.success("Poll created");
      setSlug("");
      setQuestionText("");
      setOptionsText(DEFAULT_OPTIONS.map((o) => `${o.key}|${o.label}`).join("\n"));
      router.refresh();
    } catch {
      toast.error("Unable to create poll.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="poll-slug">Slug</Label>
          <Input
            id="poll-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. most-useful-section-2026-05"
            required
            pattern="[a-z0-9_-]+"
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="poll-status">Status</Label>
          <select
            id="poll-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PollStatus)}
            className="w-full rounded-md border border-border/45 bg-background px-3 py-2 text-sm"
          >
            {POLL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="poll-question">Question</Label>
        <textarea
          id="poll-question"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Which section have you found most useful so far?"
          rows={2}
          maxLength={240}
          required
          className={textareaClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="poll-type">Type</Label>
          <select
            id="poll-type"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
            className="w-full rounded-md border border-border/45 bg-background px-3 py-2 text-sm"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="poll-starts">Starts at</Label>
          <Input
            id="poll-starts"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="poll-ends">Ends at</Label>
          <Input
            id="poll-ends"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>

      {requiresOptions ? (
        <div className="space-y-1.5">
          <Label htmlFor="poll-options">
            Options (one per line, format <code>key|Label</code>)
          </Label>
          <textarea
            id="poll-options"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            rows={4}
            className={cn(textareaClass, "font-mono text-[12px]")}
          />
        </div>
      ) : null}

      {questionType === "multi_select" ? (
        <div className="space-y-1.5">
          <Label htmlFor="poll-max">Max selections</Label>
          <Input
            id="poll-max"
            type="number"
            min={1}
            max={6}
            value={maxSelections}
            onChange={(e) => setMaxSelections(Number(e.target.value))}
            className="max-w-[120px]"
          />
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create poll"}
        </Button>
      </div>
    </form>
  );
}
