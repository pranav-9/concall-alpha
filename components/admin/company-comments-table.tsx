"use client";

import { useMemo, useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AdminCommentRow = {
  id: string;
  company_code: string;
  comment_text: string;
  visitor_id: string;
  status: "visible" | "hidden" | "deleted";
  likes_count: number;
  reports_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminReportedRow = {
  id: string;
  comment_id: string;
  reason: string | null;
  created_at: string;
  comment: {
    id: string;
    company_code: string;
    comment_text: string;
    visitor_id: string;
    status: "visible" | "hidden" | "deleted";
    likes_count: number;
    reports_count: number;
    created_at: string;
    updated_at: string;
  }[];
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

function formatDateTime(value: string) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, n = 90) {
  if (text.length <= n) return text;
  return `${text.slice(0, n)}...`;
}

function getReportedComment(row: AdminReportedRow) {
  return row.comment?.[0] ?? null;
}

type DrawerData =
  | { type: "comment"; comment: AdminCommentRow }
  | { type: "report"; report: AdminReportedRow };

export function CompanyCommentsTable({
  comments,
  reported,
}: {
  comments: AdminCommentRow[];
  reported: AdminReportedRow[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DrawerData | null>(null);

  const reportedWithComment = useMemo(
    () => reported.filter((row) => getReportedComment(row)),
    [reported],
  );

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Company Comments</h2>
        </div>
        <div className="p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Snippet</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead className="text-right">Reports</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No comments found for this range.
                  </TableCell>
                </TableRow>
              ) : (
                comments.map((comment) => (
                  <TableRow
                    key={comment.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected({ type: "comment", comment });
                      setOpen(true);
                    }}
                  >
                    <TableCell className="text-muted-foreground">{formatDate(comment.created_at)}</TableCell>
                    <TableCell className="font-medium text-foreground">{comment.company_code}</TableCell>
                    <TableCell className="max-w-[460px] truncate">{truncate(comment.comment_text)}</TableCell>
                    <TableCell className="text-right">{comment.likes_count}</TableCell>
                    <TableCell className="text-right">{comment.reports_count}</TableCell>
                    <TableCell className="uppercase text-xs text-muted-foreground">{comment.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Reported Comments</h2>
        </div>
        <div className="p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Snippet</TableHead>
                <TableHead className="text-right">Reports</TableHead>
                <TableHead>Latest Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportedWithComment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No reported comments for this range.
                  </TableCell>
                </TableRow>
              ) : (
                reportedWithComment.map((report) => {
                  const comment = getReportedComment(report);
                  if (!comment) return null;
                  return (
                  <TableRow
                    key={report.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected({ type: "report", report });
                      setOpen(true);
                    }}
                  >
                    <TableCell className="text-muted-foreground">{formatDate(report.created_at)}</TableCell>
                    <TableCell className="font-medium text-foreground">{comment.company_code}</TableCell>
                    <TableCell className="max-w-[460px] truncate">
                      {truncate(comment.comment_text)}
                    </TableCell>
                    <TableCell className="text-right">{comment.reports_count}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-muted-foreground">
                      {report.reason?.trim() ? report.reason : "No reason"}
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen} direction="right">
        <DrawerContent className="w-full max-w-2xl">
          <DrawerHeader className="border-b border-border">
            <DrawerTitle>Company Comment Details</DrawerTitle>
            <DrawerDescription>Read-only moderation view for comment activity.</DrawerDescription>
          </DrawerHeader>

          {selected ? (
            <div className="p-4 space-y-4 overflow-y-auto">
              {selected.type === "comment" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Company</p>
                      <p>{selected.comment.company_code}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="uppercase">{selected.comment.status}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p>{formatDateTime(selected.comment.created_at)}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Updated</p>
                      <p>{formatDateTime(selected.comment.updated_at)}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Likes</p>
                      <p>{selected.comment.likes_count}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Reports</p>
                      <p>{selected.comment.reports_count}</p>
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Visitor ID</p>
                    <p className="mt-1 font-mono text-xs break-all">{selected.comment.visitor_id}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Comment</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{selected.comment.comment_text}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const comment = getReportedComment(selected.report);
                    return (
                      <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Report Logged</p>
                      <p>{formatDateTime(selected.report.created_at)}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Comment ID</p>
                      <p className="font-mono text-[12px] break-all">{selected.report.comment_id}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Company</p>
                      <p>{comment?.company_code ?? "—"}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="uppercase">{comment?.status ?? "—"}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Likes</p>
                      <p>{comment?.likes_count ?? 0}</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Reports</p>
                      <p>{comment?.reports_count ?? 0}</p>
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Visitor ID</p>
                    <p className="mt-1 font-mono text-xs break-all">{comment?.visitor_id ?? "—"}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Comment</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{comment?.comment_text ?? "—"}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest Reason</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{selected.report.reason?.trim() || "No reason provided."}</p>
                  </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : null}

          <DrawerFooter className="border-t border-border">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
