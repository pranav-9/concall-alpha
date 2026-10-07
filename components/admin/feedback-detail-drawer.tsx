"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatIst, REQUEST_TYPE_LABELS, type FeedbackRequestRow } from "@/lib/admin/metrics";

import { EYEBROW, HOUSE_BTN } from "./tokens";

function Field({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-[6px] border border-[var(--rule)] bg-[var(--paper)] px-3 py-2">
      <p className={EYEBROW}>{label}</p>
      <p className={`mt-1 text-[13px] text-[var(--ink)] ${mono ? "house-data break-all text-[12px]" : "whitespace-pre-wrap"}`}>
        {children}
      </p>
    </div>
  );
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
      <DrawerContent className="house-tokens w-full max-w-2xl bg-[var(--paper-2)]">
        <DrawerHeader className="border-b border-[var(--rule)]">
          <DrawerTitle className="house-display text-[20px]">Request</DrawerTitle>
          <DrawerDescription className="text-[var(--ink-soft)]">
            Read-only row from user_requests.
          </DrawerDescription>
        </DrawerHeader>

        {feedback ? (
          <div className="space-y-3 overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Submitted (IST)">{formatIst(feedback.created_at)}</Field>
              <Field label="Type">{REQUEST_TYPE_LABELS[feedback.request_type] ?? feedback.request_type}</Field>
              <Field label="From page" mono>
                {feedback.source_path ?? "–"}
              </Field>
              <Field label="Id" mono>
                {feedback.id}
              </Field>
            </div>
            <Field label="Subject / target">{feedback.subject_target}</Field>
            <Field label="Message">{feedback.message?.trim() ? feedback.message : "No message."}</Field>
            <Field label="User agent" mono>
              {feedback.user_agent ?? "–"}
            </Field>
          </div>
        ) : null}

        <DrawerFooter className="border-t border-[var(--rule)]">
          <DrawerClose asChild>
            <button type="button" className={HOUSE_BTN}>
              Close
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
