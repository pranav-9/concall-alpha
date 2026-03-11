import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { RequestIntakeForm } from "@/components/request-intake-form";

export const metadata: Metadata = {
  title: "Submit Request – Story of a Stock",
  description: "Request a stock, share feedback, or report a bug.",
};

type RecentStockRequest = {
  subjectTarget: string;
  createdAt: string | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default async function RequestsPage() {
  let recentStockRequests: RecentStockRequest[] = [];
  let requestsUnavailable = false;

  try {
    const admin = createAdminClient();
    const { data: requestRows, error } = await admin
      .from("user_requests")
      .select("subject_target, created_at")
      .eq("request_type", "stock_addition")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      requestsUnavailable = true;
    } else {
      recentStockRequests = ((requestRows ?? []) as Array<{
        subject_target: string;
        created_at?: string | null;
      }>).map((row) => ({
        subjectTarget: row.subject_target,
        createdAt: row.created_at ?? null,
      }));
    }
  } catch {
    requestsUnavailable = true;
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="w-[95%] sm:w-[90%] py-8 sm:py-10">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            User Requests
          </p>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            Request a stock or share feedback
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Use this page to request a company to be added, share product feedback, or report bugs you run into while using the portal.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">Submit a request</h2>
              <p className="text-sm text-muted-foreground">
                Stock requests, feedback, and bug reports all come through the same intake flow.
              </p>
            </div>

            <div className="mt-5">
              <RequestIntakeForm />
            </div>
          </section>

          <aside className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Demand Visibility
            </p>
            <h2 className="mt-2 text-xl font-bold text-foreground">
              Recent stock requests
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              The latest companies users have asked us to add to the portal.
            </p>

            <div className="mt-4 rounded-xl border border-border/40 bg-muted/10">
              {requestsUnavailable ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Recent request activity is temporarily unavailable.
                  </p>
                </div>
              ) : recentStockRequests.length === 0 ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    No stock requests yet. Use the form here to suggest a company.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {recentStockRequests.map((request, index) => (
                    <div
                      key={`${request.subjectTarget}-${request.createdAt ?? index}`}
                      className="px-4 py-3 transition-colors hover:bg-background/50"
                    >
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {request.subjectTarget}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          Stock request
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(request.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              We cover companies on this portal that do concalls, with Indian stocks and especially mid- and small-cap names preferred.
            </p>
            <Link
              href="/how-scores-work"
              prefetch={false}
              className="mt-4 inline-flex text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground"
            >
              See how the portal is structured
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
