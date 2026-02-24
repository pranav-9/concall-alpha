"use client";

import { CommentItemActions } from "./comment-item-actions";

export type CompanyComment = {
  id: string;
  companyCode: string;
  commentText: string;
  likesCount: number;
  reportsCount: number;
  createdAt: string;
  likedByMe: boolean;
  reportedByMe: boolean;
};

function formatDate(value: string) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CommentList({
  comments,
  likeBusyId,
  reportBusyId,
  onToggleLike,
  onReport,
}: {
  comments: CompanyComment[];
  likeBusyId: string | null;
  reportBusyId: string | null;
  onToggleLike: (commentId: string) => void;
  onReport: (commentId: string) => void;
}) {
  if (comments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        No comments yet. Be the first to share a view.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Anonymous</p>
              <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
            </div>
            <p className="text-xs text-muted-foreground">Likes: {comment.likesCount}</p>
          </div>

          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{comment.commentText}</p>

          <CommentItemActions
            likedByMe={comment.likedByMe}
            likeBusy={likeBusyId === comment.id}
            onToggleLike={() => onToggleLike(comment.id)}
            reportedByMe={comment.reportedByMe}
            reportBusy={reportBusyId === comment.id}
            onReport={() => onReport(comment.id)}
          />
        </div>
      ))}
    </div>
  );
}
