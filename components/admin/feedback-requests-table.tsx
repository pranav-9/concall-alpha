"use client";

import { useState } from "react";

import { formatIst, REQUEST_TYPE_LABELS, type FeedbackRequestRow } from "@/lib/admin/metrics";

import { FeedbackDetailDrawer } from "./feedback-detail-drawer";
import { AdminEmpty, AdminPanel, AdminTag } from "./shell";
import { ROW_HOVER, TABLE, TD, TD_MUTED, TD_TIME, TH } from "./tokens";

export type { FeedbackRequestRow };

const TYPE_TONE: Record<FeedbackRequestRow["request_type"], "signal" | "warn" | "alarm" | "muted"> = {
  feedback: "muted",
  stock_addition: "signal",
  bug_report: "alarm",
  missing_section: "warn",
  section_improvement: "warn",
};

export function FeedbackRequestsTable({ rows }: { rows: FeedbackRequestRow[] }) {
  const [selected, setSelected] = useState<FeedbackRequestRow | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdminPanel eyebrow="User requests" flush right={<span>click a row for the full message</span>}>
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>Submitted (IST)</th>
              <th className={TH}>Type</th>
              <th className={TH}>Subject</th>
              <th className={TH}>Message</th>
              <th className={TH}>From page</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <AdminEmpty colSpan={5}>No requests in this range.</AdminEmpty>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`${ROW_HOVER} cursor-pointer`}
                  onClick={() => {
                    setSelected(row);
                    setOpen(true);
                  }}
                >
                  <td className={TD_TIME}>{formatIst(row.created_at)}</td>
                  <td className={TD}>
                    <AdminTag tone={TYPE_TONE[row.request_type] ?? "muted"}>
                      {REQUEST_TYPE_LABELS[row.request_type] ?? row.request_type}
                    </AdminTag>
                  </td>
                  <td className={`${TD} max-w-[260px] truncate`}>{row.subject_target}</td>
                  <td className={`${TD_MUTED} max-w-[360px] truncate`}>{row.message?.trim() || "–"}</td>
                  <td className={`${TD_MUTED} house-data max-w-[220px] truncate text-[12px]`}>
                    {row.source_path ?? "–"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminPanel>

      <FeedbackDetailDrawer open={open} onOpenChange={setOpen} feedback={selected} />
    </>
  );
}
