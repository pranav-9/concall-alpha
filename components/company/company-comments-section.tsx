"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CommentComposer } from "./comment-composer";
import { CommentList, type CompanyComment } from "./comment-list";

type ListResponse = {
  ok: boolean;
  comments?: CompanyComment[];
  nextCursor?: string | null;
  error?: string;
};

type CreateResponse = {
  ok: boolean;
  comment?: CompanyComment;
  error?: string;
};

type LikeResponse = {
  ok: boolean;
  liked?: boolean;
  likesCount?: number;
  error?: string;
};

type ReportResponse = {
  ok: boolean;
  reported?: boolean;
  error?: string;
};

export function CompanyCommentsSection({ companyCode }: { companyCode: string }) {
  const [comments, setComments] = useState<CompanyComment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [likeBusyId, setLikeBusyId] = useState<string | null>(null);
  const [reportBusyId, setReportBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const hasMore = useMemo(() => !!nextCursor, [nextCursor]);

  const fetchComments = useCallback(
    async (cursor?: string | null) => {
      const qs = new URLSearchParams({
        companyCode,
        limit: "20",
      });
      if (cursor) qs.set("cursor", cursor);

      const res = await fetch(`/api/company-comments?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await res.json()) as ListResponse;
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to load comments.");
      }
      return payload;
    },
    [companyCode],
  );

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    fetchComments()
      .then((payload) => {
        if (!isMounted) return;
        setComments(payload.comments ?? []);
        setNextCursor(payload.nextCursor ?? null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadError((err as Error).message || "Unable to load comments.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fetchComments]);

  const handleSubmit = useCallback(async () => {
    const commentText = input.trim();
    if (commentText.length < 3) {
      setSubmitError("Comment should be at least 3 characters.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setActionError(null);

    try {
      const res = await fetch("/api/company-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyCode,
          commentText,
        }),
      });
      const payload = (await res.json()) as CreateResponse;
      if (!res.ok || !payload.ok || !payload.comment) {
        throw new Error(payload.error ?? "Unable to post comment.");
      }

      setComments((prev) => [payload.comment as CompanyComment, ...prev]);
      setInput("");
    } catch (err) {
      setSubmitError((err as Error).message || "Unable to post comment.");
    } finally {
      setSubmitting(false);
    }
  }, [companyCode, input]);

  const handleToggleLike = useCallback(async (commentId: string) => {
    setLikeBusyId(commentId);
    setActionError(null);
    try {
      const res = await fetch("/api/company-comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const payload = (await res.json()) as LikeResponse;
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to update like.");
      }

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                likedByMe: Boolean(payload.liked),
                likesCount: Number(payload.likesCount ?? comment.likesCount),
              }
            : comment,
        ),
      );
    } catch (err) {
      setActionError((err as Error).message || "Unable to update like.");
    } finally {
      setLikeBusyId(null);
    }
  }, []);

  const handleReport = useCallback(async (commentId: string) => {
    setReportBusyId(commentId);
    setActionError(null);
    try {
      const res = await fetch("/api/company-comments/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const payload = (await res.json()) as ReportResponse;
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to report comment.");
      }

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                reportedByMe: true,
                reportsCount: comment.reportsCount + 1,
              }
            : comment,
        ),
      );
    } catch (err) {
      setActionError((err as Error).message || "Unable to report comment.");
    } finally {
      setReportBusyId(null);
    }
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    setActionError(null);
    try {
      const payload = await fetchComments(nextCursor);
      setComments((prev) => [...prev, ...(payload.comments ?? [])]);
      setNextCursor(payload.nextCursor ?? null);
    } catch (err) {
      setActionError((err as Error).message || "Unable to load more comments.");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchComments, nextCursor]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Share your view anonymously. Comments are public and sorted newest first.
      </p>

      <CommentComposer
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={submitError}
      />

      {loading ? (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading comments...
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {loadError}
        </div>
      ) : (
        <CommentList
          comments={comments}
          likeBusyId={likeBusyId}
          reportBusyId={reportBusyId}
          onToggleLike={handleToggleLike}
          onReport={handleReport}
        />
      )}

      {actionError ? (
        <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
      ) : null}

      {hasMore ? (
        <div className="pt-1">
          <Button type="button" variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
