import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { RequestIntakeForm } from "@/components/request-intake-form";

export const metadata: Metadata = {
  title: "Submit Request – Story of a Stock",
  description: "Request a stock, share feedback, or report a bug.",
};

const PAGE_BACKGROUND_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.78),_transparent_62%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.34),_transparent_62%)]";

const PAGE_SHELL_CLASS =
  "mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5 lg:px-8";

const HERO_CARD_CLASS =
  "rounded-[1.6rem] border border-sky-200/35 bg-gradient-to-br from-background/97 via-background/92 to-sky-50/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_18px_36px_-30px_rgba(15,23,42,0.26)] backdrop-blur-sm dark:border-sky-700/25 dark:from-background/90 dark:via-background/84 dark:to-sky-950/12";

const PANEL_CARD_CLASS =
  "rounded-[1.45rem] border border-sky-200/25 bg-gradient-to-br from-background/97 via-background/93 to-sky-50/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_16px_28px_-26px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-sky-700/20 dark:from-background/90 dark:via-background/84 dark:to-sky-950/10";

const METRIC_CARD_CLASS =
  "rounded-2xl border border-border/35 bg-background/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]";

const CHIP_CLASS =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors";

const CHIP_PRIMARY_CLASS =
  "border-sky-200/60 bg-sky-100/70 text-sky-800 dark:border-sky-700/35 dark:bg-sky-900/30 dark:text-sky-200";

const CHIP_NEUTRAL_CLASS =
  "border-border/60 bg-background/80 text-foreground";

const LIST_CARD_CLASS =
  "rounded-2xl border border-border/25 bg-background/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm";

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

  const recentRequestCount = recentStockRequests.length;
  const latestRequestDate = recentStockRequests[0]?.createdAt ?? null;

  return (
    <main className="relative isolate overflow-hidden">
      <div className={PAGE_BACKGROUND_CLASS} />
      <div className={PAGE_SHELL_CLASS}>
        <section className={HERO_CARD_CLASS}>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${CHIP_CLASS} ${CHIP_PRIMARY_CLASS}`}>User requests</span>
                <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>Stock additions</span>
                <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>Feedback</span>
                <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>Bug reports</span>
              </div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl">
                Request a stock or share feedback
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Use this page to request a company to be added, share product feedback, or report
                bugs you run into while using the portal.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className={METRIC_CARD_CLASS}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Recent stock requests
                </p>
                <p className="mt-2 text-2xl font-black leading-none text-foreground">
                  {recentRequestCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Companies users have asked us to add.
                </p>
              </div>
              <div className={METRIC_CARD_CLASS}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Request types
                </p>
                <p className="mt-2 text-2xl font-black leading-none text-foreground">3</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Feedback, stock additions, and bug reports.
                </p>
              </div>
              <div className={METRIC_CARD_CLASS}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Latest request
                </p>
                <p className="mt-2 text-2xl font-black leading-none text-foreground">
                  {latestRequestDate ? formatDate(latestRequestDate) : "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Most recent stock addition request in the queue.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
          <section className={PANEL_CARD_CLASS}>
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

          <aside className={PANEL_CARD_CLASS}>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Demand visibility
            </p>
            <h2 className="mt-2 text-xl font-bold text-foreground">
              Recent stock requests
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              The latest companies users have asked us to add to the portal.
            </p>

            <div className="mt-4 space-y-2">
              {requestsUnavailable ? (
                <div className={LIST_CARD_CLASS}>
                  <p className="text-sm text-muted-foreground">
                    Recent request activity is temporarily unavailable.
                  </p>
                </div>
              ) : recentStockRequests.length === 0 ? (
                <div className={LIST_CARD_CLASS}>
                  <p className="text-sm text-muted-foreground">
                    No stock requests yet. Use the form here to suggest a company.
                  </p>
                </div>
              ) : (
                recentStockRequests.map((request, index) => (
                  <div
                    key={`${request.subjectTarget}-${request.createdAt ?? index}`}
                    className={LIST_CARD_CLASS + " transition-colors hover:bg-background/80"}
                  >
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {request.subjectTarget}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`${CHIP_CLASS} ${CHIP_NEUTRAL_CLASS}`}>
                        Stock request
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              We cover companies on this portal that do concalls, with Indian stocks and especially
              mid- and small-cap names preferred.
            </p>
            <Link
              href="/how-scores-work"
              prefetch={false}
              className="mt-4 inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              See how the portal is structured
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
