"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedbackDetailDrawer } from "./feedback-detail-drawer";

export type FeedbackRequestRow = {
  id: string;
  request_type: "feedback" | "stock_addition" | "bug_report";
  subject_target: string;
  message: string | null;
  source_path: string | null;
  user_agent: string | null;
  created_at: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function FeedbackRequestsTable({ rows }: { rows: FeedbackRequestRow[] }) {
  const [selected, setSelected] = useState<FeedbackRequestRow | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Feedback Requests</h2>
        </div>
        <div className="p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Source Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No requests found for this range.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected(row);
                      setOpen(true);
                    }}
                  >
                    <TableCell className="text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                    <TableCell className="uppercase">
                      {row.request_type.replaceAll("_", " ")}
                    </TableCell>
                    <TableCell className="font-medium text-foreground max-w-[420px] truncate">
                      {row.subject_target}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {row.source_path ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <FeedbackDetailDrawer
        open={open}
        onOpenChange={setOpen}
        feedback={selected}
      />
    </>
  );
}
