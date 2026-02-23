"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { FeedbackRequestRow } from "./feedback-requests-table";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FeedbackDetailDrawer({
  open,
  onOpenChange,
  feedback,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: FeedbackRequestRow | null;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full max-w-2xl">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle>Feedback Request Details</DrawerTitle>
          <DrawerDescription>Read-only request payload from `user_requests`.</DrawerDescription>
        </DrawerHeader>

        {feedback ? (
          <div className="p-4 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border border-border bg-muted/40 p-2">
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="font-mono text-[12px] break-all">{feedback.id}</p>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-2">
                <p className="text-xs text-muted-foreground">Created</p>
                <p>{formatDateTime(feedback.created_at)}</p>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-2">
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="uppercase">{feedback.request_type.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-2">
                <p className="text-xs text-muted-foreground">Source Path</p>
                <p>{feedback.source_path ?? "—"}</p>
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Subject / Target</p>
              <p className="mt-1 text-sm">{feedback.subject_target}</p>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Message</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {feedback.message?.trim() ? feedback.message : "No message provided."}
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">User Agent</p>
              <p className="mt-1 text-xs text-muted-foreground break-words">
                {feedback.user_agent ?? "—"}
              </p>
            </div>
          </div>
        ) : null}

        <DrawerFooter className="border-t border-border">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
