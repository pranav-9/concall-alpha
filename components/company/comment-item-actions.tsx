"use client";

import { Button } from "@/components/ui/button";

export function CommentItemActions({
  likedByMe,
  likeBusy,
  onToggleLike,
  reportedByMe,
  reportBusy,
  onReport,
}: {
  likedByMe: boolean;
  likeBusy: boolean;
  onToggleLike: () => void;
  reportedByMe: boolean;
  reportBusy: boolean;
  onReport: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={likedByMe ? "default" : "outline"}
        className="h-7 px-2 text-xs"
        disabled={likeBusy}
        onClick={onToggleLike}
      >
        {likedByMe ? "Liked" : "Like"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        disabled={reportedByMe || reportBusy}
        onClick={onReport}
      >
        {reportedByMe ? "Reported" : "Report"}
      </Button>
    </div>
  );
}
