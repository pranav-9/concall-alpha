"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";

const MAX_COMMENT_LEN = 1500;

export function CommentComposer({
  value,
  onChange,
  onSubmit,
  submitting,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const trimmed = value.trim();
  const remaining = useMemo(() => MAX_COMMENT_LEN - value.length, [value.length]);
  const canSubmit = trimmed.length >= 3 && trimmed.length <= MAX_COMMENT_LEN && !submitting;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <label className="text-xs font-semibold text-foreground">Add a comment</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={MAX_COMMENT_LEN}
        placeholder="Share your view on this company..."
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-y"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Anonymous post · {remaining} characters left
        </p>
        <Button type="button" size="sm" onClick={onSubmit} disabled={!canSubmit}>
          {submitting ? "Posting..." : "Post comment"}
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
