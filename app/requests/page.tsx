import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CHIP_BASE,
  CHIP_NEUTRAL,
  CHIP_PRIMARY,
  HERO_CARD,
  PAGE_BACKGROUND_ATMOSPHERIC,
  PAGE_SHELL,
  PANEL_CARD_SKY,
} from "@/lib/design/shell";
import { RequestIntakeForm } from "@/components/request-intake-form";

export const metadata: Metadata = {
  title: "Submit Request – Story of a Stock",
  description: "Request a stock, share feedback, or report a bug.",
};

const PAGE_BACKGROUND_CLASS = `h-[30rem] ${PAGE_BACKGROUND_ATMOSPHERIC}`;

const PAGE_SHELL_CLASS = PAGE_SHELL;

const HERO_CARD_CLASS = HERO_CARD;

const PANEL_CARD_CLASS = PANEL_CARD_SKY;

const METRIC_CARD_CLASS =
  "rounded-2xl border border-border/35 bg-background/72 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]";

const CHIP_CLASS = CHIP_BASE;

const CHIP_PRIMARY_CLASS = CHIP_PRIMARY;

const CHIP_NEUTRAL_CLASS = CHIP_NEUTRAL;

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
