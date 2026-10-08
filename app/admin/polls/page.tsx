import { adminPage } from "@/components/admin/admin-page";
import type { Metadata } from "next";

import { AdminAlert, AdminEmpty, AdminPanel, AdminShell, AdminTag } from "@/components/admin/shell";
import { formatIst } from "@/lib/admin/metrics";
import { parseRange } from "@/lib/admin/range";
import { aggregateAllResponses, listAllPolls } from "@/lib/feedback-polls/queries";
import type { AdminPollRow } from "@/lib/feedback-polls/queries";
import type { PollAggregate, QuestionType } from "@/lib/feedback-polls/types";

import { PollCreateForm } from "./_components/poll-create-form";

export const metadata: Metadata = {
  title: "Polls – Admin",
  description: "Author and aggregate feedback polls.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_ORDER = ["live", "draft", "closed"] as const;
const STATUS_TONE: Record<(typeof STATUS_ORDER)[number], "signal" | "warn" | "muted"> = {
  live: "signal",
  draft: "warn",
  closed: "muted",
};

function renderAggregate(agg: PollAggregate, questionType: QuestionType): string {
  if (!agg.total_responses) return "No responses yet.";
  const entries = Object.entries(agg.counts ?? {});
  if (questionType === "rating_1_5") {
    const mean = agg.mean != null ? Number(agg.mean).toFixed(2) : "–";
    const distribution = [1, 2, 3, 4, 5].map((n) => `${n}:${agg.counts?.[String(n)] ?? 0}`).join("  ");
    return `mean ${mean} · ${distribution} · n=${agg.total_responses}`;
  }
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return `${sorted.map(([k, v]) => `${k}:${v}`).join("  ")} · n=${agg.total_responses}`;
}

async function loadData(): Promise<Array<{ poll: AdminPollRow; aggregate: PollAggregate }>> {
  const [polls, aggregates] = await Promise.all([
    listAllPolls(),
    aggregateAllResponses().catch(() => ({}) as Record<string, PollAggregate>),
  ]);
  return polls.map((poll) => ({
    poll,
    aggregate: aggregates[poll.id] ?? { total_responses: 0, question_type: poll.question_type, counts: {} },
  }));
}

async function AdminPollsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const range = parseRange((await searchParams)?.range);

  let rows: Array<{ poll: AdminPollRow; aggregate: PollAggregate }> = [];
  let error: string | null = null;
  try {
    rows = await loadData();
  } catch {
    error = "Unable to load polls. Check the feedback_polls tables and the service role key.";
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: rows.filter((row) => row.poll.status === status),
  }));

  return (
    <AdminShell
      section="polls"
      range={range}
      title="Polls"
      lede="Author feedback polls and watch the live aggregates. The banner surfaces one live poll at a time."
      timeless
    >
      {error ? <AdminAlert>{error}</AdminAlert> : null}

      <AdminPanel eyebrow="New poll">
        <PollCreateForm />
      </AdminPanel>

      {grouped.map(({ status, items }) => (
        <AdminPanel
          key={status}
          eyebrow={status}
          flush
          right={<span className="house-data">{items.length}</span>}
        >
          {items.length === 0 ? (
            <div className="px-4 py-4">
              <AdminEmpty>No {status} polls.</AdminEmpty>
            </div>
          ) : (
            <ul>
              {items.map(({ poll, aggregate }) => (
                <li key={poll.id} className="border-b border-[var(--rule)] px-4 py-3 last:border-b-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[14px] text-[var(--ink)]">{poll.question_text}</p>
                    <span className="flex items-center gap-1.5">
                      <AdminTag tone={STATUS_TONE[status]}>{status}</AdminTag>
                      <AdminTag>{poll.question_type}</AdminTag>
                    </span>
                  </div>
                  <p className="house-data mt-1 text-[11px] text-[var(--ink-soft)]">
                    {poll.slug} · starts {formatIst(poll.starts_at)} · ends {formatIst(poll.ends_at)}
                  </p>
                  <p className="house-data mt-1.5 text-[12px] text-[var(--ink)]">
                    {renderAggregate(aggregate, poll.question_type)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      ))}
    </AdminShell>
  );
}

// Gated inside the page, before any query — see components/admin/admin-page.tsx.
export default adminPage(AdminPollsPage);
