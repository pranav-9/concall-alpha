import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ACCESS_COOKIE, hasAdminAccess } from "@/lib/admin-auth";
import { aggregateResponses, listAllPolls } from "@/lib/feedback-polls/queries";
import type { AdminPollRow } from "@/lib/feedback-polls/queries";
import type { PollAggregate, QuestionType } from "@/lib/feedback-polls/types";
import { PollCreateForm } from "./_components/poll-create-form";

export const metadata: Metadata = {
  title: "Polls – Admin",
  description: "Author and aggregate feedback polls.",
  robots: { index: false, follow: false },
};

const STATUS_ORDER = ["live", "draft", "closed"] as const;

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function renderAggregate(agg: PollAggregate, questionType: QuestionType): string {
  if (!agg.total_responses) return "No responses yet.";
  const entries = Object.entries(agg.counts ?? {});
  if (questionType === "rating_1_5") {
    const mean = agg.mean != null ? Number(agg.mean).toFixed(2) : "—";
    const distribution = [1, 2, 3, 4, 5]
      .map((n) => `${n}:${agg.counts?.[String(n)] ?? 0}`)
      .join("  ");
    return `mean ${mean} • ${distribution} • n=${agg.total_responses}`;
  }
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return `${sorted.map(([k, v]) => `${k}:${v}`).join("  ")} • n=${agg.total_responses}`;
}

async function loadData(): Promise<
  Array<{ poll: AdminPollRow; aggregate: PollAggregate }>
> {
  const polls = await listAllPolls();
  const aggregates = await Promise.all(
    polls.map((poll) =>
      aggregateResponses(poll.id).catch(() => ({
        total_responses: 0,
        question_type: poll.question_type,
        counts: {},
      } as PollAggregate)),
    ),
  );
  return polls.map((poll, idx) => ({ poll, aggregate: aggregates[idx] }));
}

export default async function AdminPollsPage() {
  const cookieStore = await cookies();
  if (!hasAdminAccess(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value)) {
    redirect("/admin");
  }

  let rows: Array<{ poll: AdminPollRow; aggregate: PollAggregate }> = [];
  let loadError: string | null = null;
  try {
    rows = await loadData();
  } catch {
    loadError = "Unable to load polls. Check Supabase tables and service role key.";
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: rows.filter((row) => row.poll.status === status),
  }));

  return (
    <main className="container mx-auto px-4 py-6 sm:py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feedback Polls</h1>
          <p className="text-sm text-muted-foreground">
            Author polls and watch live aggregates. Banner surfaces only one live poll at a time.
          </p>
        </div>
        <Link
          href="/admin"
          prefetch={false}
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          ← Admin
        </Link>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-200">
          {loadError}
        </div>
      ) : null}

      <section className="rounded-xl border border-border/35 bg-background/75 p-4 shadow-md shadow-black/20 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Create new poll</h2>
        <PollCreateForm />
      </section>

      {grouped.map(({ status, items }) => (
        <section
          key={status}
          className="rounded-xl border border-border/35 bg-background/75 p-4 shadow-md shadow-black/20 space-y-3"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground capitalize">{status}</h2>
            <span className="text-[11px] text-muted-foreground">{items.length}</span>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No {status} polls.</p>
          ) : (
            <ul className="space-y-3">
              {items.map(({ poll, aggregate }) => (
                <li
                  key={poll.id}
                  className="rounded-md border border-border/25 bg-background/45 p-3 space-y-1.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-foreground">{poll.question_text}</p>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {poll.question_type}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    <span className="font-mono">{poll.slug}</span> •{" "}
                    starts {formatTimestamp(poll.starts_at)} •{" "}
                    ends {formatTimestamp(poll.ends_at)}
                  </p>
                  <p className="text-[12px] font-mono text-foreground/85">
                    {renderAggregate(aggregate, poll.question_type)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
