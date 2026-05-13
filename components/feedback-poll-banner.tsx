"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isBannerRoute } from "@/lib/feedback-polls/route-scope";
import {
  isDismissActive,
  STORAGE_KEY_LAST_DISMISS,
  storageKeyResponded,
  type NormalizedPoll,
  type ResponseValue,
} from "@/lib/feedback-polls/types";

type BannerProps = {
  poll: NormalizedPoll | null;
};

type Phase = "gating" | "idle" | "submitting" | "success" | "exiting" | "hidden";

const SUCCESS_HOLD_MS = 1500;
const FADE_MS = 200;

const PILL_CLASS =
  "h-10 sm:h-7 rounded-full px-2.5 text-[11px] font-medium";
const RATING_PILL_CLASS = cn(PILL_CLASS, "min-w-[40px] sm:min-w-[32px]");
const SUBMIT_CLASS =
  "h-10 sm:h-7 rounded-full px-3 text-[11px] font-medium";

export function FeedbackPollBanner({ poll }: BannerProps) {
  const pathname = usePathname();
  const [phase, setPhase] = React.useState<Phase>("gating");
  const [multiSelected, setMultiSelected] = React.useState<Set<string>>(
    () => new Set(),
  );
  const fadeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const allowlisted = isBannerRoute(pathname);
  const questionId = poll ? `feedback-poll-question-${poll.id}` : "feedback-poll-question";

  // Mount gate: check localStorage for cross-poll snooze and per-poll responded.
  React.useEffect(() => {
    if (!poll || !allowlisted) {
      setPhase("hidden");
      return;
    }
    if (typeof window === "undefined") return;

    try {
      const respondedRaw = window.localStorage.getItem(storageKeyResponded(poll.id));
      if (respondedRaw === "true") {
        setPhase("hidden");
        return;
      }

      const dismissRaw = window.localStorage.getItem(STORAGE_KEY_LAST_DISMISS);
      const dismissTs = dismissRaw ? Number(dismissRaw) : null;
      if (isDismissActive(dismissTs, Date.now())) {
        setPhase("hidden");
        return;
      }
    } catch {
      // localStorage unavailable (private mode) — show the banner; benign re-show
      // on dismount is preferable to hiding behind a broken check.
    }

    setPhase("idle");
  }, [poll, allowlisted]);

  React.useEffect(() => {
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  if (phase === "gating" || phase === "hidden" || !poll || !allowlisted) {
    return null;
  }

  const startExit = (markResponded: boolean) => {
    if (typeof window !== "undefined") {
      try {
        if (markResponded) {
          window.localStorage.setItem(storageKeyResponded(poll.id), "true");
        } else {
          window.localStorage.setItem(
            STORAGE_KEY_LAST_DISMISS,
            String(Date.now()),
          );
        }
      } catch {
        // Ignore storage failures; banner still fades out below.
      }
    }
    setPhase("exiting");
    fadeTimer.current = setTimeout(() => setPhase("hidden"), FADE_MS);
  };

  const submitResponse = async (value: ResponseValue) => {
    if (phase !== "idle") return;
    setPhase("submitting");
    try {
      const response = await fetch("/api/feedback-polls/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poll_id: poll.id,
          response_value: value,
          source_path: pathname || null,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error ?? "Unable to submit feedback.");
        setPhase("idle");
        return;
      }

      setPhase("success");
      fadeTimer.current = setTimeout(() => startExit(true), SUCCESS_HOLD_MS);
    } catch {
      toast.error("Unable to submit feedback.");
      setPhase("idle");
    }
  };

  const handleSingleChoice = (optionKey: string) => {
    void submitResponse({ kind: "single_choice", option_key: optionKey });
  };

  const handleRating = (value: 1 | 2 | 3 | 4 | 5) => {
    void submitResponse({ kind: "rating_1_5", value });
  };

  const handleMultiSubmit = () => {
    if (multiSelected.size === 0) return;
    void submitResponse({
      kind: "multi_select",
      option_keys: Array.from(multiSelected),
    });
  };

  const toggleMulti = (optionKey: string) => {
    setMultiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optionKey)) {
        next.delete(optionKey);
      } else {
        if (
          poll.options.kind === "multi_select" &&
          next.size >= poll.options.maxSelections
        ) {
          return prev;
        }
        next.add(optionKey);
      }
      return next;
    });
  };

  const submitting = phase === "submitting";
  const showThanks = phase === "success";
  const exiting = phase === "exiting";

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10 py-2",
        "transition-opacity",
        exiting ? "opacity-0" : "opacity-100",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden={exiting}
    >
      <aside
        role="region"
        aria-labelledby={questionId}
        className="relative rounded-2xl border border-border/45 bg-background/65 px-4 py-3 sm:py-2.5 shadow-md shadow-black/15"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 pr-8">
          <p
            id={questionId}
            className="text-[13px] sm:text-[14px] font-medium leading-snug text-foreground sm:flex-shrink-0"
          >
            {poll.questionText}
          </p>

          {showThanks ? (
            <p className="text-[12px] text-muted-foreground sm:ml-auto">
              Thanks for the feedback.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
              {poll.options.kind === "single_choice" ? (
                <SingleChoiceOptions
                  poll={poll}
                  disabled={submitting}
                  onChoose={handleSingleChoice}
                />
              ) : null}
              {poll.options.kind === "multi_select" ? (
                <MultiSelectOptions
                  poll={poll}
                  selected={multiSelected}
                  disabled={submitting}
                  onToggle={toggleMulti}
                  onSubmit={handleMultiSubmit}
                />
              ) : null}
              {poll.options.kind === "rating_1_5" ? (
                <RatingOptions
                  disabled={submitting}
                  onChoose={handleRating}
                />
              ) : null}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Dismiss feedback poll"
          className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
          disabled={submitting}
          onClick={() => startExit(false)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </aside>
    </div>
  );
}

type SingleChoicePoll = NormalizedPoll & {
  options: { kind: "single_choice"; entries: Array<{ key: string; label: string }> };
};

function SingleChoiceOptions({
  poll,
  disabled,
  onChoose,
}: {
  poll: NormalizedPoll;
  disabled: boolean;
  onChoose: (optionKey: string) => void;
}) {
  if (poll.options.kind !== "single_choice") return null;
  const entries = (poll as SingleChoicePoll).options.entries;
  const labelledBy = `feedback-poll-question-${poll.id}`;

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-wrap items-center gap-1.5">
      {entries.map((option) => (
        <Button
          key={option.key}
          type="button"
          variant="outline"
          size="sm"
          role="radio"
          aria-checked={false}
          className={PILL_CLASS}
          disabled={disabled}
          onClick={() => onChoose(option.key)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

type MultiSelectPoll = NormalizedPoll & {
  options: {
    kind: "multi_select";
    entries: Array<{ key: string; label: string }>;
    maxSelections: number;
  };
};

function MultiSelectOptions({
  poll,
  selected,
  disabled,
  onToggle,
  onSubmit,
}: {
  poll: NormalizedPoll;
  selected: Set<string>;
  disabled: boolean;
  onToggle: (optionKey: string) => void;
  onSubmit: () => void;
}) {
  if (poll.options.kind !== "multi_select") return null;
  const entries = (poll as MultiSelectPoll).options.entries;
  const labelledBy = `feedback-poll-question-${poll.id}`;
  const canSubmit = selected.size > 0 && !disabled;

  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap items-center gap-1.5">
      {entries.map((option) => {
        const isSelected = selected.has(option.key);
        return (
          <Button
            key={option.key}
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            aria-pressed={isSelected}
            className={PILL_CLASS}
            disabled={disabled}
            onClick={() => onToggle(option.key)}
          >
            {option.label}
          </Button>
        );
      })}
      <Button
        type="button"
        variant="default"
        size="sm"
        className={SUBMIT_CLASS}
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        {disabled ? "Sending…" : "Submit"}
      </Button>
    </div>
  );
}

function RatingOptions({
  disabled,
  onChoose,
}: {
  disabled: boolean;
  onChoose: (value: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Rating from 1 to 5" className="flex items-center gap-1.5">
      {([1, 2, 3, 4, 5] as const).map((value) => (
        <Button
          key={value}
          type="button"
          variant="outline"
          size="sm"
          role="radio"
          aria-checked={false}
          aria-label={`${value} out of 5`}
          className={RATING_PILL_CLASS}
          disabled={disabled}
          onClick={() => onChoose(value)}
        >
          {value}
        </Button>
      ))}
    </div>
  );
}
